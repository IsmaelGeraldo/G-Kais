import { doc, setDoc } from 'firebase/firestore';
import { firestoreDb } from '../lib/firebase';
import { ContactRequestPayload, ContactResponse } from '../types/audit';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function generateContactSubmissionId(): string {
  const timestampPart = Date.now().toString(36).toUpperCase();
  const entropy = new Uint32Array(2);
  crypto.getRandomValues(entropy);
  const entropyPart = Array.from(entropy)
    .map((value) => value.toString(36).toUpperCase())
    .join('')
    .slice(0, 10);

  return `GK-CON-${timestampPart}-${entropyPart}`;
}

function assertHumanSubmission(payload: ContactRequestPayload): void {
  if (payload._hp_website_title?.trim()) {
    throw new Error('Submission flagged by automated spam filter.');
  }

  if (payload._formRenderedAt && Date.now() - payload._formRenderedAt < 1500) {
    throw new Error('Form was submitted too quickly. Please take a moment and try again.');
  }
}

/**
 * Submits a contact inquiry directly through the Firebase Web SDK.
 * Firestore Security Rules limit the browser to create-only access.
 */
export async function submitContactRequest(payload: ContactRequestPayload): Promise<ContactResponse> {
  assertHumanSubmission(payload);

  const name = payload.name?.trim();
  const email = payload.email?.trim().toLowerCase();
  const message = payload.message?.trim();

  if (!name || name.length > 100) {
    throw new Error('Please enter a valid name.');
  }
  if (!email || email.length > 254 || !EMAIL_REGEX.test(email)) {
    throw new Error('Please enter a valid email address.');
  }
  if (!message || message.length > 5000) {
    throw new Error('Please enter a message of 5,000 characters or fewer.');
  }

  const submissionId = generateContactSubmissionId();
  const createdAt = new Date().toISOString();

  const record = {
    id: submissionId,
    name,
    email,
    message,
    status: 'PENDING_REVIEW',
    createdAt,
    notificationStatus: 'PENDING'
  };

  await setDoc(doc(firestoreDb, 'contact_submissions', submissionId), record);

  return {
    success: true,
    code: 'SUCCESS',
    submissionId,
    message: 'Inquiry received. G-KAIS reviews your request and follows up with next steps.',
    timestamp: createdAt
  };
}

export const submitContactInquiry = submitContactRequest;
