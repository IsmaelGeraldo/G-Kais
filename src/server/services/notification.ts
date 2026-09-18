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
 * Dispatches real-time notifications to configured external webhooks (Slack, Discord, Make, Zapier, etc.).
 * Webhook failures are logged and recorded without interrupting commercial lead intake.
 */
export async function notifyNewLead(payload: LeadNotificationPayload): Promise<NotificationResult> {
  const webhookUrl = process.env.NOTIFICATION_WEBHOOK_URL?.trim();

  if (!webhookUrl) {
    console.info('[NOTIFICATION] NOTIFICATION_WEBHOOK_URL is not set. Lead intake preserved, webhook skipped.');
    return { success: true, status: 'SKIPPED' };
  }

  let textMessage = '';
  let structuredBody: any = {};

  if (payload.type === 'audit') {
    const { id, name, company, email, website, contactChannel, inquiryNotes, createdAt } = payload.data;
    textMessage = `🔔 *New G-KAIS Systems Audit Request*\n` +
      `• *ID:* ${id}\n` +
      `• *Company:* ${company}\n` +
      `• *Contact:* ${name} (<${email}>)\n` +
      `• *Channel:* ${contactChannel}\n` +
      (website ? `• *Website:* ${website}\n` : '') +
      (inquiryNotes ? `• *Notes:* ${inquiryNotes}\n` : '') +
      `• *Time:* ${createdAt}`;

    structuredBody = {
      event: 'lead.audit_requested',
      id,
      type: 'audit',
      text: textMessage,
      data: payload.data
    };
  } else {
    const { id, name, email, message, createdAt } = payload.data;
    textMessage = `📬 *New G-KAIS Engineering Inquiry*\n` +
      `• *ID:* ${id}\n` +
      `• *From:* ${name} (<${email}>)\n` +
      `• *Message:* ${message}\n` +
      `• *Time:* ${createdAt}`;

    structuredBody = {
      event: 'lead.contact_inquiry',
      id,
      type: 'contact',
      text: textMessage,
      data: payload.data
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4500);

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'G-KAIS-Webhook-Notifier/1.0'
      },
      body: JSON.stringify(structuredBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No response body');
      console.error(`[NOTIFICATION FAILED] Webhook responded with status ${response.status}: ${errorText}`);
      return {
        success: false,
        status: 'FAILED',
        error: `Webhook returned status ${response.status}`
      };
    }

    console.info(`[NOTIFICATION SUCCESS] Dispatched notification for ${payload.type} ${payload.data.id}`);
    return { success: true, status: 'SUCCESS' };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isAbort = err.name === 'AbortError';
    const errorMsg = isAbort ? 'Webhook request timed out after 4.5s' : err.message || 'Network error';
    console.error(`[NOTIFICATION ERROR] Failed to send webhook for ${payload.data.id}:`, errorMsg);
    return {
      success: false,
      status: 'FAILED',
      error: errorMsg
    };
  }
}
