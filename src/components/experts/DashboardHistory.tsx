import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleGauge,
  ListTodo,
  Target,
  Video
} from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';
import { loadTasks, WORKSPACE_STATE_EVENT, type WorkTask } from './workspaceState';

type RangeKey = 'week' | 'month' | 'year';
type MetricId = 'priority' | 'sessions' | 'clients' | 'leads';
type LocalText = { es: string; en: string };
type TrendPoint = { label: string; fullLabel: string; value: number };
type ClientRecord = {
  id: string;
  name: string;
  currentPhase?: string;
  nextSession?: string;
  nextAction?: string;
};

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

const CLIENT_RECORD_STORAGE_KEY = 'gkais-experts-client-records-v2';

const BASE_METRICS: Metric[] = [
  { id: 'priority', label: { es: 'Trabajo prioritario', en: 'Priority Work' }, value: '0', detail: { es: 'acciones abiertas', en: 'open actions' }, trend: { es: 'abrir cola de ejecución', en: 'open execution queue' }, ringValue: 0, ringTotal: 1, colors: ['#A23A32', '#D67A32'] },
  { id: 'sessions', label: { es: 'Sesiones de hoy', en: 'Sessions Today' }, value: '3', detail: { es: '2 clientes · 1 lead', en: '2 clients · 1 lead' }, trend: { es: 'agenda del día', en: 'today agenda' }, ringValue: 2, ringTotal: 3, colors: ['#4556A6', '#74A9CF'] },
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

function loadClientRecords(): ClientRecord[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(CLIENT_RECORD_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function smoothPath(points: Array<{ x: number; y: number }>): string {
  if (!points.length) return '';
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const control = (previous.x + current.x) / 2;
    path += ` C ${control} ${previous.y}, ${control} ${current.y}, ${current.x} ${current.y}`;
  }
  return path;
}

function HistoricalChart({ kind, range, setRange, language }: { kind: 'clients' | 'leads'; range: RangeKey; setRange: (range: RangeKey) => void; language: Language }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const points = HISTORY[kind][range];
  const width = 760;
  const height = 150;
  const padX = 28;
  const padY = 20;
  const max = Math.max(1, ...points.map((point) => point.value));
  const plotted = points.map((point, index) => ({
    x: padX + (index / Math.max(1, points.length - 1)) * (width - padX * 2),
    y: height - padY - (point.value / max) * (height - padY * 2)
  }));
  const total = points.reduce((sum, point) => sum + point.value, 0);
  const average = total / points.length;
  const peak = Math.max(...points.map((point) => point.value));
  const selected = hovered === null ? null : points[hovered];
  const selectedPoint = hovered === null ? null : plotted[hovered];

  return (
    <section className="mt-4 rounded-2xl border border-black/8 bg-white p-4 shadow-[0_8px_24px_rgba(10,10,10,0.025)] md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{kind === 'clients' ? (language === 'es' ? 'Histórico de clientes' : 'Client history') : (language === 'es' ? 'Histórico de leads' : 'Lead history')}</p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-black/42">
            <span>{language === 'es' ? 'Total' : 'Total'} <strong className="text-black/65">{total}</strong></span>
            <span>{language === 'es' ? 'Promedio' : 'Average'} <strong className="text-black/65">{average.toFixed(1)}</strong></span>
            <span>{language === 'es' ? 'Pico' : 'Peak'} <strong className="text-black/65">{peak}</strong></span>
          </div>
        </div>
        <div className="inline-flex rounded-full border border-black/8 bg-[#F7F7F5] p-1">
          {(['week', 'month', 'year'] as RangeKey[]).map((item) => (
            <button key={item} type="button" onClick={() => setRange(item)} className={`rounded-full px-3 py-1.5 text-[10px] font-semibold ${range === item ? 'bg-[#111413] text-white' : 'text-black/40 hover:text-black'}`}>
              {item === 'week' ? (language === 'es' ? 'Semana' : 'Week') : item === 'month' ? (language === 'es' ? 'Mes' : 'Month') : (language === 'es' ? 'Año' : 'Year')}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-3 h-[176px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[150px] w-full overflow-visible" role="img" onMouseLeave={() => setHovered(null)}>
          {[0.25, 0.5, 0.75, 1].map((fraction) => <line key={fraction} x1={padX} x2={width - padX} y1={height * fraction - 5} y2={height * fraction - 5} stroke="currentColor" strokeOpacity="0.055" />)}
          <path d={smoothPath(plotted)} fill="none" stroke="#0A3F4D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {plotted.map((point, index) => (
            <g key={points[index].fullLabel} onMouseEnter={() => setHovered(index)} className="cursor-crosshair">
              <circle cx={point.x} cy={point.y} r="12" fill="transparent" />
              <circle cx={point.x} cy={point.y} r={hovered === index ? 4 : 2.75} fill="white" stroke="#0A3F4D" strokeWidth={hovered === index ? 2 : 1.5} />
            </g>
          ))}
        </svg>

        {selected && selectedPoint && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-[#111413] px-2.5 py-2 text-[10px] text-white shadow-xl"
            style={{ left: `${(selectedPoint.x / width) * 100}%`, top: `${(selectedPoint.y / height) * 150 + 4}px` }}
          >
            <p className="font-semibold">{selected.fullLabel}</p>
            <p className="mt-0.5 text-white/65">{selected.value} {kind === 'clients' ? (language === 'es' ? 'clientes' : 'clients') : 'leads'}</p>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 flex justify-between px-1 text-[9px] font-medium text-black/32">
          {points.map((point, index) => <span key={point.fullLabel} className={points.length > 8 && index % 2 !== 0 ? 'hidden sm:block' : ''}>{point.label}</span>)}
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

export function DashboardHistory({
  language,
  onNavigate,
  onOpenClient,
  onStartSession
}: {
  language: Language;
  onNavigate: (id: string) => void;
  onOpenClient: (id: string) => void;
  onStartSession: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState<'clients' | 'leads' | null>(null);
  const [ranges, setRanges] = useState<Record<'clients' | 'leads', RangeKey>>({ clients: 'month', leads: 'month' });
  const [tasks, setTasks] = useState<WorkTask[]>(loadTasks);
  const [clients, setClients] = useState<ClientRecord[]>(loadClientRecords);

  useEffect(() => {
    const refresh = () => {
      setTasks(loadTasks());
      setClients(loadClientRecords());
    };
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

  const signals = useMemo(() => {
    const result: Array<{ id: string; name: string; label: string; reason: string }> = [];
    clients.forEach((client) => {
      const phase = (client.currentPhase || '').toLowerCase();
      const nextSession = (client.nextSession || '').trim();
      const nextAction = (client.nextAction || '').trim();
      if (phase.includes('renov')) {
        result.push({ id: client.id, name: client.name, label: language === 'es' ? 'Renovación cercana' : 'Renewal approaching', reason: language === 'es' ? 'Conviene revisar resultados, brecha actual y continuidad antes del cierre del programa.' : 'Review results, current gap and continuity before the program ends.' });
      } else if (!nextSession || /coordinar|schedule|pendiente/i.test(nextSession)) {
        result.push({ id: client.id, name: client.name, label: language === 'es' ? 'Sin próxima sesión' : 'No next session', reason: language === 'es' ? 'La relación no tiene una próxima reunión confirmada.' : 'The relationship has no confirmed next meeting.' });
      } else if (!nextAction) {
        result.push({ id: client.id, name: client.name, label: language === 'es' ? 'Sin próxima acción' : 'No next action', reason: language === 'es' ? 'El cliente no tiene un siguiente paso definido.' : 'The client has no defined next step.' });
      }
    });
    return result.slice(0, 3);
  }, [clients, language]);

  const agenda = [
    { id: 'andres', time: '10:00', name: 'Andrés Silva' },
    { id: 'sofia', time: '15:30', name: 'Sofía Martínez' },
    { id: 'diego', time: '18:00', name: 'Diego Rojas' }
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
                  <span>{metric.trend[language]}</span><ChevronDown className={`h-3.5 w-3.5 transition ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
              ) : (
                <button type="button" onClick={() => metric.id === 'priority' && onNavigate('priority')} className="mt-4 w-full border-t border-black/5 pt-3 text-left text-xs text-black/55">{metric.trend[language]}</button>
              )}
            </article>
          );
        })}
      </div>

      {expanded && <HistoricalChart kind={expanded} range={ranges[expanded]} setRange={(range) => setRanges((current) => ({ ...current, [expanded]: range }))} language={language} />}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_0.8fr]">
        <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_10px_30px_rgba(10,10,10,0.03)] md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">THE RADAR</p>
              <h2 className="mt-2 text-xl font-semibold">{language === 'es' ? 'Señales de relación' : 'Relationship signals'}</h2>
              <p className="mt-1 text-sm text-black/50">{language === 'es' ? 'Situaciones que pueden transformarse en un problema si no se atienden a tiempo. Las tareas concretas viven en Trabajo prioritario.' : 'Situations that can become a problem if left unattended. Concrete tasks live in Priority Work.'}</p>
            </div>
            <span className="rounded-full bg-[#A46F16]/10 px-3 py-1.5 text-xs font-semibold text-[#82570F]">{signals.length}</span>
          </div>

          <div className="mt-4 divide-y divide-black/5">
            {signals.length === 0 && <div className="py-5 text-sm text-black/45">{language === 'es' ? 'No hay señales críticas activas.' : 'No critical signals are active.'}</div>}
            {signals.map((item) => (
              <div key={`${item.id}-${item.label}`} className="grid gap-3 py-4 first:pt-1 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="flex min-w-0 gap-3">
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#A46F16]" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{item.name}</p><span className="rounded-full bg-[#A46F16]/10 px-2 py-0.5 text-[9px] font-semibold text-[#82570F]">{item.label}</span></div>
                    <p className="mt-1.5 text-xs leading-5 text-black/50">{item.reason}</p>
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
            <div className="mt-4 space-y-2">
              {agenda.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-xl border border-black/6 p-3">
                  <span className="w-11 text-sm font-semibold text-black/60">{item.time}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">{item.name}</span>
                  <button type="button" onClick={() => onStartSession(item.id)} className="inline-flex items-center gap-1.5 rounded-full bg-[#111413] px-3 py-1.5 text-[10px] font-semibold text-white"><Video className="h-3 w-3" />{language === 'es' ? 'Modo sesión' : 'Session'}</button>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-black/10 bg-white p-5">
            <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">{language === 'es' ? 'EJECUCIÓN' : 'EXECUTION'}</p><h2 className="mt-2 text-lg font-semibold">{language === 'es' ? 'Por hacer hoy' : 'Due today'}</h2></div><ListTodo className="h-5 w-5 text-[#0A3F4D]" /></div>
            <div className="mt-4 space-y-3">{openTasks.slice(0, 3).map((task) => <div key={task.id} className="rounded-xl bg-[#F7F7F5] p-3"><div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold">{task.title}</p><span className="text-[9px] text-black/35">{task.dueTime}</span></div><p className="mt-1 text-[10px] text-black/45">{task.clientName} · {task.assignee}</p></div>)}</div>
            <button type="button" onClick={() => onNavigate('priority')} className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#0A3F4D]">{language === 'es' ? 'Abrir trabajo prioritario' : 'Open priority work'}<ChevronRight className="h-3.5 w-3.5" /></button>
          </section>
        </div>
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {[[language === 'es' ? 'Renovaciones <30 días' : 'Renewals <30 days','6',Target],[language === 'es' ? 'Sin próxima acción' : 'No next action',String(clients.filter((client) => !(client.nextAction || '').trim()).length),AlertTriangle],[language === 'es' ? 'Tareas abiertas' : 'Open tasks',String(openTasks.length),CircleGauge]].map(([label,value,Icon]) => {
          const IconComponent = Icon as React.ComponentType<{ className?: string }>;
          return <div key={String(label)} className="rounded-2xl border border-black/10 bg-white p-5"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#0A3F4D]/8"><IconComponent className="h-4.5 w-4.5 text-[#0A3F4D]" /></div><div><p className="text-sm font-semibold">{label}</p><p className="text-xs text-black/45">{value}</p></div></div></div>;
        })}
      </section>
    </>
  );
}
