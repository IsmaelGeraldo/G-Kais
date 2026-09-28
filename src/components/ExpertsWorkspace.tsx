import React, { useEffect, useMemo, useState } from 'react';
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
  Palette,
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
import { useLanguage, type Language } from '../i18n/LanguageContext';

type ExpertsWorkspaceProps = {
  onExit: () => void;
};

type LocalText = {
  es: string;
  en: string;
};

type TrendPoint = {
  label: string;
  value: number;
};

type MetricTone = 'attention' | 'sessions' | 'clients' | 'leads';

type MetricCard = {
  id: 'priority' | 'sessions' | 'clients' | 'leads';
  label: LocalText;
  value: string;
  detail: LocalText;
  trend: LocalText;
  ringValue: number;
  ringTotal: number;
  ringCaption: LocalText;
  tone: MetricTone;
  chart?: {
    title: LocalText;
    subtitle: LocalText;
    points: TrendPoint[];
  };
};

type AttentionItem = {
  name: string;
  state: 'active' | 'renewal' | 'lead';
  reason: LocalText;
  action: LocalText;
  tone: 'critical' | 'attention';
};

type WorkspaceBackground = {
  id: string;
  name: LocalText;
  css: string;
  header: string;
};

type SidebarAccent = {
  id: string;
  name: LocalText;
  background: string;
  text: string;
  count: string;
};

const tr = (language: Language, value: LocalText) => value[language];

const METRICS: MetricCard[] = [
  {
    id: 'priority',
    label: { es: 'Trabajo prioritario', en: 'Priority Work' },
    value: '7',
    detail: { es: '3 clientes · 4 leads', en: '3 clients · 4 leads' },
    trend: { es: 'requieren atención hoy', en: 'need attention today' },
    ringValue: 3,
    ringTotal: 7,
    ringCaption: { es: '3 críticos', en: '3 critical' },
    tone: 'attention'
  },
  {
    id: 'sessions',
    label: { es: 'Sesiones de hoy', en: 'Sessions Today' },
    value: '5',
    detail: { es: '2 por preparar', en: '2 to prepare' },
    trend: { es: '3 briefs listos', en: '3 briefs ready' },
    ringValue: 3,
    ringTotal: 5,
    ringCaption: { es: '3 listas', en: '3 ready' },
    tone: 'sessions'
  },
  {
    id: 'clients',
    label: { es: 'Clientes activos', en: 'Active Clients' },
    value: '46',
    detail: { es: '+4 este mes', en: '+4 this month' },
    trend: { es: '+9% vs mes anterior', en: '+9% vs previous month' },
    ringValue: 43,
    ringTotal: 46,
    ringCaption: { es: '43 con próxima acción', en: '43 with next action' },
    tone: 'clients',
    chart: {
      title: { es: 'Nuevos clientes este mes', en: 'New clients this month' },
      subtitle: { es: 'Fechas de entrada al programa', en: 'Dates they entered the program' },
      points: [
        { label: '02', value: 0 },
        { label: '05', value: 1 },
        { label: '09', value: 0 },
        { label: '13', value: 1 },
        { label: '17', value: 0 },
        { label: '21', value: 1 },
        { label: '25', value: 0 },
        { label: '28', value: 1 }
      ]
    }
  },
  {
    id: 'leads',
    label: { es: 'Nuevos leads', en: 'New Leads' },
    value: '18',
    detail: { es: 'este mes', en: 'this month' },
    trend: { es: '+12% vs mes anterior', en: '+12% vs previous month' },
    ringValue: 14,
    ringTotal: 18,
    ringCaption: { es: '14 con próxima acción', en: '14 with next action' },
    tone: 'leads',
    chart: {
      title: { es: 'Entrada de leads este mes', en: 'Lead volume this month' },
      subtitle: { es: 'Volumen por fecha', en: 'Volume by date' },
      points: [
        { label: '02', value: 1 },
        { label: '05', value: 3 },
        { label: '09', value: 2 },
        { label: '13', value: 4 },
        { label: '17', value: 1 },
        { label: '21', value: 3 },
        { label: '25', value: 2 },
        { label: '28', value: 2 }
      ]
    }
  }
];

const ATTENTION: AttentionItem[] = [
  {
    name: 'Sofía Martínez',
    state: 'active',
    reason: {
      es: '2 compromisos vencidos y sin actualización de progreso en 9 días.',
      en: '2 overdue commitments and no progress update in 9 days.'
    },
    action: { es: 'Revisar cliente', en: 'Review client' },
    tone: 'critical'
  },
  {
    name: 'Diego Rojas',
    state: 'renewal',
    reason: {
      es: 'El programa termina en 16 días y aún no existe próxima acción de renovación.',
      en: 'The program ends in 16 days and there is still no renewal next action.'
    },
    action: { es: 'Preparar renovación', en: 'Prepare renewal' },
    tone: 'attention'
  },
  {
    name: 'Valentina Cruz',
    state: 'lead',
    reason: {
      es: 'Alta intención detectada. La última conversación quedó sin siguiente paso.',
      en: 'High intent detected. The last conversation ended without a next step.'
    },
    action: { es: 'Abrir oportunidad', en: 'Open opportunity' },
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

const NAV_LABELS: Record<string, LocalText> = {
  overview: { es: 'Dashboard', en: 'Dashboard' },
  priority: { es: 'Trabajo prioritario', en: 'Priority Work' },
  leads: { es: 'Leads', en: 'Leads' },
  clients: { es: 'Clientes', en: 'Clients' },
  sessions: { es: 'Sesiones', en: 'Sessions' },
  tasks: { es: 'Tareas', en: 'Tasks' },
  calendar: { es: 'Calendario', en: 'Calendar' },
  copilot: { es: 'G-KAIS Copilot', en: 'G-KAIS Copilot' },
  knowledge: { es: 'Conocimiento', en: 'Knowledge' },
  settings: { es: 'Configuración', en: 'Settings' }
};

const NAV_SECTIONS: Array<{ id: WorkspaceNavItem['section']; label?: LocalText }> = [
  { id: 'main' },
  { id: 'people', label: { es: 'PERSONAS', en: 'PEOPLE' } },
  { id: 'work', label: { es: 'TRABAJO', en: 'WORK' } },
  { id: 'intelligence', label: { es: 'INTELIGENCIA', en: 'INTELLIGENCE' } }
];

const BACKGROUND_PRESETS: WorkspaceBackground[] = [
  {
    id: 'stone',
    name: { es: 'Piedra suave', en: 'Soft Stone' },
    css: 'linear-gradient(135deg, #F4F4F1 0%, #EEEFEA 100%)',
    header: 'rgba(244, 244, 241, 0.94)'
  },
  {
    id: 'pearl',
    name: { es: 'Perla', en: 'Pearl' },
    css: 'linear-gradient(135deg, #FAF9F6 0%, #ECEAE4 100%)',
    header: 'rgba(250, 249, 246, 0.94)'
  },
  {
    id: 'mist',
    name: { es: 'Niebla', en: 'Mist' },
    css: 'linear-gradient(135deg, #F2F5F4 0%, #E6ECEA 100%)',
    header: 'rgba(242, 245, 244, 0.94)'
  },
  {
    id: 'sand',
    name: { es: 'Arena', en: 'Sand' },
    css: 'linear-gradient(135deg, #F8F4EC 0%, #EEE5D8 100%)',
    header: 'rgba(248, 244, 236, 0.94)'
  },
  {
    id: 'slate',
    name: { es: 'Pizarra clara', en: 'Light Slate' },
    css: 'linear-gradient(135deg, #F4F5F7 0%, #E9ECF0 100%)',
    header: 'rgba(244, 245, 247, 0.94)'
  }
];

const SIDEBAR_ACCENTS: SidebarAccent[] = [
  { id: 'ivory', name: { es: 'Marfil', en: 'Ivory' }, background: '#FFFFFF', text: '#111413', count: '#0A3F4D' },
  { id: 'teal', name: { es: 'Teal', en: 'Teal' }, background: '#0A3F4D', text: '#FFFFFF', count: '#CFE7E2' },
  { id: 'blue', name: { es: 'Azul', en: 'Blue' }, background: '#274C77', text: '#FFFFFF', count: '#DCE8F5' },
  { id: 'amber', name: { es: 'Ámbar', en: 'Amber' }, background: '#8B6318', text: '#FFFFFF', count: '#F5E4B8' },
  { id: 'rose', name: { es: 'Rojo tierra', en: 'Earth Red' }, background: '#8D3D36', text: '#FFFFFF', count: '#F4D9D6' }
];

function getStoredChoice(key: string, options: Array<{ id: string }>, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  try {
    const saved = window.localStorage.getItem(key);
    if (saved && options.some((option) => option.id === saved)) return saved;
  } catch {}
  return fallback;
}

function MetricRing({ metric, language }: { metric: MetricCard; language: Language }) {
  const percentage = Math.max(0, Math.min(100, (metric.ringValue / metric.ringTotal) * 100));
  const split = percentage / 2;
  const background = metric.tone === 'attention'
    ? `conic-gradient(#A23A32 0 42.86%, #D67A32 42.86% 100%)`
    : metric.tone === 'sessions'
      ? `conic-gradient(#4556A6 0 ${split}%, #74A9CF ${split}% ${percentage}%, #E7E7E3 ${percentage}% 100%)`
      : metric.tone === 'clients'
        ? `conic-gradient(#0A3F4D 0 ${split}%, #78A892 ${split}% ${percentage}%, #E7E7E3 ${percentage}% 100%)`
        : `conic-gradient(#5C4D8A 0 ${split}%, #7A9FC8 ${split}% ${percentage}%, #E7E7E3 ${percentage}% 100%)`;

  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5">
      <div className="relative h-14 w-14 rounded-full" style={{ background }} aria-label={tr(language, metric.ringCaption)}>
        <div className="absolute inset-[5px] grid place-items-center rounded-full bg-white">
          <span className="text-[11px] font-semibold text-black/65">{metric.ringValue}/{metric.ringTotal}</span>
        </div>
      </div>
      <span className="max-w-[82px] text-center text-[9px] font-medium leading-3 text-black/38">{tr(language, metric.ringCaption)}</span>
    </div>
  );
}

function MiniTrendChart({ points, title, subtitle, language }: { points: TrendPoint[]; title: LocalText; subtitle: LocalText; language: Language }) {
  const width = 360;
  const height = 92;
  const maxValue = Math.max(1, ...points.map((point) => point.value));
  const chartPoints = points.map((point, index) => {
    const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
    const y = height - 12 - (point.value / maxValue) * (height - 24);
    return `${x},${y}`;
  }).join(' ');
  const midpoint = points[Math.floor((points.length - 1) / 2)];

  return (
    <div className="mt-4 rounded-xl border border-black/7 bg-[#FAFAF8] p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-black/70">{tr(language, title)}</p>
          <p className="mt-0.5 text-[10px] text-black/38">{tr(language, subtitle)}</p>
        </div>
        <span className="rounded-full bg-white px-2 py-1 text-[9px] font-semibold text-black/40 shadow-sm">
          {language === 'es' ? 'Mes actual' : 'Current month'}
        </span>
      </div>
      <div className="mt-3 text-[#0A3F4D]">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[92px] w-full" role="img" aria-label={tr(language, title)}>
          <line x1="0" y1={height - 12} x2={width} y2={height - 12} stroke="currentColor" strokeOpacity="0.10" />
          <polyline points={chartPoints} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((point, index) => {
            const [x, y] = chartPoints.split(' ')[index].split(',');
            return <circle key={`${point.label}-${index}`} cx={x} cy={y} r="3.5" fill="white" stroke="currentColor" strokeWidth="2" />;
          })}
        </svg>
      </div>
      <div className="flex justify-between text-[9px] font-medium text-black/32">
        <span>{points[0]?.label}</span>
        <span>{midpoint?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </div>
  );
}

function Metric({ metric, language }: { metric: MetricCard; language: Language }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_12px_35px_rgba(10,10,10,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-black/45">{tr(language, metric.label)}</p>
          <div className="mt-4">
            <strong className="block text-4xl font-semibold tracking-[-0.04em] text-black">{metric.value}</strong>
            <span className="mt-1.5 block text-xs text-black/45">{tr(language, metric.detail)}</span>
          </div>
        </div>
        <MetricRing metric={metric} language={language} />
      </div>

      {metric.chart ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          className="mt-4 flex w-full items-center justify-between gap-3 border-t border-black/5 pt-3 text-left text-xs text-black/55 transition hover:text-black/80"
        >
          <span>{tr(language, metric.trend)}</span>
          <ChevronDown className={`h-3.5 w-3.5 transition ${expanded ? 'rotate-180' : ''}`} />
        </button>
      ) : (
        <p className="mt-4 border-t border-black/5 pt-3 text-xs text-black/55">{tr(language, metric.trend)}</p>
      )}

      {metric.chart && expanded && (
        <MiniTrendChart
          points={metric.chart.points}
          title={metric.chart.title}
          subtitle={metric.chart.subtitle}
          language={language}
        />
      )}
    </article>
  );
}

function Dashboard({ onNavigate, language }: { onNavigate: (id: string) => void; language: Language }) {
  const stateLabel = (state: AttentionItem['state']) => {
    if (state === 'active') return language === 'es' ? 'Cliente activo' : 'Active client';
    if (state === 'renewal') return language === 'es' ? 'Renovación' : 'Renewal';
    return 'Lead';
  };

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
              <p className="mt-1 text-sm text-black/50">
                {language === 'es'
                  ? 'Personas que necesitan una intervención concreta, sin importar su etapa.'
                  : 'People who need a concrete intervention, regardless of lifecycle stage.'}
              </p>
            </div>
            <span className="rounded-full bg-[#A23A32]/8 px-3 py-1.5 text-xs font-semibold text-[#8D332C]">
              {language === 'es' ? '7 hoy' : '7 today'}
            </span>
          </div>

          <div className="mt-4">
            {ATTENTION.map((item) => (
              <div key={item.name} className="flex flex-col gap-4 border-b border-black/5 py-5 last:border-b-0 md:flex-row md:items-center">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${item.tone === 'critical' ? 'bg-[#A23A32]' : 'bg-[#A46F16]'}`} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{item.name}</h3>
                      <span className="rounded-full bg-black/[0.04] px-2.5 py-1 text-[11px] font-medium text-black/55">{stateLabel(item.state)}</span>
                    </div>
                    <p className="mt-1.5 max-w-2xl text-sm leading-6 text-black/55">{tr(language, item.reason)}</p>
                  </div>
                </div>
                <button
                  onClick={() => item.state === 'active' ? onNavigate('clients') : onNavigate('priority')}
                  className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold transition hover:border-[#0A3F4D]/40 hover:text-[#0A3F4D] md:self-auto"
                >
                  {tr(language, item.action)}
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          <button onClick={() => onNavigate('priority')} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#0A3F4D]">
            {language === 'es' ? 'Ver todo el trabajo prioritario' : 'View all Priority Work'}
            <ChevronRight className="h-4 w-4" />
          </button>
        </section>

        <div className="grid gap-6">
          <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_12px_35px_rgba(10,10,10,0.04)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">{language === 'es' ? 'HOY' : 'TODAY'}</p>
                <h2 className="mt-2 text-lg font-semibold">{language === 'es' ? 'Próximas sesiones' : 'Upcoming Sessions'}</h2>
              </div>
              <CalendarDays className="h-5 w-5 text-[#0A3F4D]" />
            </div>
            <div className="mt-4 space-y-4">
              {[
                ['10:00', 'Andrés Silva', language === 'es' ? 'Brief listo · revisar avance comercial' : 'Brief ready · review commercial progress'],
                ['15:30', 'Camila Soto', language === 'es' ? '3 compromisos pendientes' : '3 pending commitments'],
                ['18:00', 'Tomás León', language === 'es' ? 'Primera sesión de onboarding' : 'First onboarding session']
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
                <h2 className="mt-2 text-lg font-semibold">{language === 'es' ? 'Contexto antes de actuar.' : 'Context before action.'}</h2>
              </div>
              <Sparkles className="h-5 w-5 text-white/80" />
            </div>
            <p className="mt-3 text-sm leading-6 text-white/70">
              {language === 'es'
                ? 'Hay 2 sesiones hoy con compromisos pendientes. Sofía requiere atención y Diego entra en ventana de renovación.'
                : 'Two sessions today have pending commitments. Sofía needs attention and Diego is entering the renewal window.'}
            </p>
            <button onClick={() => onNavigate('copilot')} className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#0A3F4D]">
              {language === 'es' ? 'Abrir Copilot' : 'Open Copilot'}
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </section>
        </div>
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          [language === 'es' ? 'Renovaciones <30 días' : 'Renewals <30 days', language === 'es' ? '6 clientes' : '6 clients', <Target key="target" className="h-4.5 w-4.5 text-[#0A3F4D]" />],
          [language === 'es' ? 'Sin próxima acción' : 'No next action', language === 'es' ? '3 personas' : '3 people', <AlertTriangle key="alert" className="h-4.5 w-4.5 text-[#0A3F4D]" />],
          [language === 'es' ? 'Conocimiento vertical' : 'Vertical Knowledge', language === 'es' ? 'Preset Experts activo' : 'Experts preset active', <BookOpenCheck key="book" className="h-4.5 w-4.5 text-[#0A3F4D]" />]
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

function Placeholder({ activeNav, activeLabel, language }: { activeNav: string; activeLabel: string; language: Language }) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white p-8 shadow-[0_12px_35px_rgba(10,10,10,0.04)]">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#0A3F4D]/8">
        {activeNav === 'knowledge'
          ? <BookOpenCheck className="h-5 w-5 text-[#0A3F4D]" />
          : activeNav === 'copilot'
            ? <Sparkles className="h-5 w-5 text-[#0A3F4D]" />
            : <CircleGauge className="h-5 w-5 text-[#0A3F4D]" />}
      </div>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">
        {language === 'es' ? 'BASE DEL WORKSPACE' : 'WORKSPACE FOUNDATION'}
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight">{activeLabel}</h2>
      <p className="mt-3 max-w-xl text-sm leading-6 text-black/55">
        {language === 'es'
          ? 'Esta sección se conectará con las funciones existentes de G-KAIS siguiendo el orden de validación del primer cliente.'
          : 'This section will connect to existing G-KAIS capabilities following the first-client validation order.'}
      </p>

      {activeNav === 'knowledge' && (
        <div className="mt-6 rounded-xl bg-[#F7F7F5] p-5">
          <p className="text-sm font-semibold">
            {language === 'es' ? 'Conocimiento Experts cargado automáticamente' : 'Experts Knowledge loaded automatically'}
          </p>
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

function SettingsPanel({
  language,
  setLanguage,
  backgroundId,
  setBackgroundId,
  accentId,
  setAccentId
}: {
  language: Language;
  setLanguage: (language: Language) => void;
  backgroundId: string;
  setBackgroundId: (id: string) => void;
  accentId: string;
  setAccentId: (id: string) => void;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-[0_12px_35px_rgba(10,10,10,0.04)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'IDIOMA' : 'LANGUAGE'}</p>
            <h3 className="mt-2 text-xl font-semibold">{language === 'es' ? 'Idioma del Workspace' : 'Workspace language'}</h3>
            <p className="mt-2 text-sm leading-6 text-black/50">
              {language === 'es'
                ? 'La interfaz completa del Workspace respetará esta elección.'
                : 'The Workspace interface will consistently follow this choice.'}
            </p>
          </div>
          <Settings className="h-5 w-5 text-[#0A3F4D]" />
        </div>
        <div className="mt-5 inline-flex rounded-full border border-black/10 bg-[#F7F7F5] p-1">
          {(['es', 'en'] as Language[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setLanguage(option)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${language === option ? 'bg-[#111413] text-white' : 'text-black/45 hover:text-black'}`}
            >
              {option === 'es' ? 'Español' : 'English'}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-[0_12px_35px_rgba(10,10,10,0.04)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'APARIENCIA' : 'APPEARANCE'}</p>
            <h3 className="mt-2 text-xl font-semibold">{language === 'es' ? 'Fondo del Workspace' : 'Workspace background'}</h3>
            <p className="mt-2 text-sm leading-6 text-black/50">
              {language === 'es' ? 'Gradientes suaves para personalizar sin perder legibilidad.' : 'Soft gradients for personalization without sacrificing readability.'}
            </p>
          </div>
          <Palette className="h-5 w-5 text-[#0A3F4D]" />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {BACKGROUND_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setBackgroundId(preset.id)}
              className={`rounded-xl border p-3 text-left transition ${backgroundId === preset.id ? 'border-[#0A3F4D] ring-2 ring-[#0A3F4D]/10' : 'border-black/8 hover:border-black/20'}`}
            >
              <div className="h-14 rounded-lg border border-black/5" style={{ background: preset.css }} />
              <p className="mt-2 text-xs font-semibold">{tr(language, preset.name)}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-[0_12px_35px_rgba(10,10,10,0.04)] xl:col-span-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'SIDEBAR' : 'SIDEBAR'}</p>
          <h3 className="mt-2 text-xl font-semibold">{language === 'es' ? 'Color de selección' : 'Selection color'}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/50">
            {language === 'es'
              ? 'El sidebar se mantiene negro; solo cambia el acento del elemento seleccionado.'
              : 'The sidebar stays black; only the selected item accent changes.'}
          </p>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          {SIDEBAR_ACCENTS.map((accent) => (
            <button
              key={accent.id}
              type="button"
              onClick={() => setAccentId(accent.id)}
              className={`flex min-w-[130px] items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${accentId === accent.id ? 'border-black/35 ring-2 ring-black/8' : 'border-black/8 hover:border-black/20'}`}
            >
              <span className="h-7 w-7 rounded-lg border border-black/8" style={{ background: accent.background }} />
              <span className="text-xs font-semibold">{tr(language, accent.name)}</span>
            </button>
          ))}
        </div>
        <p className="mt-5 text-[11px] text-black/35">
          {language === 'es' ? 'Estas preferencias quedan guardadas en este navegador.' : 'These preferences are saved in this browser.'}
        </p>
      </section>
    </div>
  );
}

export function ExpertsWorkspace({ onExit }: ExpertsWorkspaceProps) {
  const { language, setLanguage } = useLanguage();
  const [activeNav, setActiveNav] = useState('overview');
  const [backgroundId, setBackgroundId] = useState(() => getStoredChoice('gkais-experts-background', BACKGROUND_PRESETS, 'stone'));
  const [accentId, setAccentId] = useState(() => getStoredChoice('gkais-experts-sidebar-accent', SIDEBAR_ACCENTS, 'ivory'));

  useEffect(() => {
    try {
      window.localStorage.setItem('gkais-experts-background', backgroundId);
    } catch {}
  }, [backgroundId]);

  useEffect(() => {
    try {
      window.localStorage.setItem('gkais-experts-sidebar-accent', accentId);
    } catch {}
  }, [accentId]);

  const background = BACKGROUND_PRESETS.find((preset) => preset.id === backgroundId) ?? BACKGROUND_PRESETS[0];
  const accent = SIDEBAR_ACCENTS.find((preset) => preset.id === accentId) ?? SIDEBAR_ACCENTS[0];

  const activeLabel = useMemo(() => {
    if (activeNav === 'settings') return tr(language, NAV_LABELS.settings);
    const item = expertsVerticalPreset.navigation.find((navItem) => navItem.id === activeNav);
    return tr(language, NAV_LABELS[item?.id ?? 'overview']);
  }, [activeNav, language]);

  const content = activeNav === 'overview'
    ? <Dashboard onNavigate={setActiveNav} language={language} />
    : activeNav === 'clients'
      ? <ActiveClientsWorkspace />
      : activeNav === 'settings'
        ? (
          <SettingsPanel
            language={language}
            setLanguage={setLanguage}
            backgroundId={backgroundId}
            setBackgroundId={setBackgroundId}
            accentId={accentId}
            setAccentId={setAccentId}
          />
        )
        : <Placeholder activeNav={activeNav} activeLabel={activeLabel} language={language} />;

  return (
    <div className="min-h-screen text-[#0A0A0A]" style={{ background: background.css }}>
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
                {section.label && <p className="mb-2 px-3 text-[9px] font-semibold tracking-[0.18em] text-white/30">{tr(language, section.label)}</p>}
                <div className="space-y-1">
                  {items.map((item) => {
                    const Icon = NAV_ICONS[item.id] ?? LayoutDashboard;
                    const selected = activeNav === item.id;
                    const count = item.id === 'priority' ? 7 : item.id === 'leads' ? 18 : item.id === 'clients' ? 46 : undefined;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveNav(item.id)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${selected ? '' : 'text-white/65 hover:bg-white/[0.06] hover:text-white'}`}
                        style={selected ? { backgroundColor: accent.background, color: accent.text } : undefined}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1">{tr(language, NAV_LABELS[item.id] ?? { es: item.label, en: item.label })}</span>
                        {typeof count === 'number' && (
                          <span className={`text-[10px] font-semibold ${selected ? '' : 'text-white/35'}`} style={selected ? { color: accent.count } : undefined}>{count}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <button
            onClick={() => setActiveNav('settings')}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${activeNav === 'settings' ? '' : 'text-white/55 hover:bg-white/[0.06] hover:text-white'}`}
            style={activeNav === 'settings' ? { backgroundColor: accent.background, color: accent.text } : undefined}
          >
            <Settings className="h-4 w-4" />
            {tr(language, NAV_LABELS.settings)}
          </button>
          <div className="mt-2 rounded-xl bg-white/[0.05] p-3">
            <p className="text-xs font-semibold">Método Escala</p>
            <p className="mt-0.5 text-[10px] text-white/35">Experts Workspace</p>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[245px]">
        <header className="sticky top-0 z-20 border-b border-black/8 px-4 py-3 backdrop-blur md:px-8 lg:px-10" style={{ background: background.header }}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={onExit} className="grid h-9 w-9 place-items-center rounded-full border border-black/10 bg-white text-black/60 transition hover:text-black" aria-label={language === 'es' ? 'Salir del workspace' : 'Exit workspace'}>
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/35">Método Escala</p>
                <h1 className="text-sm font-semibold">{activeLabel}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden rounded-full border border-[#0A3F4D]/15 bg-[#0A3F4D]/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#0A3F4D] md:block">
                {language === 'es' ? 'Conocimiento Experts activo' : 'Experts Knowledge active'}
              </div>
              <div className="inline-flex rounded-full border border-black/10 bg-white p-0.5">
                {(['es', 'en'] as Language[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setLanguage(option)}
                    className={`rounded-full px-2.5 py-1.5 text-[10px] font-semibold uppercase transition ${language === option ? 'bg-[#111413] text-white' : 'text-black/40 hover:text-black'}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
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
                    {tr(language, NAV_LABELS[item.id] ?? { es: item.label, en: item.label })}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setActiveNav('settings')}
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${activeNav === 'settings' ? 'bg-[#111413] text-white' : 'border border-black/10 bg-white text-black/55'}`}
                  aria-label={tr(language, NAV_LABELS.settings)}
                >
                  <Settings className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0A3F4D]">
                  {activeNav === 'overview'
                    ? (language === 'es' ? 'VISTA OPERATIVA DIARIA' : 'DAILY OPERATING VIEW')
                    : activeNav === 'settings'
                      ? (language === 'es' ? 'PREFERENCIAS DEL WORKSPACE' : 'WORKSPACE PREFERENCES')
                      : 'G-KAIS WORKSPACE'}
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.035em] md:text-4xl">
                  {activeNav === 'overview'
                    ? (language === 'es' ? '¿Qué necesita tu atención?' : 'What needs your attention?')
                    : activeLabel}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-black/50">
                  {activeNav === 'overview'
                    ? (language === 'es'
                      ? 'Una vista diaria para entender el negocio, priorizar personas y entrar a cada conversación con contexto.'
                      : 'A daily view to understand the business, prioritize people and enter every conversation with context.')
                    : activeNav === 'clients'
                      ? (language === 'es'
                        ? 'La relación completa de cada cliente: objetivo, plan, compromisos, bloqueadores, sesiones y próxima acción.'
                        : 'The complete client relationship: goal, plan, commitments, blockers, sessions and next action.')
                      : activeNav === 'settings'
                        ? (language === 'es'
                          ? 'Personaliza la experiencia sin convertir el Workspace en un editor de diseño.'
                          : 'Personalize the experience without turning the Workspace into a design editor.')
                        : (language === 'es'
                          ? 'Área de trabajo conectada al ciclo de vida de cada persona.'
                          : 'A workspace connected to each person’s lifecycle.')}
                </p>
              </div>
              {activeNav === 'overview' && (
                <div className="flex items-center gap-2 text-xs text-black/45">
                  <CheckCircle2 className="h-4 w-4 text-[#0A3F4D]" />
                  {language === 'es' ? 'Actualizado hoy · 09:42' : 'Updated today · 09:42'}
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