import { AuditSubmissionDoc as AuditRecord, ContactSubmissionDoc as ContactRecord } from '../db/firestoreClient';

export type LeadNotificationPayload =
  | { type: 'audit'; data: AuditRecord }
  | { type: 'contact'; data: ContactRecord };

export interface NotificationResult {
  success: boolean;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  error?: string;
}

/**
 * External webhook delivery is intentionally disabled for now.
 * Lead capture and email notifications remain active.
 * When G-KAIS adds a real Integrations workspace, webhook destinations
 * should be configured there instead of forcing an AI Studio secret.
 */
export async function notifyNewLead(
  _payload: LeadNotificationPayload
): Promise<NotificationResult> {
  return { success: true, status: 'SKIPPED' };
}
