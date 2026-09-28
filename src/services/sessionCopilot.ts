import { firebaseAuth } from '../lib/firebase';

export type SessionCopilotClient = {
  id: string;
  name: string;
  company?: string;
  program?: string;
  week?: string;
  goal?: string;
  nextAction?: string;
  blockers?: string[];
  commitments?: Array<{ label: string; status: string }>;
  copilot?: {
    summary?: string;
    gap?: string;
    known?: string[];
    risks?: string[];
    questions?: string[];
    howHelp?: string[];
    plan?: string[];
    callOpening?: string;
  };
};

export type SessionJournalEntry = {
  title?: string;
  body?: string;
  createdAt?: string;
};

export type SessionCopilotResult = {
  summary: string;
  gap: string;
  known: string[];
  risks: string[];
  questions: string[];
  howHelp: string[];
  plan: string[];
  callOpening: string;
};

function buildSessionOpening(
  existing: SessionCopilotClient['copilot'],
  risks: string[],
  language: 'es' | 'en'
): string {
  if (existing?.callOpening) return existing.callOpening;

  const gap = existing?.gap?.trim();
  const firstRisk = risks[0]?.trim();

  if (language === 'es') {
    if (gap && firstRisk) {
      return `Quiero partir revisando dónde estamos respecto a este punto: ${gap} Antes de cambiar el plan, me interesa entender mejor ${firstRisk.toLowerCase()} y salir de esta sesión con una próxima acción concreta.`;
    }
    if (gap) {
      return `Quiero partir revisando dónde estamos respecto a este punto: ${gap} Veamos qué cambió desde la última sesión y cerremos con una próxima acción concreta.`;
    }
    return 'Quiero partir conectando lo que acordamos en la última sesión con lo que realmente ocurrió. Revisemos avances, bloqueadores y cerremos con una próxima acción concreta.';
  }

  if (gap && firstRisk) {
    return `I want to start by reviewing where we are on this point: ${gap} Before changing the plan, I want to understand ${firstRisk.toLowerCase()} more clearly and leave this session with one concrete next action.`;
  }
  if (gap) {
    return `I want to start by reviewing where we are on this point: ${gap} Let's see what changed since the last session and close with one concrete next action.`;
  }
  return 'I want to connect what we agreed in the last session with what actually happened. Let’s review progress, blockers and close with one concrete next action.';
}

export async function requestSessionCopilot(
  client: SessionCopilotClient,
  journal: SessionJournalEntry[],
  language: 'es' | 'en'
): Promise<SessionCopilotResult> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('AUTH_REQUIRED');

  const idToken = await user.getIdToken(true);
  const existing = client.copilot ?? {};
  const currentProblem = [
    existing.gap,
    ...(client.blockers ?? [])
  ].filter(Boolean).join(' · ');
  const currentSolution = (existing.plan ?? []).join(' · ');
  const commitmentContext = (client.commitments ?? [])
    .map((item) => `${item.label} [${item.status}]`)
    .join(' · ');

  const response = await fetch('/api/admin/ai/lead-brief', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      language,
      id: client.id,
      name: client.name,
      company: client.company || '',
      primaryService: client.program || '',
      primaryProblem: currentProblem,
      currentSolution,
      businessGoal: client.goal || '',
      status: 'CLIENT',
      nextAction: client.nextAction || '',
      intakeContext: [client.week, commitmentContext].filter(Boolean).join(' · '),
      internalNotes: existing.summary || '',
      notes: journal.slice(0, 12).map((entry) => ({
        title: entry.title || 'Client journal',
        body: entry.body || '',
        createdAt: entry.createdAt
      }))
    })
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.brief) {
    throw new Error(payload?.error || payload?.message || 'SESSION_COPILOT_FAILED');
  }

  const brief = payload.brief;
  const known = Array.isArray(brief.signals) && brief.signals.length
    ? brief.signals
    : (existing.known || []);
  const risks = Array.isArray(brief.risks) && brief.risks.length
    ? brief.risks
    : (existing.risks || []);
  const questions = Array.isArray(brief.qualificationQuestions) && brief.qualificationQuestions.length
    ? brief.qualificationQuestions
    : (existing.questions || []);

  // The current authenticated endpoint is the Admin sales-copilot endpoint.
  // For the pilot we reuse only its evidence analysis, risks and questions.
  // Client-success solutions and spoken positioning stay grounded in the
  // client's existing Outcome Memory until a tenant-aware session endpoint exists.
  return {
    summary: existing.summary || brief.summary || '',
    gap: existing.gap || '',
    known,
    risks,
    questions,
    howHelp: existing.howHelp || [],
    plan: existing.plan || [],
    callOpening: buildSessionOpening(existing, risks, language)
  };
}
