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
  return {
    summary: brief.summary || existing.summary || '',
    gap: existing.gap || brief.recommendedAction || '',
    known: Array.isArray(brief.signals) && brief.signals.length ? brief.signals : (existing.known || []),
    risks: Array.isArray(brief.risks) && brief.risks.length ? brief.risks : (existing.risks || []),
    questions: Array.isArray(brief.qualificationQuestions) && brief.qualificationQuestions.length ? brief.qualificationQuestions : (existing.questions || []),
    howHelp: Array.isArray(brief.howGkaisCanHelp) && brief.howGkaisCanHelp.length ? brief.howGkaisCanHelp : (existing.howHelp || []),
    plan: Array.isArray(brief.solutionPlan) && brief.solutionPlan.length ? brief.solutionPlan : (existing.plan || []),
    callOpening: brief.callPositioning || existing.callOpening || ''
  };
}
