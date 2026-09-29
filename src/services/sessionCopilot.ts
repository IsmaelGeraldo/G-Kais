import { onAuthStateChanged, type User } from 'firebase/auth';
import { firebaseAuth } from '../lib/firebase';

export type SessionCopilotClient = {
  id: string;
  name: string;
  company?: string;
  program?: string;
  week?: string;
  goal?: string;
  nextAction?: string;
  currentGap?: string;
  currentPhase?: string;
  planSummary?: string;
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

export type SessionJournalEntry = { title?: string; body?: string; createdAt?: string };
export type SessionCopilotResult = { summary: string; gap: string; known: string[]; risks: string[]; questions: string[]; howHelp: string[]; plan: string[]; callOpening: string };

async function getRestoredUser(): Promise<User | null> {
  if (firebaseAuth.currentUser) return firebaseAuth.currentUser;
  return new Promise((resolve) => {
    let finished = false;
    let unsubscribe = () => {};
    const finish = (user: User | null) => { if (finished) return; finished = true; window.clearTimeout(timer); unsubscribe(); resolve(user); };
    const timer = window.setTimeout(() => finish(firebaseAuth.currentUser), 1800);
    unsubscribe = onAuthStateChanged(firebaseAuth, (user) => finish(user), () => finish(null));
  });
}

function latestStage(journal: SessionJournalEntry[], words: string[]): SessionJournalEntry | undefined {
  return journal.find((entry) => words.some((word) => (entry.title || '').toLowerCase().includes(word.toLowerCase())));
}
function extractLine(body: string | undefined, labels: string[]): string {
  if (!body) return '';
  const line = body.split('\n').find((item) => labels.some((label) => item.toLowerCase().startsWith(label.toLowerCase())));
  if (!line) return '';
  const colon = line.indexOf(':');
  return colon >= 0 ? line.slice(colon + 1).trim() : line.trim();
}
function buildSessionOpening(existing: SessionCopilotClient['copilot'], risks: string[], language: 'es' | 'en'): string {
  const gap = existing?.gap?.trim(); const firstRisk = risks[0]?.trim();
  if (language === 'es') { if (gap && firstRisk) return `Quiero partir revisando dónde estamos respecto a este punto: ${gap} Antes de cambiar el plan, entendamos mejor ${firstRisk.toLowerCase()} y salgamos con una próxima acción concreta.`; if (gap) return `Quiero partir revisando dónde estamos respecto a este punto: ${gap} Veamos qué cambió desde la última sesión y cerremos con una próxima acción concreta.`; return 'Quiero partir conectando lo que acordamos en la última sesión con lo que realmente ocurrió. Revisemos avances, bloqueos y cerremos con una próxima acción concreta.'; }
  if (gap && firstRisk) return `I want to start by reviewing where we are on this point: ${gap} Before changing the plan, let's understand ${firstRisk.toLowerCase()} and leave with one concrete next action.`;
  if (gap) return `I want to start by reviewing where we are on this point: ${gap} Let's see what changed since the last session and close with one concrete next action.`;
  return 'I want to connect what we agreed in the last session with what actually happened. Let’s review progress, blockers and close with one concrete next action.';
}

export async function requestSessionCopilot(client: SessionCopilotClient, journal: SessionJournalEntry[], language: 'es' | 'en'): Promise<SessionCopilotResult> {
  const user = await getRestoredUser();
  if (!user) throw new Error('AUTH_REQUIRED');
  const idToken = await user.getIdToken(true);
  const existing = client.copilot ?? {};
  const diagnosis = latestStage(journal, ['diagnóstico', 'diagnosis']);
  const review = latestStage(journal, ['revisión', 'review']);
  const planStage = latestStage(journal, ['plan / trabajo', 'plan / work']);
  const diagnosedProblem = extractLine(diagnosis?.body, ['problema actual:', 'current problem:']);
  const diagnosedCause = extractLine(diagnosis?.body, ['causa:', 'cause:']);
  const reviewOutcome = extractLine(review?.body, ['cumplimiento:', 'completion:']);
  const reviewPositive = /^(sí|si|yes)$/i.test(reviewOutcome.trim());
  const currentProblem = [diagnosedProblem, diagnosedCause, review?.body, client.currentGap, existing.gap, ...(client.blockers ?? [])].filter(Boolean).join(' · ');
  const currentSolution = [planStage?.body, client.planSummary, ...(existing.plan ?? [])].filter(Boolean).join(' · ');
  const commitmentContext = (client.commitments ?? []).map((item) => `${item.label} [${item.status}]`).join(' · ');

  const response = await fetch('/api/admin/ai/lead-brief', {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
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
      intakeContext: [client.week, commitmentContext, review?.body].filter(Boolean).join(' · '),
      internalNotes: [existing.summary, diagnosis?.body].filter(Boolean).join(' · '),
      notes: journal.slice(0, 16).map((entry) => ({ title: entry.title || 'Client journal', body: entry.body || '', createdAt: entry.createdAt }))
    })
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.brief) throw new Error(payload?.error || payload?.message || 'SESSION_COPILOT_FAILED');
  const brief = payload.brief;
  const known = Array.isArray(brief.signals) && brief.signals.length ? brief.signals : (existing.known || []);
  const risks = Array.isArray(brief.risks) && brief.risks.length ? brief.risks : (existing.risks || []);
  const questions = Array.isArray(brief.qualificationQuestions) && brief.qualificationQuestions.length ? brief.qualificationQuestions : (existing.questions || []);
  const howHelp = Array.isArray(brief.howGkaisCanHelp) && brief.howGkaisCanHelp.length ? brief.howGkaisCanHelp : (existing.howHelp || []);
  const solutionPlan = Array.isArray(brief.solutionPlan) && brief.solutionPlan.length ? brief.solutionPlan : [];
  const plan = solutionPlan.length ? solutionPlan : brief.recommendedAction ? [String(brief.recommendedAction)] : (existing.plan || []);
  const summary = typeof brief.summary === 'string' && brief.summary.trim() ? brief.summary.trim() : (existing.summary || '');
  const freshSignal = risks[0] || summary;
  const gap = diagnosedProblem || (reviewPositive ? freshSignal : (client.currentGap || freshSignal || existing.gap || ''));
  const callOpening = typeof brief.callPositioning === 'string' && brief.callPositioning.trim() ? brief.callPositioning.trim() : buildSessionOpening({ ...existing, gap }, risks, language);
  return { summary, gap, known, risks, questions, howHelp, plan, callOpening };
}
