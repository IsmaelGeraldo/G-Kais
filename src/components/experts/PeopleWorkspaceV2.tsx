import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, GraduationCap, History, Mail, MessageCircle, Phone, Search, UserRound, Users } from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';
import { subscribeExpertPeople, type ExpertPerson } from '../../services/expertsAcquisition';
import { enrollExpertPerson, subscribeExpertCohorts, subscribeExpertFormations, type ExpertCohort, type ExpertFormation } from '../../services/expertsFormations';
import { createPersonWorkAction, subscribePersonHistory, type PersonActionType, type PersonHistorySnapshot } from '../../services/expertsPeopleOperations';
import { loadExpertWorkspaceTeam, type WorkspaceMember } from '../../services/expertsWorkspaceCore';

type Tab = 'summary' | 'action';
type ActionMode = 'task' | 'formation' | 'mentoring';

function memberLabel(member?: WorkspaceMember) { return member?.displayName || member?.email || member?.uid || ''; }
function fmt(value: string, language: Language) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(language === 'es' ? 'es-CL' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date) : value;
}
function actionLabel(type: PersonActionType, language: Language) {
  if (type === 'whatsapp') return 'WhatsApp'; if (type === 'email') return 'Email'; if (type === 'call') return language === 'es' ? 'Llamada' : 'Call'; if (type === 'meeting') return language === 'es' ? 'Reunión' : 'Meeting'; return language === 'es' ? 'Tarea interna' : 'Internal task';
}
function stageLabel(stage: ExpertPerson['currentStage'], language: Language) {
  const labels: Record<string, [string,string]> = { lead:['Lead','Lead'], webinar:['Webinar','Webinar'], student:['Alumno','Student'], alumni:['Alumni','Alumni'], mentoring:['Mentoría 1:1','1:1 mentoring'] };
  return labels[stage]?.[language === 'es' ? 0 : 1] || stage;
}
function memoryText(person: ExpertPerson, language: Language) {
  const m = person.outcomeMemory || {};
  const next = typeof m.nextActionLabel === 'string' ? m.nextActionLabel : '';
  if (next) return `${language === 'es' ? 'Próxima acción' : 'Next action'}: ${next}`;
  if (m.lastWebinarPurchased === true) return language === 'es' ? 'Compra registrada en su historial.' : 'Purchase recorded in relationship history.';
  const status = typeof m.lastWebinarStatus === 'string' ? m.lastWebinarStatus : '';
  return status ? `${language === 'es' ? 'Último webinar' : 'Last webinar'}: ${status}` : (language === 'es' ? 'Sin señales recientes registradas.' : 'No recent signals recorded.');
}

export function PeopleWorkspaceV2({ language }: { language: Language }) {
  const [people, setPeople] = useState<ExpertPerson[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [currentUid, setCurrentUid] = useState('');
  const [formations, setFormations] = useState<ExpertFormation[]>([]);
  const [cohorts, setCohorts] = useState<ExpertCohort[]>([]);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(() => new URLSearchParams(window.location.search).get('person') || '');
  const [tab, setTab] = useState<Tab>('summary');
  const [mode, setMode] = useState<ActionMode>('task');
  const [history, setHistory] = useState<PersonHistorySnapshot>({ events: [], tasks: [] });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [type, setType] = useState<PersonActionType>('whatsapp');
  const [assigneeUid, setAssigneeUid] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [note, setNote] = useState('');
  const [formationId, setFormationId] = useState('');
  const [cohortId, setCohortId] = useState('');

  useEffect(() => {
    let a: (()=>void)|undefined, b:(()=>void)|undefined, c:(()=>void)|undefined;
    void subscribeExpertPeople((items) => { setPeople(items); setSelectedId((current) => current || items[0]?.id || ''); }).then((stop)=>{a=stop;});
    void subscribeExpertFormations(setFormations).then((stop)=>{b=stop;});
    void subscribeExpertCohorts(setCohorts).then((stop)=>{c=stop;});
    void loadExpertWorkspaceTeam().then((team) => { const active=team.members.filter((m)=>m.status==='active'); setMembers(active); setCurrentUid(team.currentUid); setAssigneeUid(team.currentUid); }).catch(()=>{});
    return () => { a?.(); b?.(); c?.(); };
  }, []);

  const filtered = useMemo(() => { const term=query.trim().toLowerCase(); return term ? people.filter((p)=>[p.name,p.email,p.phone].some((v)=>v.toLowerCase().includes(term))) : people; }, [people, query]);
  const selected = filtered.find((p)=>p.id===selectedId) || people.find((p)=>p.id===selectedId) || filtered[0] || null;
  useEffect(() => { if (!selected?.id) { setHistory({events:[],tasks:[]}); return; } let stop:(()=>void)|undefined; void subscribePersonHistory(selected.id,setHistory).then((x)=>{stop=x;}); return()=>stop?.(); }, [selected?.id]);

  const activeFormations = formations.filter((f)=>f.status==='active');
  const formationCohorts = cohorts.filter((c)=>c.formationId===formationId && (c.status==='active'||c.status==='planned'));
  useEffect(()=>{ if (!formationId || !activeFormations.some((f)=>f.id===formationId)) setFormationId(activeFormations[0]?.id||''); },[activeFormations,formationId]);
  useEffect(()=>{ if (!formationCohorts.some((c)=>c.id===cohortId)) setCohortId(formationCohorts.find((c)=>c.status==='active')?.id||formationCohorts[0]?.id||''); },[formationCohorts,cohortId]);

  const assignee = members.find((m)=>m.uid===assigneeUid) || members.find((m)=>m.uid===currentUid) || members[0];
  const createTask = async () => {
    if (!selected || !assignee || !note.trim()) { setMessage(language==='es'?'Escribe el contexto o nota de la acción.':'Write the action context or note.'); return; }
    setBusy(true); try { const title = `${actionLabel(type,language)} · ${selected.name}`; await createPersonWorkAction({ person:selected, assignee, title, type, dueDate:date, dueTime:time, note }); setNote(''); setDate(''); setTime(''); setTab('summary'); setMessage(language==='es'?'Acción creada en Trabajo prioritario.':'Action created in Priority Work.'); } catch { setMessage(language==='es'?'No se pudo crear la acción.':'Could not create action.'); } finally { setBusy(false); }
  };
  const integrate = async () => {
    if (!selected || !formationId || !cohortId) return;
    setBusy(true); try { await enrollExpertPerson({ personId:selected.id, formationId, cohortId, status:'active', progress:0 }); setMessage(language==='es'?'Persona integrada a la formación sin salir de Relaciones.':'Person enrolled without leaving Relationships.'); setTab('summary'); } catch { setMessage(language==='es'?'No se pudo integrar a la formación.':'Could not enroll person.'); } finally { setBusy(false); }
  };
  const startMentoring = () => { if (!selected) return; const params=new URLSearchParams(); params.set('view','clients'); params.set('person',selected.id); window.history.pushState({},'',`/workspace/experts?${params.toString()}`); window.dispatchEvent(new PopStateEvent('popstate')); };

  const timeline = [...history.events.map((e)=>({kind:'event' as const,date:e.occurredAt,title:e.type.replaceAll('.',' · '),detail:typeof e.metadata.result==='string'?e.metadata.result:''})), ...history.tasks.map((t)=>({kind:'task' as const,date:t.completedAt||t.createdAt,title:t.title,detail:t.result||t.note}))].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,80);

  return <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
    <section className="overflow-hidden rounded-2xl border border-black/10 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-black/7 p-4"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-[#0A3F4D]"/><p className="text-sm font-semibold">{language==='es'?'Personas':'People'}</p></div><label className="relative block w-[360px] max-w-full"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30"/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder={language==='es'?'Buscar por nombre, email o teléfono…':'Search by name, email or phone…'} className="w-full rounded-xl border border-black/10 bg-[#FAFAF8] py-2.5 pl-9 pr-3 text-sm"/></label></div>
      <div className="max-h-[700px] divide-y divide-black/5 overflow-y-auto">{filtered.map((p)=><button key={p.id} onClick={()=>{setSelectedId(p.id);setTab('summary');}} className={`grid w-full gap-2 p-4 text-left md:grid-cols-[minmax(220px,1fr)_130px_170px] md:items-center ${selected?.id===p.id?'bg-[#F7F7F5]':'hover:bg-black/[0.015]'}`}><div><p className="text-sm font-semibold">{p.name}</p><p className="mt-1 text-xs text-black/40">{p.email||p.phone||'—'}</p></div><span className="w-fit rounded-full bg-[#0A3F4D]/8 px-2.5 py-1 text-[10px] font-semibold text-[#0A3F4D]">{stageLabel(p.currentStage,language)}</span><p className="truncate text-xs text-black/40">{p.latestSource||p.firstSource||'—'}</p></button>)}{filtered.length===0&&<div className="p-10 text-center text-sm text-black/40">{language==='es'?'Sin resultados.':'No results.'}</div>}</div>
    </section>

    <section className="overflow-hidden rounded-2xl border border-black/10 bg-white">{selected ? <>
      <div className="p-5 pb-3"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-full bg-[#111413] text-white"><UserRound className="h-5 w-5"/></div><div><p className="text-lg font-semibold">{selected.name}</p><p className="text-xs text-black/40">{selected.email||selected.phone||'—'}</p></div></div><div className="mt-4 flex rounded-xl bg-[#F7F7F5] p-1"><button onClick={()=>setTab('summary')} className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold ${tab==='summary'?'bg-white shadow-sm':'text-black/45'}`}>{language==='es'?'Resumen':'Summary'}</button><button onClick={()=>setTab('action')} className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold ${tab==='action'?'bg-white shadow-sm':'text-black/45'}`}>{language==='es'?'Nueva acción':'New action'}</button></div></div>
      {tab==='summary'?<div className="space-y-3 border-t border-black/6 p-4"><div className="rounded-xl bg-[#F7F7F5] p-3.5"><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#0A3F4D]">OUTCOME MEMORY</p><p className="mt-2 text-sm leading-6 text-black/60">{memoryText(selected,language)}</p></div><div className="border-t border-black/5 pt-3"><div className="flex items-center gap-2"><History className="h-4 w-4 text-[#0A3F4D]"/><p className="text-xs font-semibold">{language==='es'?'Historial':'History'}</p></div><div className="mt-2 max-h-[330px] divide-y divide-black/5 overflow-y-auto">{timeline.map((item,i)=><div key={`${item.kind}-${i}-${item.date}`} className="py-3"><p className="text-xs font-semibold">{item.title}</p><p className="mt-1 text-[10px] text-black/35">{fmt(item.date,language)}</p>{item.detail&&<p className="mt-1 text-xs text-black/50">{item.detail}</p>}</div>)}{timeline.length===0&&<p className="py-6 text-center text-sm text-black/35">{language==='es'?'Sin historial todavía.':'No history yet.'}</p>}</div></div></div>:
      <div className="space-y-4 border-t border-black/6 p-4"><div className="grid grid-cols-3 gap-1 rounded-xl bg-[#F7F7F5] p-1"><button onClick={()=>setMode('task')} className={`rounded-lg px-2 py-2 text-[10px] font-semibold ${mode==='task'?'bg-white shadow-sm':'text-black/45'}`}>{language==='es'?'Crear tarea':'Create task'}</button><button onClick={()=>setMode('formation')} className={`rounded-lg px-2 py-2 text-[10px] font-semibold ${mode==='formation'?'bg-white shadow-sm':'text-black/45'}`}>{language==='es'?'Integrar a formación':'Enroll in program'}</button><button onClick={()=>setMode('mentoring')} className={`rounded-lg px-2 py-2 text-[10px] font-semibold ${mode==='mentoring'?'bg-white shadow-sm':'text-black/45'}`}>{language==='es'?'Iniciar cliente 1:1':'Start 1:1 client'}</button></div>
        {mode==='task'&&<><div className="grid gap-2 sm:grid-cols-2"><select value={type} onChange={(e)=>setType(e.target.value as PersonActionType)} className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm"><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="call">{language==='es'?'Llamada':'Call'}</option><option value="meeting">{language==='es'?'Reunión':'Meeting'}</option><option value="task">{language==='es'?'Tarea interna':'Internal task'}</option></select><select value={assigneeUid} onChange={(e)=>setAssigneeUid(e.target.value)} className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm">{members.map((m)=><option key={m.uid} value={m.uid}>{memberLabel(m)}</option>)}</select><input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="rounded-xl border border-black/10 px-3 py-2.5 text-sm"/><input type="time" value={time} onChange={(e)=>setTime(e.target.value)} className="rounded-xl border border-black/10 px-3 py-2.5 text-sm"/></div><label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language==='es'?'CONTEXTO / NOTA':'CONTEXT / NOTE'}</span><textarea rows={3} value={note} onChange={(e)=>setNote(e.target.value)} className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm"/></label><button disabled={busy||!note.trim()} onClick={()=>void createTask()} className="rounded-full bg-[#111413] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-35">{language==='es'?'Crear acción':'Create action'}</button></>}
        {mode==='formation'&&<div className="space-y-3"><div className="grid gap-2 sm:grid-cols-2"><select value={formationId} onChange={(e)=>setFormationId(e.target.value)} className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm"><option value="">{language==='es'?'Formación activa':'Active program'}</option>{activeFormations.map((f)=><option key={f.id} value={f.id}>{f.title}</option>)}</select><select value={cohortId} onChange={(e)=>setCohortId(e.target.value)} className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm"><option value="">{language==='es'?'Cohorte / grupo':'Cohort / group'}</option>{formationCohorts.map((c)=><option key={c.id} value={c.id}>{c.title}</option>)}</select></div><button disabled={busy||!formationId||!cohortId} onClick={()=>void integrate()} className="inline-flex items-center gap-2 rounded-full bg-[#111413] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-35"><GraduationCap className="h-4 w-4"/>{language==='es'?'Integrar ahora':'Enroll now'}</button></div>}
        {mode==='mentoring'&&<div className="rounded-xl bg-[#F7F7F5] p-4"><p className="text-sm font-semibold">{language==='es'?'Abrir onboarding 1:1':'Open 1:1 onboarding'}</p><p className="mt-1 text-xs leading-5 text-black/50">{language==='es'?'Usaremos esta misma identidad y completaremos la información específica de la mentoría.':'We will keep this identity and complete the mentoring-specific information.'}</p><button onClick={startMentoring} className="mt-3 rounded-full bg-[#111413] px-4 py-2.5 text-xs font-semibold text-white">{language==='es'?'Continuar a Cliente 1:1':'Continue to 1:1 Client'}</button></div>}
      </div>}
    </>:<div className="grid min-h-[320px] place-items-center text-sm text-black/35">{language==='es'?'Selecciona una persona.':'Select a person.'}</div>}</section>
    {message&&<div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl bg-[#111413] px-4 py-3 text-xs text-white shadow-xl">{message}</div>}
  </div>;
}
