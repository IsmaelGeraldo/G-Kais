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
function cleanGeneratedText(value: unknown, language: 'es' | 'en'): string {
  if (typeof value !== 'string') return '';
  let text = value
    .replace(/^[\s•*-]+/, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([¿¡])\s+/g, '$1')
    .trim();
  if (!text) return '';
  if (language === 'es') {
    text = text
      .replace(/\bfollow[- ]?up\b/gi, 'seguimiento')
      .replace(/\bfeedback\b/gi, 'comentarios')
      .replace(/\bcall\b/gi, 'llamada')
      .replace(/\bpipeline\b/gi, 'proceso comercial')
      .replace(/\bfunnel\b/gi, 'sistema de captación')
      .replace(/\bdelivery\b/gi, 'entrega')
      .replace(/\bperformance\b/gi, 'rendimiento');
  }
  if (/^[¿¡]/.test(text) && text.length > 1) return text.charAt(0) + text.charAt(1).toUpperCase() + text.slice(2);
  return text.charAt(0).toUpperCase() + text.slice(1);
}
function cleanGeneratedList(value: unknown, language: 'es' | 'en'): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => cleanGeneratedText(item, language)).filter(Boolean)));
}
function cleanGeneratedQuestions(value: unknown, language: 'es' | 'en'): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => {
    let text = cleanGeneratedText(item, language).replace(/[.!]+$/, '').trim();
    if (!text) return '';
    if (language === 'es') {
      text = text.replace(/^\?+/, '').replace(/\?+$/, '').trim();
      if (!text.startsWith('¿')) text = `¿${text}`;
      if (!text.endsWith('?')) text = `${text}?`;
    } else if (!text.endsWith('?')) text = `${text}?`;
    return text;
  }).filter(Boolean)));
}
function sessionTone(language: 'es' | 'en'): string {
  if (language === 'es') {
    return [
      'Contexto: el contacto es un cliente activo que ya está dentro de una mentoría, consultoría o servicio profesional; no es un lead por cerrar.',
      'Redacta para ayudar al mentor durante una sesión real con el cliente.',
      'Usa español natural, profesional y sencillo. Cuida tildes, concordancia, puntuación y signos de apertura en preguntas.',
      'Evita traducciones literales del inglés, anglicismos innecesarios, frases corporativas y lenguaje de ventas.',
      'Usa frases breves y directas. Una idea principal por oración.',
      'No repitas información que ya aparece en otras secciones. Prioriza cambios recientes, problema actual, bloqueo, decisión y siguiente paso.',
      'Las preguntas deben poder decirse en voz alta de forma natural y deben ir al grano.',
      'Las soluciones y planes deben ser concretos, accionables y fáciles de entender para un mentor.'
    ].join(' ');
  }
  return 'Context: this is an active client already receiving a mentoring, consulting or professional service. Write for a mentor during a live client session. Use concise, natural, professional language; avoid sales language, repetition and unnecessary jargon.';
}
function buildSessionOpening(existing: SessionCopilotClient['copilot'], risks: string[], language: 'es' | 'en'): string {
  const gap = cleanGeneratedText(existing?.gap, language); const firstRisk = cleanGeneratedText(risks[0], language);
  if (language === 'es') { if (gap && firstRisk) return `Quiero partir revisando dónde estamos respecto de este punto: ${gap} Antes de cambiar el plan, entendamos mejor ${firstRisk.toLowerCase()} y cerremos con una próxima acción concreta.`; if (gap) return `Quiero partir revisando dónde estamos respecto de este punto: ${gap} Veamos qué cambió desde la última sesión y cerremos con una próxima acción concreta.`; return 'Quiero partir conectando lo que acordamos en la última sesión con lo que realmente ocurrió. Revisemos avances, bloqueos y cerremos con una próxima acción concreta.'; }
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
      businessKnowledge: {
        businessDescription: language === 'es'
          ? 'G-KAIS está preparando una sesión de seguimiento para un cliente activo. El objetivo es comprender su situación actual, revisar avances, detectar bloqueos y definir un plan claro para la siguiente etapa.'
          : 'G-KAIS is preparing a follow-up session for an active client. The goal is to understand the current situation, review progress, detect blockers and define a clear next-stage plan.',
        tone: sessionTone(language)
      },
      intakeContext: [client.week, commitmentContext, review?.body].filter(Boolean).join(' · '),
      internalNotes: [existing.summary, diagnosis?.body].filter(Boolean).join(' · '),
      notes: journal.slice(0, 16).map((entry) => ({ title: entry.title || 'Client journal', body: entry.body || '', createdAt: entry.createdAt }))
    })
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.brief) throw new Error(payload?.error || payload?.message || 'SESSION_COPILOT_FAILED');
  const brief = payload.brief;
  const known = cleanGeneratedList(Array.isArray(brief.signals) && brief.signals.length ? brief.signals : (existing.known || []), language);
  const risks = cleanGeneratedList(Array.isArray(brief.risks) && brief.risks.length ? brief.risks : (existing.risks || []), language);
  const questions = cleanGeneratedQuestions(Array.isArray(brief.qualificationQuestions) && brief.qualificationQuestions.length ? brief.qualificationQuestions : (existing.questions || []), language);
  const howHelp = cleanGeneratedList(Array.isArray(brief.howGkaisCanHelp) && brief.howGkaisCanHelp.length ? brief.howGkaisCanHelp : (existing.howHelp || []), language);
  const solutionPlan = cleanGeneratedList(Array.isArray(brief.solutionPlan) && brief.solutionPlan.length ? brief.solutionPlan : [], language);
  const plan = solutionPlan.length ? solutionPlan : brief.recommendedAction ? [cleanGeneratedText(String(brief.recommendedAction), language)].filter(Boolean) : cleanGeneratedList(existing.plan || [], language);
  const summary = cleanGeneratedText(typeof brief.summary === 'string' && brief.summary.trim() ? brief.summary : (existing.summary || ''), language);
  const freshSignal = risks[0] || summary;
  const gap = cleanGeneratedText(diagnosedProblem || (reviewPositive ? freshSignal : (client.currentGap || freshSignal || existing.gap || '')), language);
  const aiOpening = cleanGeneratedText(typeof brief.callPositioning === 'string' ? brief.callPositioning : '', language);
  const callOpening = aiOpening && !/agendar|te escribo|te envío|próxima llamada|next call|schedule/i.test(aiOpening)
    ? aiOpening
    : buildSessionOpening({ ...existing, gap }, risks, language);
  return { summary, gap, known, risks, questions, howHelp, plan, callOpening };
}
