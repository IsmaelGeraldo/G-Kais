import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
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
  loadSessionClients,
  updateSessionClient,
  WORKSPACE_STATE_EVENT,
  type SharedSessionClient,
  type WorkActionType
} from './experts/workspaceState';
import { themeColor, workspaceBackground, type WorkspaceAppearance } from './experts/WorkspaceSettingsProfile';

type Props = { onBack: () => void };
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
type SessionClient = SharedSessionClient & { commitments: Commitment[]; copilot: CopilotBrief };

const APPEARANCE_KEY = 'gkais-experts-appearance-v2';

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

export function SessionMemoryWorkspace({ onBack }: Props) {
  const { language } = useLanguage();
  const [clients, setClients] = useState<SessionClient[]>(normalizeClients);
  const [appearance] = useState<WorkspaceAppearance>(loadAppearance);
  const initialClient = new URLSearchParams(window.location.search).get('client') || 'sofia';
  const [clientId] = useState(initialClient);
  const [notes, setNotes] = useState('');
  const [decisions, setDecisions] = useState('');
  const [blockers, setBlockers] = useState('');
  const [newCommitment, setNewCommitment] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [actionType, setActionType] = useState<WorkActionType>('task');
  const [actionDate, setActionDate] = useState('');
  const [actionTime, setActionTime] = useState('');
  const [assignee, setAssignee] = useState('Mentor');
  const [editingCommitmentId, setEditingCommitmentId] = useState<string | null>(null);
  const [commitmentDraft, setCommitmentDraft] = useState('');
  const [planPhase, setPlanPhase] = useState('');
  const [planSummary, setPlanSummary] = useState('');
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

  const finishSession = () => {
    let commitments = selectedClient.commitments;
    if (newCommitment.trim()) {
      const commitment: Commitment = { id: `commitment-${Date.now()}`, label: newCommitment.trim(), status: 'pending' };
      commitments = [...commitments, commitment];
      appendJournal(clientId, 'commitment', language === 'es' ? 'Nuevo compromiso' : 'New commitment', commitment.label);
    }

    const nextBlockers = blockers.trim() ? [...(selectedClient.blockers ?? []), blockers.trim()] : (selectedClient.blockers ?? []);
    const nextActionText = nextAction.trim() || selectedClient.nextAction || '';
    const nextSession = actionType === 'meeting' && actionDate ? `${actionDate}${actionTime ? ` · ${actionTime}` : ''}` : selectedClient.nextSession;
    const nextPhase = planPhase.trim() || String(selectedClient.currentPhase || '');
    const nextPlanSummary = planSummary.trim() || String(selectedClient.planSummary || '');

    updateSessionClient(clientId, (client) => ({
      ...client,
      commitments,
      blockers: nextBlockers,
      nextAction: nextActionText,
      nextSession,
      currentPhase: nextPhase,
      planSummary: nextPlanSummary
    }));

    if (notes.trim()) appendJournal(clientId, 'session', language === 'es' ? 'Notas de sesión' : 'Session notes', notes.trim());
    else appendJournal(clientId, 'session', language === 'es' ? 'Sesión completada' : 'Session completed', language === 'es' ? 'Sesión registrada en G-KAIS.' : 'Session recorded in G-KAIS.');
    if (decisions.trim()) appendJournal(clientId, 'decision', language === 'es' ? 'Decisión de sesión' : 'Session decision', decisions.trim());
    if (blockers.trim()) appendJournal(clientId, 'blocker', language === 'es' ? 'Bloqueador detectado' : 'Blocker detected', blockers.trim());
    if (nextPhase !== String(selectedClient.currentPhase || '') || nextPlanSummary !== String(selectedClient.planSummary || '')) {
      appendJournal(clientId, 'plan', language === 'es' ? 'Plan actual actualizado' : 'Current plan updated', `${nextPhase}${nextPlanSummary ? ` · ${nextPlanSummary}` : ''}`);
    }

    if (nextAction.trim() || actionDate || actionTime) {
      const label = actionLabel(actionType, language);
      const title = nextAction.trim() || `${label} · ${selectedClient.name}`;
      addWorkTask({
        clientId,
        clientName: selectedClient.name,
        title,
        type: actionType,
        note: nextAction.trim(),
        dueDate: actionDate,
        dueTime: actionTime,
        assignee,
        source: 'session',
        confirmationEmail: actionType === 'meeting' ? 'queued' : 'not-required'
      });
      appendJournal(clientId, 'next-action', language === 'es' ? 'Próxima acción acordada' : 'Next action agreed', `${label}${nextAction.trim() ? ` · ${nextAction.trim()}` : ''}${actionDate ? ` · ${actionDate}` : ''}${actionTime ? ` ${actionTime}` : ''} · ${assignee}`);
    }

    setSaved(true);
    setNotes('');
    setDecisions('');
    setBlockers('');
    setNewCommitment('');
    setNextAction('');
    window.setTimeout(() => setSaved(false), 1800);
  };

  const accentSoft = `color-mix(in srgb, ${accent} 10%, white)`;
  const accentBorder = `color-mix(in srgb, ${accent} 28%, white)`;
  const recommendedCommitment = brief.plan?.[0] || (language === 'es' ? 'Definir una acción concreta para la próxima semana.' : 'Define one concrete action for next week.');

  return (
    <div className="min-h-screen text-[#0A0A0A]" style={{ background: workspaceBackground(accent, appearance.intensity) }}>
      <header className="sticky top-0 z-20 border-b border-black/8 px-4 py-3 backdrop-blur md:px-8 lg:px-10" style={{ background: `color-mix(in srgb, ${accent} 5%, rgba(255,255,255,.94))` }}>
        <div className="mx-auto flex max-w-[1450px] items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="grid h-9 w-9 place-items-center rounded-full border border-black/10 bg-white text-black/60 transition hover:text-black" aria-label={language === 'es' ? 'Volver a la ficha' : 'Back to record'}><ArrowLeft className="h-4 w-4" /></button>
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: accent }}>G-KAIS FOR EXPERTS</p><h1 className="text-sm font-semibold">{language === 'es' ? 'Modo sesión' : 'Session mode'}</h1></div>
          </div>
          <div className="text-right"><p className="text-sm font-semibold">{selectedClient.name}</p><p className="text-[10px] text-black/40">{selectedClient.program} · {selectedClient.week}</p></div>
        </div>
      </header>

      <main className="mx-auto max-w-[1450px] px-4 py-7 md:px-8 lg:px-10 lg:py-9">
        <div className="mb-5"><p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: accent }}>{language === 'es' ? 'PREPARACIÓN' : 'PREPARATION'}</p><h2 className="mt-1.5 text-3xl font-semibold tracking-[-0.035em]">{selectedClient.name}</h2></div>

        <section className="rounded-2xl border bg-white p-5 shadow-[0_10px_30px_rgba(10,10,10,0.03)]" style={{ borderColor: accentBorder }}>
          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <div><div className="flex items-center gap-2"><Sparkles className="h-4 w-4" style={{ color: accent }} /><p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: accent }}>G-KAIS COPILOT · {language === 'es' ? 'SITUACIÓN' : 'SITUATION'}</p></div><p className="mt-2 text-sm leading-6 text-black/65">{simpleLanguage(brief.summary, language)}</p></div>
            <div className="rounded-xl p-3.5" style={{ background: accentSoft }}><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-black/38">{language === 'es' ? 'BRECHA PRINCIPAL' : 'PRIMARY GAP'}</p><p className="mt-1.5 text-sm leading-6 text-black/62">{simpleLanguage(brief.gap, language)}</p></div>
          </div>
          {brief.risks?.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{brief.risks.slice(0, 3).map((risk) => <span key={risk} className="inline-flex items-center gap-1.5 rounded-full bg-[#A46F16]/8 px-3 py-1.5 text-[10px] font-medium text-[#82570F]"><AlertTriangle className="h-3 w-3" />{simpleLanguage(risk, language)}</span>)}</div>}
        </section>

        <div className="mt-4 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <section className="rounded-2xl p-5 text-white shadow-[0_12px_35px_rgba(10,10,10,0.08)]" style={{ background: accent }}><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/55">{language === 'es' ? 'CÓMO ABRIR LA CONVERSACIÓN' : 'HOW TO OPEN THE CONVERSATION'}</p><p className="mt-2 text-sm leading-6 text-white/88">“{simpleLanguage(brief.callOpening, language)}”</p></section>
          <section className="rounded-2xl border border-black/10 bg-white p-5"><div className="flex items-center gap-2"><MessageSquareText className="h-4 w-4" style={{ color: accent }} /><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-black/42">{language === 'es' ? 'PREGUNTAS PARA LA LLAMADA' : 'QUESTIONS FOR THE CALL'}</p></div><div className="mt-3 grid gap-2 md:grid-cols-2">{brief.questions.slice(0, 4).map((question, index) => <div key={question} className="flex gap-2 rounded-xl bg-[#F7F7F5] p-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-[10px] font-semibold text-black/42">{index + 1}</span><p className="text-xs leading-5 text-black/62">{simpleLanguage(question, language)}</p></div>)}</div></section>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <section className="rounded-2xl border border-black/10 bg-white p-5"><div className="flex items-center gap-2"><Lightbulb className="h-4 w-4" style={{ color: accent }} /><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-black/42">{language === 'es' ? 'CÓMO PODEMOS AYUDAR' : 'HOW WE CAN HELP'}</p></div><div className="mt-3 space-y-2">{(brief.howHelp?.length ? brief.howHelp : [language === 'es' ? 'Aclarar el problema y convertirlo en una acción concreta.' : 'Clarify the problem and turn it into one concrete action.']).slice(0, 3).map((item) => <div key={item} className="rounded-xl bg-[#F7F7F5] p-3 text-xs leading-5 text-black/60">{simpleLanguage(item, language)}</div>)}</div></section>
          <section className="rounded-2xl border border-black/10 bg-white p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-black/42">{language === 'es' ? 'TAREA O COMPROMISO RECOMENDADO' : 'RECOMMENDED TASK OR COMMITMENT'}</p><div className="mt-3 rounded-xl p-4" style={{ background: accentSoft }}><p className="text-sm font-semibold leading-6 text-black/70">{simpleLanguage(recommendedCommitment, language)}</p></div></section>
        </div>

        <div className="my-7 flex items-center gap-4"><div className="h-px flex-1 bg-black/8" /><span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black">{language === 'es' ? 'EN LLAMADA' : 'LIVE SESSION'}</span><div className="h-px flex-1 bg-black/8" /></div>

        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <section className="rounded-2xl border border-black/10 bg-white p-5">
              <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-black/42">{language === 'es' ? 'COMPROMISOS' : 'COMMITMENTS'}</p><h3 className="mt-1 text-lg font-semibold">{language === 'es' ? 'Actualizar durante la llamada' : 'Update during the call'}</h3></div><CheckCircle2 className="h-5 w-5" style={{ color: accent }} /></div>
              <div className="mt-4 space-y-2">
                {selectedClient.commitments.map((commitment) => (
                  <div key={commitment.id} className="rounded-xl border border-black/7 p-3">
                    {editingCommitmentId === commitment.id ? (
                      <div className="flex gap-2"><input autoFocus value={commitmentDraft} onChange={(event) => setCommitmentDraft(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm outline-none" /><button type="button" onClick={() => saveCommitmentEdit(commitment)} className="rounded-lg bg-[#111413] px-3 text-xs font-semibold text-white">{language === 'es' ? 'Guardar' : 'Save'}</button><button type="button" onClick={() => setEditingCommitmentId(null)} className="grid h-9 w-9 place-items-center"><X className="h-4 w-4" /></button></div>
                    ) : (
                      <div className="flex items-center gap-3"><button type="button" onClick={() => cycleCommitment(commitment)}>{commitment.status === 'done' ? <CheckCircle2 className="h-4.5 w-4.5" style={{ color: accent }} /> : commitment.status === 'overdue' ? <AlertTriangle className="h-4.5 w-4.5 text-[#A23A32]" /> : <Circle className="h-4.5 w-4.5 text-black/25" />}</button><span className="min-w-0 flex-1 text-sm text-black/65">{commitment.label}</span><button type="button" onClick={() => beginEditCommitment(commitment)} className="grid h-7 w-7 place-items-center rounded-lg text-black/35 hover:bg-black/[0.04] hover:text-black/65"><Pencil className="h-3.5 w-3.5" /></button><button type="button" onClick={() => deleteCommitment(commitment)} className="grid h-7 w-7 place-items-center rounded-lg text-black/30 hover:bg-[#A23A32]/6 hover:text-[#A23A32]"><Trash2 className="h-3.5 w-3.5" /></button></div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border bg-white p-5" style={{ borderColor: accentBorder }}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: accent }}>{language === 'es' ? 'PLAN ACTUAL' : 'CURRENT PLAN'}</p>
              <div className="mt-3 grid gap-3">
                <label><span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.12em] text-black/35">{language === 'es' ? 'FASE DEL PLAN' : 'PLAN PHASE'}</span><select value={planPhase} onChange={(event) => setPlanPhase(event.target.value)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm"><option value="">{language === 'es' ? 'Seleccionar' : 'Select'}</option><option>Diagnóstico</option><option>Adquisición</option><option>Conversión</option><option>Implementación</option><option>Delegación</option><option>Renovación</option></select></label>
                <label><span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.12em] text-black/35">{language === 'es' ? 'DETALLE DEL PLAN' : 'PLAN DETAIL'}</span><textarea value={planSummary} onChange={(event) => setPlanSummary(event.target.value)} rows={3} className="w-full resize-y rounded-lg border border-black/10 px-3 py-2.5 text-sm leading-5 outline-none" placeholder={language === 'es' ? 'Escribe qué se está trabajando en esta fase…' : 'Write what is being worked on in this phase…'} /></label>
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
            <div className="flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: accent }}>{language === 'es' ? 'REGISTRO EN VIVO' : 'LIVE CAPTURE'}</p><h3 className="mt-1 text-lg font-semibold">{language === 'es' ? 'Registrar solo lo que cambia' : 'Capture only what changes'}</h3></div><Clock3 className="h-5 w-5" style={{ color: accent }} /></div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="md:col-span-2"><span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.13em] text-black/38">{language === 'es' ? 'NOTAS DE SESIÓN' : 'SESSION NOTES'}</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} className="w-full resize-y rounded-xl border border-black/10 bg-[#FAFAF8] px-3.5 py-3 text-sm leading-6 outline-none" placeholder={language === 'es' ? 'Qué ocurrió, resultados revisados, contexto nuevo…' : 'What happened, results reviewed, new context…'} /></label>
              <label><span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.13em] text-black/38">{language === 'es' ? 'DECISIONES' : 'DECISIONS'}</span><textarea value={decisions} onChange={(event) => setDecisions(event.target.value)} rows={3} className="w-full rounded-xl border border-black/10 px-3.5 py-3 text-sm outline-none" /></label>
              <label><span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.13em] text-black/38">{language === 'es' ? 'NUEVO BLOQUEADOR' : 'NEW BLOCKER'}</span><textarea value={blockers} onChange={(event) => setBlockers(event.target.value)} rows={3} className="w-full rounded-xl border border-black/10 px-3.5 py-3 text-sm outline-none" /></label>
              <label className="md:col-span-2"><span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.13em] text-black/38">{language === 'es' ? 'NUEVO COMPROMISO' : 'NEW COMMITMENT'}</span><input value={newCommitment} onChange={(event) => setNewCommitment(event.target.value)} className="w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm outline-none" /></label>
            </div>
          </section>
        </div>

        <section className="mt-5 rounded-2xl border border-black/10 bg-white p-5 md:p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: accent }}>{language === 'es' ? 'PRÓXIMA ACCIÓN ACORDADA' : 'AGREED NEXT ACTION'}</p>
          <div className="mt-4 grid gap-3 lg:grid-cols-[150px_minmax(220px,1fr)_145px_120px_150px]">
            <label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'TIPO' : 'TYPE'}</span><select value={actionType} onChange={(event) => setActionType(event.target.value as WorkActionType)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm"><option value="task">{language === 'es' ? 'Tarea' : 'Task'}</option><option value="email">Email</option><option value="call">{language === 'es' ? 'Llamada' : 'Call'}</option><option value="meeting">{language === 'es' ? 'Reunión' : 'Meeting'}</option></select></label>
            <label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'QUÉ DEBE PASAR' : 'WHAT MUST HAPPEN'}</span><input value={nextAction} onChange={(event) => setNextAction(event.target.value)} placeholder={language === 'es' ? 'Ej: enviar resumen con plan de la semana' : 'E.g. send weekly plan summary'} className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm" /></label>
            <label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'FECHA' : 'DATE'}</span><input type="date" value={actionDate} onChange={(event) => setActionDate(event.target.value)} className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm" /></label>
            <label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'HORA' : 'TIME'}</span><input type="time" value={actionTime} onChange={(event) => setActionTime(event.target.value)} className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm" /></label>
            <label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'RESPONSABLE' : 'ASSIGNEE'}</span><select value={assignee} onChange={(event) => setAssignee(event.target.value)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm"><option>Mentor</option><option>Equipo</option><option>Asistente</option><option>Ventas</option></select></label>
          </div>
          {actionType === 'meeting' && <p className="mt-3 text-[10px] text-black/38">{language === 'es' ? 'La reunión actualizará la próxima sesión y dejará la confirmación de email en cola.' : 'The meeting updates the next session and queues the confirmation email.'}</p>}
          <div className="mt-5 flex items-center justify-between gap-3 border-t border-black/7 pt-4"><p className="text-xs text-black/40">{language === 'es' ? 'Al finalizar, ficha, Trabajo prioritario y Bitácora se actualizan automáticamente.' : 'Finishing updates the record, Priority Work and Journal automatically.'}</p><button type="button" onClick={finishSession} className="inline-flex items-center gap-2 rounded-full bg-[#111413] px-5 py-2.5 text-xs font-semibold text-white">{saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}{saved ? (language === 'es' ? 'Sesión guardada' : 'Session saved') : (language === 'es' ? 'Finalizar sesión' : 'Finish session')}</button></div>
        </section>
      </main>
    </div>
  );
}
