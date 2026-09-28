import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleGauge,
  Clock3,
  LayoutDashboard,
  ListTodo,
  MessageSquareText,
  Settings,
  Sparkles,
  Target,
  UserCheck,
  Users
} from 'lucide-react';
import { ActiveClientsWorkspace } from './ActiveClientsWorkspace.tsx';
import {
  expertsVerticalPreset,
  type WorkspaceNavItem
} from '../config/workspaces/experts.ts';

type ExpertsWorkspaceProps = {
  onExit: () => void;
};

type MetricCard = {
  label: string;
  value: string;
  detail: string;
  progress: number;
  trend: string;
};

type AttentionItem = {
  name: string;
  state: string;
  reason: string;
  action: string;
  tone: 'critical' | 'attention';
};

const METRICS: MetricCard[] = [
  { label: 'Priority Work', value: '7', detail: '3 clientes · 4 leads', progress: 70, trend: 'requieren atención hoy' },
  { label: 'Active Clients', value: '46', detail: '+4 este mes', progress: 82, trend: '+9% vs mes anterior' },
  { label: 'New Leads', value: '18', detail: 'este mes', progress: 64, trend: '+12% vs mes anterior' },
  { label: 'Sessions Today', value: '5', detail: '2 por preparar', progress: 58, trend: '3 briefs listos' }
];

const ATTENTION: AttentionItem[] = [
  {
    name: 'Sofía Martínez',
    state: 'Active client',
    reason: '2 compromisos vencidos y sin actualización de progreso en 9 días.',
    action: 'Revisar cliente',
    tone: 'critical'
  },
  {
    name: 'Diego Rojas',
    state: 'Renewal',
    reason: 'El programa termina en 16 días y aún no existe próxima acción de renovación.',
    action: 'Preparar renovación',
    tone: 'attention'
  },
  {
    name: 'Valentina Cruz',
    state: 'Lead',
    reason: 'Alta intención detectada. La última conversación quedó sin siguiente paso.',
    action: 'Abrir oportunidad',
    tone: 'attention'
  }
];

const NAV_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  overview: LayoutDashboard,
  priority: CircleGauge,
  leads: UserCheck,
  clients: Users,
  sessions: MessageSquareText,
  tasks: ListTodo,
  calendar: CalendarDays,
  copilot: Sparkles,
  knowledge: BookOpenCheck
};

const NAV_SECTIONS: Array<{ id: WorkspaceNavItem['section']; label?: string }> = [
  { id: 'main' },
  { id: 'people', label: 'PEOPLE' },
  { id: 'work', label: 'WORK' },
  { id: 'intelligence', label: 'INTELLIGENCE' }
];

function Ring({ value }: { value: number }) {
  return (
    <div
      className="relative h-12 w-12 rounded-full"
      style={{ background: `conic-gradient(#0A3F4D 0 ${value}%, #E7E7E3 ${value}% 100%)` }}
      aria-label={`${value}%`}
    >
      <div className="absolute inset-[5px] rounded-full bg-white" />
    </div>
  );
}

function Metric({ metric }: { metric: MetricCard }) {
  return (
    <article className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_12px_35px_rgba(10,10,10,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/45">{metric.label}</p>
          <div className="mt-3 flex items-end gap-2">
            <strong className="text-3xl font-semibold tracking-tight">{metric.value}</strong>
            <span className="pb-1 text-xs text-black/45">{metric.detail}</span>
          </div>
        </div>
        <Ring value={metric.progress} />
      </div>
      <p className="mt-4 border-t border-black/5 pt-3 text-xs text-black/55">{metric.trend}</p>
    </article>
  );
}

function Dashboard({ onNavigate }: { onNavigate: (id: string) => void }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {METRICS.map((metric) => <Metric key={metric.label} metric={metric} />)}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
        <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_12px_35px_rgba(10,10,10,0.04)] md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">THE RADAR</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">Priority Work</h2>
              <p className="mt-1 text-sm text-black/50">Personas que necesitan una intervención concreta, sin importar su etapa.</p>
            </div>
            <span className="rounded-full bg-[#A23A32]/8 px-3 py-1.5 text-xs font-semibold text-[#8D332C]">7 today</span>
          </div>

          <div className="mt-4">
            {ATTENTION.map((item) => (
              <div key={item.name} className="flex flex-col gap-4 border-b border-black/5 py-5 last:border-b-0 md:flex-row md:items-center">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${item.tone === 'critical' ? 'bg-[#A23A32]' : 'bg-[#A46F16]'}`} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{item.name}</h3>
                      <span className="rounded-full bg-black/[0.04] px-2.5 py-1 text-[11px] font-medium text-black/55">{item.state}</span>
                    </div>
                    <p className="mt-1.5 max-w-2xl text-sm leading-6 text-black/55">{item.reason}</p>
                  </div>
                </div>
                <button
                  onClick={() => item.state === 'Active client' ? onNavigate('clients') : onNavigate('priority')}
                  className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold transition hover:border-[#0A3F4D]/40 hover:text-[#0A3F4D] md:self-auto"
                >
                  {item.action}
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          <button onClick={() => onNavigate('priority')} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#0A3F4D]">
            Ver todo Priority Work
            <ChevronRight className="h-4 w-4" />
          </button>
        </section>

        <div className="grid gap-6">
          <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_12px_35px_rgba(10,10,10,0.04)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">TODAY</p>
                <h2 className="mt-2 text-lg font-semibold">Upcoming Sessions</h2>
              </div>
              <CalendarDays className="h-5 w-5 text-[#0A3F4D]" />
            </div>
            <div className="mt-4 space-y-4">
              {[
                ['10:00', 'Andrés Silva', 'Brief ready · revisar avance comercial'],
                ['15:30', 'Camila Soto', '3 compromisos pendientes'],
                ['18:00', 'Tomás León', 'Primera sesión de onboarding']
              ].map(([time, name, note]) => (
                <div key={`${time}-${name}`} className="flex gap-4 border-b border-black/5 pb-4 last:border-b-0 last:pb-0">
                  <div className="w-12 text-sm font-semibold text-black/65">{time}</div>
                  <div>
                    <p className="text-sm font-medium">{name}</p>
                    <p className="mt-1 text-xs text-black/45">{note}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-[#0A3F4D] p-5 text-white shadow-[0_18px_45px_rgba(10,63,77,0.16)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">G-KAIS COPILOT</p>
                <h2 className="mt-2 text-lg font-semibold">Context before action.</h2>
              </div>
              <Sparkles className="h-5 w-5 text-white/80" />
            </div>
            <p className="mt-3 text-sm leading-6 text-white/70">Hay 2 sesiones hoy con compromisos pendientes. Sofía requiere atención y Diego entra en ventana de renovación.</p>
            <button onClick={() => onNavigate('copilot')} className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#0A3F4D]">
              Abrir Copilot
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </section>
        </div>
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          ['Renewals <30 days', '6 clientes', <Target key="target" className="h-4.5 w-4.5 text-[#0A3F4D]" />],
          ['No next action', '3 personas', <AlertTriangle key="alert" className="h-4.5 w-4.5 text-[#0A3F4D]" />],
          ['Vertical Knowledge', 'Experts preset active', <BookOpenCheck key="book" className="h-4.5 w-4.5 text-[#0A3F4D]" />]
        ].map(([label, detail, icon]) => (
          <div key={String(label)} className="rounded-2xl border border-black/10 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#0A3F4D]/8">{icon}</div>
              <div>
                <p className="text-sm font-semibold">{label}</p>
                <p className="text-xs text-black/45">{detail}</p>
              </div>
            </div>
          </div>
        ))}
      </section>
    </>
  );
}

function Placeholder({ activeNav, activeLabel }: { activeNav: string; activeLabel: string }) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white p-8 shadow-[0_12px_35px_rgba(10,10,10,0.04)]">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#0A3F4D]/8">
        {activeNav === 'knowledge'
          ? <BookOpenCheck className="h-5 w-5 text-[#0A3F4D]" />
          : activeNav === 'copilot'
            ? <Sparkles className="h-5 w-5 text-[#0A3F4D]" />
            : <CircleGauge className="h-5 w-5 text-[#0A3F4D]" />}
      </div>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">WORKSPACE FOUNDATION</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight">{activeLabel}</h2>
      <p className="mt-3 max-w-xl text-sm leading-6 text-black/55">Esta sección se conectará con las funciones existentes de G-KAIS siguiendo el orden de validación del primer cliente.</p>

      {activeNav === 'knowledge' && (
        <div className="mt-6 rounded-xl bg-[#F7F7F5] p-5">
          <p className="text-sm font-semibold">Experts Knowledge cargado automáticamente</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {expertsVerticalPreset.defaultKnowledgeTopics.map((topic) => (
              <span key={topic} className="rounded-full border border-black/8 bg-white px-3 py-1.5 text-xs text-black/55">{topic}</span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export function ExpertsWorkspace({ onExit }: ExpertsWorkspaceProps) {
  const [activeNav, setActiveNav] = useState('overview');
  const activeLabel = useMemo(
    () => expertsVerticalPreset.navigation.find((item) => item.id === activeNav)?.label ?? 'Dashboard',
    [activeNav]
  );

  const content = activeNav === 'overview'
    ? <Dashboard onNavigate={setActiveNav} />
    : activeNav === 'clients'
      ? <ActiveClientsWorkspace />
      : <Placeholder activeNav={activeNav} activeLabel={activeLabel} />;

  return (
    <div className="min-h-screen bg-[#F4F4F1] text-[#0A0A0A]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[245px] border-r border-black/10 bg-[#111413] text-white lg:flex lg:flex-col">
        <div className="border-b border-white/10 px-5 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">G-KAIS</p>
              <p className="mt-1 text-sm font-semibold">for Experts</p>
            </div>
            <span className="rounded-full border border-white/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-white/45">v1</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV_SECTIONS.map((section) => {
            const items = expertsVerticalPreset.navigation.filter((item) => item.section === section.id);
            return (
              <div key={section.id} className={section.id === 'main' ? '' : 'mt-6'}>
                {section.label && <p className="mb-2 px-3 text-[9px] font-semibold tracking-[0.18em] text-white/30">{section.label}</p>}
                <div className="space-y-1">
                  {items.map((item) => {
                    const Icon = NAV_ICONS[item.id] ?? LayoutDashboard;
                    const selected = activeNav === item.id;
                    const count = item.id === 'priority' ? 7 : item.id === 'leads' ? 18 : item.id === 'clients' ? 46 : undefined;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveNav(item.id)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${selected ? 'bg-white text-[#111413]' : 'text-white/65 hover:bg-white/[0.06] hover:text-white'}`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        {typeof count === 'number' && <span className={`text-[10px] font-semibold ${selected ? 'text-[#0A3F4D]' : 'text-white/35'}`}>{count}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/55 hover:bg-white/[0.06] hover:text-white">
            <Settings className="h-4 w-4" />
            Settings
          </button>
          <div className="mt-2 rounded-xl bg-white/[0.05] p-3">
            <p className="text-xs font-semibold">Método Escala</p>
            <p className="mt-0.5 text-[10px] text-white/35">Experts Workspace</p>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[245px]">
        <header className="sticky top-0 z-20 border-b border-black/8 bg-[#F4F4F1]/95 px-4 py-3 backdrop-blur md:px-8 lg:px-10">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={onExit} className="grid h-9 w-9 place-items-center rounded-full border border-black/10 bg-white text-black/60 transition hover:text-black" aria-label="Salir del workspace">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/35">Método Escala</p>
                <h1 className="text-sm font-semibold">{activeLabel}</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden rounded-full border border-[#0A3F4D]/15 bg-[#0A3F4D]/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#0A3F4D] sm:block">Experts Knowledge active</div>
              <div className="grid h-9 w-9 place-items-center rounded-full bg-[#111413] text-xs font-semibold text-white">CE</div>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-[1500px]">
            <div className="mb-6 lg:hidden">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {expertsVerticalPreset.navigation.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveNav(item.id)}
                    className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold ${activeNav === item.id ? 'bg-[#111413] text-white' : 'border border-black/10 bg-white text-black/55'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0A3F4D]">{activeNav === 'overview' ? 'DAILY OPERATING VIEW' : 'G-KAIS WORKSPACE'}</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.035em] md:text-4xl">{activeNav === 'overview' ? 'What needs your attention?' : activeLabel}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-black/50">
                  {activeNav === 'overview'
                    ? 'Una vista diaria para entender el negocio, priorizar personas y entrar a cada conversación con contexto.'
                    : activeNav === 'clients'
                      ? 'La relación completa de cada cliente: objetivo, plan, compromisos, bloqueadores, sesiones y próxima acción.'
                      : 'Área de trabajo conectada al ciclo de vida de cada persona.'}
                </p>
              </div>
              {activeNav === 'overview' && (
                <div className="flex items-center gap-2 text-xs text-black/45">
                  <CheckCircle2 className="h-4 w-4 text-[#0A3F4D]" />
                  Actualizado hoy · 09:42
                </div>
              )}
            </div>

            {content}
          </div>
        </main>
      </div>
    </div>
  );
}
