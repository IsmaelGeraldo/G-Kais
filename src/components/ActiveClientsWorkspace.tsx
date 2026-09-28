import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  Flag,
  MessageSquareText,
  Sparkles,
  Target,
  UserRound,
  Users
} from 'lucide-react';

type ClientSummary = {
  id: string;
  name: string;
  initials: string;
  program: string;
  week: string;
  status: 'active' | 'attention' | 'renewal';
  nextAction: string;
};

type Milestone = {
  label: string;
  status: 'done' | 'current' | 'pending';
};

type Commitment = {
  label: string;
  status: 'done' | 'pending' | 'overdue';
};

const CLIENTS: ClientSummary[] = [
  {
    id: 'sofia',
    name: 'Sofía Martínez',
    initials: 'SM',
    program: 'Mentoría Escala',
    week: 'Semana 7 / 24',
    status: 'attention',
    nextAction: 'Revisar compromisos vencidos'
  },
  {
    id: 'andres',
    name: 'Andrés Silva',
    initials: 'AS',
    program: 'Mentoría Escala',
    week: 'Semana 11 / 24',
    status: 'active',
    nextAction: 'Sesión hoy 10:00'
  },
  {
    id: 'diego',
    name: 'Diego Rojas',
    initials: 'DR',
    program: 'Mentoría Escala',
    week: 'Semana 22 / 24',
    status: 'renewal',
    nextAction: 'Preparar renovación'
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

const STATUS_STYLES: Record<ClientSummary['status'], string> = {
  active: 'bg-[#0A3F4D]/8 text-[#0A3F4D]',
  attention: 'bg-[#A23A32]/8 text-[#8D332C]',
  renewal: 'bg-[#A46F16]/10 text-[#82570F]'
};

export function ActiveClientsWorkspace() {
  const [selectedId, setSelectedId] = useState('sofia');
  const selectedClient = useMemo(
    () => CLIENTS.find((client) => client.id === selectedId) ?? CLIENTS[0],
    [selectedId]
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[310px_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-black/10 bg-white p-3 shadow-[0_12px_35px_rgba(10,10,10,0.04)]">
        <div className="px-3 pb-3 pt-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">ACTIVE CLIENTS</p>
              <h3 className="mt-1 text-lg font-semibold">46 personas</h3>
            </div>
            <Users className="h-5 w-5 text-[#0A3F4D]" />
          </div>
        </div>

        <div className="space-y-1">
          {CLIENTS.map((client) => {
            const selected = client.id === selectedId;
            return (
              <button
                key={client.id}
                onClick={() => setSelectedId(client.id)}
                className={`w-full rounded-xl p-3 text-left transition ${
                  selected ? 'bg-[#111413] text-white' : 'hover:bg-black/[0.035]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                    selected ? 'bg-white/10 text-white' : 'bg-[#0A3F4D]/8 text-[#0A3F4D]'
                  }`}>
                    {client.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{client.name}</p>
                      <span className={`h-2 w-2 shrink-0 rounded-full ${
                        client.status === 'attention'
                          ? 'bg-[#B84A40]'
                          : client.status === 'renewal'
                            ? 'bg-[#B78220]'
                            : 'bg-[#2C766B]'
                      }`} />
                    </div>
                    <p className={`mt-1 text-[11px] ${selected ? 'text-white/45' : 'text-black/40'}`}>
                      {client.week}
                    </p>
                    <p className={`mt-2 truncate text-xs ${selected ? 'text-white/65' : 'text-black/55'}`}>
                      {client.nextAction}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="min-w-0 space-y-6">
        <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_12px_35px_rgba(10,10,10,0.04)] md:p-6">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#111413] text-sm font-semibold text-white">
                {selectedClient.initials}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-semibold tracking-tight">{selectedClient.name}</h2>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLES[selectedClient.status]}`}>
                    {selectedClient.status === 'attention'
                      ? 'Needs attention'
                      : selectedClient.status === 'renewal'
                        ? 'Renewal'
                        : 'Active'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-black/45">
                  {selectedClient.program} · {selectedClient.week}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-[#0A3F4D]/15 bg-[#0A3F4D]/5 px-4 py-3 lg:max-w-[360px]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">NEXT ACTION</p>
              <div className="mt-1 flex items-center justify-between gap-4">
                <p className="text-sm font-semibold">Revisar compromisos antes de la próxima sesión</p>
                <ChevronRight className="h-4 w-4 shrink-0 text-[#0A3F4D]" />
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl bg-[#F7F7F5] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35">PRIMARY GOAL</p>
              <p className="mt-2 text-sm font-semibold">US$15k mensuales</p>
            </div>
            <div className="rounded-xl bg-[#F7F7F5] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35">CURRENT PHASE</p>
              <p className="mt-2 text-sm font-semibold">Adquisición</p>
            </div>
            <div className="rounded-xl bg-[#F7F7F5] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35">NEXT SESSION</p>
              <p className="mt-2 text-sm font-semibold">Martes · 15:30</p>
            </div>
            <div className="rounded-xl bg-[#F7F7F5] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35">LAST UPDATE</p>
              <p className="mt-2 text-sm font-semibold">Hace 9 días</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 2xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">OUTCOME MEMORY</p>
                  <h3 className="mt-2 text-lg font-semibold">Why she bought → what must change</h3>
                </div>
                <Target className="h-5 w-5 text-[#0A3F4D]" />
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-black/8 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35">STARTING POINT</p>
                  <p className="mt-2 text-sm leading-6 text-black/65">
                    Dependencia de referidos y seguimiento comercial irregular.
                  </p>
                </div>
                <div className="rounded-xl border border-black/8 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35">EXPECTED OUTCOME</p>
                  <p className="mt-2 text-sm leading-6 text-black/65">
                    Crear adquisición predecible y llegar a US$15k/mes.
                  </p>
                </div>
                <div className="rounded-xl border border-black/8 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35">CURRENT GAP</p>
                  <p className="mt-2 text-sm leading-6 text-black/65">
                    Funnel activo, pero ejecución inconsistente y volumen insuficiente.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">CURRENT PLAN</p>
                  <h3 className="mt-2 text-lg font-semibold">Milestones</h3>
                </div>
                <Flag className="h-5 w-5 text-[#0A3F4D]" />
              </div>

              <div className="mt-5 space-y-3">
                {MILESTONES.map((milestone, index) => (
                  <div key={milestone.label} className="flex items-center gap-3 rounded-xl bg-[#F7F7F5] p-3.5">
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-xs font-semibold text-black/45">
                      {index + 1}
                    </div>
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
                  <h3 className="mt-2 text-xl font-semibold">Session preparation</h3>
                </div>
                <Sparkles className="h-5 w-5 text-white/80" />
              </div>

              <p className="mt-4 text-sm leading-6 text-white/72">
                Sofía lleva siete semanas en el programa. El funnel ya está activo, pero el avance se frenó por ejecución irregular. Dos compromisos están pendientes y no hay actualización desde hace nueve días.
              </p>

              <div className="mt-5 rounded-xl bg-white/[0.08] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">FOCUS FOR NEXT SESSION</p>
                <p className="mt-2 text-sm leading-6 text-white/85">
                  Entender qué impidió ejecutar, validar resultados reales del funnel y cerrar con un compromiso medible para los próximos siete días.
                </p>
              </div>

              <button className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#0A3F4D]">
                Abrir brief completo
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </section>

            <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">COMMITMENTS</p>
                  <h3 className="mt-2 text-lg font-semibold">Current accountability</h3>
                </div>
                <CheckCircle2 className="h-5 w-5 text-[#0A3F4D]" />
              </div>

              <div className="mt-4 space-y-2">
                {COMMITMENTS.map((commitment) => (
                  <div key={commitment.label} className="flex items-center gap-3 rounded-xl border border-black/7 p-3.5">
                    {commitment.status === 'done' ? (
                      <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-[#0A3F4D]" />
                    ) : commitment.status === 'overdue' ? (
                      <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-[#A23A32]" />
                    ) : (
                      <Circle className="h-4.5 w-4.5 shrink-0 text-black/25" />
                    )}
                    <p className="flex-1 text-sm text-black/65">{commitment.label}</p>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-black/30">
                      {commitment.status}
                    </span>
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
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">BLOCKERS</p>
                <h3 className="mt-2 text-lg font-semibold">What is slowing progress?</h3>
              </div>
              <AlertTriangle className="h-5 w-5 text-[#A46F16]" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {['Ejecución inconsistente', 'Dificultad delegando', 'Poco contenido publicado'].map((blocker) => (
                <span key={blocker} className="rounded-full border border-black/8 bg-[#F7F7F5] px-3 py-2 text-xs text-black/60">
                  {blocker}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">LAST SESSION</p>
                <h3 className="mt-2 text-lg font-semibold">Decision memory</h3>
              </div>
              <MessageSquareText className="h-5 w-5 text-[#0A3F4D]" />
            </div>
            <p className="mt-4 text-sm leading-6 text-black/60">
              Se decidió mantener el funnel actual una semana más antes de cambiar la estrategia. Sofía se comprometió a aumentar la ejecución para obtener una muestra suficiente de resultados.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-black/40">
              <CalendarDays className="h-3.5 w-3.5" />
              Última sesión · hace 9 días
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
                  Esta ficha conecta por qué compró, qué se prometió, qué plan sigue, qué ha hecho, qué la bloquea y qué debería ocurrir después. Esa continuidad es el núcleo de G-KAIS.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 rounded-full bg-white/[0.07] px-3 py-2 text-xs text-white/55">
              <Clock3 className="h-3.5 w-3.5" />
              Timeline activo
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
