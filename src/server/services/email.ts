import type {
  AuditSubmissionDoc as AuditRecord,
  ContactSubmissionDoc as ContactRecord
} from '../db/firestoreClient';
import {
  buildAuditNotificationEmail,
  buildContactNotificationEmail,
  buildOperationalAlertEmail
} from './emailTemplates';
import type {
  EmailMessage,
  OperationalEmailAlert
} from './emailTemplates';

export interface EmailDispatchResult {
  success: boolean;
  status: 'SENT' | 'SKIPPED' | 'FAILED';
  provider?: string;
  messageId?: string;
  error?: string;
}

type EmailConfig = {
  provider: 'resend';
  apiKey: string;
  recipient: string;
  from: string;
};

function getEmailConfig(): EmailConfig | null {
  const provider = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  const apiKey = process.env.EMAIL_SERVICE_API_KEY?.trim();
  const recipient = process.env.NOTIFICATION_EMAIL_TO?.trim();
  const from = process.env.NOTIFICATION_EMAIL_FROM?.trim();

  if (!provider || !apiKey || !recipient || !from) {
    return null;
  }

  if (provider !== 'resend') {
    console.warn(`[EMAIL SERVICE] Unsupported EMAIL_PROVIDER: ${provider}`);
    return null;
  }

  return {
    provider: 'resend',
    apiKey,
    recipient,
    from
  };
}

async function sendWithResend(
  config: EmailConfig,
  message: EmailMessage
): Promise<EmailDispatchResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: config.from,
        to: [config.recipient],
        subject: message.subject,
        text: message.text,
        html: message.html
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      const providerMessage =
        body && typeof body.message === 'string'
          ? body.message
          : `Resend returned HTTP ${response.status}`;

      console.error('[EMAIL SERVICE] Resend request failed:', providerMessage);

      return {
        success: false,
        status: 'FAILED',
        provider: 'resend',
        error: providerMessage
      };
    }

    const messageId =
      body && typeof body.id === 'string'
        ? body.id
        : undefined;

    return {
      success: true,
      status: 'SENT',
      provider: 'resend',
      ...(messageId ? { messageId } : {})
    };
  } catch (error: any) {
    clearTimeout(timeoutId);

    const message =
      error?.name === 'AbortError'
        ? 'Email provider request timed out.'
        : error?.message || 'Email provider request failed.';

    console.error('[EMAIL SERVICE] Email dispatch error:', message);

    return {
      success: false,
      status: 'FAILED',
      provider: 'resend',
      error: message
    };
  }
}

async function dispatchEmail(message: EmailMessage): Promise<EmailDispatchResult> {
  const config = getEmailConfig();

  if (!config) {
    console.info(
      '[EMAIL SERVICE] Provider configuration is incomplete. Email notification skipped safely.'
    );
    return {
      success: true,
      status: 'SKIPPED'
    };
  }

  return sendWithResend(config, message);
}

export async function sendAuditNotification(
  record: AuditRecord
): Promise<EmailDispatchResult> {
  return dispatchEmail(buildAuditNotificationEmail(record));
}

export async function sendContactNotification(
  record: ContactRecord
): Promise<EmailDispatchResult> {
  return dispatchEmail(buildContactNotificationEmail(record));
}

export async function sendOperationalAlertNotification(
  alert: OperationalEmailAlert
): Promise<EmailDispatchResult> {
  return dispatchEmail(buildOperationalAlertEmail(alert));
}
