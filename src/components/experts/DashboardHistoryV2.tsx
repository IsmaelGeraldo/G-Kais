import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronRight, Globe2, ListTodo, MessageCircleReply, Radio, UsersRound } from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';
import { subscribeExpertPeople, type ExpertPerson } from '../../services/expertsAcquisition';
import { subscribeExpertCohorts, subscribeExpertEnrollments, subscribeExpertFormations, type ExpertCohort, type ExpertEnrollment, type ExpertFormation } from '../../services/expertsFormations';
import { subscribeExpertPeopleProfileMeta, type ExpertPersonProfileMeta } from '../../services/expertsPeopleProfile';
import {
  subscribeDashboardCohortTimes,
  subscribeDashboardFormationClasses,
  subscribeDashboardWorkItems,
  type DashboardCohortTime,
  type DashboardFormationClass,
  type DashboardWorkItem
} from '../../services/expertsDashboardLive';
import { loadSessionClients, WORKSPACE_STATE_EVENT, type SharedSessionClient } from './workspaceState';

type Props = { language: Language; onNavigate: (id: string) => void; onOpenClient: (id: string) => void; onStartSession: (id: string) => void };
type ReachRow = { country: string; formation: number; mentoring: number; total: number };
type MapPoint = { x: number; y: number };

const COUNTRY_POINTS: Record<string, MapPoint> = {
  chile:{x:205,y:151}, argentina:{x:226,y:157}, peru:{x:193,y:128}, colombia:{x:188,y:112}, brasil:{x:229,y:127}, brazil:{x:229,y:127}, mexico:{x:137,y:96}, méxico:{x:137,y:96},
  canada:{x:136,y:48}, canadá:{x:136,y:48}, 'estados unidos':{x:139,y:72}, 'united states':{x:139,y:72}, españa:{x:354,y:72}, spain:{x:354,y:72}, portugal:{x:344,y:73}, france:{x:366,y:68}, francia:{x:366,y:68},
  germany:{x:382,y:62}, alemania:{x:382,y:62}, italy:{x:385,y:76}, italia:{x:385,y:76}, 'reino unido':{x:350,y:55}, 'united kingdom':{x:350,y:55}, uk:{x:350,y:55},
  australia:{x:520,y:145}, japón:{x:545,y:82}, japan:{x:545,y:82}, india:{x:455,y:99}, china:{x:485,y:78}, sudáfrica:{x:397,y:145}, 'south africa':{x:397,y:145}
};

function todayKey() { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function monthKey(date: Date | null) { return date ? `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}` : ''; }
function humanDate(date: string, time: string, language: Language) {
  if (!date) return language==='es'?'Sin fecha':'No date';
  const value=new Date(`${date}T${time||'12:00'}:00`);
  return Number.isFinite(value.getTime()) ? new Intl.DateTimeFormat(language==='es'?'es-CL':'en-US',{dateStyle:'medium',timeStyle:time?'short':undefined}).format(value) : `${date} ${time}`;
}
function taskLabel(type: DashboardWorkItem['type'], language: Language) { if(type==='whatsapp')return'WhatsApp';if(type==='email')return'Email';if(type==='call')return language==='es'?'Llamada':'Call';if(type==='meeting')return language==='es'?'Reunión':'Meeting';return language==='es'?'Tarea':'Task'; }
function isHiddenWork(item: DashboardWorkItem) { return item.sourceActionKind==='formation-plan'||item.sourceActionKind==='formation-meta'||item.sourceActionKind==='cohort-meta'||item.workstream==='formation-plan'||item.workstream==='formation-meta'; }
function isFollowUpWork(item: DashboardWorkItem) { const value=`${item.workstream} ${item.sourceActionKind} ${item.source}`.toLowerCase(); return value.includes('follow')||value.includes('nurture')||value.includes('webinar'); }
function normalizeCountry(value: string) { return value.trim().toLocaleLowerCase('es'); }

function MetricCard({ label, value, detail }: { label:string; value:number; detail:string }) {
  return <article className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_10px_30px_rgba(10,10,10,.03)]"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/42">{label}</p><strong className="mt-3 block text-3xl font-semibold tracking-[-0.04em]">{value}</strong><p className="mt-1 text-xs text-black/45">{detail}</p></article>;
}

function WorldReach({ rows, language }: { rows: ReachRow[]; language: Language }) {
  const [view,setView]=useState<'map'|'list'>('map');
  const [hovered,setHovered]=useState<ReachRow|null>(null);
  const max=Math.max(1,...rows.map((row)=>row.total));
  return <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language==='es'?'ALCANCE DE TU COMUNIDAD':'COMMUNITY REACH'}</p><h2 className="mt-2 text-xl font-semibold">{language==='es'?'Personas activas por país':'Active people by country'}</h2><p className="mt-1 text-sm text-black/45">{language==='es'?'Personas únicas con Formación o Mentoría 1:1.':'Unique people with Program or 1:1 Mentoring relationships.'}</p></div><div className="inline-flex rounded-xl bg-[#F7F7F5] p-1"><button onClick={()=>setView('map')} className={`rounded-lg px-3 py-2 text-xs font-semibold ${view==='map'?'bg-[#111413] text-white':'text-black/45'}`}>{language==='es'?'Mapa':'Map'}</button><button onClick={()=>setView('list')} className={`rounded-lg px-3 py-2 text-xs font-semibold ${view==='list'?'bg-[#111413] text-white':'text-black/45'}`}>{language==='es'?'Países':'Countries'}</button></div></div>
    {rows.length===0?<div className="mt-5 rounded-2xl border border-dashed border-black/10 bg-[#FAFAF8] p-8 text-center"><Globe2 className="mx-auto h-8 w-8 text-black/20"/><p className="mt-3 text-sm font-semibold">{language==='es'?'Todavía no hay países registrados.':'No countries recorded yet.'}</p><p className="mt-1 text-xs text-black/40">{language==='es'?'Añade el país desde Relaciones → Personas y el mapa se actualizará automáticamente.':'Add country from Relationships → People and the map will update automatically.'}</p></div>:view==='map'?<div className="relative mt-5 overflow-hidden rounded-2xl bg-[#F4F4F1] p-3"><svg viewBox="0 0 620 205" className="w-full" onMouseLeave={()=>setHovered(null)}><path d="M55 62 C86 31 158 25 197 43 C221 54 219 82 190 91 C164 99 160 117 145 132 C124 153 85 137 88 112 C90 94 67 88 55 62Z" fill="#E1E1DC"/><path d="M185 105 C211 100 244 107 256 127 C268 148 241 184 222 188 C207 183 201 162 204 145 C207 127 185 124 185 105Z" fill="#E1E1DC"/><path d="M332 48 C364 31 425 38 447 57 C458 67 453 82 438 85 C421 89 417 104 405 113 C386 119 371 107 369 94 C366 80 339 73 332 48Z" fill="#E1E1DC"/><path d="M370 98 C397 86 433 96 444 122 C454 146 429 177 402 180 C382 171 386 151 374 137 C365 126 356 111 370 98Z" fill="#E1E1DC"/><path d="M442 54 C478 38 548 44 569 65 C578 79 558 91 538 92 C516 94 505 109 483 107 C461 104 442 84 442 54Z" fill="#E1E1DC"/><path d="M497 130 C521 119 559 126 573 145 C577 163 555 177 531 175 C510 170 491 151 497 130Z" fill="#E1E1DC"/>{rows.map((row)=>{const point=COUNTRY_POINTS[normalizeCountry(row.country)];if(!point)return null;const r=5+Math.min(9,(row.total/max)*9);return <g key={row.country} onMouseEnter={()=>setHovered(row)} className="cursor-pointer"><circle cx={point.x} cy={point.y} r={r+6} fill="transparent"/><circle cx={point.x} cy={point.y} r={r} fill="#111413" opacity=".86"/><text x={point.x} y={point.y+3} textAnchor="middle" fontSize="8" fill="white" fontWeight="700">{row.total}</text></g>;})}</svg>{hovered&&<div className="absolute right-4 top-4 min-w-[190px] rounded-xl bg-[#111413] p-3 text-white shadow-xl"><p className="text-xs font-semibold">{hovered.country}</p><p className="mt-2 text-[10px] text-white/60">{language==='es'?'Personas únicas':'Unique people'} · {hovered.total}</p><p className="mt-1 text-[10px] text-white/60">{language==='es'?'Formación':'Program'} · {hovered.formation}</p><p className="mt-1 text-[10px] text-white/60">{language==='es'?'Mentoría 1:1':'1:1 Mentoring'} · {hovered.mentoring}</p></div>}</div>:<div className="mt-5 space-y-3">{rows.map((row)=><div key={row.country} className="grid gap-2 md:grid-cols-[150px_1fr_130px] md:items-center"><div><p className="text-sm font-semibold">{row.country}</p><p className="text-[10px] text-black/40">{row.formation} {language==='es'?'formación':'program'} · {row.mentoring} 1:1</p></div><div className="h-2.5 overflow-hidden rounded-full bg-black/5"><div className="h-full rounded-full bg-[#111413]" style={{width:`${Math.max(4,(row.total/max)*100)}%`}}/></div><p className="text-right text-xs font-semibold">{row.total} {language==='es'?'personas':'people'}</p></div>)}</div>}
  </section>;
}

export function DashboardHistoryV2({ language, onNavigate, onOpenClient, onStartSession }: Props) {
  const [people,setPeople]=useState<ExpertPerson[]>([]);
  const [profiles,setProfiles]=useState<ExpertPersonProfileMeta[]>([]);
  const [formations,setFormations]=useState<ExpertFormation[]>([]);
  const [cohorts,setCohorts]=useState<ExpertCohort[]>([]);
  const [enrollments,setEnrollments]=useState<ExpertEnrollment[]>([]);
  const [tasks,setTasks]=useState<DashboardWorkItem[]>([]);
  const [classes,setClasses]=useState<DashboardFormationClass[]>([]);
  const [cohortTimes,setCohortTimes]=useState<DashboardCohortTime[]>([]);
  const [clients,setClients]=useState<SharedSessionClient[]>(()=>loadSessionClients());

  useEffect(()=>{let a:(()=>void)|undefined,b:(()=>void)|undefined,c:(()=>void)|undefined,d:(()=>void)|undefined,e:(()=>void)|undefined,f:(()=>void)|undefined,g:(()=>void)|undefined;
    void subscribeExpertPeople(setPeople).then((x)=>{a=x;}); void subscribeExpertPeopleProfileMeta(setProfiles).then((x)=>{b=x;}); void subscribeExpertFormations(setFormations).then((x)=>{c=x;}); void subscribeExpertCohorts(setCohorts).then((x)=>{d=x;}); void subscribeExpertEnrollments(setEnrollments).then((x)=>{e=x;}); void subscribeDashboardWorkItems(setTasks).then((x)=>{f=x;}); void subscribeDashboardFormationClasses(setClasses).then((x)=>{g=x;});
    let h:(()=>void)|undefined; void subscribeDashboardCohortTimes(setCohortTimes).then((x)=>{h=x;});
    const refresh=()=>setClients(loadSessionClients()); window.addEventListener(WORKSPACE_STATE_EVENT,refresh); window.addEventListener('storage',refresh);
    return()=>{a?.();b?.();c?.();d?.();e?.();f?.();g?.();h?.();window.removeEventListener(WORKSPACE_STATE_EVENT,refresh);window.removeEventListener('storage',refresh);};
  },[]);

  const today=todayKey();
  const profileById=useMemo(()=>new Map(profiles.map((p)=>[p.id,p])),[profiles]);
  const formationById=useMemo(()=>new Map(formations.map((f)=>[f.id,f])),[formations]);
  const cohortById=useMemo(()=>new Map(cohorts.map((c)=>[c.id,c])),[cohorts]);
  const cohortTimeById=useMemo(()=>new Map(cohortTimes.map((c)=>[c.cohortId,c.time])),[cohortTimes]);
  const mainWork=useMemo(()=>tasks.filter((t)=>t.status!=='done'&&!t.deletedAt&&!isHiddenWork(t)&&!isFollowUpWork(t)),[tasks]);
  const dueToday=useMemo(()=>mainWork.filter((t)=>t.interactionState!=='waiting-reply'&&(!t.dueDate||t.dueDate<=today)).sort((a,b)=>`${a.dueDate||today}${a.dueTime||'23:59'}`.localeCompare(`${b.dueDate||today}${b.dueTime||'23:59'}`)),[mainWork,today]);
  const activeClasses=useMemo(()=>classes.filter((c)=>!c.archived&&c.status!=='done'&&c.date>=today).map((c)=>({...c,effectiveTime:c.time||cohortTimeById.get(c.cohortId)||''})).sort((a,b)=>`${a.date}${a.effectiveTime}`.localeCompare(`${b.date}${b.effectiveTime}`)),[classes,cohortTimeById,today]);
  const todayClasses=activeClasses.filter((c)=>c.date===today).length;
  const todayMentoring=clients.filter((c)=>/hoy|today/i.test(c.nextSession||'')).length;
  const activeMentoring=people.filter((p)=>p.currentStage==='mentoring').length;
  const currentMonth=today.slice(0,7);
  const newLeads=people.filter((p)=>{const created=profileById.get(p.id)?.createdAt||null;return (p.currentStage==='lead'||p.currentStage==='webinar')&&monthKey(created)===currentMonth;}).length;

  const agenda=useMemo(()=>{
    const classRows=activeClasses.slice(0,8).map((c)=>({kind:'class' as const,id:c.id,title:`${formationById.get(c.formationId)?.title||'Formación'} · ${c.title}`,subtitle:`${cohortById.get(c.cohortId)?.title||c.cohortTitle} · ${humanDate(c.date,c.effectiveTime,language)}`,classItem:c}));
    const clientRows=clients.filter((c)=>(c.nextSession||'').trim()).slice(0,5).map((c)=>({kind:'client' as const,id:c.id,title:c.name,subtitle:c.nextSession||'',client:c}));
    return [...clientRows,...classRows].slice(0,9);
  },[activeClasses,formationById,cohortById,clients,language]);

  const radar=useMemo(()=>{
    const follow=tasks.filter((t)=>t.status!=='done'&&!t.deletedAt&&!isHiddenWork(t)&&isFollowUpWork(t));
    return [
      {label:language==='es'?'Respondieron':'Replied',value:follow.filter((t)=>t.interactionState==='reply-received').length,detail:language==='es'?'Necesitan revisión y siguiente decisión.':'Need review and a next decision.'},
      {label:language==='es'?'Esperando respuesta':'Waiting for reply',value:follow.filter((t)=>t.interactionState==='waiting-reply').length,detail:language==='es'?'Interacciones activas en seguimiento.':'Active follow-up interactions.'},
      {label:language==='es'?'Leads por atender':'Leads to review',value:follow.filter((t)=>t.interactionState==='queue').length,detail:language==='es'?'Motivo, contexto y continuidad por definir.':'Reason, context and continuity to define.'}
    ];
  },[tasks,language]);

  const reach=useMemo<ReachRow[]>(()=>{
    const formationIds=new Set(enrollments.filter((e)=>e.status!=='withdrawn'&&e.status!=='refunded').map((e)=>e.personId));
    const rows=new Map<string,{formation:Set<string>;mentoring:Set<string>}>();
    people.forEach((person)=>{const country=profileById.get(person.id)?.country?.trim()||'';if(!country)return;const inFormation=formationIds.has(person.id);const inMentoring=person.currentStage==='mentoring';if(!inFormation&&!inMentoring)return;const current=rows.get(country)||{formation:new Set<string>(),mentoring:new Set<string>()};if(inFormation)current.formation.add(person.id);if(inMentoring)current.mentoring.add(person.id);rows.set(country,current);});
    return [...rows.entries()].map(([country,value])=>({country,formation:value.formation.size,mentoring:value.mentoring.size,total:new Set([...value.formation,...value.mentoring]).size})).sort((a,b)=>b.total-a.total||a.country.localeCompare(b.country));
  },[people,enrollments,profileById]);

  const openClass=(item:DashboardFormationClass)=>{const q=new URLSearchParams({formation:item.formationId,cohort:item.cohortId,class:item.id});window.history.pushState({},'',`/workspace/experts/formations/session?${q.toString()}`);window.dispatchEvent(new PopStateEvent('popstate'));};

  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label={language==='es'?'Trabajo prioritario':'Priority Work'} value={mainWork.length} detail={language==='es'?'acciones operativas abiertas':'open operational actions'}/><MetricCard label={language==='es'?'Sesiones de hoy':'Sessions Today'} value={todayClasses+todayMentoring} detail={`${todayMentoring} 1:1 · ${todayClasses} ${language==='es'?'clases':'classes'}`}/><MetricCard label={language==='es'?'Clientes activos':'Active Clients'} value={activeMentoring} detail={language==='es'?'mentorías 1:1 activas':'active 1:1 mentoring relationships'}/><MetricCard label={language==='es'?'Nuevos leads':'New Leads'} value={newLeads} detail={language==='es'?'ingresados este mes':'entered this month'}/></div>

    <div className="grid gap-6 xl:grid-cols-[1.35fr_.85fr]">
      <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language==='es'?'EJECUCIÓN':'EXECUTION'}</p><h2 className="mt-2 text-xl font-semibold">{language==='es'?'Por hacer hoy':'Due today'}</h2><p className="mt-1 text-sm text-black/45">{language==='es'?'Solo trabajo abierto real; las tareas completadas o eliminadas desaparecen automáticamente.':'Only real open work; completed or deleted tasks disappear automatically.'}</p></div><button onClick={()=>onNavigate('priority')} className="rounded-full bg-[#111413] px-4 py-2.5 text-xs font-semibold text-white">{language==='es'?'Trabajo prioritario':'Priority Work'}</button></div><div className="mt-4 divide-y divide-black/5">{dueToday.slice(0,7).map((task)=><div key={task.id} className="grid gap-2 py-3 md:grid-cols-[1fr_auto] md:items-center"><div><p className="text-sm font-semibold">{task.title||task.clientName}</p><p className="mt-1 text-xs text-black/42">{task.clientName} · {taskLabel(task.type,language)} · {task.assignee||'—'}</p></div><div className="text-xs text-black/45 md:text-right"><p>{task.dueTime||'—'}</p><p className="mt-1 text-[10px]">{task.dueDate||today}</p></div></div>)}{dueToday.length===0&&<p className="py-7 text-center text-sm text-black/40">{language==='es'?'No hay acciones pendientes para hoy.':'No actions pending for today.'}</p>}</div></section>
      <section className="rounded-2xl border border-black/10 bg-white p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">AGENDA</p><h2 className="mt-2 text-lg font-semibold">{language==='es'?'Próximas sesiones y clases':'Upcoming sessions and classes'}</h2></div><CalendarDays className="h-5 w-5 text-[#0A3F4D]"/></div><div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">{agenda.map((item)=><button key={`${item.kind}-${item.id}`} onClick={()=>item.kind==='client'?onStartSession(item.id):openClass(item.classItem)} className="flex w-full items-center gap-3 rounded-xl border border-black/6 p-3 text-left transition hover:bg-[#F7F7F5]"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${item.kind==='client'?'bg-[#0A3F4D]/8 text-[#0A3F4D]':'bg-black/5 text-black/55'}`}>{item.kind==='client'?<UsersRound className="h-4 w-4"/>:<CalendarDays className="h-4 w-4"/>}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{item.title}</span><span className="mt-1 block truncate text-[10px] text-black/40">{item.subtitle}</span></span><ChevronRight className="h-3.5 w-3.5 text-black/25"/></button>)}{agenda.length===0&&<p className="py-6 text-center text-sm text-black/40">{language==='es'?'No hay sesiones o clases próximas.':'No upcoming sessions or classes.'}</p>}</div></section>
    </div>

    <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#A46F16]">THE RADAR</p><h2 className="mt-2 text-xl font-semibold">{language==='es'?'Relaciones y seguimiento':'Relationships and follow-up'}</h2><p className="mt-1 text-sm text-black/45">{language==='es'?'Señales de la mesa secundaria, sin mezclarla con Priority Work.':'Signals from the secondary desk without mixing them into Priority Work.'}</p></div><button onClick={()=>onNavigate('relationships')} className="rounded-full border border-black/10 px-4 py-2 text-xs font-semibold">{language==='es'?'Abrir Relaciones':'Open Relationships'}</button></div><div className="mt-4 grid gap-3 md:grid-cols-3">{radar.map((item,index)=><button key={item.label} onClick={()=>onNavigate('relationships')} className="rounded-2xl bg-[#FAFAF8] p-4 text-left"><div className="flex items-center justify-between"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#A46F16]/9 text-[#82570F]">{index===0?<MessageCircleReply className="h-4 w-4"/>:index===1?<Radio className="h-4 w-4"/>:<ListTodo className="h-4 w-4"/>}</span><strong className="text-2xl font-semibold">{item.value}</strong></div><p className="mt-3 text-sm font-semibold">{item.label}</p><p className="mt-1 text-xs leading-5 text-black/45">{item.detail}</p></button>)}</div></section>

    <WorldReach rows={reach} language={language}/>
  </div>;
}
