import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  Lightbulb,
  ListTodo,
  Mail,
  MessageSquareText,
  Pencil,
  Phone,
  Save,
  Sparkles,
  Trash2,
  X
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import {
  addWorkTask,
  appendJournal,
  emitSessionStageCompleted,
  loadSessionClients,
  saveSessionSummary,
  updateSessionClient,
  WORKSPACE_STATE_EVENT,
  type SessionSummary,
  type SharedSessionClient,
  type WorkActionType
} from './experts/workspaceState';
import { themeColor, workspaceBackground, type WorkspaceAppearance } from './experts/WorkspaceSettingsProfile';

type Props = { onBack: () => void };
type CommitmentStatus = 'pending' | 'done' | 'overdue';
type Commitment = { id: string; label: string; status: CommitmentStatus };
type StageKey = 'start' | 'review' | 'diagnosis' | 'plan' | 'close';
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
type SessionClient = SharedSessionClient & { commitments: Commitment[]; copilot: CopilotBrief };

type StageDefinition = {
  id: StageKey;
  es: string;
  en: string;
  minutes: number;
};

const APPEARANCE_KEY = 'gkais-experts-appearance-v2';
const STAGES: StageDefinition[] = [
  { id: 'start', es: 'Inicio', en: 'Start', minutes: 5 },
  { id: 'review', es: 'Revisión', en: 'Review', minutes: 15 },
  { id: 'diagnosis', es: 'Diagnóstico', en: 'Diagnosis', minutes: 15 },
  { id: 'plan', es: 'Plan / trabajo', en: 'Plan / work', minutes: 20 },
  { id: 'close', es: 'Cierre', en: 'Close', minutes: 5 }
];
const PLAN_PHASES = ['Entender situación', 'Definir plan', 'Implementar', 'Resolver bloqueos', 'Consolidar avances', 'Cierre y continuidad'];
const PLAN_PHASES_EN = ['Understand situation', 'Define plan', 'Implement', 'Resolve blockers', 'Consolidate progress', 'Close and continue'];

const FALLBACK_CLIENTS: SessionClient[] = [
  {
    id: 'sofia', name: 'Sofía Martínez', company: 'Sofía Martínez Consulting', program: 'Mentoría Escala', week: 'Semana 7 / 24', goal: 'Crear adquisición predecible y llegar a US$15k/mes.', nextAction: 'Revisar compromisos antes de la próxima sesión.', nextSession: 'Martes · 15:30', currentPhase: 'Adquisición', planSummary: 'Validar el sistema de captación con suficiente actividad semanal antes de cambiar la estrategia.', blockers: ['Ejecución inconsistente'],
    commitments: [{ id: 'sofia-c1', label: 'Publicar 3 piezas de contenido', status: 'overdue' }, { id: 'sofia-c2', label: 'Contactar 25 prospectos', status: 'pending' }, { id: 'sofia-c3', label: 'Revisión comercial cada viernes', status: 'done' }],
    copilot: {
      summary: 'Sofía tiene el sistema de captación activo, pero necesita ser más constante con las acciones acordadas.',
      gap: 'Todavía falta actividad suficiente para saber si el problema está en la estrategia o en la constancia.',
      known: ['El sistema de captación está activo.', 'La actividad semanal ha sido irregular.'],
      risks: ['Cambiar la estrategia demasiado pronto puede esconder el problema real.'],
      questions: ['¿Qué ocurrió concretamente desde la última sesión?', '¿Qué parte fue más difícil de ejecutar?', '¿Qué tendría que cambiar esta semana para cumplir el volumen acordado?'],
      howHelp: ['Separar si el problema está en la estrategia o en la constancia.', 'Definir una semana simple con acciones medibles.'],
      plan: ['Definir una acción semanal concreta y medible.'],
      callOpening: 'Quiero partir revisando lo que acordamos y qué ocurrió en la práctica. Antes de cambiar la estrategia, entendamos qué te frenó.'
    }
  },
  {
    id: 'andres', name: 'Andrés Silva', company: 'Silva Growth', program: 'Mentoría Escala', week: 'Semana 11 / 24', goal: 'Aumentar la tasa de cierre y estabilizar ingresos.', nextAction: 'Revisar llamadas y estandarizar follow-up.', nextSession: 'Hoy · 10:00', currentPhase: 'Conversión', planSummary: 'Ordenar el seguimiento y mejorar el cierre antes de aumentar el volumen de reuniones.', blockers: ['Seguimiento irregular'],
    commitments: [{ id: 'andres-c1', label: 'Revisar 5 llamadas grabadas', status: 'done' }, { id: 'andres-c2', label: 'Enviar follow-up dentro de 24h', status: 'pending' }],
    copilot: { summary: 'Andrés consigue reuniones, pero pierde oportunidades por un seguimiento irregular.', gap: 'El problema principal está entre la reunión y el cierre de la venta.', known: ['Existe un buen volumen de reuniones.'], risks: ['Aumentar reuniones antes de ordenar el seguimiento.'], questions: ['¿Dónde se enfrían más oportunidades?', '¿Qué objeciones se repiten?'], howHelp: ['Crear un seguimiento simple que el equipo pueda repetir.'], plan: ['Definir un seguimiento estándar para las próximas oportunidades.'], callOpening: 'Hoy quiero revisar qué está pasando después de las reuniones y dónde se están perdiendo oportunidades.' }
  },
  {
    id: 'diego', name: 'Diego Rojas', company: 'Rojas Advisory', program: 'Mentoría Escala', week: 'Semana 22 / 24', goal: 'Delegar operación y mantener crecimiento.', nextAction: 'Preparar conversación de renovación.', nextSession: 'Jueves · 12:00', currentPhase: 'Renovación', planSummary: 'Medir lo logrado, identificar lo que todavía depende del fundador y definir si existe una siguiente etapa.', blockers: ['Decisiones centralizadas'],
    commitments: [{ id: 'diego-c1', label: 'Documentar SOP de onboarding', status: 'pending' }, { id: 'diego-c2', label: 'Preparar métricas de cierre del programa', status: 'done' }],
    copilot: { summary: 'Diego está cerca de terminar el programa y necesita revisar qué mejoró y qué sigue dependiendo de él.', gap: 'Todavía hay decisiones importantes que dependen del fundador.', known: ['El programa está cerca de finalizar.'], risks: ['Renovar sin tener claro qué problema se resolverá después.'], questions: ['¿Qué cambió realmente en tu carga operativa?', '¿Qué sigue dependiendo de ti?'], howHelp: ['Revisar resultados y definir el siguiente problema que vale la pena resolver.'], plan: ['Definir el siguiente problema concreto antes de hablar de continuidad.'], callOpening: 'Quiero revisar qué cambió, qué sigue dependiendo de ti y qué problema queda realmente por resolver.' }
  }
];

function loadAppearance(): WorkspaceAppearance {
  try {
    const saved = localStorage.getItem(APPEARANCE_KEY);
    return saved ? JSON.parse(saved) : { theme: 'stone', intensity: 3, sidebar: 'same', sidebarIntensity: 7 };
  } catch {
    return { theme: 'stone', intensity: 3, sidebar: 'same', sidebarIntensity: 7 };
  }
}

function normalizeClients(): SessionClient[] {
  const stored = loadSessionClients();
  if (!stored.length) return FALLBACK_CLIENTS;
  return stored.map((client) => {
    const fallback = FALLBACK_CLIENTS.find((item) => item.id === client.id) ?? FALLBACK_CLIENTS[0];
    return {
      ...fallback,
      ...client,
      commitments: (client.commitments as Commitment[] | undefined) ?? fallback.commitments,
      copilot: (client.copilot as CopilotBrief | undefined) ?? fallback.copilot
    };
  });
}

function actionLabel(type: WorkActionType, language: 'es' | 'en'): string {
  if (type === 'email') return language === 'es' ? 'Enviar email' : 'Send email';
  if (type === 'call') return language === 'es' ? 'Llamar' : 'Call';
  if (type === 'meeting') return language === 'es' ? 'Agendar reunión' : 'Schedule meeting';
  return language === 'es' ? 'Crear tarea' : 'Create task';
}

function ActionIcon({ type }: { type: WorkActionType }) {
  if (type === 'email') return <Mail className="h-3.5 w-3.5" />;
  if (type === 'call') return <Phone className="h-3.5 w-3.5" />;
  if (type === 'meeting') return <CalendarDays className="h-3.5 w-3.5" />;
  return <ListTodo className="h-3.5 w-3.5" />;
}

function simpleLanguage(text: string, language: 'es' | 'en'): string {
  if (language !== 'es') return text;
  return text
    .replace(/funnel/gi, 'sistema de captación')
    .replace(/adquisición/gi, 'captación de clientes')
    .replace(/conversión/gi, 'cierre de ventas')
    .replace(/ejecución/gi, 'acciones realizadas')
    .replace(/escalar/gi, 'crecer')
    .replace(/pipeline/gi, 'proceso comercial');
}

function splitLines(value: string): string[] {
  return value.split(/\n+/).map((item) => item.trim()).filter(Boolean);
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

export function SessionMemoryWorkspace({ onBack }: Props) {
  const { language } = useLanguage();
  const [clients, setClients] = useState<SessionClient[]>(normalizeClients);
  const [appearance] = useState<WorkspaceAppearance>(loadAppearance);
  const initialClient = new URLSearchParams(window.location.search).get('client') || 'sofia';
  const [clientId] = useState(initialClient);
  const [activeStage, setActiveStage] = useState<StageKey>('start');
  const [completedStages, setCompletedStages] = useState<StageKey[]>([]);

  const [mood, setMood] = useState('');
  const [openingNotes, setOpeningNotes] = useState('');
  const [reviewStatus, setReviewStatus] = useState('');
  const [reviewReason, setReviewReason] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewLearning, setReviewLearning] = useState('');
  const [diagnosisStatus, setDiagnosisStatus] = useState('');
  const [currentProblem, setCurrentProblem] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [attemptedSolutions, setAttemptedSolutions] = useState('');
  const [newBlocker, setNewBlocker] = useState('');
  const [decision, setDecision] = useState('');
  const [solution, setSolution] = useState('');
  const [planPhase, setPlanPhase] = useState('');
  const [planSummary, setPlanSummary] = useState('');
  const [clientCommitments, setClientCommitments] = useState('');
  const [mentorActions, setMentorActions] = useState('');
  const [expectedResult, setExpectedResult] = useState('');
  const [successMeasure, setSuccessMeasure] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [actionType, setActionType] = useState<WorkActionType>('task');
  const [actionDate, setActionDate] = useState('');
  const [actionTime, setActionTime] = useState('');
  const [assignee, setAssignee] = useState('Mentor');
  const [nextSessionDate, setNextSessionDate] = useState('');
  const [nextSessionTime, setNextSessionTime] = useState('');
  const [editingCommitmentId, setEditingCommitmentId] = useState<string | null>(null);
  const [commitmentDraft, setCommitmentDraft] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const refresh = () => setClients(normalizeClients());
    window.addEventListener(WORKSPACE_STATE_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(WORKSPACE_STATE_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const selectedClient = useMemo(() => clients.find((client) => client.id === clientId) ?? clients[0], [clients, clientId]);
  const brief = selectedClient.copilot;
  const accent = themeColor(appearance.theme);
  const accentSoft = `color-mix(in srgb, ${accent} 10%, white)`;
  const accentBorder = `color-mix(in srgb, ${accent} 28%, white)`;
  const recommendedCommitment = brief.plan?.[0] || (language === 'es' ? 'Definir una acción concreta para la próxima semana.' : 'Define one concrete action for next week.');
  const activeDefinition = STAGES.find((stage) => stage.id === activeStage) ?? STAGES[0];

  useEffect(() => {
    setPlanPhase(String(selectedClient.currentPhase || ''));
    setPlanSummary(String(selectedClient.planSummary || ''));
  }, [selectedClient.id]);

  const persistCommitments = (commitments: Commitment[], journalTitle?: string, journalBody?: string) => {
    setClients((current) => current.map((client) => client.id === clientId ? { ...client, commitments } : client));
    updateSessionClient(clientId, (client) => ({ ...client, commitments }));
    if (journalTitle && journalBody) appendJournal(clientId, 'commitment', journalTitle, journalBody);
  };

  const cycleCommitment = (commitment: Commitment) => {
    const nextStatus: CommitmentStatus = commitment.status === 'done' ? 'pending' : 'done';
    persistCommitments(selectedClient.commitments.map((item) => item.id === commitment.id ? { ...item, status: nextStatus } : item), language === 'es' ? 'Compromiso actualizado' : 'Commitment updated', `${commitment.label} → ${nextStatus}`);
  };

  const beginEditCommitment = (commitment: Commitment) => {
    setEditingCommitmentId(commitment.id);
    setCommitmentDraft(commitment.label);
  };

  const saveCommitmentEdit = (commitment: Commitment) => {
    const clean = commitmentDraft.trim();
    if (!clean) return;
    persistCommitments(selectedClient.commitments.map((item) => item.id === commitment.id ? { ...item, label: clean } : item), language === 'es' ? 'Compromiso corregido' : 'Commitment edited', `${commitment.label} → ${clean}`);
    setEditingCommitmentId(null);
  };

  const deleteCommitment = (commitment: Commitment) => {
    persistCommitments(selectedClient.commitments.filter((item) => item.id !== commitment.id), language === 'es' ? 'Compromiso eliminado' : 'Commitment deleted', commitment.label);
    if (editingCommitmentId === commitment.id) setEditingCommitmentId(null);
  };

  const stageBody = (stage: StageKey): string => {
    if (stage === 'start') return [`Estado de ánimo: ${mood || 'Sin registrar'}`, openingNotes && `Nota inicial: ${openingNotes}`].filter(Boolean).join('\n');
    if (stage === 'review') return [`Cumplimiento: ${reviewStatus || 'Sin registrar'}`, reviewReason && `Motivo: ${reviewReason}`, reviewNotes && `Qué ocurrió: ${reviewNotes}`, reviewLearning && `Aprendizaje: ${reviewLearning}`].filter(Boolean).join('\n');
    if (stage === 'diagnosis') return [`Estado actual: ${diagnosisStatus || 'Sin registrar'}`, currentProblem && `Problema actual: ${currentProblem}`, rootCause && `Causa: ${rootCause}`, attemptedSolutions && `Qué intentó: ${attemptedSolutions}`, newBlocker && `Nuevo bloqueo: ${newBlocker}`].filter(Boolean).join('\n');
    if (stage === 'plan') return [`Decisión: ${decision || 'Sin registrar'}`, solution && `Cómo vamos a solucionarlo: ${solution}`, planPhase && `Etapa del plan: ${planPhase}`, planSummary && `Plan acordado: ${planSummary}`, clientCommitments && `Compromisos del cliente: ${clientCommitments}`, mentorActions && `Acciones mentor/equipo: ${mentorActions}`, expectedResult && `Resultado esperado: ${expectedResult}`, successMeasure && `Cómo medirlo: ${successMeasure}`].filter(Boolean).join('\n');
    return [`Próxima acción: ${nextAction || 'Sin registrar'}`, nextSessionDate && `Próxima sesión: ${nextSessionDate}${nextSessionTime ? ` ${nextSessionTime}` : ''}`].filter(Boolean).join('\n');
  };

  const completeStage = (stage: StageKey) => {
    const definition = STAGES.find((item) => item.id === stage) ?? STAGES[0];
    appendJournal(clientId, 'session-stage', language === 'es' ? `Etapa completada · ${definition.es}` : `Stage completed · ${definition.en}`, stageBody(stage));

    if (stage === 'diagnosis' && newBlocker.trim()) {
      updateSessionClient(clientId, (client) => ({ ...client, blockers: uniqueStrings([...(client.blockers ?? []), newBlocker.trim()]) }));
    }
    if (stage === 'plan') {
      updateSessionClient(clientId, (client) => ({
        ...client,
        currentPhase: planPhase.trim() || client.currentPhase,
        planSummary: planSummary.trim() || client.planSummary
      }));
      if (!nextAction.trim() && splitLines(mentorActions)[0]) setNextAction(splitLines(mentorActions)[0]);
    }

    setCompletedStages((current) => current.includes(stage) ? current : [...current, stage]);
    emitSessionStageCompleted(clientId);
    const index = STAGES.findIndex((item) => item.id === stage);
    if (index >= 0 && index < STAGES.length - 1) setActiveStage(STAGES[index + 1].id);
  };

  const finishSession = () => {
    const newCommitments = splitLines(clientCommitments);
    let commitments = selectedClient.commitments;
    newCommitments.forEach((label, index) => {
      if (!commitments.some((item) => item.label.toLowerCase() === label.toLowerCase())) {
        commitments = [...commitments, { id: `commitment-${Date.now()}-${index}`, label, status: 'pending' }];
      }
    });

    const nextBlockers = uniqueStrings([...(selectedClient.blockers ?? []), ...splitLines(newBlocker)]);
    const nextPhase = planPhase.trim() || String(selectedClient.currentPhase || '');
    const nextPlanSummary = planSummary.trim() || String(selectedClient.planSummary || '');
    const mentorActionList = splitLines(mentorActions);
    const nextActionText = nextAction.trim() || mentorActionList[0] || '';
    const nextSession = nextSessionDate
      ? `${nextSessionDate}${nextSessionTime ? ` · ${nextSessionTime}` : ''}`
      : selectedClient.nextSession;

    updateSessionClient(clientId, (client) => ({
      ...client,
      commitments,
      blockers: nextBlockers,
      nextAction: nextActionText,
      nextSession,
      currentPhase: nextPhase,
      planSummary: nextPlanSummary
    }));

    newCommitments.forEach((label) => appendJournal(clientId, 'commitment', language === 'es' ? 'Nuevo compromiso' : 'New commitment', label));
    if (decision.trim()) appendJournal(clientId, 'decision', language === 'es' ? 'Decisión de sesión' : 'Session decision', decision.trim());
    if (newBlocker.trim()) appendJournal(clientId, 'blocker', language === 'es' ? 'Bloqueador detectado' : 'Blocker detected', newBlocker.trim());
    if (nextPlanSummary) appendJournal(clientId, 'plan', language === 'es' ? 'Plan actual de la sesión' : 'Current session plan', `${nextPhase}${nextPlanSummary ? ` · ${nextPlanSummary}` : ''}`);

    const tasksToCreate = mentorActionList.length ? mentorActionList : (nextActionText ? [nextActionText] : []);
    tasksToCreate.forEach((taskText) => {
      addWorkTask({
        clientId,
        clientName: selectedClient.name,
        title: taskText,
        type: actionType,
        note: taskText,
        dueDate: actionDate,
        dueTime: actionTime,
        assignee,
        source: 'session',
        confirmationEmail: actionType === 'meeting' ? 'queued' : 'not-required'
      });
      appendJournal(clientId, 'next-action', language === 'es' ? 'Próxima acción acordada' : 'Next action agreed', `${actionLabel(actionType, language)} · ${taskText}${actionDate ? ` · ${actionDate}` : ''}${actionTime ? ` ${actionTime}` : ''} · ${assignee}`);
    });

    const summary: SessionSummary = {
      id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      clientId,
      clientName: selectedClient.name,
      createdAt: new Date().toISOString(),
      mood,
      openingNotes,
      reviewStatus,
      reviewReason,
      reviewNotes,
      reviewLearning,
      diagnosisStatus,
      currentProblem,
      rootCause,
      attemptedSolutions,
      blockers: splitLines(newBlocker),
      decision,
      solution,
      planPhase: nextPhase,
      planSummary: nextPlanSummary,
      clientCommitments: newCommitments,
      mentorActions: mentorActionList,
      expectedResult,
      successMeasure,
      nextAction: nextActionText,
      nextSession: nextSession || ''
    };
    saveSessionSummary(summary);
    appendJournal(clientId, 'session', language === 'es' ? 'Sesión finalizada' : 'Session finished', [decision, solution, nextPlanSummary, nextActionText].filter(Boolean).join(' · ') || (language === 'es' ? 'Sesión registrada en G-KAIS.' : 'Session recorded in G-KAIS.'));

    setCompletedStages((current) => current.includes('close') ? current : [...current, 'close']);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  const renderCommitments = () => (
    <div className="space-y-2">
      {selectedClient.commitments.map((commitment) => (
        <div key={commitment.id} className="rounded-xl border border-black/7 bg-white p-3">
          {editingCommitmentId === commitment.id ? (
            <div className="flex gap-2"><input autoFocus value={commitmentDraft} onChange={(event) => setCommitmentDraft(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm outline-none" /><button type="button" onClick={() => saveCommitmentEdit(commitment)} className="rounded-lg bg-[#111413] px-3 text-xs font-semibold text-white">{language === 'es' ? 'Guardar' : 'Save'}</button><button type="button" onClick={() => setEditingCommitmentId(null)} className="grid h-9 w-9 place-items-center"><X className="h-4 w-4" /></button></div>
          ) : (
            <div className="flex items-center gap-3"><button type="button" onClick={() => cycleCommitment(commitment)}>{commitment.status === 'done' ? <CheckCircle2 className="h-4.5 w-4.5" style={{ color: accent }} /> : commitment.status === 'overdue' ? <AlertTriangle className="h-4.5 w-4.5 text-[#A23A32]" /> : <Circle className="h-4.5 w-4.5 text-black/25" />}</button><span className="min-w-0 flex-1 text-sm text-black/65">{commitment.label}</span><button type="button" onClick={() => beginEditCommitment(commitment)} className="grid h-7 w-7 place-items-center rounded-lg text-black/35 hover:bg-black/[0.04] hover:text-black/65"><Pencil className="h-3.5 w-3.5" /></button><button type="button" onClick={() => deleteCommitment(commitment)} className="grid h-7 w-7 place-items-center rounded-lg text-black/30 hover:bg-[#A23A32]/6 hover:text-[#A23A32]"><Trash2 className="h-3.5 w-3.5" /></button></div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen text-[#0A0A0A]" style={{ background: workspaceBackground(accent, appearance.intensity) }}>
      <header className="sticky top-0 z-30 border-b border-black/8 px-4 py-3 backdrop-blur md:px-8 lg:px-10" style={{ background: `color-mix(in srgb, ${accent} 5%, rgba(255,255,255,.94))` }}>
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="grid h-9 w-9 place-items-center rounded-full border border-black/10 bg-white text-black/60 transition hover:text-black" aria-label={language === 'es' ? 'Volver a la ficha' : 'Back to record'}><ArrowLeft className="h-4 w-4" /></button>
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: accent }}>G-KAIS FOR EXPERTS</p><h1 className="text-sm font-semibold">{language === 'es' ? 'Modo sesión guiado' : 'Guided session mode'}</h1></div>
          </div>
          <div className="text-right"><p className="text-sm font-semibold">{selectedClient.name}</p><p className="text-[10px] text-black/40">{selectedClient.program} · {selectedClient.week}</p></div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-4 py-5 md:px-8 lg:px-10 lg:py-7">
        <div className="sticky top-[61px] z-20 -mx-2 mb-5 rounded-2xl border border-black/8 bg-white/92 p-2 shadow-sm backdrop-blur">
          <div className="grid gap-2 md:grid-cols-5">
            {STAGES.map((stage, index) => {
              const active = stage.id === activeStage;
              const completed = completedStages.includes(stage.id);
              return <button key={stage.id} type="button" onClick={() => setActiveStage(stage.id)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${active ? 'bg-[#111413] text-white' : completed ? 'bg-[#0A3F4D]/7 text-[#0A3F4D]' : 'bg-[#F7F7F5] text-black/55'}`}><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold ${active ? 'bg-white/12' : completed ? 'bg-[#0A3F4D]/10' : 'bg-white'}`}>{completed ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}</span><span className="min-w-0"><span className="block text-xs font-semibold">{language === 'es' ? stage.es : stage.en}</span><span className={`block text-[9px] ${active ? 'text-white/45' : 'text-black/35'}`}>{stage.minutes} min aprox.</span></span></button>;
            })}
          </div>
          <div className="mt-2 flex items-center justify-between px-2 text-[10px] text-black/35"><span>{language === 'es' ? 'Guía de 60 min aprox. · flexible según la conversación' : 'Approx. 60 min guide · flexible to the conversation'}</span><span>{language === 'es' ? 'Copilot se actualiza al completar cada etapa' : 'Copilot updates after each stage'}</span></div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(390px,0.85fr)]">
          <div className="space-y-4">
            {activeStage === 'start' && <>
              <section className="rounded-2xl border bg-white p-5 shadow-[0_10px_30px_rgba(10,10,10,0.03)]" style={{ borderColor: accentBorder }}>
                <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
                  <div><div className="flex items-center gap-2"><Sparkles className="h-4 w-4" style={{ color: accent }} /><p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: accent }}>G-KAIS COPILOT · {language === 'es' ? 'SITUACIÓN' : 'SITUATION'}</p></div><p className="mt-2 text-sm leading-6 text-black/65">{simpleLanguage(brief.summary, language)}</p></div>
                  <div className="rounded-xl p-3.5" style={{ background: accentSoft }}><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-black/38">{language === 'es' ? 'BRECHA PRINCIPAL' : 'PRIMARY GAP'}</p><p className="mt-1.5 text-sm leading-6 text-black/62">{simpleLanguage(brief.gap, language)}</p></div>
                </div>
              </section>
              <section className="rounded-2xl bg-[#111413] p-5 text-white"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/45">{language === 'es' ? 'CÓMO ABRIR LA CONVERSACIÓN' : 'HOW TO OPEN'}</p><p className="mt-2 text-sm leading-6 text-white/86">“{simpleLanguage(brief.callOpening, language)}”</p><p className="mt-4 text-xs leading-5 text-white/45">{language === 'es' ? 'Objetivo: 5 minutos para conectar, entender cómo llega hoy y detectar si existe algo urgente antes de revisar el trabajo.' : 'Goal: spend about 5 minutes connecting and understanding how the client arrives today.'}</p></section>
            </>}

            {activeStage === 'review' && <>
              <section className="rounded-2xl border border-black/10 bg-white p-5"><div className="flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-black/42">{language === 'es' ? 'COMPROMISOS ANTERIORES' : 'PREVIOUS COMMITMENTS'}</p><h3 className="mt-1 text-lg font-semibold">{language === 'es' ? 'Qué debía ocurrir desde la última sesión' : 'What should have happened since the last session'}</h3></div><CheckCircle2 className="h-5 w-5" style={{ color: accent }} /></div><div className="mt-4">{renderCommitments()}</div></section>
              <section className="rounded-2xl border border-black/10 bg-white p-5"><div className="flex items-center gap-2"><MessageSquareText className="h-4 w-4" style={{ color: accent }} /><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-black/42">{language === 'es' ? 'PREGUNTAS PARA PROFUNDIZAR' : 'QUESTIONS TO GO DEEPER'}</p></div><div className="mt-3 grid gap-2 md:grid-cols-2">{brief.questions.slice(0, 4).map((question, index) => <div key={`${question}-${index}`} className="flex gap-2 rounded-xl bg-[#F7F7F5] p-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-[10px] font-semibold text-black/42">{index + 1}</span><p className="text-xs leading-5 text-black/62">{simpleLanguage(question, language)}</p></div>)}</div></section>
            </>}

            {activeStage === 'diagnosis' && <>
              <section className="rounded-2xl border bg-white p-5" style={{ borderColor: accentBorder }}><div className="flex items-center gap-2"><Sparkles className="h-4 w-4" style={{ color: accent }} /><p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: accent }}>{language === 'es' ? 'LO QUE COPILOT VE AHORA' : 'WHAT COPILOT SEES NOW'}</p></div><p className="mt-3 text-sm leading-6 text-black/65">{simpleLanguage(brief.summary, language)}</p><div className="mt-4 rounded-xl p-4" style={{ background: accentSoft }}><p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-black/38">{language === 'es' ? 'PUNTO A ACLARAR' : 'POINT TO CLARIFY'}</p><p className="mt-1.5 text-sm leading-6 text-black/62">{simpleLanguage(brief.gap, language)}</p></div></section>
              {brief.risks?.length > 0 && <section className="rounded-2xl border border-black/10 bg-white p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-black/42">{language === 'es' ? 'SEÑALES A MIRAR' : 'SIGNALS TO WATCH'}</p><div className="mt-3 flex flex-wrap gap-2">{brief.risks.slice(0, 4).map((risk) => <span key={risk} className="inline-flex items-center gap-1.5 rounded-full bg-[#A46F16]/8 px-3 py-1.5 text-[10px] font-medium text-[#82570F]"><AlertTriangle className="h-3 w-3" />{simpleLanguage(risk, language)}</span>)}</div></section>}
            </>}

            {activeStage === 'plan' && <>
              <div className="grid gap-4 md:grid-cols-2">
                <section className="rounded-2xl border border-black/10 bg-white p-5"><div className="flex items-center gap-2"><Lightbulb className="h-4 w-4" style={{ color: accent }} /><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-black/42">{language === 'es' ? 'CÓMO PODEMOS AYUDAR' : 'HOW WE CAN HELP'}</p></div><div className="mt-3 space-y-2">{(brief.howHelp?.length ? brief.howHelp : [language === 'es' ? 'Aclarar el problema y convertirlo en una acción concreta.' : 'Clarify the problem and turn it into one concrete action.']).slice(0, 3).map((item) => <div key={item} className="rounded-xl bg-[#F7F7F5] p-3 text-xs leading-5 text-black/60">{simpleLanguage(item, language)}</div>)}</div></section>
                <section className="rounded-2xl border border-black/10 bg-white p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-black/42">{language === 'es' ? 'PROPUESTA DE COPILOT' : 'COPILOT SUGGESTION'}</p><div className="mt-3 space-y-2">{(brief.plan?.length ? brief.plan : [recommendedCommitment]).slice(0, 3).map((item) => <div key={item} className="rounded-xl p-3 text-xs leading-5 text-black/65" style={{ background: accentSoft }}>{simpleLanguage(item, language)}</div>)}</div></section>
              </div>
              <section className="rounded-2xl border border-black/10 bg-white p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-black/42">{language === 'es' ? 'PLAN QUE TRAÍAMOS' : 'CURRENT PLAN'}</p><div className="mt-3 grid gap-3 md:grid-cols-[180px_1fr]"><div className="rounded-xl bg-[#F7F7F5] p-4"><p className="text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'Etapa' : 'Stage'}</p><p className="mt-1 text-sm font-semibold">{String(selectedClient.currentPhase || '—')}</p></div><div className="rounded-xl bg-[#F7F7F5] p-4"><p className="text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'Detalle' : 'Detail'}</p><p className="mt-1 text-sm leading-6 text-black/60">{String(selectedClient.planSummary || '—')}</p></div></div></section>
            </>}

            {activeStage === 'close' && <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6"><div className="flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-black/42">{language === 'es' ? 'RESUMEN ANTES DE CERRAR' : 'SUMMARY BEFORE CLOSING'}</p><h3 className="mt-1 text-lg font-semibold">{language === 'es' ? 'Todo lo acordado en esta sesión' : 'Everything agreed in this session'}</h3></div><CheckCircle2 className="h-5 w-5 text-[#0A3F4D]" /></div><div className="mt-4 grid gap-3 md:grid-cols-2"><div className="rounded-xl bg-[#F7F7F5] p-4"><p className="text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'Decisión' : 'Decision'}</p><p className="mt-2 text-sm leading-6 text-black/65">{decision || '—'}</p></div><div className="rounded-xl bg-[#F7F7F5] p-4"><p className="text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'Solución / plan' : 'Solution / plan'}</p><p className="mt-2 text-sm leading-6 text-black/65">{solution || planSummary || '—'}</p></div><div className="rounded-xl bg-[#F7F7F5] p-4"><p className="text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'Cliente hará' : 'Client will do'}</p><p className="mt-2 text-sm leading-6 text-black/65">{splitLines(clientCommitments).join(' · ') || '—'}</p></div><div className="rounded-xl bg-[#F7F7F5] p-4"><p className="text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'Mentor / equipo hará' : 'Mentor / team will do'}</p><p className="mt-2 text-sm leading-6 text-black/65">{splitLines(mentorActions).join(' · ') || '—'}</p></div><div className="rounded-xl bg-[#F7F7F5] p-4"><p className="text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'Bloqueos nuevos' : 'New blockers'}</p><p className="mt-2 text-sm leading-6 text-black/65">{newBlocker || '—'}</p></div><div className="rounded-xl bg-[#F7F7F5] p-4"><p className="text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'Resultado esperado' : 'Expected result'}</p><p className="mt-2 text-sm leading-6 text-black/65">{expectedResult || '—'}</p></div></div></section>}
          </div>

          <aside className="xl:sticky xl:top-[150px] xl:self-start">
            <section className="max-h-[calc(100vh-170px)] overflow-y-auto rounded-2xl border border-black/10 bg-white p-5 shadow-[0_12px_35px_rgba(10,10,10,0.055)] md:p-6">
              <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-black">{language === 'es' ? 'REGISTRO EN VIVO' : 'LIVE CAPTURE'}</p><h3 className="mt-1 text-lg font-semibold">{language === 'es' ? activeDefinition.es : activeDefinition.en}</h3><p className="mt-1 text-xs text-black/40">{activeDefinition.minutes} min aprox.</p></div><Clock3 className="h-5 w-5 text-black/55" /></div>

              {activeStage === 'start' && <div className="mt-5 space-y-4"><div><span className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.13em] text-black/38">{language === 'es' ? 'ESTADO DE ÁNIMO' : 'MOOD'}</span><div className="flex flex-wrap gap-2">{(language === 'es' ? ['Muy bien','Bien','Neutral','Bajo','Preocupado'] : ['Great','Good','Neutral','Low','Concerned']).map((option) => <button key={option} type="button" onClick={() => setMood(option)} className={`rounded-full px-3 py-2 text-[10px] font-semibold ${mood === option ? 'bg-[#111413] text-white' : 'border border-black/10 bg-white text-black/55'}`}>{option}</button>)}</div></div><label><span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.13em] text-black/38">{language === 'es' ? 'NOTA INICIAL / ALGO IMPORTANTE' : 'OPENING NOTE / IMPORTANT CONTEXT'}</span><textarea value={openingNotes} onChange={(event) => setOpeningNotes(event.target.value)} rows={5} className="w-full resize-y rounded-xl border border-black/10 bg-[#FAFAF8] px-3.5 py-3 text-sm leading-6 outline-none" placeholder={language === 'es' ? 'Cómo llega hoy, algo personal o urgente que pueda afectar la sesión…' : 'How they arrive today, personal or urgent context…'} /></label></div>}

              {activeStage === 'review' && <div className="mt-5 space-y-4"><div><span className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.13em] text-black/38">{language === 'es' ? '¿CUMPLIÓ LOS OBJETIVOS ACORDADOS?' : 'DID THEY COMPLETE THE AGREED GOALS?'}</span><div className="grid grid-cols-3 gap-2">{(language === 'es' ? ['Sí','Parcialmente','No'] : ['Yes','Partially','No']).map((option) => <button key={option} type="button" onClick={() => setReviewStatus(option)} className={`rounded-xl px-3 py-2.5 text-[10px] font-semibold ${reviewStatus === option ? 'bg-[#111413] text-white' : 'border border-black/10 bg-white text-black/55'}`}>{option}</button>)}</div></div><label><span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.13em] text-black/38">{language === 'es' ? 'MOTIVO PRINCIPAL' : 'MAIN REASON'}</span><select value={reviewReason} onChange={(event) => setReviewReason(event.target.value)} className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm"><option value="">{language === 'es' ? 'Seleccionar' : 'Select'}</option>{(language === 'es' ? ['Cumplido sin dificultades','Falta de tiempo','Apareció un bloqueo','Cambió la prioridad','No supo cómo avanzar','Otro'] : ['Completed without difficulty','Lack of time','A blocker appeared','Priority changed','Did not know how to proceed','Other']).map((option) => <option key={option}>{option}</option>)}</select></label><label><span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.13em] text-black/38">{language === 'es' ? '¿QUÉ OCURRIÓ AL IMPLEMENTAR?' : 'WHAT HAPPENED DURING IMPLEMENTATION?'}</span><textarea value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} rows={4} className="w-full rounded-xl border border-black/10 px-3.5 py-3 text-sm leading-5 outline-none" /></label><label><span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.13em] text-black/38">{language === 'es' ? 'APRENDIZAJE / QUÉ FUNCIONÓ' : 'LEARNING / WHAT WORKED'}</span><textarea value={reviewLearning} onChange={(event) => setReviewLearning(event.target.value)} rows={3} className="w-full rounded-xl border border-black/10 px-3.5 py-3 text-sm leading-5 outline-none" /></label></div>}

              {activeStage === 'diagnosis' && <div className="mt-5 space-y-4"><label><span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.13em] text-black/38">{language === 'es' ? 'ESTADO ACTUAL' : 'CURRENT STATE'}</span><select value={diagnosisStatus} onChange={(event) => setDiagnosisStatus(event.target.value)} className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm"><option value="">{language === 'es' ? 'Seleccionar' : 'Select'}</option>{(language === 'es' ? ['Todo va bien','Hay una dificultad','Problema importante','Cambió la situación'] : ['Everything is going well','There is a difficulty','Important problem','Situation changed']).map((option) => <option key={option}>{option}</option>)}</select></label><label><span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.13em] text-black/38">{language === 'es' ? 'PROBLEMA ACTUAL' : 'CURRENT PROBLEM'}</span><textarea value={currentProblem} onChange={(event) => setCurrentProblem(event.target.value)} rows={4} className="w-full rounded-xl border border-black/10 px-3.5 py-3 text-sm leading-5 outline-none" placeholder={language === 'es' ? 'Si todo va bien, describe qué está funcionando ahora.' : 'If things are going well, describe what is working now.'} /></label><label><span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.13em] text-black/38">{language === 'es' ? '¿QUÉ LO ESTÁ PROVOCANDO?' : 'WHAT IS CAUSING IT?'}</span><textarea value={rootCause} onChange={(event) => setRootCause(event.target.value)} rows={3} className="w-full rounded-xl border border-black/10 px-3.5 py-3 text-sm leading-5 outline-none" /></label><label><span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.13em] text-black/38">{language === 'es' ? '¿QUÉ YA INTENTÓ?' : 'WHAT HAS ALREADY BEEN TRIED?'}</span><textarea value={attemptedSolutions} onChange={(event) => setAttemptedSolutions(event.target.value)} rows={3} className="w-full rounded-xl border border-black/10 px-3.5 py-3 text-sm leading-5 outline-none" /></label><label><span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.13em] text-black/38">{language === 'es' ? 'NUEVO BLOQUEO' : 'NEW BLOCKER'}</span><textarea value={newBlocker} onChange={(event) => setNewBlocker(event.target.value)} rows={3} className="w-full rounded-xl border border-black/10 px-3.5 py-3 text-sm leading-5 outline-none" /></label></div>}

              {activeStage === 'plan' && <div className="mt-5 space-y-4"><label><span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.13em] text-black/38">{language === 'es' ? 'QUÉ DECIDIMOS' : 'WHAT WE DECIDED'}</span><textarea value={decision} onChange={(event) => setDecision(event.target.value)} rows={3} className="w-full rounded-xl border border-black/10 px-3.5 py-3 text-sm leading-5 outline-none" /></label><label><span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.13em] text-black/38">{language === 'es' ? 'CÓMO VAMOS A SOLUCIONARLO' : 'HOW WE WILL SOLVE IT'}</span><textarea value={solution} onChange={(event) => setSolution(event.target.value)} rows={4} className="w-full rounded-xl border border-black/10 px-3.5 py-3 text-sm leading-5 outline-none" /></label><label><span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.13em] text-black/38">{language === 'es' ? 'ETAPA DEL PLAN' : 'PLAN STAGE'}</span><select value={planPhase} onChange={(event) => setPlanPhase(event.target.value)} className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm"><option value="">{language === 'es' ? 'Seleccionar' : 'Select'}</option>{(language === 'es' ? PLAN_PHASES : PLAN_PHASES_EN).map((option) => <option key={option}>{option}</option>)}</select></label><label><span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.13em] text-black/38">{language === 'es' ? 'PLAN QUE VAMOS A SEGUIR' : 'PLAN WE WILL FOLLOW'}</span><textarea value={planSummary} onChange={(event) => setPlanSummary(event.target.value)} rows={4} className="w-full rounded-xl border border-black/10 px-3.5 py-3 text-sm leading-5 outline-none" /></label><label><span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.13em] text-black/38">{language === 'es' ? 'COMPROMISOS DEL CLIENTE · UNO POR LÍNEA' : 'CLIENT COMMITMENTS · ONE PER LINE'}</span><textarea value={clientCommitments} onChange={(event) => setClientCommitments(event.target.value)} rows={3} className="w-full rounded-xl border border-black/10 px-3.5 py-3 text-sm leading-5 outline-none" /></label><label><span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.13em] text-black/38">{language === 'es' ? 'QUÉ HARÁ EL MENTOR / EQUIPO · UNO POR LÍNEA' : 'MENTOR / TEAM ACTIONS · ONE PER LINE'}</span><textarea value={mentorActions} onChange={(event) => setMentorActions(event.target.value)} rows={3} className="w-full rounded-xl border border-black/10 px-3.5 py-3 text-sm leading-5 outline-none" /></label><label><span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.13em] text-black/38">{language === 'es' ? 'RESULTADO ESPERADO ANTES DE LA PRÓXIMA SESIÓN' : 'EXPECTED RESULT BEFORE NEXT SESSION'}</span><textarea value={expectedResult} onChange={(event) => setExpectedResult(event.target.value)} rows={3} className="w-full rounded-xl border border-black/10 px-3.5 py-3 text-sm leading-5 outline-none" /></label><label><span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.13em] text-black/38">{language === 'es' ? 'CÓMO SABREMOS SI FUNCIONÓ' : 'HOW WE WILL KNOW IT WORKED'}</span><textarea value={successMeasure} onChange={(event) => setSuccessMeasure(event.target.value)} rows={3} className="w-full rounded-xl border border-black/10 px-3.5 py-3 text-sm leading-5 outline-none" /></label></div>}

              {activeStage === 'close' && <div className="mt-5 space-y-4"><div className="rounded-xl bg-[#F7F7F5] p-4"><p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-black/35">{language === 'es' ? 'PRÓXIMA ACCIÓN INTERNA' : 'NEXT INTERNAL ACTION'}</p><input value={nextAction} onChange={(event) => setNextAction(event.target.value)} placeholder={splitLines(mentorActions)[0] || (language === 'es' ? 'Qué debe hacer ahora el mentor/equipo' : 'What mentor/team should do next')} className="mt-2 w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /></div><div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'TIPO' : 'TYPE'}</span><select value={actionType} onChange={(event) => setActionType(event.target.value as WorkActionType)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm"><option value="task">{language === 'es' ? 'Tarea' : 'Task'}</option><option value="email">Email</option><option value="call">{language === 'es' ? 'Llamada' : 'Call'}</option><option value="meeting">{language === 'es' ? 'Reunión' : 'Meeting'}</option></select></label><label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'RESPONSABLE' : 'ASSIGNEE'}</span><select value={assignee} onChange={(event) => setAssignee(event.target.value)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm"><option>Mentor</option><option>Equipo</option><option>Asistente</option><option>Ventas</option></select></label><label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'FECHA DE TAREA' : 'TASK DATE'}</span><input type="date" value={actionDate} onChange={(event) => setActionDate(event.target.value)} className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm" /></label><label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'HORA' : 'TIME'}</span><input type="time" value={actionTime} onChange={(event) => setActionTime(event.target.value)} className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm" /></label></div><div className="border-t border-black/7 pt-4"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/38">{language === 'es' ? 'PRÓXIMA SESIÓN' : 'NEXT SESSION'}</p><div className="mt-2 grid grid-cols-2 gap-3"><input type="date" value={nextSessionDate} onChange={(event) => setNextSessionDate(event.target.value)} className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm" /><input type="time" value={nextSessionTime} onChange={(event) => setNextSessionTime(event.target.value)} className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm" /></div></div></div>}

              <div className="mt-5 border-t border-black/7 pt-4">
                {activeStage !== 'close' ? <button type="button" onClick={() => completeStage(activeStage)} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#111413] px-5 py-3 text-xs font-semibold text-white">{completedStages.includes(activeStage) ? <CheckCircle2 className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}{language === 'es' ? 'Completar etapa y actualizar Copilot' : 'Complete stage and update Copilot'}</button> : <button type="button" onClick={finishSession} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#111413] px-5 py-3 text-xs font-semibold text-white">{saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}{saved ? (language === 'es' ? 'Sesión guardada' : 'Session saved') : (language === 'es' ? 'Finalizar sesión' : 'Finish session')}</button>}
                <p className="mt-2 text-center text-[10px] leading-4 text-black/35">{activeStage === 'close' ? (language === 'es' ? 'Al finalizar se actualizan ficha, compromisos, trabajo prioritario y registro de sesiones.' : 'Finishing updates the record, commitments, priority work and session record.') : (language === 'es' ? 'La información de esta etapa se guarda y Copilot vuelve a analizar el contexto.' : 'This stage is saved and Copilot re-analyzes the context.')}</p>
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
