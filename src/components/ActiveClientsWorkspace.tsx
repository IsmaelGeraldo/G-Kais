import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  Flag,
  Mail,
  MessageSquareText,
  Pencil,
  Phone,
  Save,
  Sparkles,
  Target,
  UserRound,
  Users,
  X
} from 'lucide-react';

type Language = 'es' | 'en';
type ClientStatus = 'active' | 'attention' | 'renewal';
type ClientRecord = {
  id: string;
  name: string;
  initials: string;
  business: string;
  businessType: string;
  email: string;
  phone: string;
  program: string;
  startDate: string;
  duration: string;
  week: string;
  status: ClientStatus;
  owner: string;
  goal: string;
  phase: string;
  nextSession: string;
  lastUpdate: string;
  nextAction: string;
  startingPoint: string;
  expectedOutcome: string;
  currentGap: string;
  plan: string;
  blockers: string[];
  lastSession: string;
};

type Milestone = { label: string; status: 'done' | 'current' | 'pending' };
type Commitment = { label: string; status: 'done' | 'pending' | 'overdue' };

type ActiveClientsWorkspaceProps = { language?: Language };

const INITIAL_CLIENTS: ClientRecord[] = [
  {
    id: 'sofia', name: 'Sofía Martínez', initials: 'SM', business: 'Sofía Growth Studio', businessType: 'Consultoría de marketing', email: 'sofia@example.com', phone: '+56 9 5555 0142', program: 'Mentoría Escala', startDate: '12 ago 2026', duration: '24 semanas', week: 'Semana 7 / 24', status: 'attention', owner: 'Camila Espinoza', goal: 'US$15k mensuales', phase: 'Adquisición', nextSession: 'Martes · 15:30', lastUpdate: 'Hace 9 días', nextAction: 'Revisar compromisos antes de la próxima sesión', startingPoint: 'Dependencia de referidos y seguimiento comercial irregular.', expectedOutcome: 'Crear adquisición predecible y llegar a US$15k/mes.', currentGap: 'Funnel activo, pero ejecución inconsistente y volumen insuficiente.', plan: 'Validar el funnel actual, aumentar volumen de prospección y estabilizar una cadencia semanal medible.', blockers: ['Ejecución inconsistente', 'Dificultad delegando', 'Poco contenido publicado'], lastSession: 'Se decidió mantener el funnel actual una semana más antes de cambiar la estrategia. Sofía se comprometió a aumentar la ejecución para obtener una muestra suficiente de resultados.'
  },
  {
    id: 'andres', name: 'Andrés Silva', initials: 'AS', business: 'Silva Advisory', businessType: 'Consultoría estratégica', email: 'andres@example.com', phone: '+56 9 5555 0199', program: 'Mentoría Escala', startDate: '15 jul 2026', duration: '24 semanas', week: 'Semana 11 / 24', status: 'active', owner: 'Camila Espinoza', goal: 'Estandarizar ventas', phase: 'Conversión', nextSession: 'Hoy · 10:00', lastUpdate: 'Ayer', nextAction: 'Preparar revisión comercial', startingPoint: 'Buen flujo de referidos, pero proceso comercial poco estandarizado.', expectedOutcome: 'Sistema comercial repetible con pipeline visible.', currentGap: 'Falta consistencia en seguimiento y cierre.', plan: 'Documentar pipeline, revisar objeciones y medir conversión semanal.', blockers: ['Seguimiento irregular'], lastSession: 'Se acordó revisar la calidad de las oportunidades antes de aumentar adquisición.'
  },
  {
    id: 'diego', name: 'Diego Rojas', initials: 'DR', business: 'Rojas Performance', businessType: 'Coaching ejecutivo', email: 'diego@example.com', phone: '+56 9 5555 0108', program: 'Mentoría Escala', startDate: '20 abr 2026', duration: '24 semanas', week: 'Semana 22 / 24', status: 'renewal', owner: 'Camila Espinoza', goal: 'Consolidar equipo comercial', phase: 'Renovación', nextSession: 'Viernes · 12:00', lastUpdate: 'Hace 3 días', nextAction: 'Preparar conversación de renovación', startingPoint: 'Founder-led sales y poca delegación.', expectedOutcome: 'Equipo capaz de vender sin depender del fundador.', currentGap: 'Proceso delegable, pero accountability aún depende de Diego.', plan: 'Cerrar handoff comercial y definir plan de continuidad para el próximo ciclo.', blockers: ['Delegación incompleta'], lastSession: 'Se revisaron resultados del ciclo y quedó pendiente definir la siguiente meta trimestral.'
  }
];

const MILESTONES: Milestone[] = [
  { label: 'Oferta redefinida', status: 'done' },
  { label: 'Landing publicada', status: 'done' },
  { label: 'Primer funnel activo', status: 'current' },
  { label: '10 llamadas calificadas por semana', status: 'pending' }
];

const COMMITMENTS: Commitment[] = [
  { label: 'Publicar 3 piezas de contenido', status: 'overdue' },
  { label: 'Contactar 25 prospectos', status: 'pending' },
  { label: 'Revisión comercial cada viernes', status: 'done' },
  { label: 'Gym 3 veces por semana', status: 'done' }
];

const STATUS_STYLES: Record<ClientStatus, string> = {
  active: 'bg-[#0A3F4D]/8 text-[#0A3F4D]',
  attention: 'bg-[#A23A32]/8 text-[#8D332C]',
  renewal: 'bg-[#A46F16]/10 text-[#82570F]'
};

function Field({ label, value, editing, onChange, multiline = false }: { label: string; value: string; editing: boolean; onChange: (value: string) => void; multiline?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35">{label}</p>
      {editing ? (
        multiline ? <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-[#0A3F4D]/45" /> : <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-[#0A3F4D]/45" />
      ) : <p className="mt-2 text-sm leading-6 text-black/65">{value}</p>}
    </div>
  );
}

export function ActiveClientsWorkspace({ language = 'es' }: ActiveClientsWorkspaceProps) {
  const [clients, setClients] = useState(INITIAL_CLIENTS);
  const [selectedId, setSelectedId] = useState('sofia');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ClientRecord>(INITIAL_CLIENTS[0]);
  const selectedClient = useMemo(() => clients.find((client) => client.id === selectedId) ?? clients[0], [clients, selectedId]);

  const selectClient = (id: string) => {
    const next = clients.find((client) => client.id === id);
    setSelectedId(id);
    setEditing(false);
    if (next) setDraft(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startEdit = () => { setDraft(selectedClient); setEditing(true); };
  const cancelEdit = () => { setDraft(selectedClient); setEditing(false); };
  const saveEdit = () => { setClients((current) => current.map((client) => client.id === draft.id ? draft : client)); setEditing(false); };
  const updateDraft = (key: keyof ClientRecord, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  const record = editing ? draft : selectedClient;

  const statusLabel = record.status === 'attention' ? (language === 'es' ? 'Necesita atención' : 'Needs attention') : record.status === 'renewal' ? (language === 'es' ? 'Renovación' : 'Renewal') : (language === 'es' ? 'Activo' : 'Active');

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[310px_minmax(0,1fr)]">
      <aside className="self-start rounded-2xl border border-black/10 bg-white p-3 shadow-[0_12px_35px_rgba(10,10,10,0.04)]">
        <div className="px-3 pb-3 pt-2"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">{language === 'es' ? 'CLIENTES ACTIVOS' : 'ACTIVE CLIENTS'}</p><h3 className="mt-1 text-lg font-semibold">46 {language === 'es' ? 'personas' : 'people'}</h3></div><Users className="h-5 w-5 text-[#0A3F4D]" /></div></div>
        <div className="space-y-1">{clients.map((client) => {
          const selected = client.id === selectedId;
          return <button key={client.id} onClick={() => selectClient(client.id)} className={`w-full rounded-xl p-3 text-left transition ${selected ? 'bg-[#111413] text-white' : 'hover:bg-black/[0.035]'}`}><div className="flex items-start gap-3"><div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold ${selected ? 'bg-white/10 text-white' : 'bg-[#0A3F4D]/8 text-[#0A3F4D]'}`}>{client.initials}</div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-semibold">{client.name}</p><span className={`h-2 w-2 shrink-0 rounded-full ${client.status === 'attention' ? 'bg-[#B84A40]' : client.status === 'renewal' ? 'bg-[#B78220]' : 'bg-[#2C766B]'}`} /></div><p className={`mt-1 text-[11px] ${selected ? 'text-white/45' : 'text-black/40'}`}>{client.week}</p><p className={`mt-2 truncate text-xs ${selected ? 'text-white/65' : 'text-black/55'}`}>{client.nextAction}</p></div></div></button>;
        })}</div>
      </aside>

      <section className="min-w-0 space-y-6">
        <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_12px_35px_rgba(10,10,10,0.04)] md:p-6">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
            <div className="flex items-start gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#111413] text-sm font-semibold text-white">{record.initials}</div><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-semibold tracking-tight">{record.name}</h2><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLES[record.status]}`}>{statusLabel}</span></div><p className="mt-1 text-sm text-black/45">{record.program} · {record.week}</p></div></div>
            <div className="flex flex-wrap gap-2">{editing ? <><button onClick={cancelEdit} className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold"><X className="h-3.5 w-3.5" />{language === 'es' ? 'Cancelar' : 'Cancel'}</button><button onClick={saveEdit} className="inline-flex items-center gap-2 rounded-full bg-[#111413] px-4 py-2 text-xs font-semibold text-white"><Save className="h-3.5 w-3.5" />{language === 'es' ? 'Guardar cambios' : 'Save changes'}</button></> : <button onClick={startEdit} className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold transition hover:border-[#0A3F4D]/35 hover:text-[#0A3F4D]"><Pencil className="h-3.5 w-3.5" />{language === 'es' ? 'Editar ficha' : 'Edit record'}</button>}</div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[['PRIMARY GOAL', record.goal], ['CURRENT PHASE', record.phase], ['NEXT SESSION', record.nextSession], ['LAST UPDATE', record.lastUpdate]].map(([label, value]) => <div key={label} className="rounded-xl bg-[#F7F7F5] p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35">{label}</p><p className="mt-2 text-sm font-semibold">{value}</p></div>)}
          </div>
        </div>

        <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
          <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'RELACIÓN Y NEGOCIO' : 'RELATIONSHIP & BUSINESS'}</p><h3 className="mt-2 text-lg font-semibold">{language === 'es' ? 'Contexto operativo del cliente' : 'Client operating context'}</h3></div><BriefcaseBusiness className="h-5 w-5 text-[#0A3F4D]" /></div>
          <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <Field label={language === 'es' ? 'NOMBRE' : 'NAME'} value={record.name} editing={editing} onChange={(value) => updateDraft('name', value)} />
            <Field label={language === 'es' ? 'EMPRESA / NEGOCIO' : 'BUSINESS'} value={record.business} editing={editing} onChange={(value) => updateDraft('business', value)} />
            <Field label={language === 'es' ? 'TIPO DE NEGOCIO' : 'BUSINESS TYPE'} value={record.businessType} editing={editing} onChange={(value) => updateDraft('businessType', value)} />
            <Field label="EMAIL" value={record.email} editing={editing} onChange={(value) => updateDraft('email', value)} />
            <Field label={language === 'es' ? 'TELÉFONO' : 'PHONE'} value={record.phone} editing={editing} onChange={(value) => updateDraft('phone', value)} />
            <Field label={language === 'es' ? 'RESPONSABLE' : 'OWNER'} value={record.owner} editing={editing} onChange={(value) => updateDraft('owner', value)} />
            <Field label={language === 'es' ? 'PROGRAMA' : 'PROGRAM'} value={record.program} editing={editing} onChange={(value) => updateDraft('program', value)} />
            <Field label={language === 'es' ? 'FECHA DE INICIO' : 'START DATE'} value={record.startDate} editing={editing} onChange={(value) => updateDraft('startDate', value)} />
            <Field label={language === 'es' ? 'DURACIÓN' : 'DURATION'} value={record.duration} editing={editing} onChange={(value) => updateDraft('duration', value)} />
          </div>
          {!editing && <div className="mt-5 flex flex-wrap gap-2 text-xs text-black/45"><span className="inline-flex items-center gap-1.5 rounded-full bg-[#F7F7F5] px-3 py-2"><Mail className="h-3.5 w-3.5" />{record.email}</span><span className="inline-flex items-center gap-1.5 rounded-full bg-[#F7F7F5] px-3 py-2"><Phone className="h-3.5 w-3.5" />{record.phone}</span></div>}
        </section>

        <div className="rounded-2xl border border-[#0A3F4D]/15 bg-[#0A3F4D]/5 p-5 md:p-6"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'PRÓXIMA ACCIÓN' : 'NEXT ACTION'}</p>{editing ? <input value={record.nextAction} onChange={(event) => updateDraft('nextAction', event.target.value)} className="mt-2 w-full rounded-xl border border-[#0A3F4D]/15 bg-white px-3 py-2 text-sm font-semibold outline-none" /> : <div className="mt-1 flex items-center justify-between gap-4"><p className="text-sm font-semibold">{record.nextAction}</p><ChevronRight className="h-4 w-4 shrink-0 text-[#0A3F4D]" /></div>}</div>

        <div className="grid gap-6 2xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
              <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">OUTCOME MEMORY</p><h3 className="mt-2 text-lg font-semibold">{language === 'es' ? 'Por qué compró → qué debe cambiar' : 'Why they bought → what must change'}</h3></div><Target className="h-5 w-5 text-[#0A3F4D]" /></div>
              <div className="mt-5 grid gap-4 md:grid-cols-3"><div className="rounded-xl border border-black/8 p-4"><Field label={language === 'es' ? 'SITUACIÓN INICIAL' : 'STARTING POINT'} value={record.startingPoint} editing={editing} onChange={(value) => updateDraft('startingPoint', value)} multiline /></div><div className="rounded-xl border border-black/8 p-4"><Field label={language === 'es' ? 'OUTCOME ESPERADO' : 'EXPECTED OUTCOME'} value={record.expectedOutcome} editing={editing} onChange={(value) => updateDraft('expectedOutcome', value)} multiline /></div><div className="rounded-xl border border-black/8 p-4"><Field label={language === 'es' ? 'BRECHA ACTUAL' : 'CURRENT GAP'} value={record.currentGap} editing={editing} onChange={(value) => updateDraft('currentGap', value)} multiline /></div></div>
              <div className="mt-4 rounded-xl bg-[#F7F7F5] p-4"><Field label={language === 'es' ? 'PLAN PERSONALIZADO' : 'PERSONALIZED PLAN'} value={record.plan} editing={editing} onChange={(value) => updateDraft('plan', value)} multiline /></div>
            </section>

            <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">{language === 'es' ? 'PLAN ACTUAL' : 'CURRENT PLAN'}</p><h3 className="mt-2 text-lg font-semibold">Milestones</h3></div><Flag className="h-5 w-5 text-[#0A3F4D]" /></div><div className="mt-5 space-y-3">{MILESTONES.map((milestone, index) => <div key={milestone.label} className="flex items-center gap-3 rounded-xl bg-[#F7F7F5] p-3.5"><div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-xs font-semibold text-black/45">{index + 1}</div><p className="flex-1 text-sm font-medium">{milestone.label}</p>{milestone.status === 'done' ? <CheckCircle2 className="h-4.5 w-4.5 text-[#0A3F4D]" /> : milestone.status === 'current' ? <Clock3 className="h-4.5 w-4.5 text-[#A46F16]" /> : <Circle className="h-4.5 w-4.5 text-black/20" />}</div>)}</div></section>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl bg-[#0A3F4D] p-5 text-white shadow-[0_18px_45px_rgba(10,63,77,0.16)] md:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">G-KAIS COPILOT</p><h3 className="mt-2 text-xl font-semibold">{language === 'es' ? 'Preparación de sesión' : 'Session preparation'}</h3></div><Sparkles className="h-5 w-5 text-white/80" /></div><p className="mt-4 text-sm leading-6 text-white/72">{language === 'es' ? 'El contexto de relación, plan, compromisos y bloqueadores se combina para preparar la próxima intervención.' : 'Relationship context, plan, commitments and blockers are combined to prepare the next intervention.'}</p><div className="mt-5 rounded-xl bg-white/[0.08] p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">{language === 'es' ? 'FOCO PARA LA PRÓXIMA SESIÓN' : 'FOCUS FOR NEXT SESSION'}</p><p className="mt-2 text-sm leading-6 text-white/85">{record.nextAction}</p></div><button className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#0A3F4D]">{language === 'es' ? 'Abrir brief completo' : 'Open full brief'}<ChevronRight className="h-3.5 w-3.5" /></button></section>
            <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">{language === 'es' ? 'COMPROMISOS' : 'COMMITMENTS'}</p><h3 className="mt-2 text-lg font-semibold">{language === 'es' ? 'Accountability actual' : 'Current accountability'}</h3></div><CheckCircle2 className="h-5 w-5 text-[#0A3F4D]" /></div><div className="mt-4 space-y-2">{COMMITMENTS.map((commitment) => <div key={commitment.label} className="flex items-center gap-3 rounded-xl border border-black/7 p-3.5">{commitment.status === 'done' ? <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-[#0A3F4D]" /> : commitment.status === 'overdue' ? <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-[#A23A32]" /> : <Circle className="h-4.5 w-4.5 shrink-0 text-black/25" />}<p className="flex-1 text-sm text-black/65">{commitment.label}</p><span className="text-[10px] font-semibold uppercase tracking-wide text-black/30">{commitment.status}</span></div>)}</div></section>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2"><section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">{language === 'es' ? 'BLOQUEADORES' : 'BLOCKERS'}</p><h3 className="mt-2 text-lg font-semibold">{language === 'es' ? '¿Qué frena el progreso?' : 'What is slowing progress?'}</h3></div><AlertTriangle className="h-5 w-5 text-[#A46F16]" /></div><div className="mt-4 flex flex-wrap gap-2">{record.blockers.map((blocker) => <span key={blocker} className="rounded-full border border-black/8 bg-[#F7F7F5] px-3 py-2 text-xs text-black/60">{blocker}</span>)}</div></section><section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">{language === 'es' ? 'ÚLTIMA SESIÓN' : 'LAST SESSION'}</p><h3 className="mt-2 text-lg font-semibold">{language === 'es' ? 'Memoria de decisiones' : 'Decision memory'}</h3></div><MessageSquareText className="h-5 w-5 text-[#0A3F4D]" /></div><p className="mt-4 text-sm leading-6 text-black/60">{record.lastSession}</p><div className="mt-4 flex items-center gap-2 text-xs text-black/40"><CalendarDays className="h-3.5 w-3.5" />{language === 'es' ? 'Última sesión' : 'Last session'} · {record.lastUpdate}</div></section></div>

        <section className="rounded-2xl border border-black/10 bg-[#111413] p-5 text-white md:p-6"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-center"><div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[0.08]"><UserRound className="h-5 w-5 text-white/75" /></div><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/40">PERSON MEMORY</p><p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">{language === 'es' ? 'Esta ficha conecta quién es el cliente, por qué compró, qué se prometió, qué plan sigue, qué ha hecho, qué lo bloquea y qué debería ocurrir después.' : 'This record connects who the client is, why they bought, what was promised, the plan, actions, blockers and what should happen next.'}</p></div></div><div className="flex shrink-0 items-center gap-2 rounded-full bg-white/[0.07] px-3 py-2 text-xs text-white/55"><Clock3 className="h-3.5 w-3.5" />{language === 'es' ? 'Timeline activo' : 'Timeline active'}</div></div></section>
      </section>
    </div>
  );
}
