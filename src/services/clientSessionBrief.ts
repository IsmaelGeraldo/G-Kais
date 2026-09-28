import { firebaseAuth } from '../lib/firebase';

export type SessionCopilotBrief = {
  summary: string;
  problems: string[];
  solutions: string[];
  questions: string[];
  recommendedAction: string;
  callPositioning: string;
};

export type SessionCopilotContext = {
  id: string;
  name: string;
  company: string;
  businessType: string;
  program: string;
  primaryGoal: string;
  startingPoint: string;
  expectedOutcome: string;
  currentGap: string;
  planSummary: string;
  blockers: string[];
  nextAction: string;
  lastSessionSummary: string;
  recentTimeline: Array<{ title: string; body: string; createdAt?: string }>;
};

export async function requestClientSessionBrief(
  context: SessionCopilotContext,
  language: 'es' | 'en'
): Promise<SessionCopilotBrief> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('AUTH_REQUIRED');

  const idToken = await user.getIdToken(true);
  const response = await fetch('/api/admin/ai/lead-brief', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      language,
      id: context.id,
      name: context.name,
      company: context.company,
      businessType: context.businessType,
      primaryService: context.program,
      primaryProblem: [context.currentGap, ...context.blockers].filter(Boolean).join(' · '),
      currentSolution: context.planSummary,
      businessGoal: context.expectedOutcome || context.primaryGoal,
      status: 'CLIENT',
      nextAction: context.nextAction,
      intakeContext: context.startingPoint,
      internalNotes: context.lastSessionSummary,
      notes: context.recentTimeline.slice(-12)
    })
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.brief) {
    throw new Error(payload?.error || payload?.message || 'COPILOT_FAILED');
  }

  const brief = payload.brief;
  return {
    summary: brief.summary || '',
    problems: Array.isArray(brief.risks) ? brief.risks : [],
    solutions: [
      ...(Array.isArray(brief.howGkaisCanHelp) ? brief.howGkaisCanHelp : []),
      ...(Array.isArray(brief.solutionPlan) ? brief.solutionPlan : [])
    ].slice(0, 6),
    questions: Array.isArray(brief.qualificationQuestions) ? brief.qualificationQuestions : [],
    recommendedAction: brief.recommendedAction || '',
    callPositioning: brief.callPositioning || ''
  };
}
