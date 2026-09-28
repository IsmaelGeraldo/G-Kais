import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleGauge,
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

type ExpertsWorkspaceProps = { onExit: () => void };
type Language = 'es' | 'en';
type ThemePreset = 'stone' | 'mist' | 'sand' | 'ice';
type AccentPreset = 'white' | 'teal' | 'violet' | 'amber';
type MetricId = 'priority' | 'sessions' | 'clients' | 'leads';

type MetricCard = {
  id: MetricId;
  value: string;
  detailEs: string;
  detailEn: string;
  trendEs: string;
  trendEn: string;
  ring: number;
  chart?: number[];
};

type AttentionItem = {
  name: string;
  state: 'client' | 'renewal' | 'lead';
  reasonEs: string;
  reasonEn: string;
  actionEs: string;
  actionEn: string;
  tone: 'critical' | 'attention';
};

const METRICS: MetricCard[] = [
  { id: 'priority', value: '7', detailEs: '3 clientes · 4 leads', detailEn: '3 clients · 4 leads', trendEs: 'requieren atención hoy', trendEn: 'need attention today', ring: 78 },
  { id: 'sessions', value: '5', detailEs: '2 por preparar', detailEn: '2 need prep', trendEs: '3 briefs listos', trendEn: '3 briefs ready', ring: 60 },
  { id: 'clients', value: '46', detailEs: '+4 este mes', detailEn: '+4 this month', trendEs: '+9% vs mes anterior', trendEn: '+9% vs previous month', ring: 72, chart: [36, 36, 37, 38, 38, 39, 41, 41, 42, 44, 44, 46] },
  { id: 'leads', value: '18', detailEs: 'este mes', detailEn: 'this month', trendEs: '+12% vs mes anterior', trendEn: '+12% vs previous month', ring: 66, chart: [1, 2, 2, 4, 5, 7, 8, 10, 11, 14, 16, 18] }
];

const ATTENTION: AttentionItem[] = [
  { name: 'Sofía Martínez', state: 'client', reasonEs: '2 compromisos vencidos y sin actualización de progreso en 9 días.', reasonEn: '2 overdue commitments and no progress update for 9 days.', actionEs: 'Revisar cliente', actionEn: 'Review client', tone: 'critical' },
  { name: 'Diego Rojas', state: 'renewal', reasonEs: 'El programa termina en 16 días y aún no existe próxima acción de renovación.', reasonEn: 'The program ends in 16 days and there is no renewal next action yet.', actionEs: 'Preparar renovación', actionEn: 'Prepare renewal', tone: 'attention' },
  { name: 'Valentina Cruz', state: 'lead', reasonEs: 'Alta intención detectada. La última conversación quedó sin siguiente paso.', reasonEn: 'High intent detected. The last conversation ended without a next step.', actionEs: 'Abrir oportunidad', actionEn: 'Open opportunity', tone: 'attention' }
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

const NAV_SECTIONS: Array<{ id: WorkspaceNavItem['section']; es?: string; en?: string }> = [
  { id: 'main' },
  { id: 'people', es: 'PERSONAS', en: 'PEOPLE' },
  { id: 'work', es: 'TRABAJO', en: 'WORK' },
  { id: 'intelligence', es: 'INTELIGENCIA', en: 'INTELLIGENCE' }
];

const NAV_LABELS: Record<string, { es: string; en: string }> = {
  overview: { es: 'Dashboard', en: 'Dashboard' },
  priority: { es: 'Trabajo prioritario', en: 'Priority Work' },
  leads: { es: 'Leads', en: 'Leads' },
  clients: { es: 'Clientes', en: 'Clients' },
  sessions: { es: 'Sesiones', en: 'Sessions' },
  tasks: { es: 'Tareas', en: 'Tasks' },
  calendar: { es: 'Calendario', en: 'Calendar' },
  copilot: { es: 'G-KAIS Copilot', en: 'G-KAIS Copilot' },
  knowledge: { es: 'Knowledge', en: 'Knowledge' },
  settings: { es: 'Configuración', en: 'Settings' }
};

const BG_PRESETS: Record<ThemePreset, string> = {
  stone: 'linear-gradient(135deg,#F4F4F1 0%,#F7F7F5 52%,#ECEDEA 100%)',
  mist: 'linear-gradient(135deg,#F4F5F6 0%,#EEF2F3 52%,#E5ECEC 100%)',
  sand: 'linear-gradient(135deg,#F7F4EE 0%,#F2EEE5 52%,#EAE3D6 100%)',
  ice: 'linear-gradient(135deg,#F5F7F8 0%,#ECF2F4 52%,#E4ECEF 100%)'
};

const ACCENTS: Record<AccentPreset, { selected: string; count: string; dot: string }> = {
  white: { selected: 'bg-white text-[#111413]', count: 'text-[#0A3F4D]', dot: '#FFFFFF' },
  teal: { selected: 'bg-[#DDEBE9] text-[#10201F]', count: 'text-[#0A5B56]', dot: '#79B6AE' },
  violet: { selected: 'bg-[#E9E4F6] text-[#241D35]', count: 'text-[#6D55A8]', dot: '#A28BDA' },
  amber: { selected: 'bg-[#F2E7D1] text-[#2F2617]', count: 'text-[#986A1A]', dot: '#D8A54B' }
};

function labelFor(id: string, language: Language) {
  return NAV_LABELS[id]?.[language] ?? expertsVerticalPreset.navigation.find((item) => item.id === id)?.label ?? id;
}

function metricLabel(id: MetricId, language: Language) {
  const labels: Record<MetricId, { es: string; en: string }> = {
    priority: { es: 'Trabajo prioritario', en: 'Priority Work' },
    sessions: { es: 'Sesiones hoy', en: 'Sessions Today' },
    clients: { es: 'Clientes activos', en: 'Active Clients' },
    leads: { es: 'Nuevos leads', en: 'New Leads' }
  };
  return labels[id][language];
}

function Ring({ value, id }: { value: number; id: MetricId }) {
  const gradient = id === 'priority'
    ? `conic-gradient(#A23A32 0 24%, #D97B32 24% 48%, #E2BC54 48% 68%, #9DBB76 68% ${value}%, #E7E7E3 ${value}% 100%)`
    : id === 'sessions'
      ? `conic-gradient(#7A63B2 0 ${value}%, #E7E7E3 ${value}% 100%)`
      : id === 'clients'
        ? `conic-gradient(#0A3F4D 0 ${value}%, #B8D7D2 ${value}% 86%, #E7E7E3 86% 100%)`
        : `conic-gradient(#356E9D 0 ${value}%, #A8C7DB ${value}% 88%, #E7E7E3 88% 100%)`;

  return (
    <div className="relative h-12 w-12 rounded-full" style={{ background: gradient }} aria-label={`${value}`}>
      <div className="absolute inset-[5px] rounded-full bg-white" />
    </div>
  );
}

function MiniChart({ points, language }: { points: number[]; language: Language }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = Math.max(1, max - min);
  const coords = points.map((value, index) => `${(index / (points.length - 1)) * 100},${38 - ((value - min) / range) * 32}`).join(' ');
  return (
    <div className="mt-4 rounded-xl bg-[#F7F7F5] p-3">
      <svg viewBox="0 0 100 42" className="h-20 w-full" preserveAspectRatio="none" aria-hidden="true">
        <polyline points={coords} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" className="text-[#0A3F4D]" />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-black/35">
        <span>{language === 'es' ? 'Inicio de mes' : 'Month start'}</span>
        <span>{language === 'es' ? 'Hoy' : 'Today'}</span>
      </div>
    </div>
  );
}

function Metric({ metric, language }: { metric: MetricCard; language: Language }) {
  const [expanded, setExpanded] = useState(false);
  const canExpand = Boolean(metric.chart);
  return (
    <article className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_12px_35px_rgba(10,10,10,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/45">{metricLabel(metric.id, language)}</p>
          <div className="mt-3">
            <strong className="block text-4xl font-semibold tracking-tight">{metric.value}</strong>
            <span className="mt-1 block text-xs text-black/45">{language === 'es' ? metric.detailEs : metric.detailEn}</span>
          </div>
        </div>
        <Ring value={metric.ring} id={metric.id} />
      </div>
      <button
        type="button"
        onClick={() => canExpand && setExpanded((value) => !value)}
        className={`mt-4 flex w-full items-center justify-between border-t border-black/5 pt-3 text-left text-xs text-black/55 ${canExpand ? 'cursor-pointer hover:text-[#0A3F4D]' : 'cursor-default'}`}
      >
        <span>{language === 'es' ? metric.trendEs : metric.trendEn}</span>
        {canExpand && <ChevronDown className={`h-3.5 w-3.5 transition ${expanded ? 'rotate-180' : ''}`} />}
      </button>
      {expanded && metric.chart && <MiniChart points={metric.chart} language={language} />}
    </article>
  );
}

function Dashboard({ onNavigate, language }: { onNavigate: (id: string) => void; language: Language }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {METRICS.map((metric) => <Metric key={metric.id} metric={metric} language={language} />)}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
        <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_12px_35px_rgba(10,10,10,0.04)] md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">THE RADAR</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">{language === 'es' ? 'Trabajo prioritario' : 'Priority Work'}</h2>
              <p className="mt-1 text-sm text-black/50">{language === 'es' ? 'Personas que necesitan una intervención concreta, sin importar su etapa.' : 'People who need a concrete intervention, regardless of lifecycle stage.'}</p>
            </div>
            <span className="rounded-full bg-[#A23A32]/8 px-3 py-1.5 text-xs font-semibold text-[#8D332C]">7 {language === 'es' ? 'hoy' : 'today'}</span>
          </div>
          <div className="mt-4">
            {ATTENTION.map((item) => (
              <div key={item.name} className="flex flex-col gap-4 border-b border-black/5 py-5 last:border-b-0 md:flex-row md:items-center">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${item.tone === 'critical' ? 'bg-[#A23A32]' : 'bg-[#A46F16]'}`} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{item.name}</h3>
                      <span className="rounded-full bg-black/[0.04] px-2.5 py-1 text-[11px] font-medium text-black/55">
                        {item.state === 'client' ? (language === 'es' ? 'Cliente activo' : 'Active client') : item.state === 'renewal' ? (language === 'es' ? 'Renovación' : 'Renewal') : 'Lead'}
                      </span>
                    </div>
                    <p className="mt-1.5 max-w-2xl text-sm leading-6 text-black/55">{language === 'es' ? item.reasonEs : item.reasonEn}</p>
                  </div>
                </div>
                <button onClick={() => item.state === 'client' ? onNavigate('clients') : onNavigate('priority')} className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold transition hover:border-[#0A3F4D]/40 hover:text-[#0A3F4D] md:self-auto">
                  {language === 'es' ? item.actionEs : item.actionEn}<ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <button onClick={() => onNavigate('priority')} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#0A3F4D]">
            {language === 'es' ? 'Ver todo el trabajo prioritario' : 'View all Priority Work'}<ChevronRight className="h-4 w-4" />
          </button>
        </section>

        <div className="grid gap-6">
          <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_12px_35px_rgba(10,10,10,0.04)]">
            <div className="flex items-center justify-between">
              <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">{language === 'es' ? 'HOY' : 'TODAY'}</p><h2 className="mt-2 text-lg font-semibold">{language === 'es' ? 'Próximas sesiones' : 'Upcoming Sessions'}</h2></div>
              <CalendarDays className="h-5 w-5 text-[#0A3F4D]" />
            </div>
            <div className="mt-4 space-y-4">
              {[
                ['10:00', 'Andrés Silva', language === 'es' ? 'Brief listo · revisar avance comercial' : 'Brief ready · review commercial progress'],
                ['15:30', 'Camila Soto', language === 'es' ? '3 compromisos pendientes' : '3 pending commitments'],
                ['18:00', 'Tomás León', language === 'es' ? 'Primera sesión de onboarding' : 'First onboarding session']
              ].map(([time, name, note]) => <div key={`${time}-${name}`} className="flex gap-4 border-b border-black/5 pb-4 last:border-b-0 last:pb-0"><div className="w-12 text-sm font-semibold text-black/65">{time}</div><div><p className="text-sm font-medium">{name}</p><p className="mt-1 text-xs text-black/45">{note}</p></div></div>)}
            </div>
          </section>

          <section className="rounded-2xl bg-[#0A3F4D] p-5 text-white shadow-[0_18px_45px_rgba(10,63,77,0.16)]">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">G-KAIS COPILOT</p><h2 className="mt-2 text-lg font-semibold">{language === 'es' ? 'Contexto antes de actuar.' : 'Context before action.'}</h2></div><Sparkles className="h-5 w-5 text-white/80" /></div>
            <p className="mt-3 text-sm leading-6 text-white/70">{language === 'es' ? 'Hay 2 sesiones hoy con compromisos pendientes. Sofía requiere atención y Diego entra en ventana de renovación.' : 'Two sessions today have pending commitments. Sofía needs attention and Diego is entering the renewal window.'}</p>
            <button onClick={() => onNavigate('copilot')} className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#0A3F4D]">{language === 'es' ? 'Abrir Copilot' : 'Open Copilot'}<ChevronRight className="h-3.5 w-3.5" /></button>
          </section>
        </div>
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          [language === 'es' ? 'Renovaciones <30 días' : 'Renewals <30 days', language === 'es' ? '6 clientes' : '6 clients', <Target key="target" className="h-4.5 w-4.5 text-[#0A3F4D]" />],
          [language === 'es' ? 'Sin próxima acción' : 'No next action', language === 'es' ? '3 personas' : '3 people', <AlertTriangle key="alert" className="h-4.5 w-4.5 text-[#0A3F4D]" />],
          ['Vertical Knowledge', language === 'es' ? 'Preset Experts activo' : 'Experts preset active', <BookOpenCheck key="book" className="h-4.5 w-4.5 text-[#0A3F4D]" />]
        ].map(([label, detail, icon]) => <div key={String(label)} className="rounded-2xl border border-black/10 bg-white p-5"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#0A3F4D]/8">{icon}</div><div><p className="text-sm font-semibold">{label}</p><p className="text-xs text-black/45">{detail}</p></div></div></div>)}
      </section>
    </>
  );
}

function SettingsPanel({ language, background, accent, onBackground, onAccent }: { language: Language; background: ThemePreset; accent: AccentPreset; onBackground: (value: ThemePreset) => void; onAccent: (value: AccentPreset) => void }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-[0_12px_35px_rgba(10,10,10,0.04)]">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'APARIENCIA' : 'APPEARANCE'}</p>
        <h3 className="mt-2 text-xl font-semibold">{language === 'es' ? 'Fondo del Workspace' : 'Workspace Background'}</h3>
        <p className="mt-2 text-sm text-black/50">{language === 'es' ? 'Elige una base sutil. El contenido y la legibilidad se mantienen intactos.' : 'Choose a subtle base. Content and readability remain intact.'}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {(Object.keys(BG_PRESETS) as ThemePreset[]).map((preset) => <button key={preset} onClick={() => onBackground(preset)} className={`h-24 rounded-2xl border-2 transition ${background === preset ? 'border-[#111413]' : 'border-transparent'}`} style={{ background: BG_PRESETS[preset] }} aria-label={preset} />)}
        </div>
      </section>
      <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-[0_12px_35px_rgba(10,10,10,0.04)]">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">SIDEBAR</p>
        <h3 className="mt-2 text-xl font-semibold">{language === 'es' ? 'Color de selección' : 'Selection Color'}</h3>
        <p className="mt-2 text-sm text-black/50">{language === 'es' ? 'El sidebar permanece negro; solo cambia el acento del elemento activo.' : 'The sidebar stays black; only the active item accent changes.'}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          {(Object.keys(ACCENTS) as AccentPreset[]).map((preset) => <button key={preset} onClick={() => onAccent(preset)} className={`flex items-center gap-3 rounded-full border px-4 py-2 text-sm font-medium ${accent === preset ? 'border-black' : 'border-black/10'}`}><span className="h-4 w-4 rounded-full border border-black/10" style={{ background: ACCENTS[preset].dot }} />{preset}</button>)}
        </div>
      </section>
    </div>
  );
}

function Placeholder({ activeNav, activeLabel, language }: { activeNav: string; activeLabel: string; language: Language }) {
  return <section className="rounded-2xl border border-black/10 bg-white p-8 shadow-[0_12px_35px_rgba(10,10,10,0.04)]"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#0A3F4D]/8">{activeNav === 'knowledge' ? <BookOpenCheck className="h-5 w-5 text-[#0A3F4D]" /> : activeNav === 'copilot' ? <Sparkles className="h-5 w-5 text-[#0A3F4D]" /> : <CircleGauge className="h-5 w-5 text-[#0A3F4D]" />}</div><p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">WORKSPACE FOUNDATION</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">{activeLabel}</h2><p className="mt-3 max-w-xl text-sm leading-6 text-black/55">{language === 'es' ? 'Esta sección se conectará con las funciones existentes de G-KAIS siguiendo el orden de validación del primer cliente.' : 'This section will connect to existing G-KAIS capabilities following the first-client validation order.'}</p>{activeNav === 'knowledge' && <div className="mt-6 rounded-xl bg-[#F7F7F5] p-5"><p className="text-sm font-semibold">Experts Knowledge</p><div className="mt-3 flex flex-wrap gap-2">{expertsVerticalPreset.defaultKnowledgeTopics.map((topic) => <span key={topic} className="rounded-full border border-black/8 bg-white px-3 py-1.5 text-xs text-black/55">{topic}</span>)}</div></div>}</section>;
}

export function ExpertsWorkspace({ onExit }: ExpertsWorkspaceProps) {
  const [activeNav, setActiveNav] = useState('overview');
  const [language, setLanguage] = useState<Language>('es');
  const [background, setBackground] = useState<ThemePreset>('stone');
  const [accent, setAccent] = useState<AccentPreset>('white');
  const activeLabel = useMemo(() => labelFor(activeNav, language), [activeNav, language]);

  const content = activeNav === 'overview'
    ? <Dashboard onNavigate={setActiveNav} language={language} />
    : activeNav === 'clients'
      ? <ActiveClientsWorkspace language={language} />
      : activeNav === 'settings'
        ? <SettingsPanel language={language} background={background} accent={accent} onBackground={setBackground} onAccent={setAccent} />
        : <Placeholder activeNav={activeNav} activeLabel={activeLabel} language={language} />;

  return (
    <div className="min-h-screen text-[#0A0A0A]" style={{ background: BG_PRESETS[background] }}>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[245px] border-r border-black/10 bg-[#111413] text-white lg:flex lg:flex-col">
        <div className="border-b border-white/10 px-5 py-5"><div className="flex items-center justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">G-KAIS</p><p className="mt-1 text-sm font-semibold">for Experts</p></div><span className="rounded-full border border-white/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-white/45">v1</span></div></div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV_SECTIONS.map((section) => {
            const items = expertsVerticalPreset.navigation.filter((item) => item.section === section.id);
            return <div key={section.id} className={section.id === 'main' ? '' : 'mt-6'}>{(section.es || section.en) && <p className="mb-2 px-3 text-[9px] font-semibold tracking-[0.18em] text-white/30">{language === 'es' ? section.es : section.en}</p>}<div className="space-y-1">{items.map((item) => {
              const Icon = NAV_ICONS[item.id] ?? LayoutDashboard;
              const selected = activeNav === item.id;
              const count = item.id === 'priority' ? 7 : item.id === 'leads' ? 18 : item.id === 'clients' ? 46 : undefined;
              return <button key={item.id} onClick={() => setActiveNav(item.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${selected ? ACCENTS[accent].selected : 'text-white/65 hover:bg-white/[0.06] hover:text-white'}`}><Icon className="h-4 w-4 shrink-0" /><span className="flex-1">{labelFor(item.id, language)}</span>{typeof count === 'number' && <span className={`text-[10px] font-semibold ${selected ? ACCENTS[accent].count : 'text-white/35'}`}>{count}</span>}</button>;
            })}</div></div>;
          })}
        </nav>
        <div className="border-t border-white/10 p-3"><button onClick={() => setActiveNav('settings')} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${activeNav === 'settings' ? ACCENTS[accent].selected : 'text-white/55 hover:bg-white/[0.06] hover:text-white'}`}><Settings className="h-4 w-4" />{labelFor('settings', language)}</button><div className="mt-2 rounded-xl bg-white/[0.05] p-3"><p className="text-xs font-semibold">Método Escala</p><p className="mt-0.5 text-[10px] text-white/35">Experts Workspace</p></div></div>
      </aside>

      <div className="lg:pl-[245px]">
        <header className="sticky top-0 z-20 border-b border-black/8 bg-white/70 px-4 py-3 backdrop-blur-xl md:px-8 lg:px-10"><div className="flex items-center justify-between gap-4"><div className="flex items-center gap-3"><button onClick={onExit} className="grid h-9 w-9 place-items-center rounded-full border border-black/10 bg-white text-black/60 transition hover:text-black" aria-label={language === 'es' ? 'Salir del workspace' : 'Exit workspace'}><ArrowLeft className="h-4 w-4" /></button><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/35">Método Escala</p><h1 className="text-sm font-semibold">{activeLabel}</h1></div></div><div className="flex items-center gap-2"><div className="flex rounded-full border border-black/10 bg-white p-1 text-[10px] font-semibold"><button onClick={() => setLanguage('es')} className={`rounded-full px-2.5 py-1 ${language === 'es' ? 'bg-[#111413] text-white' : 'text-black/45'}`}>ES</button><button onClick={() => setLanguage('en')} className={`rounded-full px-2.5 py-1 ${language === 'en' ? 'bg-[#111413] text-white' : 'text-black/45'}`}>EN</button></div><div className="hidden rounded-full border border-[#0A3F4D]/15 bg-[#0A3F4D]/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#0A3F4D] sm:block">Experts Knowledge</div><div className="grid h-9 w-9 place-items-center rounded-full bg-[#111413] text-xs font-semibold text-white">CE</div></div></div></header>

        <main className="px-4 py-6 md:px-8 md:py-8 lg:px-10 lg:py-10"><div className="mx-auto max-w-[1500px]">
          <div className="mb-6 lg:hidden"><div className="flex gap-2 overflow-x-auto pb-2">{expertsVerticalPreset.navigation.slice(0, 5).map((item) => <button key={item.id} onClick={() => setActiveNav(item.id)} className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold ${activeNav === item.id ? 'bg-[#111413] text-white' : 'border border-black/10 bg-white text-black/55'}`}>{labelFor(item.id, language)}</button>)}</div></div>
          <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0A3F4D]">{activeNav === 'overview' ? (language === 'es' ? 'VISTA OPERATIVA DIARIA' : 'DAILY OPERATING VIEW') : 'G-KAIS WORKSPACE'}</p><h2 className="mt-2 text-3xl font-semibold tracking-[-0.035em] md:text-4xl">{activeNav === 'overview' ? (language === 'es' ? '¿Qué necesita tu atención?' : 'What needs your attention?') : activeLabel}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-black/50">{activeNav === 'overview' ? (language === 'es' ? 'Una vista diaria para entender el negocio, priorizar personas y entrar a cada conversación con contexto.' : 'A daily view to understand the business, prioritize people and enter every conversation with context.') : activeNav === 'clients' ? (language === 'es' ? 'La relación completa de cada cliente: objetivo, plan, compromisos, bloqueadores, sesiones y próxima acción.' : 'The full client relationship: goal, plan, commitments, blockers, sessions and next action.') : activeNav === 'settings' ? (language === 'es' ? 'Personaliza la apariencia sin perder la estructura y legibilidad del Workspace.' : 'Personalize appearance without losing Workspace structure or readability.') : (language === 'es' ? 'Área de trabajo conectada al ciclo de vida de cada persona.' : 'Workspace connected to each person’s lifecycle.')}</p></div>{activeNav === 'overview' && <div className="flex items-center gap-2 text-xs text-black/45"><CheckCircle2 className="h-4 w-4 text-[#0A3F4D]" />{language === 'es' ? 'Actualizado hoy · 09:42' : 'Updated today · 09:42'}</div>}</div>
          {content}
        </div></main>
      </div>
    </div>
  );
}
