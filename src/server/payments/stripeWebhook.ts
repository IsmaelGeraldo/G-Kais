import { createHmac, timingSafeEqual } from 'crypto';
import { getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import firebaseAppletConfig from '../../../firebase-applet-config.json';

type StripeEvent = {
  id?: unknown;
  type?: unknown;
  created?: unknown;
  livemode?: unknown;
  data?: {
    object?: Record<string, unknown>;
  };
};

type VerifiedPurchase = {
  provider: 'stripe';
  providerEventId: string;
  workspaceId: string;
  personId: string;
  checkoutSessionId: string;
  paymentId: string;
  amountMinor: number;
  currency: string;
  livemode: boolean;
  occurredAt: Date;
  offerType: string;
  formationId: string;
  cohortId: string;
  mentoringClientId: string;
};

export type StripeWebhookResult =
  | { status: 'ignored'; reason: string }
  | { status: 'duplicate'; purchase: VerifiedPurchase }
  | { status: 'recorded'; purchase: VerifiedPurchase };

function text(value: unknown, max = 500): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function numeric(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function metadata(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => typeof item === 'string')
      .map(([key, item]) => [key, String(item).trim()])
  );
}

function configuredProjectId(): string {
  return process.env.FIREBASE_PROJECT_ID?.trim() || firebaseAppletConfig.projectId?.trim() || '';
}

function configuredDatabaseId(): string {
  return process.env.FIRESTORE_DATABASE_ID?.trim() || firebaseAppletConfig.firestoreDatabaseId?.trim() || '(default)';
}

function adminApp() {
  const apps = getApps();
  const projectId = configuredProjectId();
  return apps.length
    ? apps[0]
    : initializeApp({ ...(projectId ? { projectId } : {}) });
}

function firestoreAdmin() {
  return getFirestore(adminApp(), configuredDatabaseId());
}

function signatureParts(header: string): { timestamp: number; signatures: string[] } | null {
  let timestamp = 0;
  const signatures: string[] = [];
  header.split(',').forEach((part) => {
    const [key, value] = part.split('=', 2);
    if (key === 't') timestamp = Number(value);
    if (key === 'v1' && /^[a-f0-9]{64}$/i.test(value || '')) signatures.push(value.toLowerCase());
  });
  return Number.isFinite(timestamp) && timestamp > 0 && signatures.length
    ? { timestamp, signatures }
    : null;
}

function constantTimeHexEquals(left: string, right: string): boolean {
  try {
    const a = Buffer.from(left, 'hex');
    const b = Buffer.from(right, 'hex');
    return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function verifyStripeWebhook(rawBody: Buffer, signatureHeader: string, secret: string): StripeEvent {
  if (!rawBody.length) throw new Error('STRIPE_EMPTY_BODY');
  const parts = signatureParts(signatureHeader);
  if (!parts) throw new Error('STRIPE_SIGNATURE_MALFORMED');

  const configuredTolerance = Number(process.env.STRIPE_WEBHOOK_TOLERANCE_SECONDS || '300');
  const tolerance = Number.isFinite(configuredTolerance)
    ? Math.max(60, Math.min(1800, Math.round(configuredTolerance)))
    : 300;
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - parts.timestamp) > tolerance) throw new Error('STRIPE_SIGNATURE_EXPIRED');

  const signedPayload = `${parts.timestamp}.${rawBody.toString('utf8')}`;
  const expected = createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex');
  if (!parts.signatures.some((candidate) => constantTimeHexEquals(candidate, expected))) {
    throw new Error('STRIPE_SIGNATURE_INVALID');
  }

  const parsed = JSON.parse(rawBody.toString('utf8')) as StripeEvent;
  if (!text(parsed.id, 200) || !text(parsed.type, 160)) throw new Error('STRIPE_EVENT_INVALID');
  return parsed;
}

function checkoutPurchase(event: StripeEvent): VerifiedPurchase | null {
  const eventType = text(event.type, 160);
  if (eventType !== 'checkout.session.completed' && eventType !== 'checkout.session.async_payment_succeeded') {
    return null;
  }

  const session = event.data?.object || {};
  if (text(session.object, 80) !== 'checkout.session') return null;
  if (text(session.payment_status, 40) !== 'paid') return null;

  const meta = metadata(session.metadata);
  const workspaceId = text(meta.gkais_workspace_id, 128);
  const personId = text(meta.gkais_person_id, 160);
  if (!workspaceId || !personId) return null;

  const checkoutSessionId = text(session.id, 200);
  const providerEventId = text(event.id, 200);
  const amountMinor = numeric(session.amount_total);
  const currency = text(session.currency, 16).toLowerCase();
  if (!checkoutSessionId || !providerEventId || amountMinor === null || amountMinor < 0 || !Number.isInteger(amountMinor) || !currency) {
    throw new Error('STRIPE_PURCHASE_INCOMPLETE');
  }

  const paymentIntent = session.payment_intent;
  const paymentId = typeof paymentIntent === 'string'
    ? text(paymentIntent, 200)
    : text((paymentIntent as Record<string, unknown> | null)?.id, 200) || checkoutSessionId;

  const createdSeconds = numeric(event.created);
  const occurredAt = createdSeconds && createdSeconds > 0
    ? new Date(createdSeconds * 1000)
    : new Date();

  return {
    provider: 'stripe',
    providerEventId,
    workspaceId,
    personId,
    checkoutSessionId,
    paymentId,
    amountMinor,
    currency,
    livemode: event.livemode === true,
    occurredAt,
    offerType: text(meta.gkais_offer_type, 80),
    formationId: text(meta.gkais_formation_id, 180),
    cohortId: text(meta.gkais_cohort_id, 180),
    mentoringClientId: text(meta.gkais_mentoring_client_id, 180)
  };
}

function safeDocumentId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 220);
}

async function persistVerifiedPurchase(purchase: VerifiedPurchase): Promise<'recorded' | 'duplicate'> {
  const db = firestoreAdmin();
  const workspaceRef = db.doc(`expert_workspaces/${purchase.workspaceId}`);
  const personRef = db.doc(`expert_workspaces/${purchase.workspaceId}/people/${purchase.personId}`);
  const suffix = safeDocumentId(`stripe-${purchase.providerEventId}`);
  const paymentRef = db.doc(`expert_workspaces/${purchase.workspaceId}/payment_events/${suffix}`);
  const relationshipRef = db.doc(`expert_workspaces/${purchase.workspaceId}/relationship_events/evt-purchase-completed-${suffix}`);
  const auditRef = db.doc(`expert_workspaces/${purchase.workspaceId}/audit_logs/audit-purchase-completed-${suffix}`);

  return db.runTransaction(async (transaction) => {
    const [workspaceSnapshot, personSnapshot, paymentSnapshot, relationshipSnapshot, auditSnapshot] = await Promise.all([
      transaction.get(workspaceRef),
      transaction.get(personRef),
      transaction.get(paymentRef),
      transaction.get(relationshipRef),
      transaction.get(auditRef)
    ]);

    if (!workspaceSnapshot.exists) throw new Error('PAYMENT_WORKSPACE_NOT_FOUND');
    if (!personSnapshot.exists) throw new Error('PAYMENT_PERSON_NOT_FOUND');
    if (paymentSnapshot.exists && relationshipSnapshot.exists) return 'duplicate';

    const occurredAt = Timestamp.fromDate(purchase.occurredAt);
    const metadata = {
      paymentVerified: true,
      provider: purchase.provider,
      providerEventId: purchase.providerEventId,
      paymentId: purchase.paymentId,
      checkoutSessionId: purchase.checkoutSessionId,
      amountMinor: purchase.amountMinor,
      currency: purchase.currency,
      livemode: purchase.livemode,
      offerType: purchase.offerType,
      formationId: purchase.formationId,
      cohortId: purchase.cohortId,
      mentoringClientId: purchase.mentoringClientId
    };

    if (!paymentSnapshot.exists) {
      transaction.create(paymentRef, {
        schemaVersion: 1,
        provider: purchase.provider,
        providerEventId: purchase.providerEventId,
        workspaceId: purchase.workspaceId,
        personId: purchase.personId,
        paymentId: purchase.paymentId,
        checkoutSessionId: purchase.checkoutSessionId,
        amountMinor: purchase.amountMinor,
        currency: purchase.currency,
        livemode: purchase.livemode,
        status: 'completed',
        offerType: purchase.offerType,
        formationId: purchase.formationId,
        cohortId: purchase.cohortId,
        mentoringClientId: purchase.mentoringClientId,
        verifiedAt: FieldValue.serverTimestamp(),
        occurredAt,
        createdAt: FieldValue.serverTimestamp()
      });
    }

    if (!relationshipSnapshot.exists) {
      transaction.create(relationshipRef, {
        schemaVersion: 1,
        personId: purchase.personId,
        type: 'purchase_completed',
        sourceType: 'stripe_checkout',
        sourceId: purchase.checkoutSessionId,
        actorUid: 'system:stripe',
        idempotencyKey: `purchase-completed:stripe:${purchase.providerEventId}`,
        metadata,
        occurredAt,
        createdAt: FieldValue.serverTimestamp()
      });
    }

    if (!auditSnapshot.exists) {
      transaction.create(auditRef, {
        schemaVersion: 1,
        entityType: 'payment_event',
        entityId: suffix,
        action: 'payment.verified_purchase_recorded',
        actorUid: 'system:stripe',
        changes: metadata,
        occurredAt,
        createdAt: FieldValue.serverTimestamp()
      });
    }

    return paymentSnapshot.exists && relationshipSnapshot.exists ? 'duplicate' : 'recorded';
  });
}

export async function handleStripeWebhook(rawBody: Buffer, signatureHeader: string): Promise<StripeWebhookResult> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) throw new Error('STRIPE_WEBHOOK_NOT_CONFIGURED');

  const event = verifyStripeWebhook(rawBody, signatureHeader, secret);
  const purchase = checkoutPurchase(event);
  if (!purchase) {
    const eventType = text(event.type, 160);
    const session = event.data?.object || {};
    if ((eventType === 'checkout.session.completed' || eventType === 'checkout.session.async_payment_succeeded') &&
      text(session.payment_status, 40) === 'paid') {
      console.warn(`[STRIPE WEBHOOK IGNORED] event=${text(event.id, 200)} missing G-KAIS metadata`);
      return { status: 'ignored', reason: 'MISSING_GKAIS_METADATA' };
    }
    return { status: 'ignored', reason: 'EVENT_NOT_APPLICABLE' };
  }

  const status = await persistVerifiedPurchase(purchase);
  return { status, purchase };
}
