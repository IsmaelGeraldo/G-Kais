import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleGauge,
  ListTodo,
  Target
} from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';
import { loadTasks, WORKSPACE_STATE_EVENT, type WorkTask } from './workspaceState';

type RangeKey = 'week' | 'month' | 'year';
type MetricId = 'priority' | 'sessions' | 'clients' | 'leads';
type LocalText = { es: string; en: string };
type TrendPoint = { label: string; fullLabel: string; value: number };

type Metric = {
  id: MetricId;
  label: LocalText;
  value: string;
  detail: LocalText;
  trend: LocalText;
  ringValue: number;
  ringTotal: number;
  colors: [string, string];
};

const BASE_METRICS: Metric[] = [
  { id: 'priority', label: { es: 'Por ejecutar', en: 'To execute' }, value: '0', detail: { es: 'tareas abiertas', en: 'open tasks' }, trend: { es: 'trabajo delegable y seguimiento', en: 'delegated work and follow-up' }, ringValue: 0, ringTotal: 1, colors: ['#A23A32', '#D67A32'] },
  { id: 'sessions', label: { es: 'Sesiones de hoy', en: 'Sessions Today' }, value: '5', detail: { es: '2 por preparar', en: '2 to prepare' }, trend: { es: '3 briefs listos', en: '3 briefs ready' }, ringValue: 3, ringTotal: 5, colors: ['#4556A6', '#74A9CF'] },
  { id: 'clients', label: { es: 'Clientes activos', en: 'Active Clients' }, value: '46', detail: { es: '+4 este mes', en: '+4 this month' }, trend: { es: '+9% vs mes anterior', en: '+9% vs previous month' }, ringValue: 43, ringTotal: 46, colors: ['#0A3F4D', '#78A892'] },
  { id: 'leads', label: { es: 'Nuevos leads', en: 'New Leads' }, value: '18', detail: { es: 'este mes', en: 'this month' }, trend: { es: '+12% vs mes anterior', en: '+12% vs previous month' }, ringValue: 14, ringTotal: 18, colors: ['#5C4D8A', '#7A9FC8'] }
];

const HISTORY: Record<'clients' | 'leads', Record<RangeKey, TrendPoint[]>> = {
  clients: {
    week: [
      { label: 'Lun', fullLabel: 'Lun 21 sep', value: 0 }, { label: 'Mar', fullLabel: 'Mar 22 sep', value: 1 }, { label: 'Mié', fullLabel: 'Mié 23 sep', value: 0 },
      { label: 'Jue', fullLabel: 'Jue 24 sep', value: 2 }, { label: 'Vie', fullLabel: 'Vie 25 sep', value: 0 }, { label: 'Sáb', fullLabel: 'Sáb 26 sep', value: 0 }, { label: 'Dom', fullLabel: 'Dom 27 sep', value: 1 }
    ],
    month: [
      { label: '01', fullLabel: '1 sep', value: 0 }, { label: '04', fullLabel: '4 sep', value: 1 }, { label: '07', fullLabel: '7 sep', value: 0 }, { label: '10', fullLabel: '10 sep', value: 1 },
      { label: '13', fullLabel: '13 sep', value: 0 }, { label: '16', fullLabel: '16 sep', value: 1 }, { label: '19', fullLabel: '19 sep', value: 0 }, { label: '22', fullLabel: '22 sep', value: 2 },
      { label: '25', fullLabel: '25 sep', value: 0 }, { label: '28', fullLabel: '28 sep', value: 1 }
    ],
    year: [
      { label: 'Oct', fullLabel: 'Oct 2025', value: 3 }, { label: 'Nov', fullLabel: 'Nov 2025', value: 4 }, { label: 'Dic', fullLabel: 'Dic 2025', value: 2 },
      { label: 'Ene', fullLabel: 'Ene 2026', value: 5 }, { label: 'Feb', fullLabel: 'Feb 2026', value: 3 }, { label: 'Mar', fullLabel: 'Mar 2026', value: 6 },
      { label: 'Abr', fullLabel: 'Abr 2026', value: 4 }, { label: 'May', fullLabel: 'May 2026', value: 5 }, { label: 'Jun', fullLabel: 'Jun 2026', value: 4 },
      { label: 'Jul', fullLabel: 'Jul 2026', value: 6 }, { label: 'Ago', fullLabel: 'Ago 2026', value: 5 }, { label: 'Sep', fullLabel: 'Sep 2026', value: 4 }
    ]
  },
  leads: {
    week: [
      { label: 'Lun', fullLabel: 'Lun 21 sep', value: 2 }, { label: 'Mar', fullLabel: 'Mar 22 sep', value: 4 }, { label: 'Mié', fullLabel: 'Mié 23 sep', value: 1 },
      { label: 'Jue', fullLabel: 'Jue 24 sep', value: 5 }, { label: 'Vie', fullLabel: 'Vie 25 sep', value: 3 }, { label: 'Sáb', fullLabel: 'Sáb 26 sep', value: 1 }, { label: 'Dom', fullLabel: 'Dom 27 sep', value: 2 }
    ],
    month: [
      { label: '01', fullLabel: '1 sep', value: 1 }, { label: '04', fullLabel: '4 sep', value: 3 }, { label: '07', fullLabel: '7 sep', value: 2 }, { label: '10', fullLabel: '10 sep', value: 4 },
      { label: '13', fullLabel: '13 sep', value: 1 }, { label: '16', fullLabel: '16 sep', value: 5 }, { label: '19', fullLabel: '19 sep', value: 2 }, { label: '22', fullLabel: '22 sep', value: 4 },
      { label: '25', fullLabel: '25 sep', value: 3 }, { label: '28', fullLabel: '28 sep', value: 2 }
    ],
    year: [
      { label: 'Oct', fullLabel: 'Oct 2025', value: 36 }, { label: 'Nov', fullLabel: 'Nov 2025', value: 41 }, { label: 'Dic', fullLabel: 'Dic 2025', value: 31 },
      { label: 'Ene', fullLabel: 'Ene 2026', value: 45 }, { label: 'Feb', fullLabel: 'Feb 2026', value: 38 }, { label: 'Mar', fullLabel: 'Mar 2026', value: 52 },
      { label: 'Abr', fullLabel: 'Abr 2026', value: 47 }, { label: 'May', fullLabel: 'May 2026', value: 55 }, { label: 'Jun', fullLabel: 'Jun 2026', value: 44 },
      { label: 'Jul', fullLabel: 'Jul 2026', value: 59 }, { label: 'Ago', fullLabel: 'Ago 2026', value: 48 }, { label: 'Sep', fullLabel: 'Sep 2026', value: 18 }
    ]
  }
};

function smoothPath(points: Array<{ x: number; y: number }>): string {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const controlX = (previous.x + current.x) / 2;
    path += ` C ${controlX} ${previous.y}, ${controlX} ${current.y}, ${current.x} ${current.y}`;
  }
  return path;
}

function HistoricalChart({ kind, range, setRange, language }: { kind: 'clients' | 'leads'; range: RangeKey; setRange: (range: RangeKey) => void; language: Language }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const points = HISTORY[kind][range];
  const width = 720;
  const height = 132;
  const padX = 20;
  const padTop = 14;
  const padBottom = 20;
  const max = Math.max(1, ...points.map((point) => point.value));
  const plotted = points.map((point, index) => ({
    x: padX + (index / Math.max(1, points.length - 1)) * (width - padX * 2),
    y: padTop + (1 - point.value / max) * (height - padTop - padBottom)
  }));
  const path = smoothPath(plotted);
  const baseline = height - padBottom;
  const areaPath = plotted.length ? `${path} L ${plotted[plotted.length - 1].x} ${baseline} L ${plotted[0].x} ${baseline} Z` : '';
  const selected = hovered === null ? null : points[hovered];
  const selectedPoint = hovered === null ? null : plotted[hovered];
  const total = points.reduce((sum, point) => sum + point.value, 0);
  const peak = Math.max(...points.map((point) => point.value));
  const average = points.length ? total / points.length : 0;
  const unit = kind === 'clients' ? (language === 'es' ? 'clientes' : 'clients') : 'leads';

  return (
    <section className="mt-4 rounded-2xl border border-black/8 bg-white p-4 shadow-[0_10px_28px_rgba(10,10,10,0.025)] md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{kind === 'clients' ? (language === 'es' ? 'Histórico de clientes' : 'Client history') : (language === 'es' ? 'Histórico de leads' : 'Lead history')}</p>
          <p className="mt-1 text-xs text-black/40">{language === 'es' ? 'Volumen real por fecha del período seleccionado.' : 'Actual volume by date for the selected period.'}</p>
        </div>
        <div className="inline-flex rounded-full border border-black/8 bg-[#F7F7F5] p-1">
          {(['week', 'month', 'year'] as RangeKey[]).map((item) => (
            <button key={item} type="button" onClick={() => setRange(item)} className={`rounded-full px-3 py-1.5 text-[10px] font-semibold transition ${range === item ? 'bg-[#111413] text-white shadow-sm' : 'text-black/40 hover:text-black'}`}>
              {item === 'week' ? (language === 'es' ? 'Semana' : 'Week') : item === 'month' ? (language === 'es' ? 'Mes' : 'Month') : (language === 'es' ? 'Año' : 'Year')}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-[#F7F7F5] px-3.5 py-3"><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-black/35">{language === 'es' ? 'TOTAL' : 'TOTAL'}</p><p className="mt-1 text-lg font-semibold">{total}</p></div>
        <div className="rounded-xl bg-[#F7F7F5] px-3.5 py-3"><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-black/35">{language === 'es' ? 'PROMEDIO' : 'AVERAGE'}</p><p className="mt-1 text-lg font-semibold">{average.toFixed(range === 'week' ? 1 : 0)}</p></div>
        <div className="rounded-xl bg-[#F7F7F5] px-3.5 py-3"><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-black/35">{language === 'es' ? 'PICO' : 'PEAK'}</p><p className="mt-1 text-lg font-semibold">{peak}</p></div>
      </div>

      <div className="mt-3">
        <div className="relative h-[150px] w-full">
          {selected && selectedPoint && (
            <div
              className="pointer-events-none absolute z-20 min-w-[112px] -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-lg bg-[#111413] px-3 py-2 text-center text-[10px] text-white shadow-xl"
              style={{ left: `${(selectedPoint.x / width) * 100}%`, top: `${(selectedPoint.y / height) * 132}px` }}
            >
              <p className="font-semibold">{selected.fullLabel}</p>
              <p className="mt-0.5 text-white/65">{selected.value} {unit}</p>
              <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[#111413]" />
            </div>
          )}

          <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="absolute inset-x-0 top-0 h-[132px] w-full overflow-visible" role="img">
            <defs>
              <linearGradient id={`history-fill-${kind}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0A3F4D" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#0A3F4D" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75, 1].map((fraction) => <line key={fraction} x1="0" x2={width} y1={padTop + (height - padTop - padBottom) * fraction} y2={padTop + (height - padTop - padBottom) * fraction} stroke="#111413" strokeOpacity="0.055" />)}
            {areaPath && <path d={areaPath} fill={`url(#history-fill-${kind})`} />}
            {selectedPoint && <line x1={selectedPoint.x} x2={selectedPoint.x} y1={padTop} y2={baseline} stroke="#0A3F4D" strokeOpacity="0.16" strokeDasharray="3 4" />}
            <path d={path} fill="none" stroke="#0A3F4D" strokeWidth="2.15" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
            {plotted.map((point, index) => (
              <g key={points[index].fullLabel} onMouseEnter={() => setHovered(index)} onMouseLeave={() => setHovered(null)} className="cursor-crosshair">
                <circle cx={point.x} cy={point.y} r="13" fill="transparent" />
                <circle cx={point.x} cy={point.y} r={hovered === index ? 4.2 : 2.6} fill="white" stroke="#0A3F4D" strokeWidth={hovered === index ? 2 : 1.5} vectorEffect="non-scaling-stroke" />
              </g>
            ))}
          </svg>

          <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 text-[9px] font-medium text-black/32">
            {points.map((point, index) => <span key={point.fullLabel} className={points.length > 8 && index % 2 !== 0 ? 'hidden sm:block' : ''}>{point.label}</span>)}
          </div>
        </div>
      </div>
    </section>
  );
}

function MetricRing({ metric }: { metric: Metric }) {
  const percentage = Math.max(0, Math.min(100, (metric.ringValue / Math.max(1, metric.ringTotal)) * 100));
  return (
    <div className="relative h-12 w-12 shrink-0 rounded-full" style={{ background: `conic-gradient(${metric.colors[0]} 0 ${percentage / 2}%, ${metric.colors[1]} ${percentage / 2}% ${percentage}%, #E7E7E3 ${percentage}% 100%)` }}>
      <div className="absolute inset-[4px] grid place-items-center rounded-full bg-white text-[9px] font-semibold text-black/60">{metric.ringValue}/{metric.ringTotal}</div>
    </div>
  );
}

export function DashboardHistory({ language, onNavigate, onOpenClient }: { language: Language; onNavigate: (id: string) => void; onOpenClient: (id: string) => void }) {
  const [expanded, setExpanded] = useState<'clients' | 'leads' | null>(null);
  const [ranges, setRanges] = useState<Record<'clients' | 'leads', RangeKey>>({ clients: 'month', leads: 'month' });
  const [tasks, setTasks] = useState<WorkTask[]>(loadTasks);

  useEffect(() => {
    const refresh = () => setTasks(loadTasks());
    window.addEventListener(WORKSPACE_STATE_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(WORKSPACE_STATE_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const openTasks = tasks.filter((task) => task.status !== 'done');
  const metrics = useMemo(() => BASE_METRICS.map((metric) => metric.id === 'priority'
    ? { ...metric, value: String(openTasks.length), ringValue: Math.min(openTasks.length, 7), ringTotal: Math.max(1, openTasks.length) }
    : metric), [openTasks.length]);

  const radar = [
    { id: 'sofia', name: 'Sofía Martínez', type: language === 'es' ? 'Cliente activo' : 'Active client', action: language === 'es' ? 'Enviar email' : 'Send email', reason: language === 'es' ? '2 compromisos vencidos y 9 días sin actualización.' : '2 overdue commitments and 9 days without an update.', next: language === 'es' ? 'Revisar compromisos antes de la próxima sesión.' : 'Review commitments before the next session.', due: language === 'es' ? 'Hoy · 17:00' : 'Today · 17:00' },
    { id: 'diego', name: 'Diego Rojas', type: language === 'es' ? 'Renovación' : 'Renewal', action: language === 'es' ? 'Confirmar reunión' : 'Confirm meeting', reason: language === 'es' ? 'El programa termina en 16 días y falta definir continuidad.' : 'Program ends in 16 days and continuity is still undefined.', next: language === 'es' ? 'Preparar conversación de renovación.' : 'Prepare renewal conversation.', due: language === 'es' ? 'Mié · 12:00' : 'Wed · 12:00' },
    { id: 'valentina', name: 'Valentina Cruz', type: 'Lead', action: language === 'es' ? 'Llamar' : 'Call', reason: language === 'es' ? 'Alta intención y conversación sin siguiente paso.' : 'High intent and conversation without a next step.', next: language === 'es' ? 'Confirmar diagnóstico.' : 'Confirm diagnostic call.', due: language === 'es' ? 'Mañana · 11:00' : 'Tomorrow · 11:00' }
  ];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const expandable = metric.id === 'clients' || metric.id === 'leads';
          const isExpanded = expanded === metric.id;
          return (
            <article key={metric.id} className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_10px_30px_rgba(10,10,10,0.035)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-black/45">{metric.label[language]}</p>
                  <strong className="mt-3 block text-3xl font-semibold tracking-[-0.04em]">{metric.value}</strong>
                  <span className="mt-1 block text-xs text-black/45">{metric.detail[language]}</span>
                </div>
                <MetricRing metric={metric} />
              </div>
              {expandable ? (
                <button type="button" onClick={() => setExpanded(isExpanded ? null : metric.id as 'clients' | 'leads')} className="mt-4 flex w-full items-center justify-between border-t border-black/5 pt-3 text-left text-xs text-black/55 transition hover:text-black/80">
                  <span>{metric.trend[language]}</span>
                  <ChevronDown className={`h-3.5 w-3.5 transition ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
              ) : <button type="button" onClick={() => metric.id === 'priority' && onNavigate('priority')} className="mt-4 w-full border-t border-black/5 pt-3 text-left text-xs text-black/55">{metric.trend[language]}</button>}
            </article>
          );
        })}
      </div>

      {expanded && <HistoricalChart kind={expanded} range={ranges[expanded]} setRange={(range) => setRanges((current) => ({ ...current, [expanded]: range }))} language={language} />}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_0.75fr]">
        <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_10px_30px_rgba(10,10,10,0.03)] md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">THE RADAR</p>
              <h2 className="mt-2 text-xl font-semibold">{language === 'es' ? 'Atención requerida' : 'Attention required'}</h2>
              <p className="mt-1 text-sm text-black/50">{language === 'es' ? 'Quién necesita intervención, por qué y cuál es el siguiente paso.' : 'Who needs intervention, why, and what happens next.'}</p>
            </div>
            <span className="rounded-full bg-[#A23A32]/8 px-3 py-1.5 text-xs font-semibold text-[#8D332C]">{radar.length} {language === 'es' ? 'personas' : 'people'}</span>
          </div>

          <div className="mt-4 divide-y divide-black/5">
            {radar.map((item) => (
              <div key={item.id} className="grid gap-3 py-4 first:pt-1 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="flex min-w-0 gap-3">
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#A23A32]" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{item.name}</p><span className="rounded-full bg-black/[0.04] px-2 py-0.5 text-[9px] font-semibold text-black/45">{item.type}</span><span className="rounded-full bg-[#A23A32]/8 px-2 py-0.5 text-[9px] font-semibold text-[#8D332C]">{item.action}</span></div>
                    <p className="mt-1.5 text-xs leading-5 text-black/50">{item.reason}</p>
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[10px] text-black/38"><span><strong className="text-black/55">{language === 'es' ? 'Próximo:' : 'Next:'}</strong> {item.next}</span><span><strong className="text-black/55">{language === 'es' ? 'Cuándo:' : 'When:'}</strong> {item.due}</span></div>
                  </div>
                </div>
                <button type="button" onClick={() => onOpenClient(item.id)} className="inline-flex items-center justify-center gap-1.5 rounded-full border border-black/10 px-3.5 py-2 text-[11px] font-semibold text-black/55 transition hover:border-[#0A3F4D]/30 hover:text-[#0A3F4D]">{language === 'es' ? 'Ver ficha' : 'Open record'}<ChevronRight className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
        </section>

        <div className="grid content-start gap-6">
          <section className="rounded-2xl border border-black/10 bg-white p-5">
            <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">{language === 'es' ? 'AGENDA' : 'AGENDA'}</p><h2 className="mt-2 text-lg font-semibold">{language === 'es' ? 'Próximas sesiones' : 'Upcoming sessions'}</h2></div><CalendarDays className="h-5 w-5 text-[#0A3F4D]" /></div>
            <div className="mt-4 space-y-3">{[['10:00','Andrés Silva'],['15:30','Sofía Martínez'],['18:00','Tomás León']].map(([time,name]) => <div key={`${time}-${name}`} className="flex gap-4 border-b border-black/5 pb-3 last:border-0 last:pb-0"><span className="w-12 text-sm font-semibold text-black/60">{time}</span><span className="text-sm">{name}</span></div>)}</div>
          </section>

          <section className="rounded-2xl border border-black/10 bg-white p-5">
            <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">{language === 'es' ? 'EJECUCIÓN' : 'EXECUTION'}</p><h2 className="mt-2 text-lg font-semibold">{language === 'es' ? 'Por hacer hoy' : 'Due today'}</h2></div><ListTodo className="h-5 w-5 text-[#0A3F4D]" /></div>
            <div className="mt-4 space-y-3">{openTasks.slice(0, 3).map((task) => <div key={task.id} className="rounded-xl bg-[#F7F7F5] p-3"><div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold">{task.title}</p><span className="text-[9px] text-black/35">{task.dueTime}</span></div><p className="mt-1 text-[10px] text-black/45">{task.clientName} · {task.assignee}</p></div>)}</div>
            <button type="button" onClick={() => onNavigate('priority')} className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#0A3F4D]">{language === 'es' ? 'Abrir trabajo prioritario' : 'Open priority work'}<ChevronRight className="h-3.5 w-3.5" /></button>
          </section>
        </div>
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {[[language === 'es' ? 'Renovaciones <30 días' : 'Renewals <30 days','6',Target],[language === 'es' ? 'Sin próxima acción' : 'No next action','3',AlertTriangle],[language === 'es' ? 'Tareas abiertas' : 'Open tasks',String(openTasks.length),CircleGauge]].map(([label,value,Icon]) => {
          const IconComponent = Icon as React.ComponentType<{ className?: string }>;
          return <div key={String(label)} className="rounded-2xl border border-black/10 bg-white p-5"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#0A3F4D]/8"><IconComponent className="h-4.5 w-4.5 text-[#0A3F4D]" /></div><div><p className="text-sm font-semibold">{label}</p><p className="text-xs text-black/45">{value}</p></div></div></div>;
        })}
      </section>
    </>
  );
}
