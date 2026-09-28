import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  History,
  ListTodo,
  Mail,
  Pencil,
  Phone,
  Play,
  Save,
  Target,
  X
} from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';
import {
  addWorkTask,
  appendJournal,
  loadJournal,
  loadSessionClients,
  updateSessionClient,
  type WorkActionType
} from './workspaceState';

type ClientStatus = 'active' | 'attention' | 'renewal';
type CommitmentStatus = 'done' | 'pending' | 'overdue';
type MilestoneStatus = 'done' | 'current' | 'pending';

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
  milestones: Array<{ label: string; status: MilestoneStatus }>;
  commitments: Array<{ label: string; status: CommitmentStatus }>;
};

const CLIENT_STORAGE_KEY = 'gkais-experts-client-records-v2';

const INITIAL_CLIENTS: ClientRecord[] = [
  {
    id: 'sofia', name: 'Sofía Martínez', initials: 'SM', company: 'Sofía Martínez Consulting', businessType: 'Mentoría de negocio', email: 'sofia@example.com', phone: '+56 9 5555 0101',
    program: 'Mentoría Escala', startDate: '12 ago 2026', duration: '24 semanas', progress: 'Semana 7 / 24', status: 'attention', attentionAction: 'Enviar email',
    attentionReason: '2 compromisos vencidos y sin actualización de progreso en 9 días.', nextAction: 'Revisar compromisos antes de la próxima sesión', primaryGoal: 'US$15k mensuales', currentPhase: 'Adquisición', nextSession: 'Martes · 15:30',
    startingPoint: 'Dependencia de referidos y seguimiento comercial irregular.', expectedOutcome: 'Crear adquisición predecible y llegar a US$15k/mes.', currentGap: 'Funnel activo, pero ejecución inconsistente y volumen insuficiente.',
    planSummary: 'Validar el funnel actual con suficiente volumen, estabilizar la rutina comercial y aumentar la ejecución semanal antes de cambiar la estrategia.', blockers: ['Ejecución inconsistente', 'Dificultad delegando', 'Poco contenido publicado'],
    milestones: [{ label: 'Oferta redefinida', status: 'done' }, { label: 'Landing publicada', status: 'done' }, { label: 'Primer funnel activo', status: 'current' }, { label: '10 llamadas calificadas por semana', status: 'pending' }],
    commitments: [{ label: 'Publicar 3 piezas de contenido', status: 'overdue' }, { label: 'Contactar 25 prospectos', status: 'pending' }, { label: 'Revisión comercial cada viernes', status: 'done' }]
  },
  {
    id: 'andres', name: 'Andrés Silva', initials: 'AS', company: 'Silva Growth', businessType: 'Consultoría comercial', email: 'andres@example.com', phone: '+56 9 5555 0102',
    program: 'Mentoría Escala', startDate: '15 jul 2026', duration: '24 semanas', progress: 'Semana 11 / 24', status: 'active', attentionAction: 'Sin atención requerida', attentionReason: 'Cliente al día.',
    nextAction: 'Sesión hoy 10:00', primaryGoal: 'US$20k mensuales', currentPhase: 'Conversión', nextSession: 'Hoy · 10:00', startingPoint: 'Buen volumen de oportunidades, pero cierre comercial inconsistente.',
    expectedOutcome: 'Aumentar la tasa de cierre y estabilizar ingresos mensuales.', currentGap: 'El equipo genera reuniones, pero no existe un proceso de venta consistente.', planSummary: 'Estandarizar diagnóstico, propuesta y seguimiento comercial antes de aumentar inversión en adquisición.', blockers: ['Seguimiento irregular', 'Propuestas poco estandarizadas'],
    milestones: [{ label: 'Guion de diagnóstico definido', status: 'done' }, { label: 'Pipeline comercial ordenado', status: 'done' }, { label: 'Seguimiento post-llamada', status: 'current' }, { label: 'Tasa de cierre sobre 30%', status: 'pending' }],
    commitments: [{ label: 'Revisar 5 llamadas grabadas', status: 'done' }, { label: 'Enviar follow-up dentro de 24h', status: 'pending' }]
  },
  {
    id: 'diego', name: 'Diego Rojas', initials: 'DR', company: 'Rojas Advisory', businessType: 'Asesoría estratégica', email: 'diego@example.com', phone: '+56 9 5555 0103',
    program: 'Mentoría Escala', startDate: '20 abr 2026', duration: '24 semanas', progress: 'Semana 22 / 24', status: 'renewal', attentionAction: 'Confirmar reunión de renovación', attentionReason: 'El programa termina en 16 días y todavía no existe una decisión de continuidad.',
    nextAction: 'Preparar conversación de renovación', primaryGoal: 'Consolidar equipo y delegar delivery', currentPhase: 'Renovación', nextSession: 'Jueves · 12:00', startingPoint: 'El fundador concentraba ventas, delivery y operación.', expectedOutcome: 'Delegar operación y mantener crecimiento sin aumentar carga personal.',
    currentGap: 'La delegación mejoró, pero aún existen decisiones críticas concentradas en el fundador.', planSummary: 'Cerrar el ciclo actual midiendo avances, identificar el siguiente cuello de botella y definir si una segunda etapa tiene valor claro.', blockers: ['Decisiones centralizadas', 'Documentación incompleta'],
    milestones: [{ label: 'Responsabilidades del equipo definidas', status: 'done' }, { label: 'Reunión operativa semanal', status: 'done' }, { label: 'SOPs principales documentados', status: 'current' }, { label: 'Plan de segunda etapa', status: 'pending' }],
    commitments: [{ label: 'Documentar SOP de onboarding', status: 'pending' }, { label: 'Preparar métricas de cierre del programa', status: 'done' }]
  }
];

function mergeOperationalState(records: ClientRecord[]): ClientRecord[] {
  const shared = loadSessionClients();
  if (!shared.length) return records;
  return records.map((record) => {
    const live = shared.find((item) => item.id === record.id);
    if (!live) return record;
    return {
      ...record,
      company: live.company || record.company,
      program: live.program || record.program,
      progress: live.week || record.progress,
      expectedOutcome: live.goal || record.expectedOutcome,
      nextAction: live.nextAction || record.nextAction,
      blockers: live.blockers?.length ? [...live.blockers] : record.blockers,
      commitments: live.commitments?.length
        ? live.commitments.map((item) => ({ label: item.label, status: item.status }))
        : record.commitments
    };
  });
}

function loadClients(): ClientRecord[] {
  try {
    const saved = localStorage.getItem(CLIENT_STORAGE_KEY);
    const records = saved ? JSON.parse(saved) as ClientRecord[] : INITIAL_CLIENTS;
    return mergeOperationalState(records);
  } catch {
    return mergeOperationalState(INITIAL_CLIENTS);
  }
}

function syncToSession(record: ClientRecord): void {
  updateSessionClient(record.id, (shared) => ({
    ...shared,
    name: record.name,
    company: record.company,
    program: record.program,
    week: record.progress,
    goal: record.expectedOutcome,
    nextAction: record.nextAction,
    blockers: [...record.blockers],
    commitments: record.commitments.map((item, index) => {
      const existing = shared.commitments?.find((commitment) => commitment.label === item.label);
      return { id: existing?.id ?? `${record.id}-commitment-${index + 1}`, label: item.label, status: item.status };
    })
  }));
}

function displayDate(value: string, language: Language): string {
  try {
    return new Intl.DateTimeFormat(language === 'es' ? 'es-CL' : 'en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  } catch {
    return value;
  }
}

function actionName(type: WorkActionType, language: Language): string {
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

export function ClientWorkspaceEnhanced({ language, selectedId, onSelectedId, onStartSession }: { language: Language; selectedId: string; onSelectedId: (id: string) => void; onStartSession: (clientId: string) => void }) {
  const [clients, setClients] = useState<ClientRecord[]>(loadClients);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ClientRecord | null>(null);
  const [note, setNote] = useState('');
  const [journalTick, setJournalTick] = useState(0);
  const [actionType, setActionType] = useState<WorkActionType>('email');
  const [actionNote, setActionNote] = useState('');
  const [actionDate, setActionDate] = useState('2026-09-29');
  const [actionTime, setActionTime] = useState('10:00');
  const [assignee, setAssignee] = useState('Mentor');

  useEffect(() => {
    try { localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(clients)); } catch {}
    clients.forEach(syncToSession);
  }, [clients]);

  const client = useMemo(() => clients.find((item) => item.id === selectedId) ?? clients[0], [clients, selectedId]);
  const journal = useMemo(() => loadJournal().filter((entry) => entry.clientId === client.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [client.id, journalTick]);

  const updateClient = (updater: (current: ClientRecord) => ClientRecord) => {
    setClients((current) => current.map((item) => item.id === client.id ? updater(item) : item));
  };

  const recordEvent = (type: string, title: string, body: string) => {
    appendJournal(client.id, type, title, body);
    setJournalTick((current) => current + 1);
  };

  const toggleCommitment = (index: number) => {
    const currentCommitment = client.commitments[index];
    if (!currentCommitment) return;
    const nextStatus: CommitmentStatus = currentCommitment.status === 'done' ? 'pending' : 'done';
    updateClient((current) => ({ ...current, commitments: current.commitments.map((item, itemIndex) => itemIndex === index ? { ...item, status: nextStatus } : item) }));
    recordEvent('commitment', nextStatus === 'done' ? (language === 'es' ? 'Compromiso completado' : 'Commitment completed') : (language === 'es' ? 'Compromiso reabierto' : 'Commitment reopened'), currentCommitment.label);
  };

  const cycleMilestone = (index: number) => {
    const currentMilestone = client.milestones[index];
    if (!currentMilestone) return;
    const order: MilestoneStatus[] = ['pending', 'current', 'done'];
    const nextStatus = order[(order.indexOf(currentMilestone.status) + 1) % order.length];
    updateClient((current) => ({ ...current, milestones: current.milestones.map((item, itemIndex) => itemIndex === index ? { ...item, status: nextStatus } : item) }));
    recordEvent('milestone', language === 'es' ? 'Hito actualizado' : 'Milestone updated', `${currentMilestone.label} → ${nextStatus}`);
  };

  const saveRecord = () => {
    if (!draft) return;
    setClients((current) => current.map((item) => item.id === draft.id ? draft : item));
    recordEvent('record', language === 'es' ? 'Ficha actualizada' : 'Record updated', language === 'es' ? 'Se actualizaron datos estructurales del cliente.' : 'Structural client data was updated.');
    setEditing(false);
  };

  const addNote = () => {
    if (!note.trim()) return;
    recordEvent('note', language === 'es' ? 'Nota' : 'Note', note.trim());
    setNote('');
  };

  const createAction = () => {
    const label = actionName(actionType, language);
    const description = actionNote.trim() || `${label} · ${client.name}`;
    addWorkTask({
      clientId: client.id,
      clientName: client.name,
      title: description,
      type: actionType,
      note: actionNote.trim(),
      dueDate: actionDate,
      dueTime: actionTime,
      assignee,
      source: 'manual',
      confirmationEmail: actionType === 'meeting' ? 'queued' : 'not-required'
    });
    updateClient((current) => ({ ...current, nextAction: `${label}${actionDate ? ` · ${actionDate}` : ''}${actionTime ? ` ${actionTime}` : ''}` }));
    recordEvent('task', language === 'es' ? 'Acción creada' : 'Action created', `${description} · ${assignee}${actionDate ? ` · ${actionDate}` : ''}${actionTime ? ` ${actionTime}` : ''}`);
    setActionNote('');
  };

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="self-start rounded-2xl border border-black/10 bg-white p-3 shadow-[0_10px_30px_rgba(10,10,10,0.035)]">
        <div className="px-3 py-2"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">{language === 'es' ? 'CLIENTES ACTIVOS' : 'ACTIVE CLIENTS'}</p><h3 className="mt-1 text-lg font-semibold">46 {language === 'es' ? 'personas' : 'people'}</h3></div>
        <div className="mt-2 space-y-1">
          {clients.map((item) => (
            <button key={item.id} type="button" onClick={() => { onSelectedId(item.id); setEditing(false); }} className={`w-full rounded-xl p-3 text-left transition ${item.id === client.id ? 'bg-[#111413] text-white' : 'hover:bg-black/[0.035]'}`}>
              <div className="flex gap-3"><div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold ${item.id === client.id ? 'bg-white/10' : 'bg-[#0A3F4D]/8 text-[#0A3F4D]'}`}>{item.initials}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.name}</p><p className={`mt-1 text-[11px] ${item.id === client.id ? 'text-white/45' : 'text-black/40'}`}>{item.progress}</p><p className={`mt-1 truncate text-xs ${item.id === client.id ? 'text-white/65' : 'text-black/50'}`}>{item.nextAction}</p></div></div>
            </button>
          ))}
        </div>
      </aside>

      <div className="min-w-0 space-y-6">
        <section className="relative rounded-2xl border border-black/10 bg-white p-5 shadow-[0_10px_30px_rgba(10,10,10,0.035)] md:p-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div className="flex items-center gap-4"><div className="grid h-12 w-12 place-items-center rounded-full bg-[#111413] text-sm font-semibold text-white">{client.initials}</div><div><h2 className="text-2xl font-semibold tracking-tight">{client.name}</h2><p className="mt-1 text-sm text-black/45">{client.company}</p></div></div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => onStartSession(client.id)} className="inline-flex items-center gap-2 rounded-full bg-[#111413] px-4 py-2.5 text-xs font-semibold text-white"><Play className="h-3.5 w-3.5" />{language === 'es' ? 'Iniciar modo sesión' : 'Start session mode'}</button>
              <button type="button" onClick={() => { setDraft({ ...client, blockers: [...client.blockers], milestones: client.milestones.map((item) => ({ ...item })), commitments: client.commitments.map((item) => ({ ...item })) }); setEditing(true); }} className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3.5 py-2.5 text-xs font-semibold text-black/55 hover:border-[#0A3F4D]/30 hover:text-[#0A3F4D]"><Pencil className="h-3.5 w-3.5" />{language === 'es' ? 'Editar ficha' : 'Edit record'}</button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[[language === 'es' ? 'Programa' : 'Program', client.program], [language === 'es' ? 'Fecha de inicio' : 'Start date', client.startDate], [language === 'es' ? 'Duración' : 'Duration', client.duration], [language === 'es' ? 'Progreso' : 'Progress', client.progress]].map(([label, value]) => <div key={label} className="rounded-xl bg-[#F7F7F5] p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35">{label}</p><p className="mt-2 text-sm font-semibold">{value}</p></div>)}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[[language === 'es' ? 'Tipo de negocio' : 'Business type', client.businessType], ['Email', client.email], [language === 'es' ? 'Teléfono' : 'Phone', client.phone], [language === 'es' ? 'Fase del plan' : 'Plan phase', client.currentPhase]].map(([label, value]) => <div key={label} className="rounded-xl border border-black/7 bg-[#FAFAF8] p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35">{label}</p><p className="mt-2 break-words text-sm font-medium text-black/70">{value}</p></div>)}
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className={`rounded-2xl border p-5 ${client.status !== 'active' ? 'border-[#A23A32]/15 bg-[#FFF8F7]' : 'border-black/10 bg-white'}`}>
            <p className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${client.status !== 'active' ? 'text-[#8D332C]' : 'text-black/35'}`}>{language === 'es' ? 'REQUIERE ATENCIÓN' : 'NEEDS ATTENTION'}</p>
            {client.status !== 'active' ? <><div className="mt-2 flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#A23A32] px-3 py-1 text-xs font-semibold text-white">{client.attentionAction}</span></div><p className="mt-2 text-sm leading-6 text-black/60">{client.attentionReason}</p></> : <p className="mt-2 text-sm text-black/45">{language === 'es' ? 'Sin alertas activas en este momento.' : 'No active alerts right now.'}</p>}
          </section>

          <section className="rounded-2xl border border-[#0A3F4D]/15 bg-[#F5F9F8] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'PRÓXIMA ACCIÓN' : 'NEXT ACTION'}</p>
            <p className="mt-2 text-sm font-semibold leading-6">{client.nextAction}</p>
            <p className="mt-2 text-xs text-black/40">{language === 'es' ? `Próxima sesión: ${client.nextSession}` : `Next session: ${client.nextSession}`}</p>
          </section>
        </div>

        <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'ACCIONES' : 'ACTIONS'}</p><h3 className="mt-2 text-lg font-semibold">{language === 'es' ? 'Crear seguimiento o delegar trabajo' : 'Create follow-up or delegate work'}</h3><p className="mt-1 text-sm text-black/45">{language === 'es' ? 'Cada acción entra a Trabajo prioritario y queda registrada en la bitácora.' : 'Every action enters Priority Work and is recorded in the journal.'}</p></div>
            <div className="flex flex-wrap gap-2">{(['email','call','meeting','task'] as WorkActionType[]).map((type) => <button key={type} type="button" onClick={() => setActionType(type)} className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold transition ${actionType === type ? 'bg-[#111413] text-white' : 'border border-black/10 bg-white text-black/55'}`}><ActionIcon type={type} />{actionName(type, language)}</button>)}</div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[minmax(220px,1fr)_150px_120px_150px_auto] md:items-end">
            <label><span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.14em] text-black/35">{language === 'es' ? 'NOTA / OBJETIVO' : 'NOTE / PURPOSE'}</span><input value={actionNote} onChange={(event) => setActionNote(event.target.value)} placeholder={language === 'es' ? 'Ej: enviar resumen y próximos pasos' : 'E.g. send summary and next steps'} className="w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm outline-none focus:border-[#0A3F4D]/40" /></label>
            <label><span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.14em] text-black/35">{language === 'es' ? 'FECHA' : 'DATE'}</span><input type="date" value={actionDate} onChange={(event) => setActionDate(event.target.value)} className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none" /></label>
            <label><span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.14em] text-black/35">{language === 'es' ? 'HORA' : 'TIME'}</span><input type="time" value={actionTime} onChange={(event) => setActionTime(event.target.value)} className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none" /></label>
            <label><span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.14em] text-black/35">{language === 'es' ? 'RESPONSABLE' : 'ASSIGNEE'}</span><select value={assignee} onChange={(event) => setAssignee(event.target.value)} className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none"><option>Mentor</option><option>Equipo</option><option>Asistente</option><option>Ventas</option></select></label>
            <button type="button" onClick={createAction} className="rounded-xl bg-[#111413] px-4 py-2.5 text-xs font-semibold text-white">{language === 'es' ? 'Crear acción' : 'Create action'}</button>
          </div>
          {actionType === 'meeting' && <p className="mt-3 text-[10px] text-black/38">{language === 'es' ? 'La reunión queda registrada y la confirmación de email queda en cola. El envío externo se activará al conectar el canal de correo del Workspace.' : 'The meeting is recorded and email confirmation is queued. External delivery activates when the Workspace email channel is connected.'}</p>}
        </section>

        {editing && draft && (
          <section className="rounded-2xl border border-[#0A3F4D]/20 bg-white p-5 md:p-6">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'EDITAR FICHA' : 'EDIT RECORD'}</p><p className="mt-1 text-sm text-black/45">{language === 'es' ? 'Datos estructurales de la relación.' : 'Structural relationship data.'}</p></div><button type="button" onClick={() => setEditing(false)}><X className="h-4 w-4" /></button></div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {([['company', language === 'es' ? 'Empresa / negocio' : 'Company / business'], ['businessType', language === 'es' ? 'Tipo de negocio' : 'Business type'], ['email', 'Email'], ['phone', language === 'es' ? 'Teléfono' : 'Phone'], ['program', language === 'es' ? 'Programa' : 'Program'], ['startDate', language === 'es' ? 'Fecha de inicio' : 'Start date'], ['duration', language === 'es' ? 'Duración' : 'Duration'], ['primaryGoal', language === 'es' ? 'Objetivo principal' : 'Primary goal']] as const).map(([field, label]) => <label key={field}><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40">{label}</span><input value={draft[field]} onChange={(event) => setDraft({ ...draft, [field]: event.target.value })} className="w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm outline-none focus:border-[#0A3F4D]/40" /></label>)}
            </div>
            <button type="button" onClick={saveRecord} className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#111413] px-4 py-2.5 text-xs font-semibold text-white"><Save className="h-3.5 w-3.5" />{language === 'es' ? 'Guardar ficha' : 'Save record'}</button>
          </section>
        )}

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">OUTCOME MEMORY</p><h3 className="mt-2 text-lg font-semibold">{client.primaryGoal}</h3></div><Target className="h-5 w-5 text-[#0A3F4D]" /></div><div className="mt-4 space-y-3 text-sm leading-6 text-black/60"><p><strong className="text-black/75">{language === 'es' ? 'Situación inicial:' : 'Starting point:'}</strong> {client.startingPoint}</p><p><strong className="text-black/75">{language === 'es' ? 'Resultado esperado:' : 'Expected outcome:'}</strong> {client.expectedOutcome}</p><p><strong className="text-black/75">{language === 'es' ? 'Brecha:' : 'Gap:'}</strong> {client.currentGap}</p></div></section>
          <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">{language === 'es' ? 'PLAN ACTUAL' : 'CURRENT PLAN'}</p><div className="mt-3 rounded-xl bg-[#F7F7F5] p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35">{language === 'es' ? 'Fase del plan' : 'Plan phase'}</p><p className="mt-1 text-sm font-semibold">{client.currentPhase}</p></div><p className="mt-3 text-sm leading-6 text-black/60">{client.planSummary}</p></section>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6"><div className="flex items-center justify-between"><h3 className="font-semibold">{language === 'es' ? 'Hitos' : 'Milestones'}</h3><span className="text-[10px] text-black/35">{language === 'es' ? 'Clic para actualizar' : 'Click to update'}</span></div><div className="mt-4 space-y-2">{client.milestones.map((item, index) => <button key={item.label} type="button" onClick={() => cycleMilestone(index)} className="flex w-full items-center gap-3 rounded-xl bg-[#F7F7F5] p-3 text-left">{item.status === 'done' ? <CheckCircle2 className="h-4 w-4 text-[#0A3F4D]" /> : item.status === 'current' ? <Clock3 className="h-4 w-4 text-[#A46F16]" /> : <Circle className="h-4 w-4 text-black/25" />}<span className="text-sm">{item.label}</span></button>)}</div></section>
          <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6"><div className="flex items-center justify-between"><h3 className="font-semibold">{language === 'es' ? 'Compromisos' : 'Commitments'}</h3><span className="text-[10px] text-black/35">{language === 'es' ? 'Clic para completar' : 'Click to complete'}</span></div><div className="mt-4 space-y-2">{client.commitments.map((item, index) => <button key={item.label} type="button" onClick={() => toggleCommitment(index)} className="flex w-full items-center gap-3 rounded-xl border border-black/7 p-3 text-left">{item.status === 'done' ? <CheckCircle2 className="h-4 w-4 text-[#0A3F4D]" /> : item.status === 'overdue' ? <AlertTriangle className="h-4 w-4 text-[#A23A32]" /> : <Circle className="h-4 w-4 text-black/25" />}<span className="text-sm">{item.label}</span></button>)}</div><button type="button" onClick={() => onStartSession(client.id)} className="mt-4 inline-flex items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-xs font-semibold text-black/55 hover:border-[#0A3F4D]/30 hover:text-[#0A3F4D]"><Play className="h-3.5 w-3.5" />{language === 'es' ? 'Trabajar en modo sesión' : 'Work in session mode'}</button></section>
        </div>

        <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
          <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'BITÁCORA' : 'JOURNAL'}</p><h3 className="mt-2 text-lg font-semibold">{language === 'es' ? 'Historial de relación' : 'Relationship history'}</h3><p className="mt-1 text-sm text-black/45">{language === 'es' ? 'Sesiones, tareas, notas, decisiones, compromisos y cambios en un mismo historial.' : 'Sessions, tasks, notes, decisions, commitments and changes in one history.'}</p></div><History className="h-5 w-5 text-[#0A3F4D]" /></div>
          <div className="mt-4 flex gap-2"><input value={note} onChange={(event) => setNote(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addNote(); }} placeholder={language === 'es' ? 'Añadir nota rápida…' : 'Add quick note…'} className="flex-1 rounded-xl border border-black/10 px-3.5 py-2.5 text-sm outline-none focus:border-[#0A3F4D]/40" /><button type="button" onClick={addNote} className="rounded-xl bg-[#111413] px-4 text-xs font-semibold text-white">{language === 'es' ? 'Añadir' : 'Add'}</button></div>
          <div className="mt-5 max-h-[390px] space-y-4 overflow-y-auto pr-2">
            {journal.length === 0 && <div className="rounded-xl bg-[#F7F7F5] p-4 text-sm text-black/45">{language === 'es' ? 'La bitácora se irá construyendo con las acciones y sesiones del cliente.' : 'The journal will build itself from client actions and sessions.'}</div>}
            {journal.map((entry) => <div key={entry.id} className="flex gap-3"><div className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#0A3F4D]" /><div className="min-w-0 flex-1 border-b border-black/5 pb-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{entry.title}</p><span className="text-[10px] text-black/35">{displayDate(entry.createdAt, language)}</span></div><p className="mt-1 text-sm leading-6 text-black/55">{entry.body}</p></div></div>)}
          </div>
        </section>
      </div>
    </div>
  );
}
