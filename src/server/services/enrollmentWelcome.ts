export type EnrollmentWelcomeInput = {
  recipientEmail: string;
  personName: string;
  formationTitle: string;
  cohortTitle: string;
  startsAt?: string;
};

export type EnrollmentWelcomeResult = {
  success: boolean;
  status: 'SENT' | 'SKIPPED' | 'FAILED';
  provider?: 'resend';
  messageId?: string;
  error?: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export async function sendEnrollmentWelcome(input: EnrollmentWelcomeInput): Promise<EnrollmentWelcomeResult> {
  const provider = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  const apiKey = process.env.EMAIL_SERVICE_API_KEY?.trim();
  const from = process.env.NOTIFICATION_EMAIL_FROM?.trim();

  if (provider !== 'resend' || !apiKey || !from) {
    console.info('[ENROLLMENT WELCOME] Email provider is not configured; welcome skipped safely.');
    return { success: true, status: 'SKIPPED' };
  }

  const startText = input.startsAt?.trim() || 'Te confirmaremos los detalles de inicio por este mismo canal.';
  const subject = `Bienvenido a ${input.formationTitle}`;
  const text = [
    `Hola ${input.personName},`,
    '',
    `Tu incorporación a ${input.formationTitle} quedó confirmada.`,
    `Grupo / cohorte: ${input.cohortTitle}`,
    `Inicio: ${startText}`,
    '',
    'El equipo te enviará por este mismo canal cualquier acceso o material específico que corresponda.',
    '',
    'G-KAIS'
  ].join('\n');
  const html = `
    <div style="background:#f7f7f5;padding:32px;font-family:Arial,sans-serif;color:#0a0a0a;">
      <div style="max-width:620px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;padding:30px;">
        <div style="font:11px monospace;letter-spacing:.18em;text-transform:uppercase;color:#0a3f4d;">G-KAIS · Formación</div>
        <h1 style="font-size:26px;margin:10px 0 18px;">Bienvenido a ${escapeHtml(input.formationTitle)}</h1>
        <p style="font-size:15px;line-height:1.6;">Hola ${escapeHtml(input.personName)}, tu incorporación quedó confirmada.</p>
        <table style="width:100%;border-collapse:collapse;margin-top:20px;">
          <tr><td style="padding:9px 0;color:#6b6b6b;font-size:12px;">FORMACIÓN</td><td style="padding:9px 0;font-size:14px;">${escapeHtml(input.formationTitle)}</td></tr>
          <tr><td style="padding:9px 0;color:#6b6b6b;font-size:12px;">COHORTE</td><td style="padding:9px 0;font-size:14px;">${escapeHtml(input.cohortTitle)}</td></tr>
          <tr><td style="padding:9px 0;color:#6b6b6b;font-size:12px;">INICIO</td><td style="padding:9px 0;font-size:14px;">${escapeHtml(startText)}</td></tr>
        </table>
        <p style="margin-top:22px;color:#6b6b6b;font-size:13px;line-height:1.6;">El equipo te enviará por este mismo canal cualquier acceso o material específico que corresponda.</p>
      </div>
    </div>`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ from, to: [input.recipientEmail], subject, text, html }),
      signal: controller.signal
    });
    clearTimeout(timer);
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      return { success: false, status: 'FAILED', provider: 'resend', error: body?.message || `HTTP ${response.status}` };
    }
    return { success: true, status: 'SENT', provider: 'resend', ...(typeof body?.id === 'string' ? { messageId: body.id } : {}) };
  } catch (error: unknown) {
    clearTimeout(timer);
    const message = error instanceof Error ? error.message : 'Email provider request failed.';
    return { success: false, status: 'FAILED', provider: 'resend', error: message };
  }
}
