import { doc, setDoc } from 'firebase/firestore';
import { firestoreDb } from '../lib/firebase';
import { AuditRequestPayload, AuditResponse } from '../types/audit';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function generateSubmissionId(prefix: 'GK-AUD' | 'GK-CON'): string {
  const timestampPart = Date.now().toString(36).toUpperCase();
  const entropy = new Uint32Array(2);
  crypto.getRandomValues(entropy);
  const entropyPart = Array.from(entropy)
    .map((value) => value.toString(36).toUpperCase())
    .join('')
    .slice(0, 10);

  return `${prefix}-${timestampPart}-${entropyPart}`;
}

function assertHumanSubmission(payload: AuditRequestPayload): void {
  if (payload._hp_website_title?.trim()) {
    throw new Error('Submission flagged by automated spam filter.');
  }

  if (payload._formRenderedAt && Date.now() - payload._formRenderedAt < 1500) {
    throw new Error('Form was submitted too quickly. Please take a moment and try again.');
  }
}

async function dispatchAuditNotification(
  record: {
    id: string;
    name: string;
    company: string;
    website?: string;
    email: string;
    contactChannel: string;
    inquiryNotes?: string;
    status: string;
    createdAt: string;
    notificationStatus: string;
  },
  payload: AuditRequestPayload
): Promise<void> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 9000);

  try {
    const response = await fetch('/api/intake/audit-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...record,
        _formRenderedAt: payload._formRenderedAt,
        _hp_website_title: payload._hp_website_title || ''
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      console.warn(
        '[AUDIT NOTIFICATION] Lead saved but notification failed:',
        body?.error || `HTTP ${response.status}`
      );
    }
  } catch (error: any) {
    console.warn(
      '[AUDIT NOTIFICATION] Lead saved but notification request failed:',
      error?.name === 'AbortError' ? 'Request timed out.' : error?.message || error
    );
  } finally {
    window.clearTimeout(timeoutId);
  }
}

/**
 * Submits a Free AI Business Systems Audit directly through the Firebase Web SDK.
 * This is the supported Firestore access path for Google AI Studio Starter Tier,
 * where the Cloud Run runtime identity does not have user-editable Firestore IAM.
 */
export async function submitAuditRequest(payload: AuditRequestPayload): Promise<AuditResponse> {
  assertHumanSubmission(payload);

  const name = payload.name?.trim();
  const company = payload.company?.trim();
  const email = payload.email?.trim().toLowerCase();
  const website = payload.website?.trim();
  const inquiryNotes = payload.inquiryNotes?.trim();
  const contactChannel = payload.contactChannel?.trim();

  if (!name || name.length > 100) {
    throw new Error('Please enter a valid name.');
  }
  if (!company || company.length > 150) {
    throw new Error('Please enter a valid company name.');
  }
  if (!email || email.length > 254 || !EMAIL_REGEX.test(email)) {
    throw new Error('Please enter a valid business email address.');
  }
  if (!contactChannel) {
    throw new Error('Please select how customers usually contact you.');
  }
  if (website && website.length > 250) {
    throw new Error('Website URL is too long.');
  }
  if (inquiryNotes && inquiryNotes.length > 2000) {
    throw new Error('Inquiry notes cannot exceed 2,000 characters.');
  }

  const submissionId = generateSubmissionId('GK-AUD');
  const createdAt = new Date().toISOString();

  const record = {
    id: submissionId,
    name,
    company,
    email,
    contactChannel,
    status: 'PENDING_REVIEW',
    createdAt,
    notificationStatus: 'PENDING',
    ...(website ? { website } : {}),
    ...(inquiryNotes ? { inquiryNotes } : {})
  };

  await setDoc(doc(firestoreDb, 'audit_submissions', submissionId), record);
  await dispatchAuditNotification(record, payload);

  return {
    success: true,
    code: 'SUCCESS',
    submissionId,
    message: 'G-KAIS reviews your current lead flow and follows up with next steps.',
    timestamp: createdAt
  };
}
