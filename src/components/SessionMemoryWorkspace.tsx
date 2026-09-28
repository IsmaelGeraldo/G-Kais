import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  Flag,
  ListTodo,
  Mail,
  MessageSquareText,
  Phone,
  Save,
  Sparkles,
  Target
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import {
  addWorkTask,
  appendJournal,
  loadSessionClients,
  saveSessionClients,
  type WorkActionType
} from './experts/workspaceState';

type SessionMemoryWorkspaceProps = { onBack: () => void };
type CommitmentStatus = 'pending' | 'done' | 'overdue';

type Commitment = { id: string; label: string; status: CommitmentStatus };
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
  nextSession?: string;
  blockers: string[];
  commitments: Commitment[];
  copilot: CopilotBrief;
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
  actionType: WorkActionType;
  dueDate: string;
  dueTime: string;
  assignee: string;
};

const SESSION_STORAGE_KEY = 'gkais-experts-session-memory-v2';

const INITIAL_CLIENTS: ClientProfile[] = [
  {
    id: 'sofia', name: 'Sofía Martínez', company: 'Sofía Martínez Consulting', program: 'Mentoría Escala', week: 'Semana 7 / 24', goal: 'Crear adquisición predecible y llegar a US$15k/mes.', nextAction: 'Revisar compromisos antes de la próxima sesión.', nextSession: 'Martes · 15:30', blockers: ['Ejecución inconsistente', 'Dificultad para proteger tiempo comercial'],
    commitments: [{ id: 'sofia-c1', label: 'Publicar 3 piezas de contenido', status: 'overdue' }, { id: 'sofia-c2', label: 'Contactar 25 prospectos', status: 'pending' }, { id: 'sofia-c3', label: 'Revisión comercial cada viernes', status: 'done' }],
    copilot: {
      summary: 'Sofía tiene el funnel activo, pero el progreso se frenó por una ejecución semanal insuficiente. El cuello de botella visible parece estar en la consistencia.',
      gap: 'Quiere adquisición predecible, pero todavía no existe suficiente volumen de ejecución para evaluar el funnel con una muestra fiable.',
      known: ['El funnel ya está activo.', 'Dos compromisos quedaron por debajo de lo acordado.', 'No existe una actualización de progreso reciente.'],
      risks: ['No sabemos si la baja ejecución viene de tiempo, claridad o resistencia a la estrategia.', 'Cambiar el funnel ahora podría ocultar el problema real.'],
      questions: ['¿Qué ocurrió concretamente cuando intentaste ejecutar lo acordado?', '¿Qué parte fue difícil: tiempo, claridad o disciplina?', '¿Qué resultados reales generó el funnel con el volumen alcanzado?', '¿Qué tendría que cambiar esta semana para cumplir el volumen acordado?'],
      howHelp: ['Separar si el problema es estrategia o ejecución.', 'Convertir la próxima semana en compromisos medibles.', 'Detectar bloqueadores repetidos en la memoria del cliente.'],
      plan: ['Diagnosticar por qué no se ejecutó.', 'Revisar evidencia del funnel.', 'Cerrar con un compromiso y siguiente acción concreta.'],
      callOpening: 'Quiero partir revisando qué pasó desde la última sesión y entender qué te frenó antes de tocar la estrategia.'
    }
  },
  {
    id: 'andres', name: 'Andrés Silva', company: 'Silva Growth', program: 'Mentoría Escala', week: 'Semana 11 / 24', goal: 'Aumentar la tasa de cierre y estabilizar ingresos mensuales.', nextAction: 'Revisar llamadas recientes y estandarizar follow-up.', nextSession: 'Hoy · 10:00', blockers: ['Seguimiento irregular', 'Propuestas poco estandarizadas'],
    commitments: [{ id: 'andres-c1', label: 'Revisar 5 llamadas grabadas', status: 'done' }, { id: 'andres-c2', label: 'Enviar follow-up dentro de 24h', status: 'pending' }],
    copilot: {
      summary: 'Andrés mantiene un buen volumen de oportunidades; la mejora principal está en seguimiento y conversión.',
      gap: 'La generación de reuniones funciona, pero la conversión depende demasiado de cómo se gestiona cada oportunidad después de la llamada.',
      known: ['Existe volumen suficiente de reuniones.', 'El seguimiento no está estandarizado.'],
      risks: ['Puede estar intentando escalar adquisición antes de estabilizar conversión.', 'No está claro qué objeciones concentran la mayor pérdida.'],
      questions: ['¿En qué momento se enfrían más oportunidades?', '¿Qué objeciones se repitieron?', '¿Qué sucede durante las primeras 24 horas después de una llamada?'],
      howHelp: ['Detectar patrones en oportunidades perdidas.', 'Convertir decisiones en seguimiento repetible.'],
      plan: ['Revisar evidencia de llamadas.', 'Definir follow-up estándar.', 'Medir antes de aumentar volumen.'],
      callOpening: 'Hoy quiero concentrarnos menos en conseguir más reuniones y más en qué está pasando con las que ya tenemos.'
    }
  },
  {
    id: 'diego', name: 'Diego Rojas', company: 'Rojas Advisory', program: 'Mentoría Escala', week: 'Semana 22 / 24', goal: 'Delegar operación y mantener crecimiento sin aumentar carga personal.', nextAction: 'Preparar conversación de renovación basada en la siguiente brecha real.', nextSession: 'Jueves · 12:00', blockers: ['Decisiones centralizadas', 'Documentación incompleta'],
    commitments: [{ id: 'diego-c1', label: 'Documentar SOP de onboarding', status: 'pending' }, { id: 'diego-c2', label: 'Preparar métricas de cierre del programa', status: 'done' }],
    copilot: {
      summary: 'Diego está cerca del cierre del programa; la sesión debe conectar resultados logrados, brechas abiertas y una posible segunda etapa.',
      gap: 'La operación está más delegada, pero aún existen decisiones críticas y documentación que dependen del fundador.',
      known: ['El programa está cerca de finalizar.', 'La delegación mejoró.', 'Quedan procesos concentrados en Diego.'],
      risks: ['Una renovación sin una nueva brecha clara puede sentirse como continuidad sin propósito.', 'Falta cuantificar parte del progreso.'],
      questions: ['¿Qué cambió realmente en tu carga operativa?', '¿Qué sigue dependiendo de ti?', '¿Cuál es el siguiente problema que vale la pena resolver?'],
      howHelp: ['Convertir el cierre en una revisión de resultados.', 'Identificar el próximo cuello de botella.'],
      plan: ['Cuantificar resultados.', 'Identificar la siguiente brecha.', 'Definir si existe una segunda etapa concreta.'],
      callOpening: 'Quiero que hoy hagamos una revisión muy concreta de qué cambió, qué sigue dependiendo de ti y qué problema queda realmente por resolver.'
    }
  }
];

function loadClients(): ClientProfile[] {
  const stored = loadSessionClients();
  return stored.length ? stored as ClientProfile[] : INITIAL_CLIENTS;
}

function loadSessions(): SessionRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed as SessionRecord[] : [];
  } catch {
    return [];
  }
}

function initialClientId(): string {
  if (typeof window === 'undefined') return 'sofia';
  return new URLSearchParams(window.location.search).get('client') || 'sofia';
}

function commitmentStatusLabel(status: CommitmentStatus, language: 'es' | 'en'): string {
  if (status === 'done') return language === 'es' ? 'Realizado' : 'Done';
  if (status === 'overdue') return language === 'es' ? 'Vencido' : 'Overdue';
  return language === 'es' ? 'Pendiente' : 'Pending';
}

function actionName(type: WorkActionType, language: 'es' | 'en'): string {
  if (type === 'email') return language === 'es' ? 'Enviar email' : 'Send email';
  if (type === 'call') return language === 'es' ? 'Llamar' : 'Call';
  if (type === 'meeting') return language === 'es' ? 'Agendar reunión' : 'Schedule meeting';
  return language === 'es' ? 'Crear tarea' : 'Create task';
}

function ActionIcon({ type }: { type: WorkActionType }) {
  if (type === 'email') return <Mail className="h-4 w-4" />;
  if (type === 'call') return <Phone className="h-4 w-4" />;
  if (type === 'meeting') return <CalendarDays className="h-4 w-4" />;
  return <ListTodo className="h-4 w-4" />;
}

export function SessionMemoryWorkspace({ onBack }: SessionMemoryWorkspaceProps) {
  const { language } = useLanguage();
  const [clients, setClients] = useState<ClientProfile[]>(loadClients);
  const [sessions, setSessions] = useState<SessionRecord[]>(loadSessions);
  const [clientId, setClientId] = useState(initialClientId);
  const [notes, setNotes] = useState('');
  const [decisions, setDecisions] = useState('');
  const [blockers, setBlockers] = useState('');
  const [newCommitment, setNewCommitment] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [actionType, setActionType] = useState<WorkActionType>('task');
  const [dueDate, setDueDate] = useState('2026-09-29');
  const [dueTime, setDueTime] = useState('10:00');
  const [assignee, setAssignee] = useState('Mentor');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    saveSessionClients(clients);
  }, [clients]);

  useEffect(() => {
    try { window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions)); } catch {}
  }, [sessions]);

  const selectedClient = useMemo(() => clients.find((client) => client.id === clientId) ?? clients[0], [clients, clientId]);
  const brief = selectedClient.copilot;

  const cycleCommitment = (commitmentId: string) => {
    const currentCommitment = selectedClient.commitments.find((item) => item.id === commitmentId);
    if (!currentCommitment) return;
    const nextStatus: CommitmentStatus = currentCommitment.status === 'done' ? 'pending' : 'done';
    setClients((current) => current.map((client) => client.id === clientId ? { ...client, commitments: client.commitments.map((item) => item.id === commitmentId ? { ...item, status: nextStatus } : item) } : client));
    appendJournal(clientId, 'commitment', language === 'es' ? 'Estado de compromiso actualizado' : 'Commitment status updated', `${currentCommitment.label} → ${commitmentStatusLabel(nextStatus, language)}`);
  };

  const finishSession = () => {
    const now = new Date().toISOString();
    const nextActionLabel = nextAction.trim() ? `${actionName(actionType, language)} · ${nextAction.trim()}` : '';
    const record: SessionRecord = { id: `session-${Date.now()}`, clientId, createdAt: now, notes, decisions, blockers, newCommitment, nextAction: nextActionLabel, actionType, dueDate, dueTime, assignee };
    setSessions((current) => [record, ...current]);

    appendJournal(clientId, 'session', language === 'es' ? 'Sesión completada' : 'Session completed', notes || decisions || (language === 'es' ? 'Sesión registrada en G-KAIS.' : 'Session recorded in G-KAIS.'));
    if (decisions.trim()) appendJournal(clientId, 'decision', language === 'es' ? 'Decisión de sesión' : 'Session decision', decisions);
    if (blockers.trim()) appendJournal(clientId, 'blocker', language === 'es' ? 'Bloqueador detectado' : 'Blocker detected', blockers);

    const newCommitmentItem: Commitment | null = newCommitment.trim()
      ? { id: `commitment-${Date.now()}`, label: newCommitment.trim(), status: 'pending' }
      : null;
    if (newCommitmentItem) appendJournal(clientId, 'commitment', language === 'es' ? 'Nuevo compromiso' : 'New commitment', newCommitmentItem.label);

    let taskTitle = '';
    if (nextAction.trim()) {
      taskTitle = `${actionName(actionType, language)}: ${nextAction.trim()}`;
      addWorkTask({
        clientId,
        clientName: selectedClient.name,
        title: taskTitle,
        type: actionType,
        note: nextAction.trim(),
        dueDate,
        dueTime,
        assignee,
        source: 'session',
        confirmationEmail: actionType === 'meeting' ? 'queued' : 'not-required'
      });
      appendJournal(clientId, 'next-action', language === 'es' ? 'Próxima acción acordada' : 'Next action agreed', `${taskTitle} · ${assignee} · ${dueDate} ${dueTime}`);
      if (actionType === 'meeting') appendJournal(clientId, 'meeting', language === 'es' ? 'Reunión agendada' : 'Meeting scheduled', `${dueDate} ${dueTime} · confirmación de email en cola`);
    }

    setClients((current) => current.map((client) => {
      if (client.id !== clientId) return client;
      const newBlockers = blockers.trim() ? [...client.blockers, ...blockers.split('\n').map((item) => item.trim()).filter(Boolean)] : client.blockers;
      return {
        ...client,
        blockers: Array.from(new Set(newBlockers)),
        commitments: newCommitmentItem ? [...client.commitments, newCommitmentItem] : client.commitments,
        nextAction: nextActionLabel || client.nextAction,
        nextSession: actionType === 'meeting' && nextAction.trim() ? `${dueDate} · ${dueTime}` : client.nextSession
      };
    }));

    setSaved(true);
    setNotes('');
    setDecisions('');
    setBlockers('');
    setNewCommitment('');
    setNextAction('');
    window.setTimeout(() => setSaved(false), 2200);
  };

  return (
    <div className="min-h-screen bg-[#F4F4F1] text-[#0A0A0A]">
      <header className="sticky top-0 z-20 border-b border-black/8 bg-[#F4F4F1]/95 px-4 py-3 backdrop-blur md:px-8 lg:px-10">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="grid h-9 w-9 place-items-center rounded-full border border-black/10 bg-white text-black/60 transition hover:text-black" aria-label={language === 'es' ? 'Volver a la ficha' : 'Back to record'}><ArrowLeft className="h-4 w-4" /></button>
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0A3F4D]">G-KAIS FOR EXPERTS</p><h1 className="text-sm font-semibold">{language === 'es' ? 'Modo sesión' : 'Session mode'}</h1></div>
          </div>
          <span className="rounded-full border border-[#0A3F4D]/15 bg-[#0A3F4D]/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#0A3F4D]">{language === 'es' ? 'Copilot + Outcome Memory' : 'Copilot + Outcome Memory'}</span>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-4 py-8 md:px-8 lg:px-10 lg:py-10">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0A3F4D]">{language === 'es' ? 'SESIÓN DE CLIENTE' : 'CLIENT SESSION'}</p><h2 className="mt-2 text-3xl font-semibold tracking-[-0.035em] md:text-4xl">{selectedClient.name}</h2><p className="mt-2 text-sm text-black/50">{selectedClient.company} · {selectedClient.program} · {selectedClient.week}</p></div>
          <label className="min-w-[250px]"><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40">{language === 'es' ? 'CLIENTE' : 'CLIENT'}</span><select value={clientId} onChange={(event) => setClientId(event.target.value)} className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#0A3F4D]/45">{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
        </div>

        <section className="mt-6 rounded-2xl border border-black/10 bg-white p-5 shadow-[0_10px_30px_rgba(10,10,10,0.035)] md:p-6">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">G-KAIS COPILOT</p><h3 className="mt-2 text-xl font-semibold">{language === 'es' ? 'Preparación de la conversación' : 'Conversation preparation'}</h3></div><Sparkles className="h-5 w-5 text-[#0A3F4D]" /></div>
          <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-xl bg-[#F7F7F5] p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35">{language === 'es' ? 'SITUACIÓN' : 'SITUATION'}</p><p className="mt-2 text-sm leading-6 text-black/65">{brief.summary}</p><p className="mt-3 border-t border-black/6 pt-3 text-sm leading-6 text-black/60"><strong className="text-black/75">{language === 'es' ? 'Brecha:' : 'Gap:'}</strong> {brief.gap}</p></div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-xl border border-black/7 p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0A3F4D]">{language === 'es' ? 'QUÉ SABEMOS' : 'WHAT WE KNOW'}</p><div className="mt-2 space-y-2">{brief.known.slice(0, 3).map((item) => <p key={item} className="flex gap-2 text-xs leading-5 text-black/58"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0A3F4D]" />{item}</p>)}</div></div>
              <div className="rounded-xl border border-[#A46F16]/15 bg-[#FFF9F1] p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#82570F]">{language === 'es' ? 'PROBLEMAS / INCÓGNITAS' : 'PROBLEMS / UNKNOWNS'}</p><div className="mt-2 space-y-2">{brief.risks.slice(0, 3).map((item) => <p key={item} className="flex gap-2 text-xs leading-5 text-black/58"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#A46F16]" />{item}</p>)}</div></div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl bg-[#0A3F4D] p-5 text-white"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">{language === 'es' ? 'CÓMO ABRIR LA CONVERSACIÓN' : 'HOW TO OPEN THE CONVERSATION'}</p><p className="mt-3 text-sm leading-7 text-white/85">“{brief.callOpening}”</p></div>
            <div className="rounded-2xl border border-black/8 p-5"><div className="flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/40">{language === 'es' ? 'PREGUNTAS A REALIZAR' : 'QUESTIONS TO ASK'}</p><p className="mt-1 text-xs text-black/40">{language === 'es' ? 'Descubrir antes de recomendar.' : 'Discover before recommending.'}</p></div><MessageSquareText className="h-4.5 w-4.5 text-[#0A3F4D]" /></div><div className="mt-3 space-y-2">{brief.questions.map((question, index) => <div key={question} className="flex gap-3 rounded-lg bg-[#F7F7F5] px-3 py-2.5"><span className="text-[10px] font-semibold text-black/35">{index + 1}</span><p className="text-xs leading-5 text-black/62">{question}</p></div>)}</div></div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-black/7 p-4"><div className="flex items-center gap-2"><Target className="h-4 w-4 text-[#0A3F4D]" /><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40">{language === 'es' ? 'CÓMO AYUDAR' : 'HOW TO HELP'}</p></div><div className="mt-2 flex flex-wrap gap-2">{brief.howHelp.map((item) => <span key={item} className="rounded-lg bg-[#F7F7F5] px-3 py-2 text-xs text-black/60">{item}</span>)}</div></div>
            <div className="rounded-xl border border-black/7 p-4"><div className="flex items-center gap-2"><Flag className="h-4 w-4 text-[#0A3F4D]" /><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40">{language === 'es' ? 'PLAN DE LA LLAMADA' : 'CALL PLAN'}</p></div><div className="mt-2 flex flex-wrap gap-2">{brief.plan.map((item, index) => <span key={item} className="rounded-lg bg-[#F7F7F5] px-3 py-2 text-xs text-black/60">{index + 1}. {item}</span>)}</div></div>
          </div>
        </section>

        <div className="my-8 flex items-center gap-4"><div className="h-px flex-1 bg-black/8" /><span className="rounded-full bg-[#111413] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white">{language === 'es' ? 'EN LLAMADA' : 'IN CALL'}</span><div className="h-px flex-1 bg-black/8" /></div>

        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'CONTEXTO RÁPIDO' : 'QUICK CONTEXT'}</p><h3 className="mt-2 text-lg font-semibold">{selectedClient.goal}</h3><div className="mt-4 rounded-xl bg-[#F7F7F5] p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35">{language === 'es' ? 'PRÓXIMA ACCIÓN ACTUAL' : 'CURRENT NEXT ACTION'}</p><p className="mt-2 text-sm leading-6 text-black/65">{selectedClient.nextAction}</p></div><div className="mt-4 flex flex-wrap gap-2">{selectedClient.blockers.map((blocker) => <span key={blocker} className="rounded-full bg-[#A46F16]/8 px-3 py-2 text-xs font-medium text-[#82570F]">{blocker}</span>)}</div></section>

            <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">{language === 'es' ? 'COMPROMISOS' : 'COMMITMENTS'}</p><h3 className="mt-2 text-lg font-semibold">{language === 'es' ? 'Actualizar durante la llamada' : 'Update during the call'}</h3></div><CheckCircle2 className="h-5 w-5 text-[#0A3F4D]" /></div><div className="mt-4 space-y-2">{selectedClient.commitments.map((commitment) => <button key={commitment.id} type="button" onClick={() => cycleCommitment(commitment.id)} className="flex w-full items-center gap-3 rounded-xl border border-black/7 p-3.5 text-left hover:border-[#0A3F4D]/25">{commitment.status === 'done' ? <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-[#0A3F4D]" /> : commitment.status === 'overdue' ? <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-[#A23A32]" /> : <Circle className="h-4.5 w-4.5 shrink-0 text-black/25" />}<span className="flex-1 text-sm text-black/65">{commitment.label}</span><span className="text-[10px] font-semibold uppercase tracking-wide text-black/30">{commitmentStatusLabel(commitment.status, language)}</span></button>)}</div><p className="mt-3 text-[10px] text-black/35">{language === 'es' ? 'Cada cambio actualiza la ficha y Trabajo prioritario al volver.' : 'Every change updates the record and Priority Work when you return.'}</p></section>
          </div>

          <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_10px_30px_rgba(10,10,10,0.035)] md:p-6">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'REGISTRO DE LA LLAMADA' : 'CALL CAPTURE'}</p><h3 className="mt-2 text-xl font-semibold">{language === 'es' ? 'Registrar solo lo que cambia' : 'Capture only what changes'}</h3></div><Clock3 className="h-5 w-5 text-[#0A3F4D]" /></div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="md:col-span-2"><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40">{language === 'es' ? 'NOTAS DE SESIÓN' : 'SESSION NOTES'}</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} className="w-full resize-y rounded-xl border border-black/10 bg-[#FAFAF8] px-3.5 py-3 text-sm leading-6 outline-none focus:border-[#0A3F4D]/45" placeholder={language === 'es' ? 'Qué ocurrió, resultados revisados, contexto nuevo...' : 'What happened, results reviewed, new context...'} /></label>
              <label><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40">{language === 'es' ? 'DECISIONES' : 'DECISIONS'}</span><textarea value={decisions} onChange={(event) => setDecisions(event.target.value)} rows={3} className="w-full resize-y rounded-xl border border-black/10 px-3.5 py-3 text-sm leading-6 outline-none focus:border-[#0A3F4D]/45" /></label>
              <label><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40">{language === 'es' ? 'NUEVOS BLOQUEADORES' : 'NEW BLOCKERS'}</span><textarea value={blockers} onChange={(event) => setBlockers(event.target.value)} rows={3} className="w-full resize-y rounded-xl border border-black/10 px-3.5 py-3 text-sm leading-6 outline-none focus:border-[#0A3F4D]/45" /></label>
              <label className="md:col-span-2"><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40">{language === 'es' ? 'NUEVO COMPROMISO DEL CLIENTE' : 'NEW CLIENT COMMITMENT'}</span><input value={newCommitment} onChange={(event) => setNewCommitment(event.target.value)} className="w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm outline-none focus:border-[#0A3F4D]/45" /></label>
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-[#0A3F4D]/15 bg-white p-5 md:p-6">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'PRÓXIMA ACCIÓN ACORDADA' : 'AGREED NEXT ACTION'}</p><h3 className="mt-2 text-lg font-semibold">{language === 'es' ? 'De la conversación a la ejecución' : 'From conversation to execution'}</h3><p className="mt-1 text-sm text-black/45">{language === 'es' ? 'Define qué ocurrirá, cuándo y quién lo ejecutará. Se crea automáticamente en Trabajo prioritario.' : 'Define what happens, when and who owns it. It is automatically created in Priority Work.'}</p></div><CalendarDays className="h-5 w-5 text-[#0A3F4D]" /></div>

          <div className="mt-5 flex flex-wrap gap-2">{(['email','call','meeting','task'] as WorkActionType[]).map((type) => <button key={type} type="button" onClick={() => setActionType(type)} className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold transition ${actionType === type ? 'bg-[#111413] text-white' : 'border border-black/10 bg-white text-black/55'}`}><ActionIcon type={type} />{actionName(type, language)}</button>)}</div>

          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(240px,1fr)_160px_120px_150px]">
            <label><span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.14em] text-black/35">{language === 'es' ? 'QUÉ HAY QUE HACER' : 'WHAT NEEDS TO HAPPEN'}</span><input value={nextAction} onChange={(event) => setNextAction(event.target.value)} placeholder={language === 'es' ? 'Ej: enviar resumen y propuesta actualizada' : 'E.g. send summary and updated proposal'} className="w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm outline-none focus:border-[#0A3F4D]/40" /></label>
            <label><span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.14em] text-black/35">{language === 'es' ? 'FECHA' : 'DATE'}</span><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none" /></label>
            <label><span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.14em] text-black/35">{language === 'es' ? 'HORA' : 'TIME'}</span><input type="time" value={dueTime} onChange={(event) => setDueTime(event.target.value)} className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none" /></label>
            <label><span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.14em] text-black/35">{language === 'es' ? 'RESPONSABLE' : 'ASSIGNEE'}</span><select value={assignee} onChange={(event) => setAssignee(event.target.value)} className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none"><option>Mentor</option><option>Equipo</option><option>Asistente</option><option>Ventas</option></select></label>
          </div>
          {actionType === 'meeting' && <p className="mt-3 text-[10px] text-black/38">{language === 'es' ? 'La reunión actualizará la próxima sesión y dejará la confirmación de email en cola. El envío externo se activará cuando conectemos el canal de correo del Workspace.' : 'The meeting updates the next session and queues the email confirmation. External delivery activates once the Workspace email channel is connected.'}</p>}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-black/7 pt-5"><p className="text-xs text-black/40">{language === 'es' ? 'Al finalizar se actualizan ficha, compromisos, bitácora y Trabajo prioritario.' : 'Finishing updates the record, commitments, journal and Priority Work.'}</p><button type="button" onClick={finishSession} className="inline-flex items-center gap-2 rounded-full bg-[#111413] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-black">{saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}{saved ? (language === 'es' ? 'Sesión guardada' : 'Session saved') : (language === 'es' ? 'Finalizar y actualizar cliente' : 'Finish and update client')}</button></div>
        </section>
      </main>
    </div>
  );
}
