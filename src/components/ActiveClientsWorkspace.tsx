import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BriefcaseBusiness,
  Building2,
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
import { useLanguage, type Language } from '../i18n/LanguageContext';

type ClientStatus = 'active' | 'attention' | 'renewal';
type MilestoneStatus = 'done' | 'current' | 'pending';
type CommitmentStatus = 'done' | 'pending' | 'overdue';

type Milestone = {
  label: string;
  status: MilestoneStatus;
};

type Commitment = {
  label: string;
  status: CommitmentStatus;
};

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
  week: string;
  status: ClientStatus;
  owner: string;
  nextAction: string;
  primaryGoal: string;
  currentPhase: string;
  nextSession: string;
  lastUpdate: string;
  startingPoint: string;
  expectedOutcome: string;
  currentGap: string;
  planSummary: string;
  blockers: string[];
  milestones: Milestone[];
  commitments: Commitment[];
  copilotSummary: string;
  sessionFocus: string;
  lastSessionSummary: string;
  lastSessionAgo: string;
};

const INITIAL_CLIENTS: ClientRecord[] = [
  {
    id: 'sofia',
    name: 'Sofía Martínez',
    initials: 'SM',
    company: 'Sofía Martínez Consulting',
    businessType: 'Mentoría de negocio',
    email: 'sofia@example.com',
    phone: '+56 9 5555 0101',
    program: 'Mentoría Escala',
    startDate: '12 ago 2026',
    duration: '24 semanas',
    week: 'Semana 7 / 24',
    status: 'attention',
    owner: 'Camila Espinoza',
    nextAction: 'Revisar compromisos antes de la próxima sesión',
    primaryGoal: 'US$15k mensuales',
    currentPhase: 'Adquisición',
    nextSession: 'Martes · 15:30',
    lastUpdate: 'Hace 9 días',
    startingPoint: 'Dependencia de referidos y seguimiento comercial irregular.',
    expectedOutcome: 'Crear adquisición predecible y llegar a US$15k/mes.',
    currentGap: 'Funnel activo, pero ejecución inconsistente y volumen insuficiente.',
    planSummary: 'Validar el funnel actual con suficiente volumen, estabilizar la rutina comercial y aumentar la ejecución semanal antes de cambiar la estrategia.',
    blockers: ['Ejecución inconsistente', 'Dificultad delegando', 'Poco contenido publicado'],
    milestones: [
      { label: 'Oferta redefinida', status: 'done' },
      { label: 'Landing publicada', status: 'done' },
      { label: 'Primer funnel activo', status: 'current' },
      { label: '10 llamadas calificadas por semana', status: 'pending' }
    ],
    commitments: [
      { label: 'Publicar 3 piezas de contenido', status: 'overdue' },
      { label: 'Contactar 25 prospectos', status: 'pending' },
      { label: 'Revisión comercial cada viernes', status: 'done' },
      { label: 'Gym 3 veces por semana', status: 'done' }
    ],
    copilotSummary: 'Sofía lleva siete semanas en el programa. El funnel ya está activo, pero el avance se frenó por ejecución irregular. Dos compromisos están pendientes y no hay actualización desde hace nueve días.',
    sessionFocus: 'Entender qué impidió ejecutar, validar resultados reales del funnel y cerrar con un compromiso medible para los próximos siete días.',
    lastSessionSummary: 'Se decidió mantener el funnel actual una semana más antes de cambiar la estrategia. Sofía se comprometió a aumentar la ejecución para obtener una muestra suficiente de resultados.',
    lastSessionAgo: 'hace 9 días'
  },
  {
    id: 'andres',
    name: 'Andrés Silva',
    initials: 'AS',
    company: 'Silva Growth',
    businessType: 'Consultoría comercial',
    email: 'andres@example.com',
    phone: '+56 9 5555 0102',
    program: 'Mentoría Escala',
    startDate: '15 jul 2026',
    duration: '24 semanas',
    week: 'Semana 11 / 24',
    status: 'active',
    owner: 'Camila Espinoza',
    nextAction: 'Sesión hoy 10:00',
    primaryGoal: 'US$20k mensuales',
    currentPhase: 'Conversión',
    nextSession: 'Hoy · 10:00',
    lastUpdate: 'Ayer',
    startingPoint: 'Buen volumen de oportunidades, pero cierre comercial inconsistente.',
    expectedOutcome: 'Aumentar la tasa de cierre y estabilizar ingresos mensuales.',
    currentGap: 'El equipo genera reuniones, pero no existe un proceso de venta consistente.',
    planSummary: 'Estandarizar diagnóstico, propuesta y seguimiento comercial antes de aumentar inversión en adquisición.',
    blockers: ['Seguimiento irregular', 'Propuestas poco estandarizadas'],
    milestones: [
      { label: 'Guion de diagnóstico definido', status: 'done' },
      { label: 'Pipeline comercial ordenado', status: 'done' },
      { label: 'Seguimiento post-llamada', status: 'current' },
      { label: 'Tasa de cierre sobre 30%', status: 'pending' }
    ],
    commitments: [
      { label: 'Revisar 5 llamadas grabadas', status: 'done' },
      { label: 'Enviar follow-up dentro de 24h', status: 'pending' },
      { label: 'Actualizar pipeline cada viernes', status: 'done' }
    ],
    copilotSummary: 'Andrés está ejecutando con consistencia. La prioridad de la próxima sesión es revisar calidad de seguimiento y detectar dónde se pierden oportunidades después de la llamada.',
    sessionFocus: 'Revisar llamadas recientes, identificar objeciones repetidas y definir un follow-up estándar para las próximas dos semanas.',
    lastSessionSummary: 'Se acordó mantener el volumen actual de reuniones y concentrarse en mejorar seguimiento y cierre antes de escalar adquisición.',
    lastSessionAgo: 'hace 6 días'
  },
  {
    id: 'diego',
    name: 'Diego Rojas',
    initials: 'DR',
    company: 'Rojas Advisory',
    businessType: 'Asesoría estratégica',
    email: 'diego@example.com',
    phone: '+56 9 5555 0103',
    program: 'Mentoría Escala',
    startDate: '20 abr 2026',
    duration: '24 semanas',
    week: 'Semana 22 / 24',
    status: 'renewal',
    owner: 'Camila Espinoza',
    nextAction: 'Preparar conversación de renovación',
    primaryGoal: 'Consolidar equipo y delegar delivery',
    currentPhase: 'Renovación',
    nextSession: 'Jueves · 12:00',
    lastUpdate: 'Hace 3 días',
    startingPoint: 'El fundador concentraba ventas, delivery y operación.',
    expectedOutcome: 'Delegar operación y mantener crecimiento sin aumentar carga personal.',
    currentGap: 'La delegación mejoró, pero aún existen decisiones críticas concentradas en el fundador.',
    planSummary: 'Cerrar el ciclo actual midiendo avances, identificar el siguiente cuello de botella y definir si una segunda etapa tiene valor claro.',
    blockers: ['Decisiones centralizadas', 'Documentación incompleta'],
    milestones: [
      { label: 'Responsabilidades del equipo definidas', status: 'done' },
      { label: 'Reunión operativa semanal', status: 'done' },
      { label: 'SOPs principales documentados', status: 'current' },
      { label: 'Plan de segunda etapa', status: 'pending' }
    ],
    commitments: [
      { label: 'Documentar SOP de onboarding', status: 'pending' },
      { label: 'Preparar métricas de cierre del programa', status: 'done' }
    ],
    copilotSummary: 'Diego está cerca del cierre del programa. El foco ya no es solo ejecución: necesitamos conectar resultados logrados, brechas pendientes y el valor concreto de una eventual segunda etapa.',
    sessionFocus: 'Revisar resultados del programa, cuantificar cambios y abrir una conversación de renovación basada en el siguiente problema real.',
    lastSessionSummary: 'Se acordó terminar la documentación operativa y llegar a la próxima sesión con una lista clara de tareas que todavía dependen de Diego.',
    lastSessionAgo: 'hace 3 días'
  }
];

const STATUS_STYLES: Record<ClientStatus, string> = {
  active: 'bg-[#0A3F4D]/8 text-[#0A3F4D]',
  attention: 'bg-[#A23A32]/8 text-[#8D332C]',
  renewal: 'bg-[#A46F16]/10 text-[#82570F]'
};

const STORAGE_KEY = 'gkais-experts-client-records-v1';

function loadInitialClients(): ClientRecord[] {
  if (typeof window === 'undefined') return INITIAL_CLIENTS;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return INITIAL_CLIENTS;
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as ClientRecord[];
  } catch {}
  return INITIAL_CLIENTS;
}

function cloneClient(client: ClientRecord): ClientRecord {
  return {
    ...client,
    blockers: [...client.blockers],
    milestones: client.milestones.map((milestone) => ({ ...milestone })),
    commitments: client.commitments.map((commitment) => ({ ...commitment }))
  };
}

function statusLabel(status: ClientStatus, language: Language): string {
  if (status === 'attention') return language === 'es' ? 'Requiere atención' : 'Needs attention';
  if (status === 'renewal') return language === 'es' ? 'Renovación' : 'Renewal';
  return language === 'es' ? 'Activo' : 'Active';
}

function commitmentStatusLabel(status: CommitmentStatus, language: Language): string {
  if (status === 'done') return language === 'es' ? 'completo' : 'done';
  if (status === 'overdue') return language === 'es' ? 'vencido' : 'overdue';
  return language === 'es' ? 'pendiente' : 'pending';
}

function DetailField({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-black/7 bg-[#FAFAF8] p-4">
      <div className="flex items-center gap-2 text-black/35">
        {icon}
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em]">{label}</p>
      </div>
      <p className="mt-2 break-words text-sm font-medium text-black/72">{value || '—'}</p>
    </div>
  );
}

function InputField({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
        className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#0A3F4D]/45 focus:ring-2 focus:ring-[#0A3F4D]/8"
      />
    </label>
  );
}

function TextAreaField({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (value: string) => void; rows?: number }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40">{label}</span>
      <textarea
        value={value}
        rows={rows}
        onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value)}
        className="w-full resize-y rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm leading-6 outline-none transition focus:border-[#0A3F4D]/45 focus:ring-2 focus:ring-[#0A3F4D]/8"
      />
    </label>
  );
}

function EditClientPanel({
  draft,
  setDraft,
  onSave,
  onCancel,
  language
}: {
  draft: ClientRecord;
  setDraft: React.Dispatch<React.SetStateAction<ClientRecord | null>>;
  onSave: () => void;
  onCancel: () => void;
  language: Language;
}) {
  const setField = (key: keyof ClientRecord, value: string) => {
    setDraft((current) => current ? { ...current, [key]: value } : current);
  };

  const updateMilestone = (index: number, label: string) => {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        milestones: current.milestones.map((milestone, itemIndex) => itemIndex === index ? { ...milestone, label } : milestone)
      };
    });
  };

  const updateCommitment = (index: number, label: string) => {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        commitments: current.commitments.map((commitment, itemIndex) => itemIndex === index ? { ...commitment, label } : commitment)
      };
    });
  };

  return (
    <section className="rounded-2xl border border-[#0A3F4D]/20 bg-white p-5 shadow-[0_18px_50px_rgba(10,63,77,0.08)] md:p-6">
      <div className="flex flex-col justify-between gap-4 border-b border-black/7 pb-5 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'MODO EDICIÓN' : 'EDIT MODE'}</p>
          <h3 className="mt-2 text-xl font-semibold">{language === 'es' ? 'Editar relación y resultados' : 'Edit relationship and outcomes'}</h3>
          <p className="mt-1 text-sm text-black/45">
            {language === 'es' ? 'Los cambios de esta etapa se guardan localmente en el navegador.' : 'At this stage, changes are saved locally in this browser.'}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="inline-flex items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-xs font-semibold text-black/55 hover:text-black">
            <X className="h-3.5 w-3.5" />
            {language === 'es' ? 'Cancelar' : 'Cancel'}
          </button>
          <button type="button" onClick={onSave} className="inline-flex items-center gap-2 rounded-full bg-[#111413] px-4 py-2 text-xs font-semibold text-white">
            <Save className="h-3.5 w-3.5" />
            {language === 'es' ? 'Guardar cambios' : 'Save changes'}
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl bg-[#F7F7F5] p-5">
          <h4 className="text-sm font-semibold">{language === 'es' ? 'Negocio y programa' : 'Business and program'}</h4>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <InputField label={language === 'es' ? 'Empresa / negocio' : 'Company / business'} value={draft.company} onChange={(value) => setField('company', value)} />
            <InputField label={language === 'es' ? 'Tipo de negocio' : 'Business type'} value={draft.businessType} onChange={(value) => setField('businessType', value)} />
            <InputField label="Email" value={draft.email} onChange={(value) => setField('email', value)} type="email" />
            <InputField label={language === 'es' ? 'Teléfono' : 'Phone'} value={draft.phone} onChange={(value) => setField('phone', value)} />
            <InputField label={language === 'es' ? 'Programa contratado' : 'Program'} value={draft.program} onChange={(value) => setField('program', value)} />
            <InputField label={language === 'es' ? 'Responsable' : 'Owner'} value={draft.owner} onChange={(value) => setField('owner', value)} />
            <InputField label={language === 'es' ? 'Fecha de inicio' : 'Start date'} value={draft.startDate} onChange={(value) => setField('startDate', value)} />
            <InputField label={language === 'es' ? 'Duración' : 'Duration'} value={draft.duration} onChange={(value) => setField('duration', value)} />
            <InputField label={language === 'es' ? 'Etapa actual' : 'Current phase'} value={draft.currentPhase} onChange={(value) => setField('currentPhase', value)} />
            <InputField label={language === 'es' ? 'Próxima sesión' : 'Next session'} value={draft.nextSession} onChange={(value) => setField('nextSession', value)} />
          </div>
        </div>

        <div className="rounded-2xl bg-[#F7F7F5] p-5">
          <h4 className="text-sm font-semibold">Outcome Memory</h4>
          <div className="mt-4 space-y-4">
            <InputField label={language === 'es' ? 'Objetivo principal' : 'Primary goal'} value={draft.primaryGoal} onChange={(value) => setField('primaryGoal', value)} />
            <TextAreaField label={language === 'es' ? 'Situación inicial' : 'Starting point'} value={draft.startingPoint} onChange={(value) => setField('startingPoint', value)} />
            <TextAreaField label={language === 'es' ? 'Resultado esperado' : 'Expected outcome'} value={draft.expectedOutcome} onChange={(value) => setField('expectedOutcome', value)} />
            <TextAreaField label={language === 'es' ? 'Brecha actual' : 'Current gap'} value={draft.currentGap} onChange={(value) => setField('currentGap', value)} />
          </div>
        </div>

        <div className="rounded-2xl bg-[#F7F7F5] p-5">
          <h4 className="text-sm font-semibold">{language === 'es' ? 'Plan y continuidad' : 'Plan and continuity'}</h4>
          <div className="mt-4 space-y-4">
            <TextAreaField label={language === 'es' ? 'Plan actual' : 'Current plan'} value={draft.planSummary} onChange={(value) => setField('planSummary', value)} />
            <TextAreaField label={language === 'es' ? 'Próxima acción' : 'Next action'} value={draft.nextAction} onChange={(value) => setField('nextAction', value)} rows={2} />
            <TextAreaField
              label={language === 'es' ? 'Bloqueadores · uno por línea' : 'Blockers · one per line'}
              value={draft.blockers.join('\n')}
              onChange={(value) => setDraft((current) => current ? { ...current, blockers: value.split('\n').map((item) => item.trim()).filter(Boolean) } : current)}
              rows={4}
            />
          </div>
        </div>

        <div className="rounded-2xl bg-[#F7F7F5] p-5">
          <h4 className="text-sm font-semibold">{language === 'es' ? 'Hitos y compromisos' : 'Milestones and commitments'}</h4>
          <div className="mt-4 space-y-5">
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40">{language === 'es' ? 'Hitos' : 'Milestones'}</p>
              <div className="space-y-2">
                {draft.milestones.map((milestone, index) => (
                  <input
                    key={`${milestone.status}-${index}`}
                    value={milestone.label}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => updateMilestone(index, event.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#0A3F4D]/45"
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40">{language === 'es' ? 'Compromisos' : 'Commitments'}</p>
              <div className="space-y-2">
                {draft.commitments.map((commitment, index) => (
                  <input
                    key={`${commitment.status}-${index}`}
                    value={commitment.label}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => updateCommitment(index, event.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#0A3F4D]/45"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ActiveClientsWorkspace() {
  const { language } = useLanguage();
  const [clients, setClients] = useState<ClientRecord[]>(loadInitialClients);
  const [selectedId, setSelectedId] = useState('sofia');
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<ClientRecord | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
    } catch {}
  }, [clients]);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedId) ?? clients[0],
    [clients, selectedId]
  );

  const selectClient = (id: string) => {
    setSelectedId(id);
    setIsEditing(false);
    setDraft(null);
  };

  const startEditing = () => {
    setDraft(cloneClient(selectedClient));
    setIsEditing(true);
  };

  const saveEditing = () => {
    if (!draft) return;
    setClients((current) => current.map((client) => client.id === draft.id ? cloneClient(draft) : client));
    setIsEditing(false);
    setDraft(null);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setDraft(null);
  };

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[310px_minmax(0,1fr)]">
      <aside className="self-start rounded-2xl border border-black/10 bg-white p-3 shadow-[0_12px_35px_rgba(10,10,10,0.04)]">
        <div className="px-3 pb-3 pt-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">{language === 'es' ? 'CLIENTES ACTIVOS' : 'ACTIVE CLIENTS'}</p>
              <h3 className="mt-1 text-lg font-semibold">46 {language === 'es' ? 'personas' : 'people'}</h3>
            </div>
            <Users className="h-5 w-5 text-[#0A3F4D]" />
          </div>
        </div>

        <div className="space-y-1">
          {clients.map((client) => {
            const selected = client.id === selectedId;
            return (
              <button
                key={client.id}
                onClick={() => selectClient(client.id)}
                className={`w-full rounded-xl p-3 text-left transition ${selected ? 'bg-[#111413] text-white' : 'hover:bg-black/[0.035]'}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold ${selected ? 'bg-white/10 text-white' : 'bg-[#0A3F4D]/8 text-[#0A3F4D]'}`}>
                    {client.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{client.name}</p>
                      <span className={`h-2 w-2 shrink-0 rounded-full ${client.status === 'attention' ? 'bg-[#B84A40]' : client.status === 'renewal' ? 'bg-[#B78220]' : 'bg-[#2C766B]'}`} />
                    </div>
                    <p className={`mt-1 text-[11px] ${selected ? 'text-white/45' : 'text-black/40'}`}>{client.week}</p>
                    <p className={`mt-2 truncate text-xs ${selected ? 'text-white/65' : 'text-black/55'}`}>{client.nextAction}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="min-w-0 space-y-6">
        {isEditing && draft && (
          <EditClientPanel
            draft={draft}
            setDraft={setDraft}
            onSave={saveEditing}
            onCancel={cancelEditing}
            language={language}
          />
        )}

        <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_12px_35px_rgba(10,10,10,0.04)] md:p-6">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#111413] text-sm font-semibold text-white">{selectedClient.initials}</div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-semibold tracking-tight">{selectedClient.name}</h2>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLES[selectedClient.status]}`}>
                    {statusLabel(selectedClient.status, language)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-black/45">{selectedClient.program} · {selectedClient.week}</p>
                <p className="mt-1 text-xs text-black/35">{selectedClient.company}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row lg:items-start">
              <button
                type="button"
                onClick={startEditing}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-xs font-semibold text-black/60 transition hover:border-[#0A3F4D]/30 hover:text-[#0A3F4D]"
              >
                <Pencil className="h-3.5 w-3.5" />
                {language === 'es' ? 'Editar ficha' : 'Edit record'}
              </button>
              <div className="rounded-xl border border-[#0A3F4D]/15 bg-[#0A3F4D]/5 px-4 py-3 sm:max-w-[360px]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'PRÓXIMA ACCIÓN' : 'NEXT ACTION'}</p>
                <div className="mt-1 flex items-center justify-between gap-4">
                  <p className="text-sm font-semibold">{selectedClient.nextAction}</p>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#0A3F4D]" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl bg-[#F7F7F5] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35">{language === 'es' ? 'OBJETIVO PRINCIPAL' : 'PRIMARY GOAL'}</p>
              <p className="mt-2 text-sm font-semibold">{selectedClient.primaryGoal}</p>
            </div>
            <div className="rounded-xl bg-[#F7F7F5] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35">{language === 'es' ? 'ETAPA ACTUAL' : 'CURRENT PHASE'}</p>
              <p className="mt-2 text-sm font-semibold">{selectedClient.currentPhase}</p>
            </div>
            <div className="rounded-xl bg-[#F7F7F5] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35">{language === 'es' ? 'PRÓXIMA SESIÓN' : 'NEXT SESSION'}</p>
              <p className="mt-2 text-sm font-semibold">{selectedClient.nextSession}</p>
            </div>
            <div className="rounded-xl bg-[#F7F7F5] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35">{language === 'es' ? 'ÚLTIMA ACTUALIZACIÓN' : 'LAST UPDATE'}</p>
              <p className="mt-2 text-sm font-semibold">{selectedClient.lastUpdate}</p>
            </div>
          </div>
        </div>

        <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'RELACIÓN' : 'RELATIONSHIP'}</p>
              <h3 className="mt-2 text-lg font-semibold">{language === 'es' ? 'Contexto del cliente y su negocio' : 'Client and business context'}</h3>
              <p className="mt-1 text-sm text-black/45">
                {language === 'es'
                  ? 'Datos operativos suficientes para entender a la persona sin convertir esta ficha en un CRM tradicional.'
                  : 'Enough operational context to understand the person without turning this record into a traditional CRM.'}
              </p>
            </div>
            <BriefcaseBusiness className="h-5 w-5 text-[#0A3F4D]" />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <DetailField label={language === 'es' ? 'Empresa / negocio' : 'Company / business'} value={selectedClient.company} icon={<Building2 className="h-3.5 w-3.5" />} />
            <DetailField label={language === 'es' ? 'Tipo de negocio' : 'Business type'} value={selectedClient.businessType} icon={<BriefcaseBusiness className="h-3.5 w-3.5" />} />
            <DetailField label="Email" value={selectedClient.email} icon={<Mail className="h-3.5 w-3.5" />} />
            <DetailField label={language === 'es' ? 'Teléfono' : 'Phone'} value={selectedClient.phone} icon={<Phone className="h-3.5 w-3.5" />} />
            <DetailField label={language === 'es' ? 'Programa' : 'Program'} value={selectedClient.program} />
            <DetailField label={language === 'es' ? 'Fecha de inicio' : 'Start date'} value={selectedClient.startDate} icon={<CalendarDays className="h-3.5 w-3.5" />} />
            <DetailField label={language === 'es' ? 'Duración' : 'Duration'} value={selectedClient.duration} icon={<Clock3 className="h-3.5 w-3.5" />} />
            <DetailField label={language === 'es' ? 'Responsable' : 'Owner'} value={selectedClient.owner} icon={<UserRound className="h-3.5 w-3.5" />} />
          </div>
        </section>

        <div className="grid gap-6 2xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">OUTCOME MEMORY</p>
                  <h3 className="mt-2 text-lg font-semibold">{language === 'es' ? 'Por qué compró → qué debe cambiar' : 'Why they bought → what must change'}</h3>
                </div>
                <Target className="h-5 w-5 text-[#0A3F4D]" />
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-black/8 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35">{language === 'es' ? 'SITUACIÓN INICIAL' : 'STARTING POINT'}</p>
                  <p className="mt-2 text-sm leading-6 text-black/65">{selectedClient.startingPoint}</p>
                </div>
                <div className="rounded-xl border border-black/8 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35">{language === 'es' ? 'RESULTADO ESPERADO' : 'EXPECTED OUTCOME'}</p>
                  <p className="mt-2 text-sm leading-6 text-black/65">{selectedClient.expectedOutcome}</p>
                </div>
                <div className="rounded-xl border border-black/8 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35">{language === 'es' ? 'BRECHA ACTUAL' : 'CURRENT GAP'}</p>
                  <p className="mt-2 text-sm leading-6 text-black/65">{selectedClient.currentGap}</p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">{language === 'es' ? 'PLAN ACTUAL' : 'CURRENT PLAN'}</p>
                  <h3 className="mt-2 text-lg font-semibold">{language === 'es' ? 'Plan e hitos' : 'Plan and milestones'}</h3>
                </div>
                <Flag className="h-5 w-5 text-[#0A3F4D]" />
              </div>
              <p className="mt-4 rounded-xl bg-[#F7F7F5] p-4 text-sm leading-6 text-black/62">{selectedClient.planSummary}</p>

              <div className="mt-4 space-y-3">
                {selectedClient.milestones.map((milestone, index) => (
                  <div key={`${milestone.label}-${index}`} className="flex items-center gap-3 rounded-xl bg-[#F7F7F5] p-3.5">
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-xs font-semibold text-black/45">{index + 1}</div>
                    <p className="flex-1 text-sm font-medium">{milestone.label}</p>
                    {milestone.status === 'done' ? (
                      <CheckCircle2 className="h-4.5 w-4.5 text-[#0A3F4D]" />
                    ) : milestone.status === 'current' ? (
                      <Clock3 className="h-4.5 w-4.5 text-[#A46F16]" />
                    ) : (
                      <Circle className="h-4.5 w-4.5 text-black/20" />
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl bg-[#0A3F4D] p-5 text-white shadow-[0_18px_45px_rgba(10,63,77,0.16)] md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">G-KAIS COPILOT</p>
                  <h3 className="mt-2 text-xl font-semibold">{language === 'es' ? 'Preparación de sesión' : 'Session preparation'}</h3>
                </div>
                <Sparkles className="h-5 w-5 text-white/80" />
              </div>

              <p className="mt-4 text-sm leading-6 text-white/72">{selectedClient.copilotSummary}</p>

              <div className="mt-5 rounded-xl bg-white/[0.08] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">{language === 'es' ? 'FOCO DE LA PRÓXIMA SESIÓN' : 'FOCUS FOR NEXT SESSION'}</p>
                <p className="mt-2 text-sm leading-6 text-white/85">{selectedClient.sessionFocus}</p>
              </div>

              <button className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#0A3F4D]">
                {language === 'es' ? 'Abrir brief completo' : 'Open full brief'}
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </section>

            <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">{language === 'es' ? 'COMPROMISOS' : 'COMMITMENTS'}</p>
                  <h3 className="mt-2 text-lg font-semibold">{language === 'es' ? 'Accountability actual' : 'Current accountability'}</h3>
                </div>
                <CheckCircle2 className="h-5 w-5 text-[#0A3F4D]" />
              </div>

              <div className="mt-4 space-y-2">
                {selectedClient.commitments.map((commitment, index) => (
                  <div key={`${commitment.label}-${index}`} className="flex items-center gap-3 rounded-xl border border-black/7 p-3.5">
                    {commitment.status === 'done' ? (
                      <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-[#0A3F4D]" />
                    ) : commitment.status === 'overdue' ? (
                      <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-[#A23A32]" />
                    ) : (
                      <Circle className="h-4.5 w-4.5 shrink-0 text-black/25" />
                    )}
                    <p className="flex-1 text-sm text-black/65">{commitment.label}</p>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-black/30">{commitmentStatusLabel(commitment.status, language)}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">{language === 'es' ? 'BLOQUEADORES' : 'BLOCKERS'}</p>
                <h3 className="mt-2 text-lg font-semibold">{language === 'es' ? '¿Qué está frenando el progreso?' : 'What is slowing progress?'}</h3>
              </div>
              <AlertTriangle className="h-5 w-5 text-[#A46F16]" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedClient.blockers.map((blocker) => (
                <span key={blocker} className="rounded-full border border-black/8 bg-[#F7F7F5] px-3 py-2 text-xs text-black/60">{blocker}</span>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">{language === 'es' ? 'ÚLTIMA SESIÓN' : 'LAST SESSION'}</p>
                <h3 className="mt-2 text-lg font-semibold">{language === 'es' ? 'Memoria de decisiones' : 'Decision memory'}</h3>
              </div>
              <MessageSquareText className="h-5 w-5 text-[#0A3F4D]" />
            </div>
            <p className="mt-4 text-sm leading-6 text-black/60">{selectedClient.lastSessionSummary}</p>
            <div className="mt-4 flex items-center gap-2 text-xs text-black/40">
              <CalendarDays className="h-3.5 w-3.5" />
              {language === 'es' ? `Última sesión · ${selectedClient.lastSessionAgo}` : `Last session · ${selectedClient.lastSessionAgo}`}
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-black/10 bg-[#111413] p-5 text-white md:p-6">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[0.08]">
                <UserRound className="h-5 w-5 text-white/75" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/40">PERSON MEMORY</p>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
                  {language === 'es'
                    ? 'Esta ficha conecta por qué compró, qué se prometió, qué plan sigue, qué ha hecho, qué lo bloquea y qué debería ocurrir después. Esa continuidad es el núcleo de G-KAIS.'
                    : 'This record connects why they bought, what was promised, the plan, what they did, what blocks them and what should happen next. That continuity is the core of G-KAIS.'}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 rounded-full bg-white/[0.07] px-3 py-2 text-xs text-white/55">
              <Clock3 className="h-3.5 w-3.5" />
              {language === 'es' ? 'Timeline activo' : 'Timeline active'}
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}