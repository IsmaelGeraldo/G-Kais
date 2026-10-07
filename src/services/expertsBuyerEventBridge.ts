import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../lib/firebase';
import { recordOperationalBuyerEvent } from './expertsBuyerEvents';
import { linkMentoringClientToPerson, upsertExpertPerson } from './expertsRelationshipFoundation';
import { resolveActiveExpertWorkspaceId } from './expertsWorkspaceCore';

let completedKey = '';
let runningKey = '';

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function eventDate(...values: unknown[]): Date | undefined {
  for (const value of values) {
    if (value instanceof Date && Number.isFinite(value.getTime())) return value;
    if (typeof value === 'string' && value.trim()) {
      const date = new Date(value);
      if (Number.isFinite(date.getTime())) return date;
    }
    if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
      const date = (value as { toDate: () => Date }).toDate();
      if (Number.isFinite(date.getTime())) return date;
    }
  }
  return undefined;
}

async function backfillFormationBuyers(workspaceId: string): Promise<void> {
  const snapshot = await getDocs(collection(firestoreDb, 'expert_workspaces', workspaceId, 'enrollments'));
  for (const item of snapshot.docs) {
    const data = item.data() as Record<string, unknown>;
    const status = text(data.status);
    const personId = text(data.personId);
    if (!personId || status === 'withdrawn' || status === 'refunded') continue;
    await recordOperationalBuyerEvent({
      personId,
      kind: 'formation',
      sourceType: 'enrollment',
      sourceId: item.id,
      occurredAt: eventDate(data.joinedAt, data.createdAt),
      metadata: {
        formationId: text(data.formationId),
        cohortId: text(data.cohortId),
        status,
        backfilled: true
      }
    });
  }
}

async function backfillMentoringBuyers(workspaceId: string): Promise<void> {
  const snapshot = await getDocs(collection(firestoreDb, 'expert_workspaces', workspaceId, 'clients'));
  for (const item of snapshot.docs) {
    const data = item.data() as Record<string, unknown>;
    const record = object(data.record);
    let personId = text(record.personId);
    if (!personId) {
      const name = text(record.name).trim();
      const email = text(record.email).trim();
      const phone = text(record.phone).trim();
      if (!name || (!email && !phone)) continue;
      const resolved = await upsertExpertPerson({
        name,
        email,
        phone,
        source: 'mentoring-client',
        stage: 'mentoring',
        outcomeMemory: object(data.outcomeMemory)
      });
      personId = resolved.personId;
    }
    await recordOperationalBuyerEvent({
      personId,
      kind: 'mentoring',
      sourceType: 'mentoring_client',
      sourceId: item.id,
      occurredAt: eventDate(record.createdAt, record.startDate, data.createdAt),
      metadata: {
        clientId: item.id,
        program: text(record.program),
        backfilled: true
      }
    });
    if (!text(record.personId)) await linkMentoringClientToPerson(item.id, personId);
  }
}

async function backfillWebinarBuyers(workspaceId: string): Promise<void> {
  const snapshot = await getDocs(collection(firestoreDb, 'expert_workspaces', workspaceId, 'webinar_registrations'));
  for (const item of snapshot.docs) {
    const data = item.data() as Record<string, unknown>;
    if (data.purchased !== true) continue;
    const personId = text(data.personId);
    if (!personId) continue;
    await recordOperationalBuyerEvent({
      personId,
      kind: 'webinar',
      sourceType: 'webinar_registration',
      sourceId: item.id,
      occurredAt: eventDate(data.updatedAt, data.registeredAt),
      metadata: {
        webinarId: text(data.webinarId),
        backfilled: true
      }
    });
  }
}

async function backfill(user: User): Promise<void> {
  const workspaceId = await resolveActiveExpertWorkspaceId(user);
  if (!workspaceId || workspaceId !== user.uid) return;
  const key = `${user.uid}:${workspaceId}`;
  if (completedKey === key || runningKey === key) return;
  runningKey = key;
  try {
    await backfillFormationBuyers(workspaceId);
    await backfillMentoringBuyers(workspaceId);
    await backfillWebinarBuyers(workspaceId);
    completedKey = key;
  } finally {
    runningKey = '';
  }
}

if (typeof window !== 'undefined') {
  onAuthStateChanged(firebaseAuth, (user) => {
    if (!user) {
      completedKey = '';
      runningKey = '';
      return;
    }
    if (new URLSearchParams(window.location.search).get('invite')) return;
    void backfill(user).catch((error) => console.error('[G-KAIS BUYER EVENT BACKFILL]', error));
  });
}
