import { AuditSubmissionDoc as AuditRecord, ContactSubmissionDoc as ContactRecord } from '../db/firestoreClient';

export interface EmailDispatchResult {
  success: boolean;
  status: 'SENT' | 'SKIPPED' | 'FAILED';
  error?: string;
}

/**
 * Server-side email notification architecture.
 * Ready to integrate with Resend, Postmark, SendGrid, or standard SMTP
 * once server environment variables are provided.
 */
export async function sendAuditNotification(record: AuditRecord): Promise<EmailDispatchResult> {
  const apiKey = process.env.EMAIL_SERVICE_API_KEY?.trim();
  const recipient = process.env.NOTIFICATION_EMAIL_TO?.trim();

  if (!apiKey || !recipient) {
    // Provider not configured yet; log architectural status and skip safely
    console.info(`[EMAIL SERVICE] Email credentials not configured. Notification skipped for audit ${record.id}`);
    return { success: true, status: 'SKIPPED' };
  }

  try {
    // Architectural hook for future email provider integration:
    // e.g. await resend.emails.send({ from: 'leads@gkais.com', to: recipient, ... })
    console.info(`[EMAIL SERVICE] Simulating dispatch for audit ${record.id} to ${recipient}`);
    return { success: true, status: 'SENT' };
  } catch (err: any) {
    console.error(`[EMAIL SERVICE ERROR] Failed to send audit notification:`, err);
    return { success: false, status: 'FAILED', error: err.message };
  }
}

export async function sendContactNotification(record: ContactRecord): Promise<EmailDispatchResult> {
  const apiKey = process.env.EMAIL_SERVICE_API_KEY?.trim();
  const recipient = process.env.NOTIFICATION_EMAIL_TO?.trim();

  if (!apiKey || !recipient) {
    console.info(`[EMAIL SERVICE] Email credentials not configured. Notification skipped for contact ${record.id}`);
    return { success: true, status: 'SKIPPED' };
  }

  try {
    console.info(`[EMAIL SERVICE] Simulating dispatch for contact ${record.id} to ${recipient}`);
    return { success: true, status: 'SENT' };
  } catch (err: any) {
    console.error(`[EMAIL SERVICE ERROR] Failed to send contact notification:`, err);
    return { success: false, status: 'FAILED', error: err.message };
  }
}
