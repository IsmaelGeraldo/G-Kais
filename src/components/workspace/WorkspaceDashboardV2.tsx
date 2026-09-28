import React, { useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, ChevronDown, ChevronRight, CircleGauge, Sparkles, Target } from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';

type RangeKey = 'week' | 'month' | 'year';
type MetricId = 'priority' | 'sessions' | 'clients' | 'leads';
type Point = { label: string; value: number };

type Metric = {
  id: MetricId;
  label: { es: string; en: string };
  value: string;
  detail: { es: string; en: string };
  trend: { es: string; en: string };
  ring: string;
  chart?: Record<RangeKey, Point[]>;
};

const CLIENT_HISTORY: Record<RangeKey, Point[]> = {
  week: [
    { label: '22 sep', value: 0 }, { label: '23 sep', value: 1 }, { label: '24 sep', value: 0 },
    { label: '25 sep', value: 1 }, { label: '26 sep', value: 0 }, { label: '27 sep', value: 1 }, { label: '28 sep', value: 1 }
  ],
  month: Array.from({ length: 28 }, (_, index) => ({
    label: `${String(index + 1).padStart(2, '0')} sep`,
    value: [0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0][index] ?? 0
  })),
  year: [
    { label: 'Oct 25', value: 2 }, { label: 'Nov 25', value: 3 }, { label: 'Dic 25', value: 1 },
    { label: 'Ene 26', value: 4 }, { label: 'Feb 26', value: 2 }, { label: 'Mar 26', value: 5 },
    { label: 'Abr 26', value: 4 }, { label: 'May 26', value: 6 }, { label: 'Jun 26', value: 3 },
    { label: 'Jul 26', value: 5 }, { label: 'Ago 26', value: 7 }, { label: 'Sep 26', value: 4 }
  ]
};

const LEAD_HISTORY: Record<RangeKey, Point[]> = {
  week: [
    { label: '22 sep', value: 2 }, { label: '23 sep', value: 4 }, { label: '24 sep', value: 1 },
    { label: '25 sep', value: 3 }, { label: '26 sep', value: 2 }, { label: '27 sep', value: 4 }, { label: '28 sep', value: 2 }
  ],
  month: Array.from({ length: 28 }, (_, index) => ({
    label: `${String(index + 1).padStart(2, '0')} sep`,
    value: [1,0,2,1,0,1,2,0,1,1,0,2,1,0,1,1,0,1,1,0,1,1,0,0,1,0,0,0][index] ?? 0
  })),
  year: [
    { label: 'Oct 25', value: 11 }, { label: 'Nov 25', value: 14 }, { label: 'Dic 25', value: 9 },
    { label: 'Ene 26', value: 16 }, { label: 'Feb 26', value: 13 }, { label: 'Mar 26', value: 19 },
    { label: 'Abr 26', value: 17 }, { label: 'May 26', value: 22 }, { label: 'Jun 26', value: 18 },
    { label: 'Jul 26', value: 21 }, { label: 'Ago 26', value: 24 }, { label: 'Sep 26', value: 18 }
  ]
};

const METRICS: Metric[] = [
  { id: 'priority', label: { es: 'Trabajo prioritario', en: 'Priority Work' }, value: '7', detail: { es: '3 clientes · 4 leads', en: '3 clients · 4 leads' }, trend: { es: 'requieren atención hoy', en: 'need attention today' }, ring: '3/7 críticos' },
  { id: 'sessions', label: { es: 'Sesiones de hoy', en: 'Sessions Today' }, value: '5', detail: { es: '2 por preparar', en: '2 to prepare' }, trend: { es: '3 briefs listos', en: '3 briefs ready' }, ring: '3/5 listas' },
  { id: 'clients', label: { es: 'Clientes activos', en: 'Active Clients' }, value: '46', detail: { es: '+4 este mes', en: '+4 this month' }, trend: { es: '+9% vs mes anterior', en: '+9% vs previous month' }, ring: '43/46', chart: CLIENT_HISTORY },
  { id: 'leads', label: { es: 'Nuevos leads', en: 'New Leads' }, value: '18', detail: { es: 'este mes', en: 'this month' }, trend: { es: '+12% vs mes anterior', en: '+12% vs previous month' }, ring: '14/18', chart: LEAD_HISTORY }
];

function smoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length < 2) return '';
  const line = (p: { x: number; y: number }) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  let d = `M ${line(points[0])}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const cp1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const cp2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C ${line(cp1)} ${line(cp2)} ${line(p2)}`;
  }
  return d;
}

function HistoryChart({ data, range, setRange, language, noun }: { data: Record<RangeKey, Point[]>; range: RangeKey; setRange: (range: RangeKey) => void; language: Language; noun: 'clients' | 'leads' }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const points = data[range];
  const width = 620;
  const height = 190;
  const top = 22;
  const bottom = 32;
  const max = Math.max(1, ...points.map((point) => point.value));
  const coords = points.map((point, index) => ({
    x: points.length === 1 ? width / 2 : 18 + (index / (points.length - 1)) * (width - 36),
    y: top + (1 - point.value / max) * (height - top - bottom)
  }));
  const total = points.reduce((sum, point) => sum + point.value, 0);
  const xLabels = range === 'month'
    ? points.filter((_, index) => index === 0 || index === 6 || index === 13 || index === 20 || index === points.length - 1)
    : points;

  return (
    <div className="mt-4 rounded-2xl border border-black/8 bg-[#FAFAF8] p-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold">{total} {language === 'es' ? (noun === 'clients' ? 'nuevos clientes' : 'nuevos leads') : (noun === 'clients' ? 'new clients' : 'new leads')}</p>
          <p className="mt-0.5 text-[11px] text-black/40">{language === 'es' ? 'Historial del periodo seleccionado' : 'History for selected period'}</p>
        </div>
        <div className="inline-flex self-start rounded-full border border-black/8 bg-white p-1">
          {(['week', 'month', 'year'] as RangeKey[]).map((item) => (
            <button key={item} type="button" onClick={() => setRange(item)} className={`rounded-full px-3 py-1.5 text-[10px] font-semibold transition ${range === item ? 'bg-[#111413] text-white' : 'text-black/45 hover:text-black'}`}>
              {language === 'es' ? ({ week: 'Semana', month: 'Mes', year: 'Año' } as const)[item] : ({ week: 'Week', month: 'Month', year: 'Year' } as const)[item]}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-3 overflow-visible text-[#0A3F4D]">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[190px] w-full overflow-visible" role="img">
          {[0.25, 0.5, 0.75].map((fraction) => <line key={fraction} x1="18" x2={width - 18} y1={top + (height - top - bottom) * fraction} y2={top + (height - top - bottom) * fraction} stroke="currentColor" strokeOpacity="0.08" />)}
          <path d={smoothPath(coords)} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          {coords.map((coord, index) => (
            <g key={`${points[index].label}-${index}`}>
              <circle cx={coord.x} cy={coord.y} r={hovered === index ? 5 : 3.5} fill="white" stroke="currentColor" strokeWidth="2" />
              <circle cx={coord.x} cy={coord.y} r="12" fill="transparent" className="cursor-crosshair" onMouseEnter={() => setHovered(index)} onMouseLeave={() => setHovered(null)} />
            </g>
          ))}
          {hovered !== null && (
            <g pointerEvents="none">
              <line x1={coords[hovered].x} x2={coords[hovered].x} y1={top} y2={height - bottom} stroke="currentColor" strokeOpacity="0.15" strokeDasharray="4 4" />
              <rect x={Math.max(6, Math.min(width - 126, coords[hovered].x - 60))} y={Math.max(4, coords[hovered].y - 54)} width="120" height="40" rx="9" fill="#111413" />
              <text x={Math.max(66, Math.min(width - 66, coords[hovered].x))} y={Math.max(20, coords[hovered].y - 36)} textAnchor="middle" fill="white" fontSize="10" fontWeight="600">{points[hovered].label}</text>
              <text x={Math.max(66, Math.min(width - 66, coords[hovered].x))} y={Math.max(34, coords[hovered].y - 22)} textAnchor="middle" fill="rgba(255,255,255,.72)" fontSize="9">{points[hovered].value} {noun === 'clients' ? (language === 'es' ? 'clientes' : 'clients') : 'leads'}</text>
            </g>
          )}
        </svg>
      </div>
      <div className={`grid gap-1 text-[9px] font-medium text-black/32 ${range === 'year' ? 'grid-cols-6 sm:grid-cols-12' : 'grid-cols-5'}`}>
        {xLabels.map((point) => <span key={point.label} className="text-center">{point.label}</span>)}
      </div>
    </div>
  );
}

function MetricCard({ metric, language, expanded, onToggle }: { metric: Metric; language: Language; expanded: boolean; onToggle: () => void }) {
  const [range, setRange] = useState<RangeKey>('month');
  return (
    <article className="self-start rounded-2xl border border-black/10 bg-white p-5 shadow-[0_12px_35px_rgba(10,10,10,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-black/45">{metric.label[language]}</p>
          <strong className="mt-4 block text-4xl font-semibold tracking-[-0.04em]">{metric.value}</strong>
          <span className="mt-1.5 block text-xs text-black/45">{metric.detail[language]}</span>
        </div>
        <div className="grid h-14 w-14 place-items-center rounded-full border-[5px] border-[#0A3F4D]/18 text-[10px] font-semibold text-[#0A3F4D]">{metric.ring.split(' ')[0]}</div>
      </div>
      {metric.chart ? (
        <button type="button" onClick={onToggle} className="mt-4 flex w-full items-center justify-between gap-3 border-t border-black/5 pt-3 text-left text-xs text-black/55 hover:text-black">
          <span>{metric.trend[language]}</span><ChevronDown className={`h-3.5 w-3.5 transition ${expanded ? 'rotate-180' : ''}`} />
        </button>
      ) : <p className="mt-4 border-t border-black/5 pt-3 text-xs text-black/55">{metric.trend[language]}</p>}
      {metric.chart && expanded && <HistoryChart data={metric.chart} range={range} setRange={setRange} language={language} noun={metric.id === 'clients' ? 'clients' : 'leads'} />}
    </article>
  );
}

export function WorkspaceDashboardV2({ language, onNavigate }: { language: Language; onNavigate: (id: string) => void }) {
  const [expanded, setExpanded] = useState<MetricId | null>(null);
  return (
    <>
      <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {METRICS.map((metric) => <MetricCard key={metric.id} metric={metric} language={language} expanded={expanded === metric.id} onToggle={() => setExpanded((current) => current === metric.id ? null : metric.id)} />)}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
        <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-[0_12px_35px_rgba(10,10,10,0.04)]">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">THE RADAR</p><h2 className="mt-2 text-xl font-semibold">{language === 'es' ? 'Trabajo prioritario' : 'Priority Work'}</h2><p className="mt-1 text-sm text-black/50">{language === 'es' ? 'Qué persona requiere atención, por qué y qué acción concreta corresponde.' : 'Who needs attention, why and the concrete action required.'}</p></div><span className="rounded-full bg-[#A23A32]/8 px-3 py-1.5 text-xs font-semibold text-[#8D332C]">7 {language === 'es' ? 'hoy' : 'today'}</span></div>
          <div className="mt-4 divide-y divide-black/5">
            {[
              ['Sofía Martínez', language === 'es' ? 'Enviar email' : 'Send email', language === 'es' ? '2 compromisos vencidos y 9 días sin actualización.' : '2 overdue commitments and no update for 9 days.'],
              ['Diego Rojas', language === 'es' ? 'Preparar renovación' : 'Prepare renewal', language === 'es' ? 'El programa termina en 16 días.' : 'The program ends in 16 days.'],
              ['Valentina Cruz', language === 'es' ? 'Confirmar reunión' : 'Confirm meeting', language === 'es' ? 'La conversación quedó sin siguiente paso.' : 'The conversation has no next step.']
            ].map(([name, action, reason]) => <div key={name} className="flex flex-col gap-3 py-4 md:flex-row md:items-center"><span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#A23A32]"/><div className="min-w-0 flex-1"><p className="font-semibold">{name}</p><p className="mt-1 text-sm text-black/50">{reason}</p></div><div className="rounded-xl bg-[#A23A32]/6 px-3 py-2 text-xs font-semibold text-[#8D332C]">{action}</div></div>)}
          </div>
          <button type="button" onClick={() => onNavigate('priority')} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#0A3F4D]">{language === 'es' ? 'Abrir The Radar' : 'Open The Radar'}<ChevronRight className="h-4 w-4"/></button>
        </section>
        <div className="space-y-6">
          <section className="rounded-2xl border border-black/10 bg-white p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">{language === 'es' ? 'HOY' : 'TODAY'}</p><h2 className="mt-2 text-lg font-semibold">{language === 'es' ? 'Próximas sesiones' : 'Upcoming Sessions'}</h2></div><CalendarDays className="h-5 w-5 text-[#0A3F4D]"/></div><div className="mt-4 space-y-4">{[['10:00','Andrés Silva'],['15:30','Sofía Martínez'],['18:00','Tomás León']].map(([time,name]) => <div key={time} className="flex gap-4 border-b border-black/5 pb-3 last:border-0"><strong className="w-12 text-sm">{time}</strong><span className="text-sm text-black/65">{name}</span></div>)}</div></section>
          <section className="rounded-2xl bg-[#0A3F4D] p-5 text-white"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">G-KAIS COPILOT</p><h2 className="mt-2 text-lg font-semibold">{language === 'es' ? 'Contexto antes de actuar.' : 'Context before action.'}</h2></div><Sparkles className="h-5 w-5 text-white/80"/></div><p className="mt-3 text-sm leading-6 text-white/70">{language === 'es' ? 'Sofía requiere seguimiento por compromisos vencidos. Diego está entrando en ventana de renovación.' : 'Sofía needs follow-up for overdue commitments. Diego is entering the renewal window.'}</p></section>
        </div>
      </div>
      <section className="mt-6 grid gap-4 md:grid-cols-3">{[[Target, language === 'es' ? 'Renovaciones <30 días' : 'Renewals <30 days','6'],[AlertTriangle,language === 'es' ? 'Sin próxima acción' : 'No next action','3'],[CircleGauge,language === 'es' ? 'Atención crítica' : 'Critical attention','3']].map(([Icon,label,value]) => { const C = Icon as React.ComponentType<{className?: string}>; return <div key={String(label)} className="rounded-2xl border border-black/10 bg-white p-5"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#0A3F4D]/8"><C className="h-4.5 w-4.5 text-[#0A3F4D]"/></div><div><p className="text-sm font-semibold">{label as string}</p><p className="text-xs text-black/45">{value as string}</p></div></div></div>})}</section>
    </>
  );
}

export function PriorityRadarV2({ language, onOpenClient }: { language: Language; onOpenClient: () => void }) {
  const items = useMemo(() => [
    { name: 'Sofía Martínez', stage: language === 'es' ? 'Cliente activo' : 'Active client', action: language === 'es' ? 'Enviar email' : 'Send email', reason: language === 'es' ? '2 compromisos vencidos y sin actualización en 9 días.' : '2 overdue commitments and no update for 9 days.', next: language === 'es' ? 'Revisar compromisos antes de la próxima sesión.' : 'Review commitments before the next session.', severity: 'critical' },
    { name: 'Diego Rojas', stage: language === 'es' ? 'Renovación' : 'Renewal', action: language === 'es' ? 'Preparar renovación' : 'Prepare renewal', reason: language === 'es' ? 'El programa termina en 16 días.' : 'The program ends in 16 days.', next: language === 'es' ? 'Preparar resultados logrados y brechas pendientes.' : 'Prepare achieved outcomes and remaining gaps.', severity: 'attention' },
    { name: 'Valentina Cruz', stage: 'Lead', action: language === 'es' ? 'Confirmar reunión' : 'Confirm meeting', reason: language === 'es' ? 'Alta intención y conversación sin siguiente paso.' : 'High intent and conversation without a next step.', next: language === 'es' ? 'Confirmar la llamada de diagnóstico.' : 'Confirm the diagnostic call.', severity: 'attention' }
  ], [language]);
  return <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-[0_12px_35px_rgba(10,10,10,0.04)]"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">THE RADAR</p><h2 className="mt-2 text-2xl font-semibold">{language === 'es' ? 'Personas que requieren atención ahora' : 'People who need attention now'}</h2><p className="mt-2 text-sm text-black/50">{language === 'es' ? 'La prioridad se explica con una causa y una acción concreta; no con un score opaco.' : 'Priority is explained by a cause and a concrete action, not an opaque score.'}</p></div><div className="mt-5 space-y-3">{items.map((item) => <article key={item.name} className="rounded-2xl border border-black/8 p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-start"><span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${item.severity === 'critical' ? 'bg-[#A23A32]' : 'bg-[#C07A28]'}`}/><div className="flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{item.name}</h3><span className="rounded-full bg-black/[0.04] px-2.5 py-1 text-[10px] text-black/50">{item.stage}</span></div><div className="mt-4 grid gap-3 md:grid-cols-3"><div className="rounded-xl bg-[#A23A32]/6 p-3"><p className="text-[9px] font-semibold uppercase tracking-[.14em] text-[#8D332C]">{language === 'es' ? 'REQUIERE' : 'REQUIRES'}</p><p className="mt-1 text-sm font-semibold text-[#8D332C]">{item.action}</p></div><div className="rounded-xl bg-[#F7F7F5] p-3 md:col-span-1"><p className="text-[9px] font-semibold uppercase tracking-[.14em] text-black/35">{language === 'es' ? 'MOTIVO' : 'REASON'}</p><p className="mt-1 text-sm text-black/62">{item.reason}</p></div><div className="rounded-xl bg-[#0A3F4D]/5 p-3"><p className="text-[9px] font-semibold uppercase tracking-[.14em] text-[#0A3F4D]">{language === 'es' ? 'PRÓXIMA ACCIÓN' : 'NEXT ACTION'}</p><p className="mt-1 text-sm font-medium">{item.next}</p></div></div></div>{item.name === 'Sofía Martínez' && <button type="button" onClick={onOpenClient} className="rounded-full border border-black/10 px-4 py-2 text-xs font-semibold">{language === 'es' ? 'Abrir cliente' : 'Open client'}</button>}</div></article>)}</div></section>;
}
