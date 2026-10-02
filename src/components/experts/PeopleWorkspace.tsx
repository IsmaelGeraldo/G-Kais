import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  GraduationCap,
  History,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Search,
  UserRound,
  Users,
  UsersRound,
  X
} from 'lucide-react';
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
import {
  createPersonWorkAction,
  subscribePersonHistory,
  type PersonActionType,
  type PersonHistorySnapshot,
  type PersonRelationshipEvent,
  type PersonWorkTask
} from '../../services/expertsPeopleOperations';
import { loadExpertWorkspaceTeam, type WorkspaceMember } from '../../services/expertsWorkspaceCore';

function stageLabel(stage: ExpertPerson['currentStage'], language: Language) {
  const es: Record<ExpertPerson['currentStage'], string> = { lead: 'Lead', webinar: 'Webinar', student: 'Alumno', alumni: 'Alumni', mentoring: 'Mentoría 1:1' };
  const en: Record<ExpertPerson['currentStage'], string> = { lead: 'Lead', webinar: 'Webinar', student: 'Student', alumni: 'Alumni', mentoring: '1:1 mentoring' };
  return (language === 'es' ? es : en)[stage];
}

function memoryText(person: ExpertPerson, language: Language): string {
  const memory = person.outcomeMemory || {};
  const nextAction = typeof memory.nextActionLabel === 'string' ? memory.nextActionLabel : '';
  const formationStatus = typeof memory.currentEnrollmentStatus === 'string' ? memory.currentEnrollmentStatus : '';
  const formationProgress = typeof memory.currentFormationProgress === 'number' ? memory.currentFormationProgress : null;
  const followUp = typeof memory.nurtureStatus === 'string' ? memory.nurtureStatus : '';
  const purchased = memory.lastWebinarPurchased === true;
  if (nextAction) return language === 'es' ? `Próxima acción: ${nextAction}` : `Next action: ${nextAction}`;
  if (formationStatus) return `${language === 'es' ? 'Formación' : 'Program'}: ${formationStatus}${formationProgress !== null ? ` · ${formationProgress}%` : ''}`;
  if (followUp === 'active') return language === 'es' ? 'Relación activa en seguimiento.' : 'Relationship active in follow-up.';
  if (purchased) return language === 'es' ? 'Compra registrada y pendiente de continuidad operativa.' : 'Purchase recorded and awaiting operational continuation.';
  return language === 'es' ? 'Sin señales recientes registradas.' : 'No recent signals recorded.';
}

function memberLabel(member: WorkspaceMember) {
  return member.displayName || member.email || member.uid;
}

function formatDateTime(value: string, language: Language): string {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === 'es' ? 'es-CL' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function taskTypeLabel(type: PersonActionType, language: Language) {
  if (type === 'whatsapp') return 'WhatsApp';
  if (type === 'email') return 'Email';
  if (type === 'call') return language === 'es' ? 'Llamada' : 'Call';
  if (type === 'meeting') return language === 'es' ? 'Reunión' : 'Meeting';
  return language === 'es' ? 'Tarea interna' : 'Internal task';
}

function eventLabel(event: PersonRelationshipEvent, language: Language): string {
  const labels: Record<string, [string, string]> = {
    'webinar.registered': ['Se registró en un webinar', 'Registered for a webinar'],
    'webinar.attended': ['Asistió al webinar', 'Attended the webinar'],
    'webinar.no_show': ['No asistió al webinar', 'Did not attend the webinar'],
    'webinar.purchased': ['Compra registrada', 'Purchase recorded'],
    'formation.enrolled': ['Ingresó a una formación', 'Enrolled in a program'],
    'formation.completed': ['Completó una formación', 'Completed a program'],
    'formation.progress_updated': ['Progreso de formación actualizado', 'Program progress updated'],
    'person.action_created': ['Acción creada desde su ficha', 'Action created from person record'],
    'interaction.waiting_reply': ['Contacto enviado · esperando respuesta', 'Contact sent · waiting for reply'],
    'interaction.reply_received': ['Respuesta recibida', 'Reply received'],
    'nurture.activated': ['Entró a seguimiento', 'Entered follow-up'],
    'nurture.reviewed': ['Seguimiento revisado', 'Follow-up reviewed'],
    'task.completed': ['Acción completada', 'Action completed']
  };
  const pair = labels[event.type];
  return pair ? (language === 'es' ? pair[0] : pair[1]) : event.type.replaceAll('.', ' · ');
}

function dueText(task: PersonWorkTask, language: Language): string {
  if (!task.dueDate) return language === 'es' ? 'Sin fecha límite' : 'No due date';
  return formatDateTime(`${task.dueDate}T${task.dueTime || '12:00'}:00`, language);
}

type DetailTab = 'summary' | 'action';

function navigateWorkspace(view: string, personId: string) {
  const params = new URLSearchParams();
  params.set('view', view);
  params.set('person', personId);
  window.history.pushState({}, '', `/workspace/experts?${params.toString()}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function PeopleWorkspace({ language }: { language: Language }) {
  const requestedPersonId = new URLSearchParams(window.location.search).get('person') || '';
  const [people, setPeople] = useState<ExpertPerson[]>([]);
  const [formations, setFormations] = useState<ExpertFormation[]>([]);
  const [cohorts, setCohorts] = useState<ExpertCohort[]>([]);
  const [enrollments, setEnrollments] = useState<ExpertEnrollment[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [currentUid, setCurrentUid] = useState('');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>(requestedPersonId);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<DetailTab>('summary');
  const [history, setHistory] = useState<PersonHistorySnapshot>({ events: [], tasks: [] });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [savingAction, setSavingAction] = useState(false);
  const [showFormation, setShowFormation] = useState(false);
  const [formationId, setFormationId] = useState('');
  const [cohortId, setCohortId] = useState('');
  const [enrolling, setEnrolling] = useState(false);

  const [actionTitle, setActionTitle] = useState('');
  const [actionType, setActionType] = useState<PersonActionType>('whatsapp');
  const [actionAssigneeUid, setActionAssigneeUid] = useState('');
  const [actionDate, setActionDate] = useState('');
  const [actionTime, setActionTime] = useState('');
  const [actionNote, setActionNote] = useState('');

  useEffect(() => {
    let stopPeople: (() => void) | undefined;
    let stopFormations: (() => void) | undefined;
    let stopCohorts: (() => void) | undefined;
    let stopEnrollments: (() => void) | undefined;
    void subscribeExpertPeople((next) => {
      setPeople(next);
      setLoading(false);
      setSelectedId((current) => {
        if (current && next.some((person) => person.id === current)) return current;
        if (requestedPersonId && next.some((person) => person.id === requestedPersonId)) return requestedPersonId;
        return next[0]?.id || '';
      });
    }).then((stop) => { stopPeople = stop; }).catch(() => setLoading(false));
    void subscribeExpertFormations(setFormations).then((stop) => { stopFormations = stop; }).catch(() => {});
    void subscribeExpertCohorts(setCohorts).then((stop) => { stopCohorts = stop; }).catch(() => {});
    void subscribeExpertEnrollments(setEnrollments).then((stop) => { stopEnrollments = stop; }).catch(() => {});
    void loadExpertWorkspaceTeam().then((team) => {
      const active = team.members.filter((member) => member.status === 'active');
      setMembers(active);
      setCurrentUid(team.currentUid);
      setActionAssigneeUid(team.currentUid);
    }).catch(() => {});
    return () => { stopPeople?.(); stopFormations?.(); stopCohorts?.(); stopEnrollments?.(); };
  }, [requestedPersonId]);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(''), 4000);
    return () => window.clearTimeout(timer);
  }, [message]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return people;
    return people.filter((person) => [person.name, person.email, person.phone].some((value) => value.toLowerCase().includes(term)));
  }, [people, query]);

  const selected = filtered.find((person) => person.id === selectedId)
    || people.find((person) => person.id === selectedId && !query.trim())
    || filtered[0]
    || null;

  useEffect(() => {
    if (!selected?.id) { setHistory({ events: [], tasks: [] }); return; }
    let stop: (() => void) | undefined;
    setHistoryLoading(true);
    void subscribePersonHistory(selected.id, (next) => { setHistory(next); setHistoryLoading(false); })
      .then((unsubscribe) => { stop = unsubscribe; }).catch(() => setHistoryLoading(false));
    return () => stop?.();
  }, [selected?.id]);

  const activeFormations = useMemo(() => formations.filter((item) => item.status === 'active'), [formations]);
  const availableCohorts = useMemo(() => cohorts.filter((item) => item.formationId === formationId && (item.status === 'active' || item.status === 'planned')), [cohorts, formationId]);
  const selectedEnrollments = useMemo(() => selected ? enrollments.filter((item) => item.personId === selected.id) : [], [enrollments, selected]);

  useEffect(() => {
    if (!showFormation) return;
    if (!formationId || !activeFormations.some((item) => item.id === formationId)) setFormationId(activeFormations[0]?.id || '');
  }, [activeFormations, formationId, showFormation]);

  useEffect(() => {
    if (!availableCohorts.some((item) => item.id === cohortId)) setCohortId(availableCohorts.find((item) => item.status === 'active')?.id || availableCohorts[0]?.id || '');
  }, [availableCohorts, cohortId]);

  const counts = useMemo(() => ({
    total: people.length,
    webinar: people.filter((person) => person.currentStage === 'webinar').length,
    student: people.filter((person) => person.currentStage === 'student' || person.currentStage === 'alumni').length,
    mentoring: people.filter((person) => person.currentStage === 'mentoring').length
  }), [people]);

  const resetAction = () => {
    setActionTitle(''); setActionType('whatsapp'); setActionAssigneeUid(currentUid); setActionDate(''); setActionTime(''); setActionNote('');
  };

  const createAction = async () => {
    if (!selected || !actionTitle.trim()) { setMessage(language === 'es' ? 'Indica qué acción debe realizarse.' : 'Describe the action to perform.'); return; }
    const assignee = members.find((member) => member.uid === actionAssigneeUid) || members.find((member) => member.uid === currentUid) || members[0];
    if (!assignee) return;
    setSavingAction(true);
    try {
      await createPersonWorkAction({ person: selected, assignee, title: actionTitle, type: actionType, dueDate: actionDate, dueTime: actionTime, note: actionNote });
      setMessage(language === 'es' ? `Acción creada en Trabajo prioritario · ${memberLabel(assignee)}` : `Action created in Priority Work · ${memberLabel(assignee)}`);
      resetAction(); setTab('summary');
    } catch { setMessage(language === 'es' ? 'No se pudo crear la acción.' : 'Could not create the action.'); }
    finally { setSavingAction(false); }
  };

  const integrateFormation = async () => {
    if (!selected || !formationId || !cohortId) { setMessage(language === 'es' ? 'Selecciona formación y cohorte.' : 'Select formation and cohort.'); return; }
    const already = selectedEnrollments.some((item) => item.formationId === formationId && item.cohortId === cohortId && item.status !== 'withdrawn' && item.status !== 'refunded');
    if (already) { setMessage(language === 'es' ? 'Esta persona ya pertenece a esa cohorte.' : 'This person already belongs to that cohort.'); return; }
    setEnrolling(true);
    try {
      await enrollExpertPerson({ personId: selected.id, formationId, cohortId, status: 'active', progress: 0 });
      const formation = formations.find((item) => item.id === formationId);
      const cohort = cohorts.find((item) => item.id === cohortId);
      setMessage(language === 'es' ? `${selected.name} integrado en ${formation?.title || 'formación'} · ${cohort?.title || 'cohorte'}.` : `${selected.name} enrolled in ${formation?.title || 'program'} · ${cohort?.title || 'cohort'}.`);
      setShowFormation(false);
    } catch { setMessage(language === 'es' ? 'No se pudo integrar a la formación.' : 'Could not enroll in the program.'); }
    finally { setEnrolling(false); }
  };

  const timeline = useMemo(() => {
    const taskItems = history.tasks.map((task) => ({ key: `task-${task.id}`, date: task.completedAt || task.createdAt, kind: 'task' as const, task }));
    const eventItems = history.events.map((event) => ({ key: `event-${event.id}`, date: event.occurredAt, kind: 'event' as const, event }));
    return [...taskItems, ...eventItems].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 100);
  }, [history]);

  return <div className="space-y-5">
    <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'PERSONAS' : 'PEOPLE'}</p><h3 className="mt-2 text-2xl font-semibold">{language === 'es' ? 'Una persona, una sola historia' : 'One person, one continuous history'}</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-black/50">{language === 'es' ? 'Busca la identidad una sola vez y continúa su relación sin duplicarla entre webinar, formación, seguimiento o mentoría.' : 'Find the identity once and continue the relationship without duplicating it across webinar, program, follow-up or mentoring.'}</p></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[['Total', counts.total], ['Webinar', counts.webinar], [language === 'es' ? 'Alumnos' : 'Students', counts.student], [language === 'es' ? 'Mentoría' : 'Mentoring', counts.mentoring]].map(([label, value]) => <div key={String(label)} className="min-w-[90px] rounded-xl bg-[#F7F7F5] px-3 py-2.5"><p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-black/35">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p></div>)}</div></div>
    </section>

    <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
      <section className="overflow-hidden rounded-2xl border border-black/10 bg-white">
        <div className="flex flex-col gap-3 border-b border-black/7 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-[#0A3F4D]" /><p className="text-sm font-semibold">{language === 'es' ? 'Directorio de personas' : 'People directory'}</p></div><label className="relative block sm:w-[340px]"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={language === 'es' ? 'Buscar por nombre, email o teléfono…' : 'Search by name, email or phone…'} className="w-full rounded-xl border border-black/10 bg-[#FAFAF8] py-2.5 pl-9 pr-3 text-sm" /></label></div>
        <div className="max-h-[720px] divide-y divide-black/5 overflow-y-auto">{filtered.map((person) => <button key={person.id} type="button" onClick={() => { setSelectedId(person.id); setTab('summary'); setShowFormation(false); }} className={`grid w-full gap-2 px-4 py-4 text-left md:grid-cols-[minmax(220px,1fr)_140px_180px] md:items-center ${selected?.id === person.id ? 'bg-[#F7F7F5]' : 'hover:bg-black/[0.015]'}`}><div className="min-w-0"><p className="truncate text-sm font-semibold">{person.name}</p><p className="mt-1 truncate text-xs text-black/45">{person.email || person.phone || '—'}</p></div><span className="w-fit rounded-full bg-[#0A3F4D]/8 px-2.5 py-1 text-[10px] font-semibold text-[#0A3F4D]">{stageLabel(person.currentStage, language)}</span><p className="truncate text-xs text-black/45">{person.latestSource || person.firstSource || (language === 'es' ? 'Sin origen' : 'No source')}</p></button>)}{!loading && filtered.length === 0 && <div className="p-10 text-center text-sm text-black/40">{language === 'es' ? 'No hay coincidencias.' : 'No matches.'}</div>}</div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-black/10 bg-white">
        {selected ? <><div className="p-5 pb-3"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-full bg-[#111413] text-white"><UserRound className="h-5 w-5" /></div><div className="min-w-0"><p className="truncate text-lg font-semibold">{selected.name}</p><p className="text-xs text-black/40">{stageLabel(selected.currentStage, language)} · {selected.latestSource || selected.firstSource || '—'}</p></div></div><div className="mt-4 flex gap-1 rounded-xl bg-[#F7F7F5] p-1"><button type="button" onClick={() => setTab('summary')} className={`flex-1 rounded-lg px-2.5 py-2 text-[10px] font-semibold ${tab === 'summary' ? 'bg-white shadow-sm' : 'text-black/45'}`}>{language === 'es' ? 'Resumen' : 'Summary'}</button><button type="button" onClick={() => setTab('action')} className={`flex-1 rounded-lg px-2.5 py-2 text-[10px] font-semibold ${tab === 'action' ? 'bg-white shadow-sm' : 'text-black/45'}`}>{language === 'es' ? 'Nueva acción' : 'New action'}</button></div></div>

          {tab === 'summary' ? <div className="space-y-3 border-t border-black/6 p-4"><div className="grid gap-2 sm:grid-cols-2"><Info label="EMAIL" value={selected.email || '—'} /><Info label={language === 'es' ? 'TELÉFONO' : 'PHONE'} value={selected.phone || '—'} /></div><div className="rounded-xl bg-[#F7F7F5] p-3.5"><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#0A3F4D]">OUTCOME MEMORY</p><p className="mt-2 text-sm leading-6 text-black/60">{memoryText(selected, language)}</p></div><div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => setShowFormation(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#111413] px-4 py-3 text-xs font-semibold text-white"><GraduationCap className="h-4 w-4" />{language === 'es' ? 'Integrar a formación' : 'Enroll in program'}</button><button type="button" onClick={() => navigateWorkspace('clients', selected.id)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-3 text-xs font-semibold text-black/65"><UsersRound className="h-4 w-4" />{language === 'es' ? 'Iniciar Cliente 1:1' : 'Start 1:1 Client'}</button></div>

            {showFormation && <div className="rounded-xl border border-black/10 bg-white p-4"><div className="flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0A3F4D]">{language === 'es' ? 'INTEGRAR SIN SALIR DE PERSONAS' : 'ENROLL WITHOUT LEAVING PEOPLE'}</p><p className="mt-1 text-xs text-black/45">{language === 'es' ? 'Se mantiene el mismo personId y todo su historial.' : 'The same personId and history are preserved.'}</p></div><button type="button" onClick={() => setShowFormation(false)} className="grid h-8 w-8 place-items-center rounded-full border border-black/10"><X className="h-4 w-4" /></button></div><div className="mt-3 grid gap-2 sm:grid-cols-2"><select value={formationId} onChange={(e) => setFormationId(e.target.value)} className="rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm"><option value="">{language === 'es' ? 'Seleccionar formación' : 'Select program'}</option>{activeFormations.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select><select value={cohortId} onChange={(e) => setCohortId(e.target.value)} className="rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm"><option value="">{language === 'es' ? 'Seleccionar cohorte' : 'Select cohort'}</option>{availableCohorts.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></div><div className="mt-3 flex justify-end"><button type="button" disabled={enrolling || !formationId || !cohortId} onClick={() => void integrateFormation()} className="inline-flex items-center gap-1.5 rounded-full bg-[#111413] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40"><CheckCircle2 className="h-3.5 w-3.5" />{enrolling ? (language === 'es' ? 'Integrando…' : 'Enrolling…') : (language === 'es' ? 'Integrar persona' : 'Enroll person')}</button></div></div>}

            {selectedEnrollments.length > 0 && <div className="rounded-xl border border-black/7 p-3"><p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-black/35">{language === 'es' ? 'FORMACIONES EN HISTORIAL' : 'PROGRAM HISTORY'}</p><div className="mt-2 space-y-1.5">{selectedEnrollments.map((item) => { const formation = formations.find((f) => f.id === item.formationId); const cohort = cohorts.find((c) => c.id === item.cohortId); return <p key={item.id} className="text-xs text-black/55">{formation?.title || item.formationId} · {cohort?.title || item.cohortId} · {item.status} · {item.progress}%</p>; })}</div></div>}
          </div> : <div className="space-y-3 border-t border-black/6 p-4"><label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'ACCIÓN' : 'ACTION'}</span><input value={actionTitle} onChange={(e) => setActionTitle(e.target.value)} className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm" /></label><div className="grid gap-2 sm:grid-cols-2"><select value={actionType} onChange={(e) => setActionType(e.target.value as PersonActionType)} className="rounded-xl border border-black/10 px-3 py-2.5 text-sm"><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="call">{language === 'es' ? 'Llamada' : 'Call'}</option><option value="meeting">{language === 'es' ? 'Reunión' : 'Meeting'}</option><option value="task">{language === 'es' ? 'Tarea interna' : 'Internal task'}</option></select><select value={actionAssigneeUid} onChange={(e) => setActionAssigneeUid(e.target.value)} className="rounded-xl border border-black/10 px-3 py-2.5 text-sm">{members.map((member) => <option key={member.uid} value={member.uid}>{memberLabel(member)}</option>)}</select><input type="date" value={actionDate} onChange={(e) => setActionDate(e.target.value)} className="rounded-xl border border-black/10 px-3 py-2.5 text-sm" /><input type="time" value={actionTime} onChange={(e) => setActionTime(e.target.value)} className="rounded-xl border border-black/10 px-3 py-2.5 text-sm" /></div><textarea value={actionNote} onChange={(e) => setActionNote(e.target.value)} rows={2} placeholder={language === 'es' ? 'Contexto / nota' : 'Context / note'} className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm" /><div className="flex justify-end"><button type="button" disabled={savingAction} onClick={() => void createAction()} className="inline-flex items-center gap-1.5 rounded-full bg-[#111413] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40"><Plus className="h-3.5 w-3.5" />{savingAction ? (language === 'es' ? 'Creando…' : 'Creating…') : (language === 'es' ? 'Crear acción' : 'Create action')}</button></div></div>}

          <div className="border-t border-black/6"><div className="flex items-center justify-between border-b border-black/6 bg-[#FAFAF8] px-4 py-3"><div className="flex items-center gap-2"><History className="h-4 w-4 text-[#0A3F4D]" /><p className="text-xs font-semibold">{language === 'es' ? 'Historial' : 'History'}</p></div><span className="text-[10px] text-black/35">{timeline.length}</span></div><div className="max-h-[330px] overflow-y-auto">{historyLoading && <div className="p-8 text-center text-sm text-black/35">{language === 'es' ? 'Cargando historial…' : 'Loading history…'}</div>}<div className="divide-y divide-black/5">{!historyLoading && timeline.map((item) => item.kind === 'task' ? <TaskHistoryRow key={item.key} task={item.task} language={language} /> : <EventHistoryRow key={item.key} event={item.event} language={language} />)}</div></div></div>
        </> : <div className="grid min-h-[320px] place-items-center p-6 text-sm text-black/35">{language === 'es' ? 'Selecciona una persona.' : 'Select a person.'}</div>}
      </section>
    </div>
    {message && <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl bg-[#111413] px-4 py-3 text-xs font-medium text-white shadow-xl">{message}</div>}
  </div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-black/7 p-3"><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-black/35">{label}</p><p className="mt-1 truncate text-sm">{value}</p></div>;
}

function TaskHistoryRow({ task, language }: { task: PersonWorkTask; language: Language }) {
  const Icon = task.type === 'email' ? Mail : task.type === 'whatsapp' ? MessageCircle : task.type === 'call' ? Phone : CalendarClock;
  const done = task.status === 'done';
  return <div className="p-4"><div className="flex items-start gap-3"><div className={`mt-0.5 grid h-8 w-8 place-items-center rounded-full ${done ? 'bg-[#0A3F4D]/8 text-[#0A3F4D]' : 'bg-black/5 text-black/45'}`}>{done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{task.title}</p><span className="text-[9px] font-semibold uppercase text-black/35">{done ? (language === 'es' ? 'Completada' : 'Done') : (language === 'es' ? 'Pendiente' : 'Pending')}</span></div><p className="mt-1 text-[11px] text-black/45">{taskTypeLabel(task.type, language)} · {task.assignedToName || '—'}</p><p className="mt-1 text-[10px] text-black/35"><Clock3 className="mr-1 inline h-3 w-3" />{dueText(task, language)}</p>{task.note && <p className="mt-2 text-xs text-black/50">{task.note}</p>}{task.result && <p className="mt-2 rounded-lg bg-[#F7F7F5] px-3 py-2 text-xs text-black/60">{task.result}</p>}</div></div></div>;
}

function EventHistoryRow({ event, language }: { event: PersonRelationshipEvent; language: Language }) {
  const result = typeof event.metadata.result === 'string' ? event.metadata.result : '';
  return <div className="p-4"><div className="flex items-start gap-3"><div className="mt-1 h-2.5 w-2.5 rounded-full bg-[#0A3F4D]/45" /><div><p className="text-xs font-semibold">{eventLabel(event, language)}</p><p className="mt-1 text-[10px] text-black/35">{formatDateTime(event.occurredAt, language)}</p>{result && <p className="mt-1 text-xs text-black/50">{result}</p>}</div></div></div>;
}
