import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Globe2, GraduationCap, History, Mail, MapPin, Phone, Search, UserRound, Users } from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';
import { subscribeExpertPeople, type ExpertPerson } from '../../services/expertsAcquisition';
import {
  enrollExpertPerson,
  subscribeExpertCohorts,
  subscribeExpertEnrollments,
  subscribeExpertFormations,
  type ExpertCohort,
  type ExpertEnrollment,
  type ExpertFormation
} from '../../services/expertsFormations';
import { createPersonWorkAction, subscribePersonHistory, type PersonActionType, type PersonHistorySnapshot } from '../../services/expertsPeopleOperations';
import { loadExpertWorkspaceTeam, workspaceAssigneeLabel, type WorkspaceMember, type WorkspaceRole } from '../../services/expertsWorkspaceCore';
import { subscribeExpertPeopleProfileMeta, updateExpertPersonCountry, type ExpertPersonProfileMeta } from '../../services/expertsPeopleProfile';

type Tab = 'history' | 'action';
type ActionMode = 'task' | 'formation' | 'mentoring';

function memberLabel(member?: WorkspaceMember) { return member?.displayName || member?.email || member?.uid || ''; }
function fmt(value: string, language: Language) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(language === 'es' ? 'es-CL' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date) : value;
}
function fmtDate(value: Date | null, language: Language) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(language === 'es' ? 'es-CL' : 'en-US', { dateStyle: 'medium' }).format(value);
}
function actionLabel(type: PersonActionType, language: Language) {
  if (type === 'whatsapp') return 'WhatsApp'; if (type === 'email') return 'Email'; if (type === 'call') return language === 'es' ? 'Llamada' : 'Call'; if (type === 'meeting') return language === 'es' ? 'Reunión' : 'Meeting'; return language === 'es' ? 'Tarea interna' : 'Internal task';
}
function stageLabel(stage: ExpertPerson['currentStage'], language: Language) {
  const labels: Record<string, [string,string]> = { lead:['Lead','Lead'], webinar:['Webinar','Webinar'], student:['Alumno','Student'], alumni:['Alumni','Alumni'], mentoring:['Mentoría 1:1','1:1 mentoring'] };
  return labels[stage]?.[language === 'es' ? 0 : 1] || stage;
}
function eventLabel(type: string, language: Language) {
  const labels: Record<string, [string,string]> = {
    'webinar.registered':['Registro en webinar','Webinar registration'],
    'webinar.attended':['Asistió a webinar','Attended webinar'],
    'webinar.no_show':['No asistió a webinar','Webinar no-show'],
    'webinar.purchased':['Compra registrada','Purchase recorded'],
    'formation.enrolled':['Ingresó a formación','Enrolled in program'],
    'formation.completed':['Completó formación','Completed program'],
    'nurture.activated':['Entró a seguimiento','Entered follow-up'],
    'nurture.reviewed':['Seguimiento revisado','Follow-up reviewed'],
    'interaction.waiting_reply':['Esperando respuesta','Waiting for reply'],
    'interaction.reply_received':['Respuesta recibida','Reply received'],
    'person.action_created':['Acción creada','Action created']
  };
  return labels[type]?.[language === 'es' ? 0 : 1] || type.replaceAll('.', ' · ');
}

export function PeopleWorkspaceV3({ language }: { language: Language }) {
  const [people, setPeople] = useState<ExpertPerson[]>([]);
  const [profiles, setProfiles] = useState<ExpertPersonProfileMeta[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [memberRoles, setMemberRoles] = useState<WorkspaceRole[]>([]);
  const [currentUid, setCurrentUid] = useState('');
  const [formations, setFormations] = useState<ExpertFormation[]>([]);
  const [cohorts, setCohorts] = useState<ExpertCohort[]>([]);
  const [enrollments, setEnrollments] = useState<ExpertEnrollment[]>([]);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(() => new URLSearchParams(window.location.search).get('person') || '');
  const [tab, setTab] = useState<Tab>('history');
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
  const [countryDraft, setCountryDraft] = useState('');
  const [editingCountry, setEditingCountry] = useState(false);

  useEffect(() => {
    let a: (()=>void)|undefined, b:(()=>void)|undefined, c:(()=>void)|undefined, d:(()=>void)|undefined, e:(()=>void)|undefined;
    void subscribeExpertPeople((items) => { setPeople(items); setSelectedId((current) => current && items.some((p) => p.id === current) ? current : items[0]?.id || ''); }).then((stop)=>{a=stop;});
    void subscribeExpertPeopleProfileMeta(setProfiles).then((stop)=>{b=stop;});
    void subscribeExpertFormations(setFormations).then((stop)=>{c=stop;});
    void subscribeExpertCohorts(setCohorts).then((stop)=>{d=stop;});
    void subscribeExpertEnrollments(setEnrollments).then((stop)=>{e=stop;});
    void loadExpertWorkspaceTeam().then((team) => { const active=team.members.filter((m)=>m.status==='active'); setMembers(active); setMemberRoles(team.roles); setCurrentUid(team.currentUid); setAssigneeUid(team.currentUid); }).catch(()=>{});
    return () => { a?.(); b?.(); c?.(); d?.(); e?.(); };
  }, []);

  useEffect(() => { if (!message) return; const timer=window.setTimeout(()=>setMessage(''),3500); return()=>window.clearTimeout(timer); }, [message]);

  const filtered = useMemo(() => { const term=query.trim().toLowerCase(); return term ? people.filter((p)=>[p.name,p.email,p.phone].some((v)=>v.toLowerCase().includes(term))) : people; }, [people, query]);
  const selected = filtered.find((p)=>p.id===selectedId) || people.find((p)=>p.id===selectedId) || filtered[0] || null;
  const profile = profiles.find((item)=>item.id===selected?.id) || null;
  useEffect(() => { if (!selected?.id) { setHistory({events:[],tasks:[]}); return; } let stop:(()=>void)|undefined; void subscribePersonHistory(selected.id,setHistory).then((x)=>{stop=x;}); return()=>stop?.(); }, [selected?.id]);
  useEffect(() => { setCountryDraft(profile?.country || ''); setEditingCountry(false); }, [profile?.country, selected?.id]);

  const activeFormations = formations.filter((f)=>f.status==='active');
  const formationCohorts = cohorts.filter((c)=>c.formationId===formationId && (c.status==='active'||c.status==='planned'));
  useEffect(()=>{ if (!formationId || !activeFormations.some((f)=>f.id===formationId)) setFormationId(activeFormations[0]?.id||''); },[activeFormations,formationId]);
  useEffect(()=>{ if (!formationCohorts.some((c)=>c.id===cohortId)) setCohortId(formationCohorts.find((c)=>c.status==='active')?.id||formationCohorts[0]?.id||''); },[formationCohorts,cohortId]);

  const personEnrollments = useMemo(() => selected ? enrollments.filter((item)=>item.personId===selected.id && item.status!=='withdrawn' && item.status!=='refunded') : [], [enrollments,selected]);
  const currentEnrollment = personEnrollments.find((item)=>item.status==='active') || personEnrollments[0];
  const currentFormation = currentEnrollment ? formations.find((item)=>item.id===currentEnrollment.formationId) : null;
  const currentCohort = currentEnrollment ? cohorts.find((item)=>item.id===currentEnrollment.cohortId) : null;
  const relation = currentEnrollment
    ? `${currentFormation?.title || (language==='es'?'Formación':'Program')}${currentCohort ? ` · ${currentCohort.title}` : ''}`
    : stageLabel(selected?.currentStage || 'lead',language);

  const assignee = members.find((m)=>m.uid===assigneeUid) || members.find((m)=>m.uid===currentUid) || members[0];
  const createTask = async () => {
    if (!selected || !assignee || !note.trim()) { setMessage(language==='es'?'Escribe el contexto o nota de la acción.':'Write the action context or note.'); return; }
    setBusy(true); try { await createPersonWorkAction({ person:selected, assignee, title:`${actionLabel(type,language)} · ${selected.name}`, type, dueDate:date, dueTime:time, note }); setNote(''); setDate(''); setTime(''); setTab('history'); setMessage(language==='es'?'Acción creada en Trabajo prioritario.':'Action created in Priority Work.'); } catch { setMessage(language==='es'?'No se pudo crear la acción.':'Could not create action.'); } finally { setBusy(false); }
  };
  const integrate = async () => {
    if (!selected || !formationId || !cohortId) return;
    setBusy(true); try { await enrollExpertPerson({ personId:selected.id, formationId, cohortId, status:'active', progress:0 }); setMessage(language==='es'?'Persona integrada a la formación.':'Person enrolled in program.'); setTab('history'); } catch { setMessage(language==='es'?'No se pudo integrar a la formación.':'Could not enroll person.'); } finally { setBusy(false); }
  };
  const startMentoring = () => { if (!selected) return; const params=new URLSearchParams(); params.set('view','clients'); params.set('person',selected.id); window.history.pushState({},'',`/workspace/experts?${params.toString()}`); window.dispatchEvent(new PopStateEvent('popstate')); };
  const saveCountry = async () => { if (!selected) return; setBusy(true); try { await updateExpertPersonCountry(selected.id,countryDraft); setEditingCountry(false); setMessage(language==='es'?'País actualizado.':'Country updated.'); } catch { setMessage(language==='es'?'No se pudo guardar el país.':'Could not save country.'); } finally { setBusy(false); } };

  const timeline = [...history.events.map((e)=>({kind:'event' as const,date:e.occurredAt,title:eventLabel(e.type,language),detail:typeof e.metadata.result==='string'?e.metadata.result:''})), ...history.tasks.map((t)=>({kind:'task' as const,date:t.completedAt||t.createdAt,title:t.title,detail:t.result||t.note}))].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,100);

  return <div className="grid gap-5 lg:grid-cols-[minmax(340px,0.9fr)_minmax(0,1.1fr)]">
    <section className="overflow-hidden rounded-2xl border border-black/10 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-black/7 p-4"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-[#0A3F4D]"/><p className="text-sm font-semibold">{language==='es'?'Personas':'People'}</p></div><label className="relative block w-[360px] max-w-full"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30"/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder={language==='es'?'Buscar por nombre, email o teléfono…':'Search by name, email or phone…'} className="w-full rounded-xl border border-black/10 bg-[#FAFAF8] py-2.5 pl-9 pr-3 text-sm"/></label></div>
      <div className="gkais-light-scrollbar max-h-[700px] divide-y divide-black/5 overflow-y-auto">{filtered.map((p)=><button key={p.id} onClick={()=>{setSelectedId(p.id);setTab('history');}} className={`grid w-full gap-2 p-4 text-left md:grid-cols-[minmax(180px,1fr)_110px] md:items-center 2xl:grid-cols-[minmax(220px,1fr)_130px_170px] ${selected?.id===p.id?'bg-[#111413] text-white':'hover:bg-black/[0.015]'}`}><div><p className="text-sm font-semibold">{p.name}</p><p className={`mt-1 text-xs ${selected?.id===p.id?'text-white/55':'text-black/40'}`}>{p.email||p.phone||'—'}</p></div><span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold ${selected?.id===p.id?'bg-white/10 text-white':'bg-[#0A3F4D]/8 text-[#0A3F4D]'}`}>{stageLabel(p.currentStage,language)}</span><p className={`truncate text-xs md:col-span-2 2xl:col-span-1 ${selected?.id===p.id?'text-white/45':'text-black/40'}`}>{p.latestSource||p.firstSource||'—'}</p></button>)}{filtered.length===0&&<div className="p-10 text-center text-sm text-black/40">{language==='es'?'Sin resultados.':'No results.'}</div>}</div>
    </section>

    <section className="overflow-hidden rounded-2xl border border-black/10 bg-white">{selected ? <>
      <div className="p-5 pb-3"><div className="flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#111413] text-white"><UserRound className="h-5 w-5"/></div><div className="min-w-0 flex-1"><p className="text-xl font-semibold">{selected.name}</p><div className="mt-2 grid gap-x-5 gap-y-2 text-xs text-black/50 sm:grid-cols-2"><span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{selected.email||'—'}</span><span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{selected.phone||'—'}</span><span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{language==='es'?'En G-Kais desde':'In G-Kais since'} {fmtDate(profile?.createdAt||null,language)}</span><span className="inline-flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5" />{relation}</span></div><div className="mt-2 flex items-center gap-2 text-xs text-black/50"><MapPin className="h-3.5 w-3.5" />{editingCountry?<><input autoFocus value={countryDraft} onChange={(e)=>setCountryDraft(e.target.value)} placeholder={language==='es'?'País':'Country'} className="h-8 w-40 rounded-lg border border-black/10 px-2"/><button disabled={busy} onClick={()=>void saveCountry()} className="rounded-full bg-[#111413] px-3 py-1.5 text-[10px] font-semibold text-white">{language==='es'?'Guardar':'Save'}</button><button onClick={()=>{setCountryDraft(profile?.country||'');setEditingCountry(false);}} className="text-[10px] font-semibold text-black/40">{language==='es'?'Cancelar':'Cancel'}</button></>:<button onClick={()=>setEditingCountry(true)} className="inline-flex items-center gap-1 font-medium text-black/60"><Globe2 className="h-3.5 w-3.5" />{profile?.country || (language==='es'?'Agregar país':'Add country')}</button>}</div></div></div><div className="mt-4 flex rounded-xl bg-[#F7F7F5] p-1"><button onClick={()=>setTab('history')} className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold ${tab==='history'?'bg-white shadow-sm':'text-black/45'}`}>{language==='es'?'Historial':'History'}</button><button onClick={()=>setTab('action')} className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold ${tab==='action'?'bg-white shadow-sm':'text-black/45'}`}>{language==='es'?'Nueva acción':'New action'}</button></div></div>
      {tab==='history'?<div className="border-t border-black/6 p-4"><div className="flex items-center gap-2"><History className="h-4 w-4 text-[#0A3F4D]"/><p className="text-xs font-semibold">{language==='es'?'Historial completo':'Full history'}</p></div><div className="mt-2 max-h-[430px] divide-y divide-black/5 overflow-y-auto">{timeline.map((item,i)=><div key={`${item.kind}-${i}-${item.date}`} className="py-3"><p className="text-xs font-semibold">{item.title}</p><p className="mt-1 text-[10px] text-black/35">{fmt(item.date,language)}</p>{item.detail&&<p className="mt-1 text-xs leading-5 text-black/50">{item.detail}</p>}</div>)}{timeline.length===0&&<p className="py-8 text-center text-sm text-black/35">{language==='es'?'Sin historial todavía.':'No history yet.'}</p>}</div></div>:
      <div className="space-y-4 border-t border-black/6 p-4"><div className="grid grid-cols-3 gap-1 rounded-xl bg-[#F7F7F5] p-1"><button onClick={()=>setMode('task')} className={`rounded-lg px-2 py-2 text-[10px] font-semibold ${mode==='task'?'bg-white shadow-sm':'text-black/45'}`}>{language==='es'?'Crear tarea':'Create task'}</button><button onClick={()=>setMode('formation')} className={`rounded-lg px-2 py-2 text-[10px] font-semibold ${mode==='formation'?'bg-white shadow-sm':'text-black/45'}`}>{language==='es'?'Integrar a formación':'Enroll in program'}</button><button onClick={()=>setMode('mentoring')} className={`rounded-lg px-2 py-2 text-[10px] font-semibold ${mode==='mentoring'?'bg-white shadow-sm':'text-black/45'}`}>{language==='es'?'Iniciar cliente 1:1':'Start 1:1 client'}</button></div>
        {mode==='task'&&<><div className="grid gap-2 sm:grid-cols-2"><select value={type} onChange={(e)=>setType(e.target.value as PersonActionType)} className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm"><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="call">{language==='es'?'Llamada':'Call'}</option><option value="meeting">{language==='es'?'Reunión':'Meeting'}</option><option value="task">{language==='es'?'Tarea interna':'Internal task'}</option></select><select value={assigneeUid} onChange={(e)=>setAssigneeUid(e.target.value)} className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm">{members.map((m)=><option key={m.uid} value={m.uid}>{workspaceAssigneeLabel(m,memberRoles)}</option>)}</select><input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="rounded-xl border border-black/10 px-3 py-2.5 text-sm"/><input type="time" value={time} onChange={(e)=>setTime(e.target.value)} className="rounded-xl border border-black/10 px-3 py-2.5 text-sm"/></div><label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language==='es'?'CONTEXTO / NOTA':'CONTEXT / NOTE'}</span><textarea rows={3} value={note} onChange={(e)=>setNote(e.target.value)} className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm"/></label><button disabled={busy||!note.trim()} onClick={()=>void createTask()} className="rounded-full bg-[#111413] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-35">{language==='es'?'Crear acción':'Create action'}</button></>}
        {mode==='formation'&&<div className="space-y-3"><div className="grid gap-2 sm:grid-cols-2"><select value={formationId} onChange={(e)=>setFormationId(e.target.value)} className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm"><option value="">{language==='es'?'Formación':'Program'}</option>{activeFormations.map((f)=><option key={f.id} value={f.id}>{f.title}</option>)}</select><select value={cohortId} onChange={(e)=>setCohortId(e.target.value)} className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm"><option value="">{language==='es'?'Cohorte':'Cohort'}</option>{formationCohorts.map((c)=><option key={c.id} value={c.id}>{c.title}</option>)}</select></div><button disabled={busy||!formationId||!cohortId} onClick={()=>void integrate()} className="rounded-full bg-[#111413] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-35">{language==='es'?'Integrar sin salir de Relaciones':'Enroll without leaving Relationships'}</button></div>}
        {mode==='mentoring'&&<div className="rounded-xl bg-[#F7F7F5] p-4"><p className="text-sm font-semibold">{language==='es'?'Cliente 1:1 necesita onboarding adicional.':'1:1 client needs additional onboarding.'}</p><button onClick={startMentoring} className="mt-3 rounded-full bg-[#111413] px-4 py-2.5 text-xs font-semibold text-white">{language==='es'?'Continuar onboarding 1:1':'Continue 1:1 onboarding'}</button></div>}
      </div>}
      {message&&<div className="fixed right-6 top-24 z-[130] max-w-sm rounded-xl bg-[#111413] px-4 py-3 text-xs text-white shadow-2xl">{message}</div>}
    </>:<div className="p-10 text-center text-sm text-black/40">{language==='es'?'Selecciona una persona.':'Select a person.'}</div>}</section>
  </div>;
}
