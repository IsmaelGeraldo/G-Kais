import React, { useEffect, useMemo, useRef, useState } from 'react';
import WorldMap, { regions, type CountryContext, type ISOCode } from 'react-svg-worldmap';
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Globe2,
  ListTodo,
  MessageCircleReply,
  Radio,
  UsersRound
} from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';
import { subscribeExpertPeople, type ExpertPerson } from '../../services/expertsAcquisition';
import {
  subscribeExpertCohorts,
  subscribeExpertEnrollments,
  subscribeExpertFormations,
  type ExpertCohort,
  type ExpertEnrollment,
  type ExpertFormation
} from '../../services/expertsFormations';
import { subscribeExpertPeopleProfileMeta, type ExpertPersonProfileMeta } from '../../services/expertsPeopleProfile';
import {
  subscribeDashboardCohortTimes,
  subscribeDashboardFormationClasses,
  subscribeDashboardMentoringBuyers,
  subscribeDashboardWorkItems,
  type DashboardCohortTime,
  type DashboardFormationClass,
  type DashboardMentoringBuyer,
  type DashboardWorkItem
} from '../../services/expertsDashboardLive';
import { loadSessionClients, WORKSPACE_STATE_EVENT, type SharedSessionClient } from './workspaceState';

type Props = {
  language: Language;
  onNavigate: (id: string) => void;
  onOpenClient: (id: string) => void;
  onStartSession: (id: string) => void;
};
type ReachRow = { country: string; code: string; formation: number; mentoring: number; total: number };
type RangeKey = 'week' | 'month' | 'year';
type ExpandableMetric = 'buyers' | 'clients' | 'leads';
type TrendPoint = { label: string; fullLabel: string; value: number };
type BuyerEvent = { identity: string; date: Date; kind: 'formation' | 'mentoring' };
type MetricCardProps = {
  id: 'priority' | ExpandableMetric;
  label: string;
  value: number;
  detail: string;
  comparison?: string;
  ringValue: number;
  ringTotal: number;
  colors: [string, string];
  expandable?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
};
type MapHover = { country: string; formation: number; mentoring: number; total: number; x: number; y: number };

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function monthKey(date: Date | null) {
  return date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` : '';
}
function previousMonthKey() {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function asDate(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}
function humanDate(date: string, time: string, language: Language) {
  if (!date) return language === 'es' ? 'Sin fecha' : 'No date';
  const value = new Date(`${date}T${time || '12:00'}:00`);
  return Number.isFinite(value.getTime())
    ? new Intl.DateTimeFormat(language === 'es' ? 'es-CL' : 'en-US', { dateStyle: 'medium', timeStyle: time ? 'short' : undefined }).format(value)
    : `${date} ${time}`;
}
function taskLabel(type: DashboardWorkItem['type'], language: Language) {
  if (type === 'whatsapp') return 'WhatsApp';
  if (type === 'email') return 'Email';
  if (type === 'call') return language === 'es' ? 'Llamada' : 'Call';
  if (type === 'meeting') return language === 'es' ? 'Reunión' : 'Meeting';
  return language === 'es' ? 'Tarea' : 'Task';
}
function isHiddenWork(item: DashboardWorkItem) {
  const text = `${item.title} ${item.note}`.toLowerCase();
  return item.sourceActionKind === 'formation-plan'
    || item.sourceActionKind === 'formation-meta'
    || item.sourceActionKind === 'cohort-meta'
    || item.workstream === 'formation-plan'
    || item.workstream === 'formation-meta'
    || text.includes('confirmar acceso y onboarding')
    || text.includes('confirm access and onboarding');
}
function isFollowUpWork(item: DashboardWorkItem) {
  const value = `${item.workstream} ${item.sourceActionKind} ${item.source}`.toLowerCase();
  return value.includes('follow') || value.includes('nurture') || value.includes('webinar');
}
function isWebinarLeadEntry(item: DashboardWorkItem) {
  return item.source === 'webinar'
    && item.sourceActionKind === 'follow-up'
    && Boolean(item.personId)
    && Boolean(asDate(item.createdAt));
}
function normalizeCountry(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

const COUNTRY_LOOKUP = (() => {
  const map = new Map<string, string>();
  const es = typeof Intl !== 'undefined' && 'DisplayNames' in Intl ? new Intl.DisplayNames(['es'], { type: 'region' }) : null;
  const en = typeof Intl !== 'undefined' && 'DisplayNames' in Intl ? new Intl.DisplayNames(['en'], { type: 'region' }) : null;
  regions.forEach((region) => {
    const code = String(region.code).toUpperCase();
    const names = [region.name, es?.of(code), en?.of(code), code];
    names.forEach((name) => { if (name) map.set(normalizeCountry(name), code); });
  });
  const aliases: Record<string, string> = {
    eeuu: 'US', usa: 'US', 'estados unidos de america': 'US', uk: 'GB', inglaterra: 'GB', 'gran bretana': 'GB',
    brasil: 'BR', brazil: 'BR', mexico: 'MX', mejico: 'MX', 'corea del sur': 'KR', 'corea del norte': 'KP',
    'republica dominicana': 'DO', 'republica checa': 'CZ', chequia: 'CZ', 'emiratos arabes unidos': 'AE',
    'costa de marfil': 'CI', 'republica democratica del congo': 'CD', 'republica del congo': 'CG'
  };
  Object.entries(aliases).forEach(([name, code]) => map.set(normalizeCountry(name), code));
  return map;
})();

const FLAG_PALETTES: Record<string, string[]> = {
  AR:['#74ACDF','#FFFFFF','#74ACDF'], BO:['#D52B1E','#F9E300','#007A33'], BR:['#009B3A','#FFDF00','#002776'], CA:['#D80621','#FFFFFF','#D80621'],
  CL:['#0039A6','#FFFFFF','#D52B1E'], CO:['#FCD116','#003893','#CE1126'], CR:['#002B7F','#FFFFFF','#CE1126','#FFFFFF','#002B7F'],
  CU:['#002A8F','#FFFFFF','#CF142B'], DO:['#002D62','#FFFFFF','#CE1126'], EC:['#FFD100','#0072CE','#EF3340'], GT:['#4997D0','#FFFFFF','#4997D0'],
  HN:['#0073CF','#FFFFFF','#0073CF'], MX:['#006847','#FFFFFF','#CE1126'], NI:['#0067C6','#FFFFFF','#0067C6'], PA:['#FFFFFF','#DA121A','#072357'],
  PE:['#D91023','#FFFFFF','#D91023'], PY:['#D52B1E','#FFFFFF','#0038A8'], SV:['#0047AB','#FFFFFF','#0047AB'], US:['#B22234','#FFFFFF','#3C3B6E'],
  UY:['#5BC0EB','#FFFFFF','#FCD116'], VE:['#FFCC00','#003DA5','#CE1126'], ES:['#AA151B','#F1BF00','#AA151B'], PT:['#046A38','#DA291C'],
  FR:['#0055A4','#FFFFFF','#EF4135'], DE:['#111111','#DD0000','#FFCE00'], IT:['#009246','#FFFFFF','#CE2B37'], GB:['#012169','#FFFFFF','#C8102E'],
  IE:['#169B62','#FFFFFF','#FF883E'], NL:['#AE1C28','#FFFFFF','#21468B'], BE:['#111111','#FDDA24','#EF3340'], CH:['#D52B1E','#FFFFFF','#D52B1E'],
  AT:['#ED2939','#FFFFFF','#ED2939'], SE:['#006AA7','#FECC00'], NO:['#BA0C2F','#FFFFFF','#00205B'], DK:['#C60C30','#FFFFFF'], FI:['#FFFFFF','#003580'],
  PL:['#FFFFFF','#DC143C'], UA:['#0057B7','#FFD700'], RO:['#002B7F','#FCD116','#CE1126'], GR:['#0D5EAF','#FFFFFF'], TR:['#E30A17','#FFFFFF'],
  RU:['#FFFFFF','#0039A6','#D52B1E'], CN:['#DE2910','#FFDE00'], JP:['#FFFFFF','#BC002D'], KR:['#FFFFFF','#0047A0','#CD2E3A'], IN:['#FF9933','#FFFFFF','#138808'],
  AU:['#00008B','#FFFFFF','#E4002B'], NZ:['#00247D','#FFFFFF','#CC142B'], PH:['#0038A8','#CE1126','#FFFFFF'], TH:['#A51931','#FFFFFF','#2D2A4A'],
  VN:['#DA251D','#FFCD00'], ID:['#CE1126','#FFFFFF'], SG:['#EF3340','#FFFFFF'], MY:['#010066','#CC0001','#FFFFFF'], ZA:['#007749','#FFB81C','#000000','#DE3831'],
  EG:['#CE1126','#FFFFFF','#000000'], MA:['#C1272D','#006233'], NG:['#008753','#FFFFFF','#008753'], KE:['#000000','#BB0000','#006600'], AE:['#00732F','#FFFFFF','#000000','#FF0000'],
  SA:['#006C35','#FFFFFF'], IL:['#FFFFFF','#0038B8','#FFFFFF']
};
const VERTICAL_FLAGS = new Set(['FR','IT','IE','BE','RO','MX','NG','CA','PE']);
function countryCode(value: string) { return COUNTRY_LOOKUP.get(normalizeCountry(value)) || ''; }
function flagPalette(code: string) { return FLAG_PALETTES[code.toUpperCase()] || ['#0A3F4D','#78A892']; }
function flagGradientCss(code: string) {
  const palette = flagPalette(code);
  const direction = VERTICAL_FLAGS.has(code.toUpperCase()) ? 'to right' : 'to bottom';
  const step = 100 / palette.length;
  const stops = palette.flatMap((color, index) => [`${color} ${(index * step).toFixed(2)}%`, `${color} ${((index + 1) * step).toFixed(2)}%`]).join(', ');
  return `linear-gradient(${direction}, ${stops})`;
}
function displayRegionName(code: string, fallback: string, language: Language) {
  try {
    const names = new Intl.DisplayNames([language === 'es' ? 'es' : 'en'], { type: 'region' });
    return names.of(code) || fallback;
  } catch { return fallback; }
}
function FlagMark({ code }: { code: string }) {
  return <span aria-hidden className="inline-block h-5 w-8 shrink-0 overflow-hidden rounded-[4px] border border-black/10 shadow-sm" style={{ background: flagGradientCss(code) }} />;
}

function MetricRing({ value, total, colors }: { value: number; total: number; colors: [string, string] }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, total)) * 100));
  return <div className="relative h-12 w-12 shrink-0 rounded-full" style={{ background: `conic-gradient(${colors[0]} 0 ${pct / 2}%, ${colors[1]} ${pct / 2}% ${pct}%, #E7E7E3 ${pct}% 100%)` }}>
    <div className="absolute inset-[4px] grid place-items-center rounded-full bg-white text-[9px] font-semibold text-black/55">{value}</div>
  </div>;
}
function MetricCard({ label, value, detail, comparison, ringValue, ringTotal, colors, expandable, expanded, onToggle }: MetricCardProps) {
  const comparisonClass = comparison?.startsWith('+') ? 'text-[#17603D]' : comparison?.startsWith('-') ? 'text-[#A23A32]' : 'text-black/38';
  return <article className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_10px_30px_rgba(10,10,10,.035)]">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/42">{label}</p><strong className="mt-3 block text-3xl font-semibold tracking-[-0.04em]">{value}</strong><p className="mt-1 text-xs text-black/45">{detail}</p>{comparison && <p className={`mt-1 text-[10px] font-semibold ${comparisonClass}`}>{comparison}</p>}</div>
      <MetricRing value={ringValue} total={ringTotal} colors={colors} />
    </div>
    {expandable ? <button type="button" onClick={onToggle} className="mt-4 flex w-full items-center justify-between border-t border-black/5 pt-3 text-left text-xs text-black/55"><span>{expanded ? 'Ocultar histórico' : 'Ver histórico'}</span><ChevronDown className={`h-3.5 w-3.5 transition ${expanded ? 'rotate-180' : ''}`} /></button> : <div className="mt-4 h-[29px] border-t border-black/5" />}
  </article>;
}

function buildTrend(dates: Date[], range: RangeKey, language: Language): TrendPoint[] {
  const locale = language === 'es' ? 'es-CL' : 'en-US';
  const now = new Date(); now.setHours(12, 0, 0, 0);
  if (range === 'week') return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now); date.setDate(now.getDate() - (6 - index)); const key = dateKey(date);
    return { label: new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date).replace('.', ''), fullLabel: new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date), value: dates.filter((item) => dateKey(item) === key).length };
  });
  if (range === 'month') return Array.from({ length: 10 }, (_, index) => {
    const end = new Date(now); end.setDate(now.getDate() - ((9 - index) * 3));
    const start = new Date(end); start.setDate(end.getDate() - 2); start.setHours(0, 0, 0, 0);
    const finish = new Date(end); finish.setHours(23, 59, 59, 999);
    return { label: new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(end).replace('.', ''), fullLabel: `${new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(start)} – ${new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(finish)}`, value: dates.filter((item) => item >= start && item <= finish).length };
  });
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1, 12, 0, 0, 0);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return { label: new Intl.DateTimeFormat(locale, { month: 'short' }).format(date).replace('.', ''), fullLabel: new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date), value: dates.filter((item) => monthKey(item) === key).length };
  });
}
function smoothPath(points: Array<{ x: number; y: number }>) {
  if (!points.length) return '';
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i += 1) { const prev = points[i - 1]; const current = points[i]; const control = (prev.x + current.x) / 2; path += ` C ${control} ${prev.y}, ${control} ${current.y}, ${current.x} ${current.y}`; }
  return path;
}
function metricCopy(kind: ExpandableMetric, language: Language) {
  if (kind === 'buyers') return { title: language === 'es' ? 'Histórico de compradores' : 'Buyer history', description: language === 'es' ? 'Altas en Formación y Mentoría según fecha de inicio de la relación.' : 'Program and Mentoring starts by relationship start date.', unit: language === 'es' ? 'compradores' : 'buyers' };
  if (kind === 'clients') return { title: language === 'es' ? 'Altas de clientes activos' : 'Active client starts', description: language === 'es' ? 'Ingresos de personas que hoy están activas en Mentoría o Formación.' : 'Entry dates for people currently active in Mentoring or Programs.', unit: language === 'es' ? 'clientes' : 'clients' };
  return { title: language === 'es' ? 'Histórico de nuevos leads' : 'New lead history', description: language === 'es' ? 'Leads según su fecha real de entrada al seguimiento post-webinar.' : 'Leads by their real post-webinar follow-up entry date.', unit: 'leads' };
}
function TrendChart({ kind, dates, range, setRange, language }: { kind: ExpandableMetric; dates: Date[]; range: RangeKey; setRange: (range: RangeKey) => void; language: Language }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const points = buildTrend(dates, range, language);
  const copy = metricCopy(kind, language);
  const width = 760; const height = 190; const padX = 52; const padR = 18; const padY = 20;
  const max = Math.max(1, ...points.map((point) => point.value)); const chartW = width - padX - padR; const chartH = height - padY * 2;
  const plotted = points.map((point, index) => ({ x: padX + (index / Math.max(1, points.length - 1)) * chartW, y: height - padY - (point.value / max) * chartH }));
  const color = kind === 'buyers' ? '#8B5E34' : kind === 'clients' ? '#0A6B66' : '#5357A6';
  const line = smoothPath(plotted); const area = plotted.length ? `${line} L ${plotted.at(-1)?.x} ${height - padY} L ${plotted[0].x} ${height - padY} Z` : '';
  const selected = hovered === null ? null : points[hovered]; const selectedPoint = hovered === null ? null : plotted[hovered];
  const total = points.reduce((sum, point) => sum + point.value, 0); const average = points.length ? total / points.length : 0; const best = points.reduce((current, point) => point.value > current.value ? point : current, points[0] || { label: '—', fullLabel: '—', value: 0 });
  const periodLabel = range === 'week' ? (language === 'es' ? 'Últimos 7 días' : 'Last 7 days') : range === 'month' ? (language === 'es' ? 'Últimos 30 días' : 'Last 30 days') : (language === 'es' ? 'Últimos 12 meses' : 'Last 12 months');
  const ticks = [max, Math.round(max * .75), Math.round(max * .5), Math.round(max * .25), 0].filter((value, index, array) => array.indexOf(value) === index);
  return <section className="rounded-2xl border border-black/8 bg-white p-4 shadow-[0_8px_24px_rgba(10,10,10,.025)] md:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold">{copy.title}</p><p className="mt-1 text-[10px] text-black/40">{copy.description}</p></div><div className="inline-flex rounded-full border border-black/8 bg-[#F7F7F5] p-1">{(['week', 'month', 'year'] as RangeKey[]).map((item) => <button key={item} onClick={() => setRange(item)} className={`rounded-full px-3 py-1.5 text-[10px] font-semibold ${range === item ? 'bg-[#111413] text-white' : 'text-black/40'}`}>{item === 'week' ? (language === 'es' ? 'Semana' : 'Week') : item === 'month' ? (language === 'es' ? 'Mes' : 'Month') : (language === 'es' ? 'Año' : 'Year')}</button>)}</div></div>
    <div className="mt-4 grid gap-5 lg:grid-cols-[185px_minmax(0,1fr)]">
      <aside className="rounded-xl bg-[#F7F7F5] p-4"><p className="text-[9px] font-semibold uppercase tracking-[.13em] text-black/35">{periodLabel}</p><div className="mt-4 space-y-3"><div><p className="text-[10px] text-black/40">{language === 'es' ? 'Total período' : 'Period total'}</p><p className="text-xl font-semibold">{total}</p></div><div><p className="text-[10px] text-black/40">{language === 'es' ? 'Promedio por tramo' : 'Average per bucket'}</p><p className="text-sm font-semibold">{average.toFixed(1)}</p></div><div><p className="text-[10px] text-black/40">{language === 'es' ? 'Máximo' : 'Peak'}</p><p className="text-sm font-semibold">{best.value} <span className="font-normal text-black/40">· {best.label}</span></p></div><div className="border-t border-black/7 pt-3"><p className="text-[10px] text-black/40">{language === 'es' ? 'Unidad' : 'Unit'}</p><p className="text-xs font-semibold">{copy.unit}</p></div></div></aside>
      <div className="min-w-0 overflow-hidden"><svg viewBox={`0 0 ${width} ${height}`} className="h-[190px] w-full" onMouseLeave={() => setHovered(null)}><defs><linearGradient id={`dashboard-trend-${kind}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".22"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>{ticks.map((tick) => { const y = height - padY - (tick / max) * chartH; return <g key={tick}><line x1={padX} y1={y} x2={width - padR} y2={y} stroke="rgba(0,0,0,.07)" strokeWidth="1"/><text x={padX - 10} y={y + 3} textAnchor="end" fontSize="9" fill="rgba(0,0,0,.38)">{tick}</text></g>; })}<path d={area} fill={`url(#dashboard-trend-${kind})`}/><path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"/>{plotted.map((point, index) => <g key={`${points[index].fullLabel}-${index}`} onMouseEnter={() => setHovered(index)}><circle cx={point.x} cy={point.y} r="12" fill="transparent"/><circle cx={point.x} cy={point.y} r={hovered === index ? 4 : 2.5} fill="white" stroke={color} strokeWidth="2"/></g>)}{selected && selectedPoint && <g pointerEvents="none"><rect x={Math.max(8, Math.min(width - 160, selectedPoint.x - 74))} y={Math.max(8, selectedPoint.y - 48)} width="150" height="40" rx="8" fill="#111413"/><text x={Math.max(18, Math.min(width - 150, selectedPoint.x - 64))} y={Math.max(23, selectedPoint.y - 32)} fill="white" fontSize="10" fontWeight="600">{selected.fullLabel}</text><text x={Math.max(18, Math.min(width - 150, selectedPoint.x - 64))} y={Math.max(38, selectedPoint.y - 17)} fill="rgba(255,255,255,.68)" fontSize="9">{selected.value} {copy.unit}</text></g>}</svg><div className="flex justify-between pl-[52px] pr-4 text-[9px] text-black/30">{points.map((point, index) => <span key={`${point.label}-${index}`}>{point.label}</span>)}</div></div>
    </div>
  </section>;
}

function WorldReach({ rows, language }: { rows: ReachRow[]; language: Language }) {
  const [view, setView] = useState<'map' | 'list'>('map');
  const [hover, setHover] = useState<MapHover | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const rowByCode = useMemo(() => new Map(rows.filter((row) => row.code).map((row) => [row.code.toUpperCase(), row])), [rows]);
  const max = Math.max(1, ...rows.map((row) => row.total));
  const mapData = useMemo(() => regions.map((region) => ({ country: String(region.code).toLowerCase() as ISOCode, value: rowByCode.get(String(region.code).toUpperCase())?.total || 0 })), [rowByCode]);
  useEffect(() => {
    if (view !== 'map') return;
    const svg = mapRef.current?.querySelector('svg'); if (!svg) return;
    svg.querySelector('defs[data-gkais-flags="true"]')?.remove();
    const ns = 'http://www.w3.org/2000/svg'; const defs = document.createElementNS(ns, 'defs'); defs.setAttribute('data-gkais-flags', 'true');
    rows.filter((row) => row.code).forEach((row) => {
      const code = row.code.toUpperCase(); const palette = flagPalette(code); const gradient = document.createElementNS(ns, 'linearGradient'); gradient.setAttribute('id', `gkais-flag-${code}`);
      if (VERTICAL_FLAGS.has(code)) { gradient.setAttribute('x1', '0'); gradient.setAttribute('x2', '1'); gradient.setAttribute('y1', '0'); gradient.setAttribute('y2', '0'); } else { gradient.setAttribute('x1', '0'); gradient.setAttribute('x2', '0'); gradient.setAttribute('y1', '0'); gradient.setAttribute('y2', '1'); }
      const step = 100 / palette.length;
      palette.forEach((color, index) => { const a = document.createElementNS(ns, 'stop'); a.setAttribute('offset', `${index * step}%`); a.setAttribute('stop-color', color); const b = document.createElementNS(ns, 'stop'); b.setAttribute('offset', `${(index + 1) * step}%`); b.setAttribute('stop-color', color); gradient.append(a, b); });
      defs.appendChild(gradient);
    });
    svg.prepend(defs);
  });
  const styleCountry = (context: CountryContext<number>): React.CSSProperties => {
    const code = String(context.countryCode).toUpperCase(); const row = rowByCode.get(code);
    const intensity = row ? 0.78 + (row.total / max) * 0.22 : 1;
    return { fill: row ? `url(#gkais-flag-${code})` : '#F4F3EE', fillOpacity: intensity, stroke: '#ffffff', strokeWidth: 0.8, cursor: 'default' };
  };
  const moveTooltip = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = (event.target as Element | null)?.closest?.('.gkais-world-country-v5'); const root = mapRef.current; if (!target || !root) { setHover(null); return; }
    const paths = Array.from(root.querySelectorAll('.gkais-world-country-v5')); const index = paths.indexOf(target); const region = regions[index]; if (!region) return;
    const code = String(region.code).toUpperCase(); const row = rowByCode.get(code); const rect = root.getBoundingClientRect(); const x = Math.max(12, Math.min(rect.width - 190, event.clientX - rect.left + 14)); const y = Math.max(12, event.clientY - rect.top + 14);
    setHover({ country: row?.country || displayRegionName(code, region.name, language), formation: row?.formation || 0, mentoring: row?.mentoring || 0, total: row?.total || 0, x, y });
  };
  return <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
    <style>{`.gkais-world-country-v5{transition:fill-opacity 180ms ease,stroke 180ms ease,filter 180ms ease}.gkais-world-country-v5:hover,.gkais-world-country-v5.worldmap__region--hover{fill-opacity:1!important;stroke:#fff!important;stroke-width:1.45!important;filter:drop-shadow(0 0 6px rgba(17,20,19,.35))}`}</style>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'ALCANCE DE TU COMUNIDAD' : 'COMMUNITY REACH'}</p><h2 className="mt-2 text-xl font-semibold">{language === 'es' ? 'Personas activas por país' : 'Active people by country'}</h2><p className="mt-1 text-sm text-black/45">{language === 'es' ? 'Formación y Mentoría sobre un mapa mundial interactivo.' : 'Program and Mentoring relationships on an interactive world map.'}</p></div><div className="inline-flex rounded-xl bg-[#F7F7F5] p-1"><button onClick={() => setView('map')} className={`rounded-lg px-3 py-2 text-xs font-semibold ${view === 'map' ? 'bg-[#111413] text-white' : 'text-black/45'}`}>{language === 'es' ? 'Mapa' : 'Map'}</button><button onClick={() => setView('list')} className={`rounded-lg px-3 py-2 text-xs font-semibold ${view === 'list' ? 'bg-[#111413] text-white' : 'text-black/45'}`}>{language === 'es' ? 'Países' : 'Countries'}</button></div></div>
    {view === 'map' ? <div ref={mapRef} onPointerMove={moveTooltip} onPointerLeave={() => setHover(null)} className="relative mt-5 overflow-hidden rounded-2xl border border-black/6 bg-[#DCECEF] p-3 md:p-4"><div className="gkais-world-map mx-auto max-w-[800px]"><WorldMap data={mapData} size={760} color="#0A3F4D" backgroundColor="transparent" borderColor="#ffffff" strokeOpacity={1} tooltipTextFunction={() => ''} styleFunction={styleCountry} regionClassName="gkais-world-country-v5" /></div>{hover && <div className="pointer-events-none absolute z-20 min-w-[170px] rounded-xl bg-[#111413] px-3.5 py-3 text-white shadow-xl" style={{ left:hover.x, top:hover.y }}><p className="text-xs font-semibold">{hover.country}</p><p className="mt-2 text-[10px] text-white/70">{language === 'es' ? 'Formaciones' : 'Programs'}: {hover.formation}</p><p className="mt-1 text-[10px] text-white/70">{language === 'es' ? 'Mentorías' : 'Mentoring'}: {hover.mentoring}</p><p className="mt-1 border-t border-white/10 pt-1.5 text-[10px] font-semibold">Total: {hover.total}</p></div>}<div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-black/6 pt-3 text-[10px] text-black/45"><span>{language === 'es' ? 'Los países activos usan los colores de su bandera.' : 'Active countries use their flag colors.'}</span><span>{rows.reduce((sum, row) => sum + row.total, 0)} {language === 'es' ? 'relaciones geográficas registradas' : 'geographic relationships recorded'}</span></div></div> : rows.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-black/10 bg-[#FAFAF8] p-8 text-center"><Globe2 className="mx-auto h-8 w-8 text-black/20"/><p className="mt-3 text-sm font-semibold">{language === 'es' ? 'Todavía no hay países registrados.' : 'No countries recorded yet.'}</p></div> : <div className="mt-5 space-y-3">{rows.map((row) => <div key={`${row.country}-${row.code}`} className="grid gap-3 rounded-xl border border-black/5 px-3 py-3 md:grid-cols-[210px_1fr_80px] md:items-center"><div className="flex items-center gap-3"><FlagMark code={row.code}/><p className="text-sm font-semibold">{row.country}</p></div><div className="h-2.5 overflow-hidden rounded-full bg-black/5"><div className="h-full rounded-full bg-[#111413]" style={{ width: `${Math.max(4, (row.total / max) * 100)}%` }}/></div><p className="text-right text-sm font-semibold">{row.total}</p></div>)}</div>}
  </section>;
}

export function DashboardHistoryV5({ language, onNavigate, onOpenClient, onStartSession }: Props) {
  void onOpenClient;
  const [people, setPeople] = useState<ExpertPerson[]>([]); const [profiles, setProfiles] = useState<ExpertPersonProfileMeta[]>([]); const [formations, setFormations] = useState<ExpertFormation[]>([]); const [cohorts, setCohorts] = useState<ExpertCohort[]>([]); const [enrollments, setEnrollments] = useState<ExpertEnrollment[]>([]); const [tasks, setTasks] = useState<DashboardWorkItem[]>([]); const [classes, setClasses] = useState<DashboardFormationClass[]>([]); const [cohortTimes, setCohortTimes] = useState<DashboardCohortTime[]>([]); const [mentoringBuyers, setMentoringBuyers] = useState<DashboardMentoringBuyer[]>([]); const [clients, setClients] = useState<SharedSessionClient[]>(() => loadSessionClients()); const [expanded, setExpanded] = useState<ExpandableMetric | null>(null); const [ranges, setRanges] = useState<Record<ExpandableMetric, RangeKey>>({ buyers:'month', clients:'month', leads:'month' });

  useEffect(() => {
    let a:(()=>void)|undefined,b:(()=>void)|undefined,c:(()=>void)|undefined,d:(()=>void)|undefined,e:(()=>void)|undefined,f:(()=>void)|undefined,g:(()=>void)|undefined,h:(()=>void)|undefined,i:(()=>void)|undefined;
    void subscribeExpertPeople(setPeople).then((x)=>{a=x;}); void subscribeExpertPeopleProfileMeta(setProfiles).then((x)=>{b=x;}); void subscribeExpertFormations(setFormations).then((x)=>{c=x;}); void subscribeExpertCohorts(setCohorts).then((x)=>{d=x;}); void subscribeExpertEnrollments(setEnrollments).then((x)=>{e=x;}); void subscribeDashboardWorkItems(setTasks).then((x)=>{f=x;}); void subscribeDashboardFormationClasses(setClasses).then((x)=>{g=x;}); void subscribeDashboardCohortTimes(setCohortTimes).then((x)=>{h=x;}); void subscribeDashboardMentoringBuyers(setMentoringBuyers).then((x)=>{i=x;});
    const refresh=()=>setClients(loadSessionClients()); window.addEventListener(WORKSPACE_STATE_EVENT,refresh); window.addEventListener('storage',refresh);
    return()=>{a?.();b?.();c?.();d?.();e?.();f?.();g?.();h?.();i?.();window.removeEventListener(WORKSPACE_STATE_EVENT,refresh);window.removeEventListener('storage',refresh);};
  },[]);

  const today=todayKey(); const profileById=useMemo(()=>new Map(profiles.map((p)=>[p.id,p])),[profiles]); const formationById=useMemo(()=>new Map(formations.map((f)=>[f.id,f])),[formations]); const cohortById=useMemo(()=>new Map(cohorts.map((c)=>[c.id,c])),[cohorts]); const cohortTimeById=useMemo(()=>new Map(cohortTimes.map((c)=>[c.cohortId,c.time])),[cohortTimes]);
  const mainWork=useMemo(()=>tasks.filter((t)=>t.status!=='done'&&!t.deletedAt&&!isHiddenWork(t)&&!isFollowUpWork(t)),[tasks]);
  const dueToday=useMemo(()=>mainWork.filter((t)=>t.interactionState!=='waiting-reply'&&(!t.dueDate||t.dueDate<=today)).sort((a,b)=>`${a.dueDate||today}${a.dueTime||'23:59'}`.localeCompare(`${b.dueDate||today}${b.dueTime||'23:59'}`)),[mainWork,today]);
  const activeClasses=useMemo(()=>classes.filter((c)=>!c.archived&&c.status!=='done'&&c.date>=today).map((c)=>({...c,effectiveTime:c.time||cohortTimeById.get(c.cohortId)||''})).sort((a,b)=>`${a.date}${a.effectiveTime}`.localeCompare(`${b.date}${b.effectiveTime}`)),[classes,cohortTimeById,today]);
  const formationPersonIds=useMemo(()=>new Set(enrollments.filter((e)=>e.status!=='withdrawn'&&e.status!=='refunded').map((e)=>e.personId)),[enrollments]);
  const activeClientIds=useMemo(()=>new Set([...formationPersonIds,...people.filter((p)=>p.currentStage==='mentoring').map((p)=>p.id)]),[formationPersonIds,people]);
  const activeClients=activeClientIds.size; const currentMonth=today.slice(0,7); const priorMonth=previousMonthKey();
  const leadEntryByPerson=useMemo(()=>{const map=new Map<string,Date>();tasks.forEach((task)=>{if(!isWebinarLeadEntry(task))return;const date=asDate(task.createdAt);if(!date)return;const current=map.get(task.personId);if(!current||date<current)map.set(task.personId,date);});return map;},[tasks]);
  const leadDates=useMemo(()=>[...leadEntryByPerson.values()].sort((a,b)=>a.getTime()-b.getTime()),[leadEntryByPerson]); const newLeads=leadDates.filter((date)=>monthKey(date)===currentMonth).length;
  const clientDates=useMemo(()=>[...activeClientIds].map((id)=>profileById.get(id)?.createdAt||null).filter((value):value is Date=>value instanceof Date),[activeClientIds,profileById]);
  const buyerEvents=useMemo<BuyerEvent[]>(()=>{
    const formationEvents=enrollments.filter((e)=>e.status!=='withdrawn'&&e.status!=='refunded'&&e.joinedAt).map((e)=>({identity:`person:${e.personId}`,date:e.joinedAt!,kind:'formation' as const}));
    const mentoringEvents=mentoringBuyers.map((item)=>{const date=asDate(item.createdAt)||asDate(item.startDate);return date?{identity:item.personId?`person:${item.personId}`:`client:${item.id}`,date,kind:'mentoring' as const}:null;}).filter((item):item is BuyerEvent=>Boolean(item));
    return [...formationEvents,...mentoringEvents].sort((a,b)=>a.date.getTime()-b.date.getTime());
  },[enrollments,mentoringBuyers]);
  const formationBuyers=useMemo(()=>new Set(buyerEvents.filter((e)=>e.kind==='formation'&&monthKey(e.date)===currentMonth).map((e)=>e.identity)).size,[buyerEvents,currentMonth]);
  const mentoringBuyerCount=useMemo(()=>new Set(buyerEvents.filter((e)=>e.kind==='mentoring'&&monthKey(e.date)===currentMonth).map((e)=>e.identity)).size,[buyerEvents,currentMonth]);
  const currentBuyers=formationBuyers+mentoringBuyerCount;
  const previousFormationBuyers=useMemo(()=>new Set(buyerEvents.filter((e)=>e.kind==='formation'&&monthKey(e.date)===priorMonth).map((e)=>e.identity)).size,[buyerEvents,priorMonth]);
  const previousMentoringBuyers=useMemo(()=>new Set(buyerEvents.filter((e)=>e.kind==='mentoring'&&monthKey(e.date)===priorMonth).map((e)=>e.identity)).size,[buyerEvents,priorMonth]);
  const previousBuyers=previousFormationBuyers+previousMentoringBuyers; const buyerDifference=currentBuyers-previousBuyers;
  const buyerComparison=buyerDifference===0?(language==='es'?'Sin cambios vs mes anterior':'No change vs previous month'):`${buyerDifference>0?'+':''}${buyerDifference} ${language==='es'?'vs mes anterior':'vs previous month'}`;
  const buyerDates=useMemo(()=>buyerEvents.map((event)=>event.date),[buyerEvents]);

  const agenda=useMemo(()=>{const classRows=activeClasses.slice(0,8).map((c)=>({kind:'class' as const,id:c.id,title:`${formationById.get(c.formationId)?.title||'Formación'} · ${c.title}`,subtitle:`${cohortById.get(c.cohortId)?.title||c.cohortTitle} · ${humanDate(c.date,c.effectiveTime,language)}`,classItem:c}));const clientRows=clients.filter((c)=>(c.nextSession||'').trim()).slice(0,5).map((c)=>({kind:'client' as const,id:c.id,title:c.name,subtitle:c.nextSession||'',client:c}));return[...clientRows,...classRows].slice(0,9);},[activeClasses,formationById,cohortById,clients,language]);
  const radar=useMemo(()=>{const follow=tasks.filter((t)=>t.status!=='done'&&!t.deletedAt&&!isHiddenWork(t)&&isFollowUpWork(t));return[{label:language==='es'?'Respondieron':'Replied',value:follow.filter((t)=>t.interactionState==='reply-received').length,detail:language==='es'?'Necesitan revisión y siguiente decisión.':'Need review and a next decision.'},{label:language==='es'?'Esperando respuesta':'Waiting for reply',value:follow.filter((t)=>t.interactionState==='waiting-reply').length,detail:language==='es'?'Interacciones activas en seguimiento.':'Active follow-up interactions.'},{label:language==='es'?'Leads por atender':'Leads to review',value:follow.filter((t)=>t.interactionState==='queue').length,detail:language==='es'?'Motivo, contexto y continuidad por definir.':'Reason, context and continuity to define.'}];},[tasks,language]);
  const reach=useMemo<ReachRow[]>(()=>{const rows=new Map<string,{country:string;formation:Set<string>;mentoring:Set<string>}>();people.forEach((person)=>{const country=profileById.get(person.id)?.country?.trim()||'';if(!country)return;const inFormation=formationPersonIds.has(person.id);const inMentoring=person.currentStage==='mentoring';if(!inFormation&&!inMentoring)return;const code=countryCode(country);const key=code||normalizeCountry(country);const current=rows.get(key)||{country,formation:new Set<string>(),mentoring:new Set<string>()};if(inFormation)current.formation.add(person.id);if(inMentoring)current.mentoring.add(person.id);rows.set(key,current);});return[...rows.entries()].map(([key,value])=>({country:value.country,code:key.length===2?key.toUpperCase():'',formation:value.formation.size,mentoring:value.mentoring.size,total:new Set([...value.formation,...value.mentoring]).size})).sort((a,b)=>b.total-a.total||a.country.localeCompare(b.country));},[people,formationPersonIds,profileById]);
  const openClass=(item:DashboardFormationClass)=>{const q=new URLSearchParams({formation:item.formationId,cohort:item.cohortId,class:item.id});window.history.pushState({},'',`/workspace/experts/formations/session?${q.toString()}`);window.dispatchEvent(new PopStateEvent('popstate'));};
  const chartDates=expanded==='buyers'?buyerDates:expanded==='clients'?clientDates:leadDates;

  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard id="priority" label={language==='es'?'Trabajo prioritario':'Priority Work'} value={mainWork.length} detail={language==='es'?'Tareas activas por resolver':'Active tasks to resolve'} ringValue={Math.min(mainWork.length,12)} ringTotal={12} colors={['#A23A32','#D67A32']} />
      <MetricCard id="buyers" label={language==='es'?'Compradores del mes':'Buyers this month'} value={currentBuyers} detail={`${formationBuyers} ${language==='es'?'Formación':'Program'} · ${mentoringBuyerCount} ${language==='es'?'Mentoría':'Mentoring'}`} comparison={buyerComparison} ringValue={currentBuyers} ringTotal={Math.max(1,currentBuyers,previousBuyers)} colors={['#8B5E34','#C49A6C']} expandable expanded={expanded==='buyers'} onToggle={()=>setExpanded((current)=>current==='buyers'?null:'buyers')} />
      <MetricCard id="clients" label={language==='es'?'Clientes activos':'Active Clients'} value={activeClients} detail={language==='es'?'Mentoría y formación':'Mentoring and programs'} ringValue={activeClients} ringTotal={Math.max(1,people.length)} colors={['#0A3F4D','#78A892']} expandable expanded={expanded==='clients'} onToggle={()=>setExpanded((current)=>current==='clients'?null:'clients')} />
      <MetricCard id="leads" label={language==='es'?'Nuevos leads':'New Leads'} value={newLeads} detail={language==='es'?'pasaron a Leads este mes':'entered Leads this month'} ringValue={newLeads} ringTotal={Math.max(1,leadEntryByPerson.size)} colors={['#5C4D8A','#7A9FC8']} expandable expanded={expanded==='leads'} onToggle={()=>setExpanded((current)=>current==='leads'?null:'leads')} />
    </div>
    {expanded&&<TrendChart kind={expanded} dates={chartDates} range={ranges[expanded]} setRange={(range)=>setRanges((current)=>({...current,[expanded]:range}))} language={language}/>} 
    <div className="grid gap-6 xl:grid-cols-[1.35fr_.85fr]">
      <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6"><div className="flex flex-col items-start justify-between gap-3 sm:flex-row"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language==='es'?'EJECUCIÓN':'EXECUTION'}</p><h2 className="mt-2 text-xl font-semibold">{language==='es'?'Por hacer hoy':'Due today'}</h2><p className="mt-1 text-sm text-black/45">{language==='es'?'Solo trabajo abierto real; las tareas automáticas no aparecen aquí.':'Only real open work; automated tasks do not appear here.'}</p></div><button onClick={()=>onNavigate('priority')} className="shrink-0 whitespace-nowrap rounded-full bg-[#111413] px-4 py-2.5 text-xs font-semibold text-white">{language==='es'?'Trabajo prioritario':'Priority Work'}</button></div><div className="mt-4 border-t border-black/7 pt-1"><div className="divide-y divide-black/5">{dueToday.slice(0,7).map((task)=><div key={task.id} className="grid gap-2 py-3 md:grid-cols-[1fr_auto] md:items-center"><div><p className="text-sm font-semibold">{task.title||task.clientName}</p><p className="mt-1 text-xs text-black/42">{task.clientName} · {taskLabel(task.type,language)} · {task.assignee||'—'}</p></div><div className="text-xs text-black/45 md:text-right"><p>{task.dueTime||'—'}</p><p className="mt-1 text-[10px]">{task.dueDate||today}</p></div></div>)}{dueToday.length===0&&<p className="py-7 text-center text-sm text-black/40">{language==='es'?'No hay acciones pendientes para hoy.':'No actions pending for today.'}</p>}</div></div></section>
      <div className="grid content-start gap-6">
        <section className="rounded-2xl border border-black/10 bg-white p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">AGENDA</p><h2 className="mt-2 text-lg font-semibold">{language==='es'?'Próximas sesiones y clases':'Upcoming sessions and classes'}</h2></div><CalendarDays className="h-5 w-5 text-[#0A3F4D]"/></div><div className="mt-4 max-h-[360px] space-y-2 overflow-y-auto pr-1">{agenda.map((item)=><button key={`${item.kind}-${item.id}`} onClick={()=>item.kind==='client'?onStartSession(item.id):openClass(item.classItem)} className="flex w-full items-center gap-3 rounded-xl border border-black/6 p-3 text-left transition hover:bg-[#F7F7F5]"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${item.kind==='client'?'bg-[#0A3F4D]/8 text-[#0A3F4D]':'bg-black/5 text-black/55'}`}>{item.kind==='client'?<UsersRound className="h-4 w-4"/>:<CalendarDays className="h-4 w-4"/>}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{item.title}</span><span className="mt-1 block truncate text-[10px] text-black/40">{item.subtitle}</span></span><ChevronRight className="h-3.5 w-3.5 text-black/25"/></button>)}{agenda.length===0&&<p className="py-6 text-center text-sm text-black/40">{language==='es'?'No hay sesiones o clases próximas.':'No upcoming sessions or classes.'}</p>}</div></section>
        <section className="rounded-2xl border border-black/10 bg-white p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#A46F16]">THE RADAR</p><h2 className="mt-2 text-lg font-semibold">{language==='es'?'Relaciones y seguimiento':'Relationships and follow-up'}</h2></div><button onClick={()=>onNavigate('relationships')} className="whitespace-nowrap rounded-full border border-black/10 px-3 py-2 text-[10px] font-semibold">{language==='es'?'Abrir':'Open'}</button></div><div className="mt-4 space-y-2">{radar.map((item,index)=><button key={item.label} onClick={()=>onNavigate('relationships')} className="flex w-full items-center gap-3 rounded-xl border border-black/6 p-3 text-left hover:bg-[#FAFAF8]"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#A46F16]/9 text-[#82570F]">{index===0?<MessageCircleReply className="h-4 w-4"/>:index===1?<Radio className="h-4 w-4"/>:<ListTodo className="h-4 w-4"/>}</span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold">{item.label}</span><span className="mt-1 block text-[10px] leading-4 text-black/40">{item.detail}</span></span><strong className="text-xl font-semibold">{item.value}</strong></button>)}</div></section>
      </div>
    </div>
    <WorldReach rows={reach} language={language}/>
  </div>;
}
