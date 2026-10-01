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

function compactEvidence(value: unknown, max = 420): string {
  if (typeof value !== 'string') return '';
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}

function normalizeSpanishTerms(text: string): string {
  return text
    .replace(/\buna acciones realizadas\b/gi, 'una implementación')
    .replace(/\bacciones realizadas inconsistente(s?)\b/gi, 'implementación inconsistente$1')
    .replace(/\bfollow[- ]?up\b/gi, 'seguimiento')
    .replace(/\bfeedback\b/gi, 'comentarios')
    .replace(/\bcall\b/gi, 'llamada')
    .replace(/\bpipeline\b/gi, 'proceso comercial')
    .replace(/\bfunnel\b/gi, 'sistema de captación')
    .replace(/\bdelivery\b/gi, 'entrega')
    .replace(/\bperformance\b/gi, 'rendimiento')
    .replace(/\bejecuci[oó]n\b/gi, 'implementación')
    .replace(/\badquisici[oó]n\b/gi, 'captación de clientes')
    .replace(/\btasa de conversi[oó]n\b/gi, 'tasa de cierre')
    .replace(/\bla conversi[oó]n\b/gi, 'el cierre')
    .replace(/\buna conversi[oó]n\b/gi, 'un cierre')
    .replace(/\bconversi[oó]n\b/gi, 'cierre')
    .replace(/\bescalar\b/gi, 'crecer');
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
  if (language === 'es') text = normalizeSpanishTerms(text);
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
    } else if (!text.endsWith('?')) {
      text = `${text}?`;
    }
    return text;
  }).filter(Boolean)));
}

function sessionTone(language: 'es' | 'en'): string {
  if (language === 'es') {
    return [
      'Contexto: el contacto es un cliente activo dentro de una mentoría, consultoría o servicio profesional; no es un lead por cerrar.',
      'Redacta para ayudar al mentor durante una sesión real con ese cliente específico.',
      'La respuesta debe cambiar de forma material entre clientes: utiliza nombres de compromisos, objetivos, métricas, decisiones, bloqueos, etapa del programa o hechos recientes cuando existan.',
      'Cada pregunta debe nacer de evidencia concreta del cliente. Evita preguntas universales como “¿qué cambió?”, “¿qué te bloqueó?” o “¿qué necesitas?” salvo que realmente no exista información más específica.',
      'En al menos tres de las preguntas, menciona o conecta explícitamente un hecho verificable del contexto: un compromiso, una cifra, una meta, una decisión, un bloqueo, una acción pendiente o un resultado reciente.',
      'Si faltan datos para una conclusión, dilo y formula una pregunta concreta para obtener ese dato; no rellenes el vacío con consejos genéricos.',
      'Prioriza la información más reciente. Si la revisión actual contradice una brecha histórica, trata la brecha antigua como algo por validar, no como un hecho vigente.',
      'Reconoce avances cuando existan. No inventes un problema nuevo para llenar una sección.',
      'No repitas la misma idea con palabras distintas entre resumen, riesgos, preguntas, soluciones y plan.',
      'Las recomendaciones deben conectar la evidencia actual con el objetivo declarado del cliente y terminar en una acción observable.',
      'Usa español natural, profesional y sencillo. Cuida tildes, concordancia, puntuación y signos de apertura en preguntas.',
      'Evita traducciones literales del inglés, anglicismos innecesarios, frases corporativas y lenguaje de ventas.',
      'Usa frases breves y directas. Una idea principal por oración.'
    ].join(' ');
  }
  return [
    'Context: this is an active client already receiving mentoring, consulting or a professional service.',
    'Make the brief materially client-specific by grounding questions and recommendations in named commitments, goals, metrics, decisions, blockers, program stage and recent evidence.',
    'Avoid universal coaching questions when specific evidence exists.',
    'At least three questions should explicitly connect to a concrete fact from this client context.',
    'If evidence is insufficient, state what is missing instead of inventing a generic conclusion.',
    'Prioritize the newest evidence, recognize progress, distinguish historical gaps from current problems, and use concise natural professional language.'
  ].join(' ');
}

function buildSessionOpening(
  client: SessionCopilotClient,
  gap: string,
  risks: string[],
  language: 'es' | 'en'
): string {
  const cleanGap = cleanGeneratedText(gap, language);
  const firstRisk = cleanGeneratedText(risks[0], language);
  const priorityCommitment = client.commitments?.find((item) => item.status === 'overdue')
    || client.commitments?.find((item) => item.status === 'pending');
  const commitment = cleanGeneratedText(priorityCommitment?.label, language);
  const goal = cleanGeneratedText(client.goal, language);

  if (language === 'es') {
    if (commitment && cleanGap) return `Quiero partir por “${commitment}” y entender qué ocurrió en la práctica. Después conectemos eso con esta brecha: ${cleanGap}`;
    if (cleanGap && goal) return `Quiero revisar dónde estamos respecto de “${cleanGap}” y cómo está afectando el objetivo de ${goal.toLowerCase()}.`;
    if (firstRisk && goal) return `Hoy quiero validar este riesgo: ${firstRisk} Veamos si realmente está frenando el objetivo de ${goal.toLowerCase()}.`;
    if (cleanGap) return `Quiero partir revisando dónde estamos respecto de este punto: ${cleanGap}`;
    return `Quiero partir por lo más reciente de ${client.name} y definir qué evidencia necesitamos para decidir el siguiente paso.`;
  }

  if (commitment && cleanGap) return `I want to start with “${commitment}” and understand what happened in practice, then connect it to this gap: ${cleanGap}`;
  if (cleanGap && goal) return `I want to review where we are on “${cleanGap}” and how it is affecting the goal of ${goal.toLowerCase()}.`;
  if (firstRisk && goal) return `Today I want to validate this risk: ${firstRisk} Let’s see whether it is actually blocking the goal of ${goal.toLowerCase()}.`;
  if (cleanGap) return `I want to start by reviewing where we are on this point: ${cleanGap}`;
  return `I want to start with ${client.name}'s most recent evidence and decide what we need to validate next.`;
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
  const blockers = (client.blockers ?? []).map((item) => cleanGeneratedText(item, language)).filter(Boolean);

  const currentProblem = diagnosedProblem
    ? [diagnosedProblem, diagnosedCause].filter(Boolean).join(' · ')
    : reviewPositive
      ? blockers.length
        ? (language === 'es'
            ? `La revisión reciente muestra avances. Solo falta validar si estos bloqueos históricos siguen activos: ${blockers.join(' · ')}`
            : `The latest review shows progress. Only validate whether these historical blockers are still active: ${blockers.join(' · ')}`)
        : ''
      : [client.currentGap, existing.gap, ...blockers].filter(Boolean).join(' · ');

  const currentSolution = [planStage?.body, client.planSummary, ...(existing.plan ?? [])].filter(Boolean).join(' · ');
  const commitmentContext = (client.commitments ?? []).map((item) => `${item.label} [${item.status}]`).join(' · ');
  const historicalContext = [existing.summary, existing.gap, client.currentGap]
    .map((item) => cleanGeneratedText(item, language))
    .filter(Boolean)
    .join(' · ');
  const recentEvidence = journal
    .slice(0, 8)
    .map((entry) => [entry.title, compactEvidence(entry.body, 300)].filter(Boolean).join(': '))
    .filter(Boolean)
    .join(' | ');

  const evidenceContext = [
    client.program && `${language === 'es' ? 'Programa' : 'Program'}: ${client.program}`,
    client.week && `${language === 'es' ? 'Momento del programa' : 'Program stage'}: ${client.week}`,
    client.currentPhase && `${language === 'es' ? 'Fase actual' : 'Current phase'}: ${client.currentPhase}`,
    client.goal && `${language === 'es' ? 'Objetivo declarado' : 'Declared goal'}: ${client.goal}`,
    client.nextAction && `${language === 'es' ? 'Próxima acción vigente' : 'Current next action'}: ${client.nextAction}`,
    client.planSummary && `${language === 'es' ? 'Plan vigente' : 'Current plan'}: ${client.planSummary}`,
    commitmentContext && `${language === 'es' ? 'Compromisos con estado' : 'Commitments with status'}: ${commitmentContext}`,
    blockers.length && `${language === 'es' ? 'Bloqueos registrados' : 'Recorded blockers'}: ${blockers.join(' · ')}`,
    review?.body && `${language === 'es' ? 'Revisión más reciente' : 'Latest review'}: ${review.body}`,
    diagnosis?.body && `${language === 'es' ? 'Diagnóstico más reciente' : 'Latest diagnosis'}: ${diagnosis.body}`
  ].filter(Boolean).join(' | ');

  const response = await fetch('/api/workspace/ai/session-brief', {
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
          ? `G-KAIS prepara una sesión de seguimiento para ${client.name}. El análisis debe apoyarse en evidencia concreta de esta persona y evitar respuestas intercambiables con otros clientes.`
          : `G-KAIS is preparing a follow-up session for ${client.name}. The analysis must be grounded in this person's concrete evidence and avoid interchangeable client responses.`,
        tone: sessionTone(language)
      },
      intakeContext: compactEvidence(evidenceContext, 2750),
      internalNotes: compactEvidence([
        historicalContext && `${language === 'es' ? 'Contexto histórico, no asumir vigente' : 'Historical context, do not assume current'}: ${historicalContext}`,
        recentEvidence && `${language === 'es' ? 'Evidencia reciente de bitácora' : 'Recent journal evidence'}: ${recentEvidence}`
      ].filter(Boolean).join(' | '), 2750),
      notes: journal.slice(0, 16).map((entry) => ({
        title: entry.title || (language === 'es' ? 'Bitácora del cliente' : 'Client journal'),
        body: entry.body || '',
        createdAt: entry.createdAt
      }))
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
  const plan = solutionPlan.length
    ? solutionPlan
    : brief.recommendedAction
      ? [cleanGeneratedText(String(brief.recommendedAction), language)].filter(Boolean)
      : cleanGeneratedList(existing.plan || [], language);
  const summary = cleanGeneratedText(typeof brief.summary === 'string' && brief.summary.trim() ? brief.summary : (existing.summary || ''), language);
  const freshSignal = risks[0] || summary;

  let gap = '';
  if (diagnosedProblem) {
    gap = cleanGeneratedText(diagnosedProblem, language);
  } else if (reviewPositive) {
    gap = blockers.length
      ? (language === 'es'
          ? `El avance es positivo; falta confirmar si ${blockers[0].toLowerCase()} sigue siendo un bloqueo.`
          : `Progress is positive; confirm whether ${blockers[0].toLowerCase()} is still a blocker.`)
      : (language === 'es'
          ? 'No hay una brecha crítica confirmada. El foco es consolidar los avances.'
          : 'No critical gap is confirmed. The focus is to consolidate progress.');
  } else {
    gap = cleanGeneratedText(client.currentGap || freshSignal || existing.gap || '', language);
  }

  const aiOpening = cleanGeneratedText(typeof brief.callPositioning === 'string' ? brief.callPositioning : '', language);
  const callOpening = aiOpening && !/agendar|te escribo|te envío|próxima llamada|next call|schedule/i.test(aiOpening)
    ? aiOpening
    : buildSessionOpening(client, gap, risks, language);

  return { summary, gap, known, risks, questions, howHelp, plan, callOpening };
}
