import React, { useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleGauge,
  Sparkles,
  Target
} from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';

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

const METRICS: Metric[] = [
  { id: 'priority', label: { es: 'Trabajo prioritario', en: 'Priority Work' }, value: '7', detail: { es: '3 clientes · 4 leads', en: '3 clients · 4 leads' }, trend: { es: 'requieren atención hoy', en: 'need attention today' }, ringValue: 3, ringTotal: 7, colors: ['#A23A32', '#D67A32'] },
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
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const midpoint = (previous.x + current.x) / 2;
    path += ` C ${midpoint} ${previous.y}, ${midpoint} ${current.y}, ${current.x} ${current.y}`;
  }
  return path;
}

function HistoricalChart({ kind, range, setRange, language }: { kind: 'clients' | 'leads'; range: RangeKey; setRange: (range: RangeKey) => void; language: Language }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const points = HISTORY[kind][range];
  const width = 680;
  const height = 190;
  const padding = 22;
  const max = Math.max(1, ...points.map((point) => point.value));
  const plotted = points.map((point, index) => ({
    x: padding + (index / Math.max(1, points.length - 1)) * (width - padding * 2),
    y: height - padding - (point.value / max) * (height - padding * 2)
  }));
  const selected = hovered === null ? null : points[hovered];
  const total = points.reduce((sum, point) => sum + point.value, 0);

  return (
    <div className="mt-4 rounded-2xl border border-black/8 bg-[#FAFAF8] p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{kind === 'clients' ? (language === 'es' ? 'Nuevos clientes' : 'New clients') : (language === 'es' ? 'Nuevos leads' : 'New leads')}</p>
          <p className="mt-1 text-xs text-black/40">{total} {language === 'es' ? 'en el período seleccionado' : 'in the selected period'}</p>
        </div>
        <div className="inline-flex rounded-full border border-black/8 bg-white p-1">
          {(['week', 'month', 'year'] as RangeKey[]).map((item) => (
            <button key={item} type="button" onClick={() => setRange(item)} className={`rounded-full px-3 py-1.5 text-[10px] font-semibold ${range === item ? 'bg-[#111413] text-white' : 'text-black/40 hover:text-black'}`}>
              {item === 'week' ? (language === 'es' ? 'Semana' : 'Week') : item === 'month' ? (language === 'es' ? 'Mes' : 'Month') : (language === 'es' ? 'Año' : 'Year')}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-4">
        {selected && hovered !== null && (
          <div className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg bg-[#111413] px-3 py-2 text-xs text-white shadow-xl" style={{ left: `${(hovered / Math.max(1, points.length - 1)) * 100}%`, top: 0 }}>
            <p className="font-semibold">{selected.fullLabel}</p>
            <p className="mt-0.5 text-white/65">{selected.value} {kind === 'clients' ? (language === 'es' ? 'clientes' : 'clients') : 'leads'}</p>
          </div>
        )}
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[190px] w-full overflow-visible" role="img">
          {[0.25, 0.5, 0.75, 1].map((fraction) => <line key={fraction} x1="0" x2={width} y1={height * fraction - 8} y2={height * fraction - 8} stroke="currentColor" strokeOpacity="0.06" />)}
          <path d={smoothPath(plotted)} fill="none" stroke="currentColor" className="text-[#0A3F4D]" strokeWidth="4" strokeLinecap="round" />
          {plotted.map((point, index) => (
            <g key={points[index].fullLabel} onMouseEnter={() => setHovered(index)} onMouseLeave={() => setHovered(null)} className="cursor-crosshair">
              <circle cx={point.x} cy={point.y} r="13" fill="transparent" />
              <circle cx={point.x} cy={point.y} r={hovered === index ? 5 : 3.5} fill="white" stroke="currentColor" className="text-[#0A3F4D]" strokeWidth="2.5" />
            </g>
          ))}
        </svg>
        <div className="flex justify-between gap-1 text-[9px] font-medium text-black/32">
          {points.map((point, index) => <span key={point.fullLabel} className={points.length > 8 && index % 2 !== 0 ? 'hidden sm:block' : ''}>{point.label}</span>)}
        </div>
      </div>
    </div>
  );
}

function MetricRing({ metric }: { metric: Metric }) {
  const percentage = (metric.ringValue / metric.ringTotal) * 100;
  return (
    <div className="relative h-14 w-14 shrink-0 rounded-full" style={{ background: `conic-gradient(${metric.colors[0]} 0 ${percentage / 2}%, ${metric.colors[1]} ${percentage / 2}% ${percentage}%, #E7E7E3 ${percentage}% 100%)` }}>
      <div className="absolute inset-[5px] grid place-items-center rounded-full bg-white text-[10px] font-semibold text-black/60">{metric.ringValue}/{metric.ringTotal}</div>
    </div>
  );
}

export function DashboardHistory({ language, onNavigate }: { language: Language; onNavigate: (id: string) => void }) {
  const [expanded, setExpanded] = useState<'clients' | 'leads' | null>(null);
  const [ranges, setRanges] = useState<Record<'clients' | 'leads', RangeKey>>({ clients: 'month', leads: 'month' });

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {METRICS.map((metric) => {
          const expandable = metric.id === 'clients' || metric.id === 'leads';
          const isExpanded = expanded === metric.id;
          return (
            <article key={metric.id} className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_12px_35px_rgba(10,10,10,0.04)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-black/45">{metric.label[language]}</p>
                  <strong className="mt-4 block text-4xl font-semibold tracking-[-0.04em]">{metric.value}</strong>
                  <span className="mt-1.5 block text-xs text-black/45">{metric.detail[language]}</span>
                </div>
                <MetricRing metric={metric} />
              </div>
              {expandable ? (
                <button type="button" onClick={() => setExpanded(isExpanded ? null : metric.id as 'clients' | 'leads')} className="mt-4 flex w-full items-center justify-between border-t border-black/5 pt-3 text-left text-xs text-black/55 transition hover:text-black/80">
                  <span>{metric.trend[language]}</span>
                  <ChevronDown className={`h-3.5 w-3.5 transition ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
              ) : <p className="mt-4 border-t border-black/5 pt-3 text-xs text-black/55">{metric.trend[language]}</p>}
            </article>
          );
        })}
      </div>

      {expanded && <HistoricalChart kind={expanded} range={ranges[expanded]} setRange={(range) => setRanges((current) => ({ ...current, [expanded]: range }))} language={language} />}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
        <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-[0_12px_35px_rgba(10,10,10,0.04)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">THE RADAR</p>
              <h2 className="mt-2 text-xl font-semibold">{language === 'es' ? 'Trabajo prioritario' : 'Priority Work'}</h2>
              <p className="mt-1 text-sm text-black/50">{language === 'es' ? 'Personas que requieren una intervención concreta hoy.' : 'People who need a concrete intervention today.'}</p>
            </div>
            <span className="rounded-full bg-[#A23A32]/8 px-3 py-1.5 text-xs font-semibold text-[#8D332C]">7 {language === 'es' ? 'hoy' : 'today'}</span>
          </div>
          <div className="mt-4 space-y-2">
            {[
              ['Sofía Martínez', language === 'es' ? 'Enviar email' : 'Send email', language === 'es' ? '2 compromisos vencidos y 9 días sin actualización.' : '2 overdue commitments and 9 days without an update.'],
              ['Diego Rojas', language === 'es' ? 'Confirmar reunión' : 'Confirm meeting', language === 'es' ? 'Renovación en 16 días y sin decisión de continuidad.' : 'Renewal in 16 days with no continuity decision.']
            ].map(([name, action, reason]) => (
              <div key={name} className="flex flex-col gap-3 rounded-xl border border-black/7 p-4 md:flex-row md:items-center">
                <span className="h-2.5 w-2.5 rounded-full bg-[#A23A32]" />
                <div className="flex-1"><div className="flex flex-wrap gap-2"><p className="text-sm font-semibold">{name}</p><span className="rounded-full bg-[#A23A32]/8 px-2 py-0.5 text-[10px] font-semibold text-[#8D332C]">{action}</span></div><p className="mt-1 text-xs leading-5 text-black/50">{reason}</p></div>
              </div>
            ))}
          </div>
          <button onClick={() => onNavigate('priority')} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#0A3F4D]">{language === 'es' ? 'Abrir Trabajo prioritario' : 'Open Priority Work'}<ChevronRight className="h-4 w-4" /></button>
        </section>

        <div className="grid gap-6">
          <section className="rounded-2xl border border-black/10 bg-white p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">{language === 'es' ? 'HOY' : 'TODAY'}</p><h2 className="mt-2 text-lg font-semibold">{language === 'es' ? 'Próximas sesiones' : 'Upcoming Sessions'}</h2></div><CalendarDays className="h-5 w-5 text-[#0A3F4D]" /></div><div className="mt-4 space-y-4">{[['10:00','Andrés Silva'],['15:30','Sofía Martínez'],['18:00','Tomás León']].map(([time,name]) => <div key={time} className="flex gap-4 border-b border-black/5 pb-3 last:border-0"><span className="w-12 text-sm font-semibold text-black/60">{time}</span><span className="text-sm">{name}</span></div>)}</div></section>
          <section className="rounded-2xl bg-[#0A3F4D] p-5 text-white"><Sparkles className="h-5 w-5 text-white/80" /><h2 className="mt-3 text-lg font-semibold">G-KAIS Copilot</h2><p className="mt-2 text-sm leading-6 text-white/70">{language === 'es' ? 'El brief de sesión ya conecta contexto, problemas, preguntas, soluciones y próxima acción.' : 'The session brief already connects context, problems, questions, solutions and next action.'}</p><button onClick={() => onNavigate('sessions')} className="mt-5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#0A3F4D]">{language === 'es' ? 'Abrir modo sesión' : 'Open session mode'}</button></section>
        </div>
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {[[language === 'es' ? 'Renovaciones <30 días' : 'Renewals <30 days','6',Target],[language === 'es' ? 'Sin próxima acción' : 'No next action','3',AlertTriangle],[language === 'es' ? 'Trabajo crítico' : 'Critical work','3',CircleGauge]].map(([label,value,Icon]) => {
          const IconComponent = Icon as React.ComponentType<{ className?: string }>;
          return <div key={String(label)} className="rounded-2xl border border-black/10 bg-white p-5"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#0A3F4D]/8"><IconComponent className="h-4.5 w-4.5 text-[#0A3F4D]" /></div><div><p className="text-sm font-semibold">{label}</p><p className="text-xs text-black/45">{value}</p></div></div></div>;
        })}
      </section>
    </>
  );
}
