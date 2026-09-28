import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpenCheck,
  CheckCircle2,
  Circle,
  Clock3,
  Flag,
  MessageSquareText,
  Plus,
  Save,
  Sparkles,
  Target,
  UserRound
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

type SessionMemoryWorkspaceProps = {
  onBack: () => void;
};

type CommitmentStatus = 'pending' | 'done' | 'overdue';

type Commitment = {
  id: string;
  label: string;
  status: CommitmentStatus;
};

type CopilotBrief = {
  summary: string;
  gap: string;
  known: string[];
  risks: string[];
  questions: string[];
  howHelp: string[];
  plan: string[];
  callOpening: string;
};

type ClientProfile = {
  id: string;
  name: string;
  company: string;
  program: string;
  week: string;
  goal: string;
  nextAction: string;
  blockers: string[];
  commitments: Commitment[];
  copilot: CopilotBrief;
};

type JournalType = 'session' | 'note' | 'decision' | 'commitment' | 'blocker' | 'next-action';

type JournalEntry = {
  id: string;
  clientId: string;
  type: JournalType;
  title: string;
  body: string;
  createdAt: string;
};

type SessionRecord = {
  id: string;
  clientId: string;
  createdAt: string;
  notes: string;
  decisions: string;
  blockers: string;
  newCommitment: string;
  nextAction: string;
};

type ViewMode = 'prepare' | 'live' | 'journal';

const CLIENT_STORAGE_KEY = 'gkais-experts-session-clients-v2';
const JOURNAL_STORAGE_KEY = 'gkais-experts-client-journal-v1';
const SESSION_STORAGE_KEY = 'gkais-experts-session-memory-v2';

const INITIAL_CLIENTS: ClientProfile[] = [
  {
    id: 'sofia',
    name: 'Sofía Martínez',
    company: 'Sofía Martínez Consulting',
    program: 'Mentoría Escala',
    week: 'Semana 7 / 24',
    goal: 'Crear adquisición predecible y llegar a US$15k/mes.',
    nextAction: 'Revisar compromisos antes de la próxima sesión.',
    blockers: ['Ejecución inconsistente', 'Dificultad para proteger tiempo comercial'],
    commitments: [
      { id: 'sofia-c1', label: 'Publicar 3 piezas de contenido', status: 'overdue' },
      { id: 'sofia-c2', label: 'Contactar 25 prospectos', status: 'pending' },
      { id: 'sofia-c3', label: 'Revisión comercial cada viernes', status: 'done' }
    ],
    copilot: {
      summary: 'Sofía tiene el funnel activo, pero el progreso se frenó por una ejecución semanal insuficiente. El cuello de botella visible ya no parece ser la estructura del sistema, sino la consistencia.',
      gap: 'Quiere una adquisición predecible, pero todavía no existe suficiente volumen de ejecución para evaluar el funnel con una muestra fiable.',
      known: [
        'El funnel ya está activo.',
        'Dos compromisos de ejecución no llegaron al nivel acordado.',
        'No existe una actualización de progreso reciente.'
      ],
      risks: [
        'No sabemos todavía si la baja ejecución viene de tiempo, claridad o resistencia a la estrategia.',
        'Cambiar el funnel ahora podría ocultar el problema real en lugar de resolverlo.'
      ],
      questions: [
        '¿Qué ocurrió concretamente cuando intentaste ejecutar lo que acordamos?',
        '¿Qué parte fue difícil: encontrar tiempo, saber qué hacer o mantener la disciplina?',
        '¿Qué resultados reales generó el funnel con el volumen que sí alcanzaste?',
        '¿Qué tendría que cambiar esta semana para cumplir el volumen acordado?'
      ],
      howHelp: [
        'Separar si el problema es estrategia o ejecución antes de cambiar el plan.',
        'Convertir la próxima semana en compromisos medibles y visibles.',
        'Usar la bitácora para detectar si el mismo bloqueador se repite.'
      ],
      plan: [
        'Diagnosticar por qué no se ejecutó lo acordado.',
        'Revisar los datos reales del funnel con el volumen disponible.',
        'Cerrar con un compromiso semanal concreto y una próxima acción.'
      ],
      callOpening: 'Quiero partir revisando qué pasó desde la última sesión, porque el funnel ya está funcionando pero la ejecución quedó por debajo de lo que habíamos acordado. Antes de tocar la estrategia, me interesa entender qué te frenó y qué resultados reales alcanzamos con lo que sí se hizo.'
    }
  },
  {
    id: 'andres',
    name: 'Andrés Silva',
    company: 'Silva Growth',
    program: 'Mentoría Escala',
    week: 'Semana 11 / 24',
    goal: 'Aumentar la tasa de cierre y estabilizar ingresos mensuales.',
    nextAction: 'Revisar llamadas recientes y estandarizar follow-up.',
    blockers: ['Seguimiento irregular', 'Propuestas poco estandarizadas'],
    commitments: [
      { id: 'andres-c1', label: 'Revisar 5 llamadas grabadas', status: 'done' },
      { id: 'andres-c2', label: 'Enviar follow-up dentro de 24h', status: 'pending' }
    ],
    copilot: {
      summary: 'Andrés mantiene un buen volumen de oportunidades. La mejora principal ahora está en convertir mejor las reuniones existentes, especialmente mediante seguimiento y consistencia comercial.',
      gap: 'La generación de reuniones funciona, pero la conversión depende demasiado de cómo se gestiona cada oportunidad después de la llamada.',
      known: ['Existe volumen suficiente de reuniones.', 'El seguimiento no está completamente estandarizado.', 'Se están revisando llamadas para detectar patrones.'],
      risks: ['Puede estar intentando escalar adquisición antes de estabilizar conversión.', 'No está claro qué objeciones concentran la mayor pérdida de oportunidades.'],
      questions: ['¿En qué momento sientes que más oportunidades se enfrían?', '¿Qué objeciones se repitieron en las llamadas revisadas?', '¿Qué sucede hoy durante las primeras 24 horas después de una llamada?'],
      howHelp: ['Detectar patrones en las oportunidades perdidas.', 'Convertir decisiones de sesión en un proceso de seguimiento repetible.', 'Mantener visibles los compromisos comerciales entre sesiones.'],
      plan: ['Revisar evidencia de las últimas llamadas.', 'Definir un follow-up estándar.', 'Medir el cambio antes de aumentar el volumen.'],
      callOpening: 'Hoy me gustaría concentrarnos menos en conseguir más reuniones y más en qué está pasando con las que ya tenemos. Revisemos las llamadas y el seguimiento para encontrar exactamente dónde se están perdiendo oportunidades.'
    }
  },
  {
    id: 'diego',
    name: 'Diego Rojas',
    company: 'Rojas Advisory',
    program: 'Mentoría Escala',
    week: 'Semana 22 / 24',
    goal: 'Delegar operación y mantener crecimiento sin aumentar carga personal.',
    nextAction: 'Preparar conversación de renovación basada en la siguiente brecha real.',
    blockers: ['Decisiones centralizadas', 'Documentación incompleta'],
    commitments: [
      { id: 'diego-c1', label: 'Documentar SOP de onboarding', status: 'pending' },
      { id: 'diego-c2', label: 'Preparar métricas de cierre del programa', status: 'done' }
    ],
    copilot: {
      summary: 'Diego está cerca del cierre del programa. El foco de la sesión debe conectar resultados logrados, brechas que siguen abiertas y el valor concreto de una posible segunda etapa.',
      gap: 'La operación está más delegada, pero todavía existen decisiones críticas y documentación que dependen del fundador.',
      known: ['El programa está cerca de finalizar.', 'La delegación mejoró.', 'Aún quedan procesos y decisiones concentradas en Diego.'],
      risks: ['Una renovación sin una nueva brecha clara puede sentirse como continuidad sin propósito.', 'Falta cuantificar parte del progreso obtenido durante el programa.'],
      questions: ['¿Qué cambió realmente en tu carga operativa desde que empezamos?', '¿Qué sigue dependiendo de ti y no debería?', '¿Cuál sería el siguiente problema que vale la pena resolver después de este programa?'],
      howHelp: ['Convertir el cierre del programa en una revisión de resultados verificables.', 'Identificar el próximo cuello de botella antes de hablar de renovación.', 'Mantener continuidad entre resultado logrado y siguiente plan.'],
      plan: ['Cuantificar resultados del ciclo actual.', 'Identificar la siguiente brecha real.', 'Definir si existe una segunda etapa con objetivo concreto.'],
      callOpening: 'Como estamos entrando en la parte final del programa, quiero que hoy hagamos una revisión muy concreta de qué cambió, qué sigue dependiendo de ti y qué problema queda realmente por resolver. A partir de eso podemos decidir si tiene sentido una siguiente etapa.'
    }
  }
];

const INITIAL_JOURNAL: JournalEntry[] = [
  {
    id: 'journal-sofia-1',
    clientId: 'sofia',
    type: 'session',
    title: 'Sesión de seguimiento',
    body: 'Se revisó el funnel y se decidió mantener la estrategia una semana más antes de realizar cambios.',
    createdAt: '2026-09-19T15:30:00.000Z'
  },
  {
    id: 'journal-sofia-2',
    clientId: 'sofia',
    type: 'commitment',
    title: 'Compromiso vencido',
    body: 'Publicar 3 piezas de contenido no fue completado dentro del periodo acordado.',
    createdAt: '2026-09-26T12:00:00.000Z'
  }
];

function loadArray<T>(key: string, fallback: T[]): T[] {
  if (typeof window === 'undefined') return fallback;
  try {
    const saved = window.localStorage.getItem(key);
    if (!saved) return fallback;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed as T[] : fallback;
  } catch {
    return fallback;
  }
}

function journalLabel(type: JournalType, language: 'es' | 'en'): string {
  const labels: Record<JournalType, { es: string; en: string }> = {
    session: { es: 'Sesión', en: 'Session' },
    note: { es: 'Nota', en: 'Note' },
    decision: { es: 'Decisión', en: 'Decision' },
    commitment: { es: 'Compromiso', en: 'Commitment' },
    blocker: { es: 'Bloqueador', en: 'Blocker' },
    'next-action': { es: 'Próxima acción', en: 'Next action' }
  };
  return labels[type][language];
}

function commitmentStatusLabel(status: CommitmentStatus, language: 'es' | 'en'): string {
  if (status === 'done') return language === 'es' ? 'Realizado' : 'Done';
  if (status === 'overdue') return language === 'es' ? 'Vencido' : 'Overdue';
  return language === 'es' ? 'Pendiente' : 'Pending';
}

export function SessionMemoryWorkspace({ onBack }: SessionMemoryWorkspaceProps) {
  const { language } = useLanguage();
  const [clients, setClients] = useState<ClientProfile[]>(() => loadArray(CLIENT_STORAGE_KEY, INITIAL_CLIENTS));
  const [journal, setJournal] = useState<JournalEntry[]>(() => loadArray(JOURNAL_STORAGE_KEY, INITIAL_JOURNAL));
  const [sessions, setSessions] = useState<SessionRecord[]>(() => loadArray(SESSION_STORAGE_KEY, []));
  const [clientId, setClientId] = useState('sofia');
  const [mode, setMode] = useState<ViewMode>('prepare');
  const [notes, setNotes] = useState('');
  const [decisions, setDecisions] = useState('');
  const [blockers, setBlockers] = useState('');
  const [newCommitment, setNewCommitment] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try { window.localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(clients)); } catch {}
  }, [clients]);

  useEffect(() => {
    try { window.localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(journal)); } catch {}
  }, [journal]);

  useEffect(() => {
    try { window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions)); } catch {}
  }, [sessions]);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === clientId) ?? clients[0],
    [clients, clientId]
  );

  const selectedJournal = useMemo(
    () => journal
      .filter((entry) => entry.clientId === clientId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [journal, clientId]
  );

  const addJournal = (type: JournalType, title: string, body: string) => {
    if (!body.trim()) return;
    setJournal((current) => [{
      id: `journal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      clientId,
      type,
      title,
      body: body.trim(),
      createdAt: new Date().toISOString()
    }, ...current]);
  };

  const cycleCommitment = (commitmentId: string) => {
    const currentCommitment = selectedClient.commitments.find((item) => item.id === commitmentId);
    if (!currentCommitment) return;
    const nextStatus: CommitmentStatus = currentCommitment.status === 'pending'
      ? 'done'
      : currentCommitment.status === 'done'
        ? 'pending'
        : 'done';

    setClients((current) => current.map((client) => client.id === clientId
      ? {
        ...client,
        commitments: client.commitments.map((item) => item.id === commitmentId ? { ...item, status: nextStatus } : item)
      }
      : client));

    addJournal(
      'commitment',
      language === 'es' ? 'Estado de compromiso actualizado' : 'Commitment status updated',
      `${currentCommitment.label} → ${commitmentStatusLabel(nextStatus, language)}`
    );
  };

  const finishSession = () => {
    const now = new Date().toISOString();
    const record: SessionRecord = {
      id: `session-${Date.now()}`,
      clientId,
      createdAt: now,
      notes,
      decisions,
      blockers,
      newCommitment,
      nextAction
    };

    setSessions((current) => [record, ...current]);
    addJournal(
      'session',
      language === 'es' ? 'Sesión completada' : 'Session completed',
      notes || decisions || (language === 'es' ? 'Sesión registrada en G-KAIS.' : 'Session recorded in G-KAIS.')
    );
    if (decisions.trim()) addJournal('decision', language === 'es' ? 'Decisión de sesión' : 'Session decision', decisions);
    if (blockers.trim()) addJournal('blocker', language === 'es' ? 'Bloqueador detectado' : 'Blocker detected', blockers);
    if (newCommitment.trim()) {
      const commitment: Commitment = {
        id: `commitment-${Date.now()}`,
        label: newCommitment.trim(),
        status: 'pending'
      };
      setClients((current) => current.map((client) => client.id === clientId
        ? { ...client, commitments: [...client.commitments, commitment] }
        : client));
      addJournal('commitment', language === 'es' ? 'Nuevo compromiso' : 'New commitment', newCommitment);
    }
    if (nextAction.trim()) {
      setClients((current) => current.map((client) => client.id === clientId
        ? { ...client, nextAction: nextAction.trim() }
        : client));
      addJournal('next-action', language === 'es' ? 'Próxima acción actualizada' : 'Next action updated', nextAction);
    }

    setSaved(true);
    setNotes('');
    setDecisions('');
    setBlockers('');
    setNewCommitment('');
    setNextAction('');
    setMode('journal');
    window.setTimeout(() => setSaved(false), 1800);
  };

  const brief = selectedClient.copilot;

  return (
    <div className="min-h-screen bg-[#F4F4F1] text-[#0A0A0A]">
      <header className="sticky top-0 z-20 border-b border-black/8 bg-[#F4F4F1]/95 px-4 py-3 backdrop-blur md:px-8 lg:px-10">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="grid h-9 w-9 place-items-center rounded-full border border-black/10 bg-white text-black/60 transition hover:text-black" aria-label={language === 'es' ? 'Volver al Workspace' : 'Back to Workspace'}>
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0A3F4D]">G-KAIS FOR EXPERTS</p>
              <h1 className="text-sm font-semibold">{language === 'es' ? 'Modo sesión' : 'Session mode'}</h1>
            </div>
          </div>
          <span className="rounded-full border border-[#0A3F4D]/15 bg-[#0A3F4D]/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#0A3F4D]">
            {language === 'es' ? 'Outcome Memory activo' : 'Outcome Memory active'}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-4 py-8 md:px-8 lg:px-10 lg:py-10">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0A3F4D]">{language === 'es' ? 'SESIÓN DE CLIENTE' : 'CLIENT SESSION'}</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.035em] md:text-4xl">{selectedClient.name}</h2>
            <p className="mt-2 text-sm text-black/50">{selectedClient.company} · {selectedClient.program} · {selectedClient.week}</p>
          </div>
          <label className="min-w-[250px]">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40">{language === 'es' ? 'CLIENTE' : 'CLIENT'}</span>
            <select
              value={clientId}
              onChange={(event) => { setClientId(event.target.value); setMode('prepare'); }}
              className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#0A3F4D]/45"
            >
              {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-6 inline-flex rounded-full border border-black/10 bg-white p-1 shadow-sm">
          {([
            ['prepare', language === 'es' ? 'Preparación' : 'Preparation'],
            ['live', language === 'es' ? 'Modo sesión' : 'Live session'],
            ['journal', language === 'es' ? 'Bitácora' : 'Journal']
          ] as Array<[ViewMode, string]>).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${mode === value ? 'bg-[#111413] text-white' : 'text-black/45 hover:text-black'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === 'prepare' && (
          <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6">
              <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_12px_35px_rgba(10,10,10,0.04)] md:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">G-KAIS COPILOT</p>
                    <h3 className="mt-2 text-xl font-semibold">{language === 'es' ? 'Situación y brecha' : 'Situation and gap'}</h3>
                  </div>
                  <Sparkles className="h-5 w-5 text-[#0A3F4D]" />
                </div>
                <p className="mt-4 text-sm leading-6 text-black/65">{brief.summary}</p>
                <div className="mt-4 rounded-xl bg-[#F7F7F5] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35">{language === 'es' ? 'BRECHA PRINCIPAL' : 'PRIMARY GAP'}</p>
                  <p className="mt-2 text-sm leading-6 text-black/65">{brief.gap}</p>
                </div>
              </section>

              <div className="grid gap-6 md:grid-cols-2">
                <section className="rounded-2xl border border-black/10 bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'QUÉ SABEMOS' : 'WHAT WE KNOW'}</p>
                  <div className="mt-4 space-y-3">
                    {brief.known.map((item) => <div key={item} className="flex gap-3 text-sm leading-6 text-black/62"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#0A3F4D]" /><span>{item}</span></div>)}
                  </div>
                </section>
                <section className="rounded-2xl border border-black/10 bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#A46F16]">{language === 'es' ? 'PROBLEMAS / INCÓGNITAS' : 'PROBLEMS / UNKNOWNS'}</p>
                  <div className="mt-4 space-y-3">
                    {brief.risks.map((item) => <div key={item} className="flex gap-3 text-sm leading-6 text-black/62"><AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-[#A46F16]" /><span>{item}</span></div>)}
                  </div>
                </section>
              </div>

              <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">{language === 'es' ? 'PREGUNTAS PARA LA LLAMADA' : 'QUESTIONS FOR THE CALL'}</p>
                    <h3 className="mt-2 text-lg font-semibold">{language === 'es' ? 'Descubrir antes de recomendar' : 'Discover before recommending'}</h3>
                  </div>
                  <MessageSquareText className="h-5 w-5 text-[#0A3F4D]" />
                </div>
                <div className="mt-4 space-y-3">
                  {brief.questions.map((question, index) => (
                    <div key={question} className="flex gap-3 rounded-xl bg-[#F7F7F5] p-3.5">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-xs font-semibold text-black/45">{index + 1}</span>
                      <p className="text-sm leading-6 text-black/65">{question}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section className="rounded-2xl bg-[#0A3F4D] p-5 text-white shadow-[0_18px_45px_rgba(10,63,77,0.16)] md:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">{language === 'es' ? 'CÓMO ABRIR LA CONVERSACIÓN' : 'CALL OPENING'}</p>
                    <h3 className="mt-2 text-xl font-semibold">{language === 'es' ? 'Posicionamiento sugerido' : 'Suggested positioning'}</h3>
                  </div>
                  <Sparkles className="h-5 w-5 text-white/80" />
                </div>
                <p className="mt-4 text-sm leading-7 text-white/82">“{brief.callOpening}”</p>
              </section>

              <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'CÓMO PODEMOS AYUDAR' : 'HOW WE CAN HELP'}</p>
                    <h3 className="mt-2 text-lg font-semibold">{language === 'es' ? 'Soluciones relevantes' : 'Relevant solutions'}</h3>
                  </div>
                  <Target className="h-5 w-5 text-[#0A3F4D]" />
                </div>
                <div className="mt-4 space-y-3">
                  {brief.howHelp.map((item) => <div key={item} className="rounded-xl border border-black/7 p-3.5 text-sm leading-6 text-black/65">{item}</div>)}
                </div>
              </section>

              <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">{language === 'es' ? 'PLAN SUGERIDO' : 'SUGGESTED PLAN'}</p>
                    <h3 className="mt-2 text-lg font-semibold">{language === 'es' ? 'Cómo conducir la sesión' : 'How to run the session'}</h3>
                  </div>
                  <Flag className="h-5 w-5 text-[#0A3F4D]" />
                </div>
                <div className="mt-4 space-y-3">
                  {brief.plan.map((item, index) => (
                    <div key={item} className="flex items-center gap-3 rounded-xl bg-[#F7F7F5] p-3.5">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-xs font-semibold text-black/45">{index + 1}</span>
                      <p className="text-sm font-medium">{item}</p>
                    </div>
                  ))}
                </div>
              </section>

              <button type="button" onClick={() => setMode('live')} className="w-full rounded-xl bg-[#111413] px-5 py-3 text-sm font-semibold text-white transition hover:bg-black">
                {language === 'es' ? 'Iniciar modo sesión' : 'Start live session'}
              </button>
            </div>
          </div>
        )}

        {mode === 'live' && (
          <div className="mt-6 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
            <div className="space-y-6">
              <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'CONTEXTO RÁPIDO' : 'QUICK CONTEXT'}</p>
                <h3 className="mt-2 text-lg font-semibold">{selectedClient.goal}</h3>
                <div className="mt-4 rounded-xl bg-[#F7F7F5] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35">{language === 'es' ? 'PRÓXIMA ACCIÓN ACTUAL' : 'CURRENT NEXT ACTION'}</p>
                  <p className="mt-2 text-sm leading-6 text-black/65">{selectedClient.nextAction}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedClient.blockers.map((blocker) => <span key={blocker} className="rounded-full bg-[#A46F16]/8 px-3 py-2 text-xs font-medium text-[#82570F]">{blocker}</span>)}
                </div>
              </section>

              <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">{language === 'es' ? 'COMPROMISOS' : 'COMMITMENTS'}</p>
                    <h3 className="mt-2 text-lg font-semibold">{language === 'es' ? 'Actualizar durante la llamada' : 'Update during the call'}</h3>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-[#0A3F4D]" />
                </div>
                <div className="mt-4 space-y-2">
                  {selectedClient.commitments.map((commitment) => (
                    <button
                      key={commitment.id}
                      type="button"
                      onClick={() => cycleCommitment(commitment.id)}
                      className="flex w-full items-center gap-3 rounded-xl border border-black/7 p-3.5 text-left transition hover:border-[#0A3F4D]/25"
                    >
                      {commitment.status === 'done'
                        ? <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-[#0A3F4D]" />
                        : commitment.status === 'overdue'
                          ? <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-[#A23A32]" />
                          : <Circle className="h-4.5 w-4.5 shrink-0 text-black/25" />}
                      <span className="flex-1 text-sm text-black/65">{commitment.label}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-black/30">{commitmentStatusLabel(commitment.status, language)}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-[10px] text-black/35">{language === 'es' ? 'Cada cambio queda registrado automáticamente en la bitácora.' : 'Every change is automatically recorded in the journal.'}</p>
              </section>
            </div>

            <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_12px_35px_rgba(10,10,10,0.04)] md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'EN LLAMADA' : 'LIVE SESSION'}</p>
                  <h3 className="mt-2 text-xl font-semibold">{language === 'es' ? 'Registrar solo lo que cambia' : 'Capture only what changes'}</h3>
                </div>
                <Clock3 className="h-5 w-5 text-[#0A3F4D]" />
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="md:col-span-2">
                  <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40">{language === 'es' ? 'NOTAS DE SESIÓN' : 'SESSION NOTES'}</span>
                  <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={5} className="w-full resize-y rounded-xl border border-black/10 bg-[#FAFAF8] px-3.5 py-3 text-sm leading-6 outline-none focus:border-[#0A3F4D]/45" placeholder={language === 'es' ? 'Qué ocurrió, resultados revisados, contexto nuevo...' : 'What happened, results reviewed, new context...'} />
                </label>
                <label>
                  <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40">{language === 'es' ? 'DECISIONES' : 'DECISIONS'}</span>
                  <textarea value={decisions} onChange={(event) => setDecisions(event.target.value)} rows={4} className="w-full resize-y rounded-xl border border-black/10 px-3.5 py-3 text-sm leading-6 outline-none focus:border-[#0A3F4D]/45" />
                </label>
                <label>
                  <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40">{language === 'es' ? 'NUEVOS BLOQUEADORES' : 'NEW BLOCKERS'}</span>
                  <textarea value={blockers} onChange={(event) => setBlockers(event.target.value)} rows={4} className="w-full resize-y rounded-xl border border-black/10 px-3.5 py-3 text-sm leading-6 outline-none focus:border-[#0A3F4D]/45" />
                </label>
                <label>
                  <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40">{language === 'es' ? 'NUEVO COMPROMISO' : 'NEW COMMITMENT'}</span>
                  <textarea value={newCommitment} onChange={(event) => setNewCommitment(event.target.value)} rows={3} className="w-full resize-y rounded-xl border border-black/10 px-3.5 py-3 text-sm leading-6 outline-none focus:border-[#0A3F4D]/45" />
                </label>
                <label>
                  <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40">{language === 'es' ? 'PRÓXIMA ACCIÓN' : 'NEXT ACTION'}</span>
                  <textarea value={nextAction} onChange={(event) => setNextAction(event.target.value)} rows={3} className="w-full resize-y rounded-xl border border-black/10 px-3.5 py-3 text-sm leading-6 outline-none focus:border-[#0A3F4D]/45" />
                </label>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-black/7 pt-5">
                <p className="text-xs text-black/40">{language === 'es' ? 'Al finalizar se actualizan Session Memory y Bitácora.' : 'Finishing updates Session Memory and the Journal.'}</p>
                <button type="button" onClick={finishSession} className="inline-flex items-center gap-2 rounded-full bg-[#111413] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-black">
                  {saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                  {saved ? (language === 'es' ? 'Sesión guardada' : 'Session saved') : (language === 'es' ? 'Finalizar sesión' : 'Finish session')}
                </button>
              </div>
            </section>
          </div>
        )}

        {mode === 'journal' && (
          <div className="mt-6 grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
            <section className="rounded-2xl border border-black/10 bg-[#111413] p-5 text-white md:p-6">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[0.08]"><UserRound className="h-5 w-5 text-white/75" /></div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/40">OUTCOME MEMORY</p>
                  <h3 className="mt-2 text-lg font-semibold">{language === 'es' ? 'La relación completa en el tiempo' : 'The complete relationship over time'}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/65">{language === 'es' ? 'Sesiones, notas, decisiones, compromisos, bloqueadores y próximas acciones forman una sola memoria cronológica.' : 'Sessions, notes, decisions, commitments, blockers and next actions form one chronological memory.'}</p>
                </div>
              </div>
              <div className="mt-5 rounded-xl bg-white/[0.06] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">{language === 'es' ? 'REGISTROS' : 'ENTRIES'}</p>
                <p className="mt-2 text-3xl font-semibold">{selectedJournal.length}</p>
              </div>
            </section>

            <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'BITÁCORA DEL CLIENTE' : 'CLIENT JOURNAL'}</p>
                  <h3 className="mt-2 text-xl font-semibold">{selectedClient.name}</h3>
                </div>
                <BookOpenCheck className="h-5 w-5 text-[#0A3F4D]" />
              </div>

              <div className="mt-5 space-y-0">
                {selectedJournal.length === 0 && (
                  <div className="rounded-xl bg-[#F7F7F5] p-5 text-sm text-black/45">{language === 'es' ? 'Aún no existen eventos para este cliente.' : 'There are no events for this client yet.'}</div>
                )}
                {selectedJournal.map((entry, index) => (
                  <div key={entry.id} className="relative flex gap-4 pb-6 last:pb-0">
                    {index < selectedJournal.length - 1 && <div className="absolute left-[7px] top-5 h-[calc(100%-10px)] w-px bg-black/8" />}
                    <div className={`mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-white ring-1 ${entry.type === 'blocker' ? 'bg-[#A46F16] ring-[#A46F16]/30' : entry.type === 'commitment' ? 'bg-[#2C766B] ring-[#2C766B]/30' : entry.type === 'decision' ? 'bg-[#4556A6] ring-[#4556A6]/30' : 'bg-[#111413] ring-black/20'}`} />
                    <div className="min-w-0 flex-1 rounded-xl border border-black/7 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-black/[0.04] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-black/45">{journalLabel(entry.type, language)}</span>
                          <p className="text-sm font-semibold">{entry.title}</p>
                        </div>
                        <span className="text-[10px] text-black/35">{new Date(entry.createdAt).toLocaleString(language === 'es' ? 'es-CL' : 'en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-black/60">{entry.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
