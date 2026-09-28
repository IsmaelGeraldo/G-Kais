import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpenText,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  Flag,
  Mail,
  MessageSquarePlus,
  Pencil,
  Phone,
  PlayCircle,
  Save,
  Sparkles,
  Target,
  X
} from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';
import { requestClientSessionBrief, type SessionCopilotBrief } from '../../services/clientSessionBrief';

type ClientStatus = 'active' | 'attention' | 'renewal';
type StepStatus = 'done' | 'current' | 'pending';
type CommitmentStatus = 'done' | 'pending' | 'overdue';
type TimelineType = 'session' | 'note' | 'decision' | 'commitment' | 'milestone' | 'next_action' | 'record' | 'attention';

type TimelineEntry = { id: string; type: TimelineType; title: string; body: string; createdAt: string };
type Milestone = { label: string; status: StepStatus };
type Commitment = { label: string; status: CommitmentStatus };

type ClientRecord = {
  id: string;
  name: string;
  initials: string;
  company: string;
  businessType: string;
  email: string;
  phone: string;
  program: string;
  startDate: string;
  duration: string;
  progress: string;
  status: ClientStatus;
  attentionAction: string;
  attentionReason: string;
  nextAction: string;
  primaryGoal: string;
  currentPhase: string;
  nextSession: string;
  startingPoint: string;
  expectedOutcome: string;
  currentGap: string;
  planSummary: string;
  blockers: string[];
  milestones: Milestone[];
  commitments: Commitment[];
  lastSessionSummary: string;
  timeline: TimelineEntry[];
};

const STORAGE_KEY = 'gkais-experts-client-records-v2';
const nowLabel = () => new Date().toISOString();
const makeEntry = (type: TimelineType, title: string, body: string): TimelineEntry => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type, title, body, createdAt: nowLabel() });

const INITIAL_CLIENTS: ClientRecord[] = [
  {
    id: 'sofia', name: 'Sofía Martínez', initials: 'SM', company: 'Sofía Martínez Consulting', businessType: 'Mentoría de negocio', email: 'sofia@example.com', phone: '+56 9 5555 0101', program: 'Mentoría Escala', startDate: '12 ago 2026', duration: '24 semanas', progress: 'Semana 7 de 24', status: 'attention', attentionAction: 'Enviar email', attentionReason: '2 compromisos vencidos y sin actualización de progreso en 9 días.', nextAction: 'Revisar compromisos antes de la próxima sesión', primaryGoal: 'US$15k mensuales', currentPhase: 'Adquisición', nextSession: 'Martes · 15:30', startingPoint: 'Dependencia de referidos y seguimiento comercial irregular.', expectedOutcome: 'Crear adquisición predecible y llegar a US$15k/mes.', currentGap: 'Funnel activo, pero ejecución inconsistente y volumen insuficiente.', planSummary: 'Validar el funnel actual con suficiente volumen, estabilizar la rutina comercial y aumentar la ejecución semanal antes de cambiar la estrategia.', blockers: ['Ejecución inconsistente', 'Dificultad delegando', 'Poco contenido publicado'], milestones: [{ label: 'Oferta redefinida', status: 'done' }, { label: 'Landing publicada', status: 'done' }, { label: 'Primer funnel activo', status: 'current' }, { label: '10 llamadas calificadas por semana', status: 'pending' }], commitments: [{ label: 'Publicar 3 piezas de contenido', status: 'overdue' }, { label: 'Contactar 25 prospectos', status: 'pending' }, { label: 'Revisión comercial cada viernes', status: 'done' }], lastSessionSummary: 'Se decidió mantener el funnel actual una semana más antes de cambiar la estrategia.', timeline: [
      { id: 's1', type: 'session', title: 'Sesión', body: 'Se revisó el funnel y se acordó mantener la estrategia una semana más para obtener una muestra suficiente.', createdAt: '2026-09-19T15:30:00.000Z' },
      { id: 's2', type: 'decision', title: 'Decisión', body: 'Mantener campaña y aumentar ejecución antes de modificar el funnel.', createdAt: '2026-09-19T16:05:00.000Z' },
      { id: 's3', type: 'commitment', title: 'Compromiso vencido', body: 'Publicar 3 piezas de contenido.', createdAt: '2026-09-26T12:00:00.000Z' }
    ]
  },
  {
    id: 'andres', name: 'Andrés Silva', initials: 'AS', company: 'Silva Growth', businessType: 'Consultoría comercial', email: 'andres@example.com', phone: '+56 9 5555 0102', program: 'Mentoría Escala', startDate: '15 jul 2026', duration: '24 semanas', progress: 'Semana 11 de 24', status: 'active', attentionAction: '', attentionReason: '', nextAction: 'Sesión hoy 10:00', primaryGoal: 'US$20k mensuales', currentPhase: 'Conversión', nextSession: 'Hoy · 10:00', startingPoint: 'Buen volumen de oportunidades, pero cierre comercial inconsistente.', expectedOutcome: 'Aumentar la tasa de cierre y estabilizar ingresos mensuales.', currentGap: 'El equipo genera reuniones, pero no existe un proceso de venta consistente.', planSummary: 'Estandarizar diagnóstico, propuesta y seguimiento antes de aumentar adquisición.', blockers: ['Seguimiento irregular'], milestones: [{ label: 'Guion de diagnóstico definido', status: 'done' }, { label: 'Pipeline comercial ordenado', status: 'done' }, { label: 'Seguimiento post-llamada', status: 'current' }], commitments: [{ label: 'Revisar 5 llamadas grabadas', status: 'done' }, { label: 'Enviar follow-up dentro de 24h', status: 'pending' }], lastSessionSummary: 'Se acordó concentrarse en seguimiento y cierre antes de escalar adquisición.', timeline: []
  },
  {
    id: 'diego', name: 'Diego Rojas', initials: 'DR', company: 'Rojas Advisory', businessType: 'Asesoría estratégica', email: 'diego@example.com', phone: '+56 9 5555 0103', program: 'Mentoría Escala', startDate: '20 abr 2026', duration: '24 semanas', progress: 'Semana 22 de 24', status: 'renewal', attentionAction: 'Preparar renovación', attentionReason: 'El programa termina en 16 días.', nextAction: 'Preparar conversación de renovación', primaryGoal: 'Consolidar equipo y delegar delivery', currentPhase: 'Renovación', nextSession: 'Jueves · 12:00', startingPoint: 'El fundador concentraba ventas, delivery y operación.', expectedOutcome: 'Delegar operación y mantener crecimiento sin aumentar carga personal.', currentGap: 'La delegación mejoró, pero aún existen decisiones críticas concentradas en el fundador.', planSummary: 'Cerrar el ciclo actual midiendo avances y definir si una segunda etapa tiene valor claro.', blockers: ['Decisiones centralizadas'], milestones: [{ label: 'Responsabilidades definidas', status: 'done' }, { label: 'SOPs principales documentados', status: 'current' }, { label: 'Plan de segunda etapa', status: 'pending' }], commitments: [{ label: 'Documentar SOP de onboarding', status: 'pending' }], lastSessionSummary: 'Se acordó terminar la documentación operativa y medir resultados del programa.', timeline: []
  }
];

function loadClients(): ClientRecord[] {
  if (typeof window === 'undefined') return INITIAL_CLIENTS;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {}
  return INITIAL_CLIENTS;
}

const statusLabel = (status: ClientStatus, language: Language) => status === 'attention' ? (language === 'es' ? 'Requiere atención' : 'Needs attention') : status === 'renewal' ? (language === 'es' ? 'Renovación' : 'Renewal') : (language === 'es' ? 'Activo' : 'Active');
const formatDate = (value: string, language: Language) => { try { return new Intl.DateTimeFormat(language === 'es' ? 'es-CL' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); } catch { return value; } };

function Detail({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return <div className="rounded-xl border border-black/7 bg-[#FAFAF8] p-4"><div className="flex items-center gap-2 text-black/35">{icon}<p className="text-[10px] font-semibold uppercase tracking-[0.14em]">{label}</p></div><p className="mt-2 break-words text-sm font-medium text-black/72">{value || '—'}</p></div>;
}

function SessionMode({ client, language, onClose, onFinish }: { client: ClientRecord; language: Language; onClose: () => void; onFinish: (payload: { note: string; decision: string; blockers: string; commitments: string; nextAction: string }) => void }) {
  const [brief, setBrief] = useState<SessionCopilotBrief | null>(null);
  const [loading, setLoading] = useState(false);
  const [copilotMessage, setCopilotMessage] = useState('');
  const [note, setNote] = useState('');
  const [decision, setDecision] = useState('');
  const [blockers, setBlockers] = useState('');
  const [commitments, setCommitments] = useState('');
  const [nextAction, setNextAction] = useState(client.nextAction);

  const fallbackBrief = useMemo<SessionCopilotBrief>(() => ({
    summary: language === 'es' ? `${client.name} está en ${client.currentPhase}. La brecha principal es: ${client.currentGap}` : `${client.name} is in ${client.currentPhase}. Main gap: ${client.currentGap}`,
    problems: client.blockers.length ? client.blockers : [client.currentGap],
    solutions: [client.planSummary, language === 'es' ? `Conectar la sesión con el resultado esperado: ${client.expectedOutcome}` : `Connect the session to the expected outcome: ${client.expectedOutcome}`],
    questions: language === 'es' ? ['¿Qué cambió desde la última sesión?', '¿Qué impidió ejecutar lo acordado?', '¿Qué resultado concreto debemos conseguir antes de la próxima sesión?'] : ['What changed since the last session?', 'What prevented the agreed execution?', 'What concrete result must happen before the next session?'],
    recommendedAction: client.nextAction,
    callPositioning: language === 'es' ? `Quiero partir conectando lo que acordamos la vez anterior con lo que realmente ocurrió. Revisemos qué avanzó, qué se bloqueó y salgamos de esta sesión con una próxima acción muy concreta.` : `I want to start by connecting what we agreed last time with what actually happened. Let's review progress, blockers and leave with one concrete next action.`
  }), [client, language]);

  const prepare = async () => {
    setLoading(true); setCopilotMessage('');
    try {
      const result = await requestClientSessionBrief({
        id: client.id, name: client.name, company: client.company, businessType: client.businessType, program: client.program, primaryGoal: client.primaryGoal, startingPoint: client.startingPoint, expectedOutcome: client.expectedOutcome, currentGap: client.currentGap, planSummary: client.planSummary, blockers: client.blockers, nextAction: client.nextAction, lastSessionSummary: client.lastSessionSummary, recentTimeline: client.timeline.slice(-12).map((item) => ({ title: item.title, body: item.body, createdAt: item.createdAt }))
      }, language);
      setBrief(result);
    } catch (error) {
      setBrief(fallbackBrief);
      setCopilotMessage(language === 'es' ? 'Se muestra una preparación basada en el contexto guardado. El análisis AI requiere una sesión autenticada de G-KAIS.' : 'Showing a context-based preparation. AI analysis requires an authenticated G-KAIS session.');
    } finally { setLoading(false); }
  };

  useEffect(() => { prepare(); }, []);
  const activeBrief = brief || fallbackBrief;

  return <div className="fixed inset-0 z-[90] overflow-y-auto bg-[#0B0D0C]/75 p-3 backdrop-blur-sm md:p-6"><div className="mx-auto max-w-[1380px] rounded-[26px] bg-[#F4F4F1] shadow-2xl"><header className="sticky top-0 z-10 flex items-center justify-between gap-4 rounded-t-[26px] border-b border-black/8 bg-[#F4F4F1]/95 px-5 py-4 backdrop-blur md:px-7"><div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#0A3F4D]">{language === 'es' ? 'MODO SESIÓN' : 'SESSION MODE'}</p><h2 className="mt-1 text-xl font-semibold">{client.name} · {client.nextSession}</h2></div><button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full border border-black/10 bg-white"><X className="h-4 w-4"/></button></header><div className="grid gap-6 p-5 md:p-7 xl:grid-cols-[1fr_0.9fr]">
    <div className="space-y-5">
      <section className="rounded-2xl bg-[#0A3F4D] p-5 text-white"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-white/55">G-KAIS COPILOT</p><h3 className="mt-2 text-xl font-semibold">{language === 'es' ? 'Brief de preparación' : 'Preparation brief'}</h3></div><button type="button" onClick={prepare} disabled={loading} className="rounded-full bg-white px-3 py-2 text-[10px] font-semibold text-[#0A3F4D]">{loading ? '...' : (language === 'es' ? 'Actualizar' : 'Refresh')}</button></div><p className="mt-4 text-sm leading-6 text-white/75">{activeBrief.summary}</p>{copilotMessage && <p className="mt-3 text-[10px] leading-4 text-white/45">{copilotMessage}</p>}</section>
      <div className="grid gap-4 md:grid-cols-2"><section className="rounded-2xl border border-black/8 bg-white p-5"><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-[#A23A32]"/><h4 className="font-semibold">{language === 'es' ? 'Problemas / riesgos' : 'Problems / risks'}</h4></div><ul className="mt-3 space-y-2 text-sm text-black/62">{activeBrief.problems.map((item, i) => <li key={i} className="rounded-xl bg-[#A23A32]/5 p-3">{item}</li>)}</ul></section><section className="rounded-2xl border border-black/8 bg-white p-5"><div className="flex items-center gap-2"><Target className="h-4 w-4 text-[#0A3F4D]"/><h4 className="font-semibold">{language === 'es' ? 'Soluciones / plan' : 'Solutions / plan'}</h4></div><ul className="mt-3 space-y-2 text-sm text-black/62">{activeBrief.solutions.map((item, i) => <li key={i} className="rounded-xl bg-[#0A3F4D]/5 p-3">{item}</li>)}</ul></section></div>
      <section className="rounded-2xl border border-black/8 bg-white p-5"><h4 className="font-semibold">{language === 'es' ? 'Preguntas para la llamada' : 'Questions for the call'}</h4><div className="mt-3 space-y-2">{activeBrief.questions.map((q, i) => <div key={i} className="flex gap-3 rounded-xl bg-[#F7F7F5] p-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-[10px] font-semibold">{i + 1}</span><p className="text-sm text-black/65">{q}</p></div>)}</div></section>
      <section className="rounded-2xl border border-black/8 bg-white p-5"><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#0A3F4D]">{language === 'es' ? 'CÓMO PRESENTARLO EN LA LLAMADA' : 'HOW TO POSITION IT IN THE CALL'}</p><p className="mt-3 text-sm leading-7 text-black/70">“{activeBrief.callPositioning}”</p><div className="mt-4 rounded-xl bg-[#F7F7F5] p-3"><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-black/35">{language === 'es' ? 'ACCIÓN RECOMENDADA' : 'RECOMMENDED ACTION'}</p><p className="mt-1 text-sm font-semibold">{activeBrief.recommendedAction}</p></div></section>
    </div>
    <div className="space-y-4"><section className="rounded-2xl border border-black/8 bg-white p-5"><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#0A3F4D]">{language === 'es' ? 'NOTAS EN VIVO' : 'LIVE NOTES'}</p><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={6} placeholder={language === 'es' ? 'Qué ocurrió, qué dijo el cliente, qué cambió…' : 'What happened, what the client said, what changed…'} className="mt-3 w-full rounded-xl border border-black/10 px-3 py-3 text-sm leading-6 outline-none focus:border-[#0A3F4D]/40"/></section><section className="rounded-2xl border border-black/8 bg-white p-5"><div className="space-y-4"><label className="block"><span className="text-[10px] font-semibold uppercase tracking-[.14em] text-black/40">{language === 'es' ? 'Decisiones' : 'Decisions'}</span><textarea value={decision} onChange={(e) => setDecision(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm"/></label><label className="block"><span className="text-[10px] font-semibold uppercase tracking-[.14em] text-black/40">{language === 'es' ? 'Nuevos bloqueadores · uno por línea' : 'New blockers · one per line'}</span><textarea value={blockers} onChange={(e) => setBlockers(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm"/></label><label className="block"><span className="text-[10px] font-semibold uppercase tracking-[.14em] text-black/40">{language === 'es' ? 'Nuevos compromisos · uno por línea' : 'New commitments · one per line'}</span><textarea value={commitments} onChange={(e) => setCommitments(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm"/></label><label className="block"><span className="text-[10px] font-semibold uppercase tracking-[.14em] text-black/40">{language === 'es' ? 'Próxima acción' : 'Next action'}</span><input value={nextAction} onChange={(e) => setNextAction(e.target.value)} className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm"/></label></div></section><button type="button" onClick={() => onFinish({ note, decision, blockers, commitments, nextAction })} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#111413] px-5 py-3.5 text-sm font-semibold text-white"><CheckCircle2 className="h-4 w-4"/>{language === 'es' ? 'Finalizar sesión y guardar memoria' : 'Finish session and save memory'}</button></div>
  </div></div></div>;
}

export function ClientsWorkspaceV2({ language }: { language: Language }) {
  const [clients, setClients] = useState<ClientRecord[]>(loadClients);
  const [selectedId, setSelectedId] = useState('sofia');
  const [editing, setEditing] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const selected = useMemo(() => clients.find((client) => client.id === selectedId) || clients[0], [clients, selectedId]);

  useEffect(() => { try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clients)); } catch {} }, [clients]);
  const updateSelected = (updater: (client: ClientRecord) => ClientRecord) => setClients((current) => current.map((client) => client.id === selected.id ? updater(client) : client));
  const addTimeline = (type: TimelineType, title: string, body: string) => updateSelected((client) => ({ ...client, timeline: [...client.timeline, makeEntry(type, title, body)] }));

  const cycleCommitment = (index: number) => updateSelected((client) => {
    const current = client.commitments[index];
    const next: CommitmentStatus = current.status === 'done' ? 'pending' : 'done';
    const commitments = client.commitments.map((item, i) => i === index ? { ...item, status: next } : item);
    const entry = makeEntry('commitment', next === 'done' ? (language === 'es' ? 'Compromiso completado' : 'Commitment completed') : (language === 'es' ? 'Compromiso reabierto' : 'Commitment reopened'), current.label);
    return { ...client, commitments, timeline: [...client.timeline, entry] };
  });
  const cycleMilestone = (index: number) => updateSelected((client) => {
    const current = client.milestones[index];
    const next: StepStatus = current.status === 'pending' ? 'current' : current.status === 'current' ? 'done' : 'pending';
    const milestones = client.milestones.map((item, i) => i === index ? { ...item, status: next } : item);
    const entry = makeEntry('milestone', language === 'es' ? 'Hito actualizado' : 'Milestone updated', `${current.label} → ${next}`);
    return { ...client, milestones, timeline: [...client.timeline, entry] };
  });
  const addNote = () => { if (!noteDraft.trim()) return; addTimeline('note', language === 'es' ? 'Nota' : 'Note', noteDraft.trim()); setNoteDraft(''); };
  const finishSession = (payload: { note: string; decision: string; blockers: string; commitments: string; nextAction: string }) => {
    updateSelected((client) => {
      const newBlockers = payload.blockers.split('\n').map((v) => v.trim()).filter(Boolean);
      const newCommitments = payload.commitments.split('\n').map((v) => v.trim()).filter(Boolean).map((label) => ({ label, status: 'pending' as CommitmentStatus }));
      const entries: TimelineEntry[] = [makeEntry('session', language === 'es' ? 'Sesión finalizada' : 'Session completed', payload.note.trim() || (language === 'es' ? 'Sesión registrada sin notas adicionales.' : 'Session recorded without additional notes.'))];
      if (payload.decision.trim()) entries.push(makeEntry('decision', language === 'es' ? 'Decisión' : 'Decision', payload.decision.trim()));
      newBlockers.forEach((item) => entries.push(makeEntry('attention', language === 'es' ? 'Nuevo bloqueador' : 'New blocker', item)));
      newCommitments.forEach((item) => entries.push(makeEntry('commitment', language === 'es' ? 'Nuevo compromiso' : 'New commitment', item.label)));
      if (payload.nextAction.trim() && payload.nextAction.trim() !== client.nextAction) entries.push(makeEntry('next_action', language === 'es' ? 'Próxima acción actualizada' : 'Next action updated', payload.nextAction.trim()));
      return { ...client, blockers: Array.from(new Set([...client.blockers, ...newBlockers])), commitments: [...client.commitments, ...newCommitments], nextAction: payload.nextAction.trim() || client.nextAction, lastSessionSummary: payload.note.trim() || payload.decision.trim() || client.lastSessionSummary, timeline: [...client.timeline, ...entries] };
    });
    setSessionOpen(false);
  };

  return <div className="grid items-start gap-6 xl:grid-cols-[300px_minmax(0,1fr)]"><aside className="self-start rounded-2xl border border-black/10 bg-white p-3 shadow-[0_12px_35px_rgba(10,10,10,0.04)]"><div className="px-3 pb-3 pt-2"><p className="text-xs font-semibold uppercase tracking-[.16em] text-black/40">{language === 'es' ? 'CLIENTES ACTIVOS' : 'ACTIVE CLIENTS'}</p><h3 className="mt-1 text-lg font-semibold">46 {language === 'es' ? 'personas' : 'people'}</h3></div><div className="space-y-1">{clients.map((client) => <button key={client.id} onClick={() => { setSelectedId(client.id); setEditing(false); }} className={`w-full rounded-xl p-3 text-left transition ${client.id === selectedId ? 'bg-[#111413] text-white' : 'hover:bg-black/[.035]'}`}><div className="flex gap-3"><div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold ${client.id === selectedId ? 'bg-white/10' : 'bg-[#0A3F4D]/8 text-[#0A3F4D]'}`}>{client.initials}</div><div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate text-sm font-semibold">{client.name}</p><span className={`h-2 w-2 rounded-full ${client.status === 'attention' ? 'bg-[#B84A40]' : client.status === 'renewal' ? 'bg-[#B78220]' : 'bg-[#2C766B]'}`}/></div><p className={`mt-1 text-[11px] ${client.id === selectedId ? 'text-white/45' : 'text-black/40'}`}>{client.progress}</p><p className={`mt-2 truncate text-xs ${client.id === selectedId ? 'text-white/65' : 'text-black/55'}`}>{client.nextAction}</p></div></div></button>)}</div></aside>
  <section className="min-w-0 space-y-6">
    <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_12px_35px_rgba(10,10,10,.04)] md:p-6"><div className="flex items-start justify-between gap-4"><div className="flex items-start gap-4"><div className="grid h-12 w-12 place-items-center rounded-full bg-[#111413] text-sm font-semibold text-white">{selected.initials}</div><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-semibold">{selected.name}</h2><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${selected.status === 'attention' ? 'bg-[#A23A32]/8 text-[#8D332C]' : selected.status === 'renewal' ? 'bg-[#A46F16]/10 text-[#82570F]' : 'bg-[#0A3F4D]/8 text-[#0A3F4D]'}`}>{statusLabel(selected.status, language)}</span></div><p className="mt-1 text-sm text-black/45">{selected.company}</p></div></div><button type="button" onClick={() => setEditing((v) => !v)} className="inline-flex items-center gap-2 rounded-full border border-black/10 px-3.5 py-2 text-xs font-semibold text-black/55"><Pencil className="h-3.5 w-3.5"/>{language === 'es' ? 'Editar ficha' : 'Edit record'}</button></div>
      {selected.status !== 'active' && <div className="mt-5 rounded-2xl border border-[#A23A32]/12 bg-[#A23A32]/5 p-4"><div className="flex flex-col justify-between gap-3 md:flex-row md:items-center"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#8D332C]">{language === 'es' ? 'REQUIERE ATENCIÓN' : 'NEEDS ATTENTION'}</p><p className="mt-1 text-base font-semibold text-[#8D332C]">{selected.attentionAction}</p><p className="mt-1 text-sm text-black/55">{selected.attentionReason}</p></div><button type="button" onClick={() => setSessionOpen(true)} className="inline-flex items-center gap-2 self-start rounded-full bg-[#8D332C] px-4 py-2 text-xs font-semibold text-white"><PlayCircle className="h-4 w-4"/>{language === 'es' ? 'Trabajar ahora' : 'Work now'}</button></div></div>}
      <div className="mt-4 rounded-2xl border border-[#0A3F4D]/12 bg-[#0A3F4D]/5 p-4"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#0A3F4D]">{language === 'es' ? 'PRÓXIMA ACCIÓN' : 'NEXT ACTION'}</p><div className="mt-1 flex items-center justify-between gap-3"><p className="text-sm font-semibold">{selected.nextAction}</p><ChevronRight className="h-4 w-4 text-[#0A3F4D]"/></div></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Detail label={language === 'es' ? 'Programa' : 'Program'} value={selected.program}/><Detail label={language === 'es' ? 'Fecha de inicio' : 'Start date'} value={selected.startDate} icon={<CalendarDays className="h-3.5 w-3.5"/>}/><Detail label={language === 'es' ? 'Duración' : 'Duration'} value={selected.duration} icon={<Clock3 className="h-3.5 w-3.5"/>}/><Detail label={language === 'es' ? 'Progreso' : 'Progress'} value={selected.progress}/></div>
    </div>

    {editing && <section className="rounded-2xl border border-[#0A3F4D]/20 bg-white p-5 md:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#0A3F4D]">{language === 'es' ? 'EDITAR FICHA' : 'EDIT RECORD'}</p><p className="mt-1 text-sm text-black/45">{language === 'es' ? 'Solo datos estructurales del cliente.' : 'Structural client data only.'}</p></div><button onClick={() => { setEditing(false); addTimeline('record', language === 'es' ? 'Ficha ajustada' : 'Record adjusted', language === 'es' ? 'Se revisaron los datos estructurales del cliente.' : 'Structural client data was reviewed.'); }} className="inline-flex items-center gap-2 rounded-full bg-[#111413] px-4 py-2 text-xs font-semibold text-white"><Save className="h-3.5 w-3.5"/>{language === 'es' ? 'Cerrar y registrar' : 'Close and log'}</button></div><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Detail label={language === 'es' ? 'Empresa / negocio' : 'Company'} value={selected.company}/><Detail label={language === 'es' ? 'Tipo de negocio' : 'Business type'} value={selected.businessType}/><Detail label="Email" value={selected.email}/><Detail label={language === 'es' ? 'Teléfono' : 'Phone'} value={selected.phone}/></div></section>}

    <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#0A3F4D]">{language === 'es' ? 'RELACIÓN' : 'RELATIONSHIP'}</p><h3 className="mt-2 text-lg font-semibold">{language === 'es' ? 'Contexto del cliente y su negocio' : 'Client and business context'}</h3></div><Building2 className="h-5 w-5 text-[#0A3F4D]"/></div><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><Detail label={language === 'es' ? 'Empresa / negocio' : 'Company / business'} value={selected.company} icon={<Building2 className="h-3.5 w-3.5"/>}/><Detail label={language === 'es' ? 'Tipo de negocio' : 'Business type'} value={selected.businessType}/><Detail label="Email" value={selected.email} icon={<Mail className="h-3.5 w-3.5"/>}/><Detail label={language === 'es' ? 'Teléfono' : 'Phone'} value={selected.phone} icon={<Phone className="h-3.5 w-3.5"/>}/><Detail label={language === 'es' ? 'Fase del plan' : 'Plan phase'} value={selected.currentPhase}/><Detail label={language === 'es' ? 'Próxima sesión' : 'Next session'} value={selected.nextSession} icon={<CalendarDays className="h-3.5 w-3.5"/>}/></div></section>

    <div className="grid gap-6 2xl:grid-cols-[1.1fr_.9fr]"><div className="space-y-6"><section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#0A3F4D]">OUTCOME MEMORY</p><h3 className="mt-2 text-lg font-semibold">{language === 'es' ? 'De la situación inicial al resultado esperado' : 'From starting point to expected outcome'}</h3></div><Target className="h-5 w-5 text-[#0A3F4D]"/></div><div className="mt-5 grid gap-4 md:grid-cols-3"><Detail label={language === 'es' ? 'Situación inicial' : 'Starting point'} value={selected.startingPoint}/><Detail label={language === 'es' ? 'Resultado esperado' : 'Expected outcome'} value={selected.expectedOutcome}/><Detail label={language === 'es' ? 'Brecha actual' : 'Current gap'} value={selected.currentGap}/></div></section><section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-black/40">{language === 'es' ? 'PLAN ACTUAL' : 'CURRENT PLAN'}</p><h3 className="mt-2 text-lg font-semibold">{language === 'es' ? 'Plan e hitos' : 'Plan and milestones'}</h3></div><Flag className="h-5 w-5 text-[#0A3F4D]"/></div><p className="mt-4 rounded-xl bg-[#F7F7F5] p-4 text-sm leading-6 text-black/62">{selected.planSummary}</p><div className="mt-4 space-y-2">{selected.milestones.map((item,index) => <button type="button" key={`${item.label}-${index}`} onClick={() => cycleMilestone(index)} className="flex w-full items-center gap-3 rounded-xl bg-[#F7F7F5] p-3.5 text-left"><span className="grid h-7 w-7 place-items-center rounded-full bg-white text-xs">{index+1}</span><span className="flex-1 text-sm font-medium">{item.label}</span>{item.status === 'done' ? <CheckCircle2 className="h-4.5 w-4.5 text-[#0A3F4D]"/> : item.status === 'current' ? <Clock3 className="h-4.5 w-4.5 text-[#A46F16]"/> : <Circle className="h-4.5 w-4.5 text-black/20"/>}</button>)}</div><p className="mt-3 text-[10px] text-black/35">{language === 'es' ? 'Haz clic en un hito para cambiar su estado; el cambio se registra en la bitácora.' : 'Click a milestone to change its state; the change is logged.'}</p></section></div>
      <div className="space-y-6"><section className="rounded-2xl bg-[#0A3F4D] p-5 text-white md:p-6"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-white/55">G-KAIS COPILOT</p><h3 className="mt-2 text-xl font-semibold">{language === 'es' ? 'Modo Sesión' : 'Session Mode'}</h3></div><Sparkles className="h-5 w-5 text-white/80"/></div><p className="mt-4 text-sm leading-6 text-white/72">{language === 'es' ? 'Entra a la llamada con problemas, soluciones, preguntas, contexto y un guion para presentar la conversación. Al finalizar, la memoria queda registrada automáticamente.' : 'Enter the call with problems, solutions, questions, context and a positioning script. When finished, memory is logged automatically.'}</p><button onClick={() => setSessionOpen(true)} className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-semibold text-[#0A3F4D]"><PlayCircle className="h-4 w-4"/>{language === 'es' ? 'Iniciar Modo Sesión' : 'Start Session Mode'}</button></section><section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-black/40">{language === 'es' ? 'COMPROMISOS' : 'COMMITMENTS'}</p><h3 className="mt-2 text-lg font-semibold">{language === 'es' ? 'Actualizar durante la llamada' : 'Update during the call'}</h3></div><CheckCircle2 className="h-5 w-5 text-[#0A3F4D]"/></div><div className="mt-4 space-y-2">{selected.commitments.map((item,index) => <button key={`${item.label}-${index}`} onClick={() => cycleCommitment(index)} className="flex w-full items-center gap-3 rounded-xl border border-black/7 p-3.5 text-left">{item.status === 'done' ? <CheckCircle2 className="h-4.5 w-4.5 text-[#0A3F4D]"/> : item.status === 'overdue' ? <AlertTriangle className="h-4.5 w-4.5 text-[#A23A32]"/> : <Circle className="h-4.5 w-4.5 text-black/25"/>}<span className="flex-1 text-sm text-black/65">{item.label}</span><span className="text-[9px] font-semibold uppercase text-black/30">{item.status}</span></button>)}</div></section></div></div>

    <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-start"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#0A3F4D]">{language === 'es' ? 'BITÁCORA DEL CLIENTE' : 'CLIENT LOG'}</p><h3 className="mt-2 text-xl font-semibold">{language === 'es' ? 'Historial de relación y resultados' : 'Relationship and outcome history'}</h3><p className="mt-1 text-sm text-black/45">{language === 'es' ? 'Sesiones, notas, decisiones, compromisos, hitos, bloqueadores y próximas acciones.' : 'Sessions, notes, decisions, commitments, milestones, blockers and next actions.'}</p></div><BookOpenText className="h-5 w-5 text-[#0A3F4D]"/></div><div className="mt-5 flex gap-2"><input value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addNote(); }} placeholder={language === 'es' ? 'Añadir nota rápida…' : 'Add quick note…'} className="min-w-0 flex-1 rounded-xl border border-black/10 px-3 py-2.5 text-sm"/><button onClick={addNote} className="inline-flex items-center gap-2 rounded-xl bg-[#111413] px-4 py-2 text-xs font-semibold text-white"><MessageSquarePlus className="h-4 w-4"/>{language === 'es' ? 'Añadir' : 'Add'}</button></div><div className="mt-6 space-y-0">{[...selected.timeline].sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map((entry,index,array) => <div key={entry.id} className="relative flex gap-4 pb-6"><div className="relative flex w-5 justify-center"><span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-[#0A3F4D]"/>{index < array.length - 1 && <span className="absolute bottom-0 top-4 w-px bg-black/10"/>}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{entry.title}</p><span className="text-[10px] text-black/35">{formatDate(entry.createdAt, language)}</span></div><p className="mt-1 text-sm leading-6 text-black/55">{entry.body}</p></div></div>)}{selected.timeline.length === 0 && <p className="rounded-xl bg-[#F7F7F5] p-4 text-sm text-black/45">{language === 'es' ? 'Todavía no hay eventos registrados.' : 'No events recorded yet.'}</p>}</div></section>
  </section>{sessionOpen && <SessionMode client={selected} language={language} onClose={() => setSessionOpen(false)} onFinish={finishSession}/>}</div>;
}
