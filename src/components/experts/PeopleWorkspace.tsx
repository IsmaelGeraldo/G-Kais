import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  History,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Search,
  UserRound,
  Users
} from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';
import { subscribeExpertPeople, type ExpertPerson } from '../../services/expertsAcquisition';
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
  const es: Record<ExpertPerson['currentStage'], string> = {
    lead: 'Lead', webinar: 'Webinar', student: 'Alumno', alumni: 'Alumni', mentoring: 'Mentoría 1:1'
  };
  const en: Record<ExpertPerson['currentStage'], string> = {
    lead: 'Lead', webinar: 'Webinar', student: 'Student', alumni: 'Alumni', mentoring: '1:1 mentoring'
  };
  return (language === 'es' ? es : en)[stage];
}

function memoryText(person: ExpertPerson, language: Language): string {
  const memory = person.outcomeMemory || {};
  const status = typeof memory.lastWebinarStatus === 'string' ? memory.lastWebinarStatus : '';
  const purchased = memory.lastWebinarPurchased === true;
  const interest = typeof memory.lastWebinarInterest === 'string' ? memory.lastWebinarInterest : '';
  const followUp = typeof memory.webinarFollowUpStatus === 'string' ? memory.webinarFollowUpStatus : '';
  const nextAction = typeof memory.nextActionLabel === 'string' ? memory.nextActionLabel : '';
  if (nextAction) return language === 'es' ? `Próxima acción: ${nextAction}` : `Next action: ${nextAction}`;
  if (purchased) return language === 'es' ? 'Compra registrada después del último webinar.' : 'Purchase recorded after the last webinar.';
  if (followUp === 'created') return language === 'es' ? 'Seguimiento creado y pendiente.' : 'Follow-up created and pending.';
  if (followUp === 'completed') return language === 'es' ? 'Seguimiento completado.' : 'Follow-up completed.';
  if (status) return `${language === 'es' ? 'Último webinar' : 'Last webinar'}: ${status}${interest && interest !== 'unknown' ? ` · ${language === 'es' ? 'interés' : 'interest'} ${interest}` : ''}`;
  return language === 'es' ? 'Sin señales recientes registradas.' : 'No recent signals recorded.';
}

function memberLabel(member: WorkspaceMember) {
  return member.displayName || member.email || member.uid;
}

function formatDateTime(value: string, language: Language): string {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === 'es' ? 'es-CL' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
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
    'webinar.followup_created': ['Seguimiento creado', 'Follow-up created'],
    'webinar.followup_completed': ['Seguimiento completado', 'Follow-up completed'],
    'webinar.enrollment_task_created': ['Integración a formación creada', 'Program enrollment created'],
    'webinar.enrollment_task_completed': ['Integración a formación completada', 'Program enrollment completed'],
    'person.action_created': ['Acción creada desde Personas', 'Action created from People'],
    'task.completed': ['Acción completada', 'Action completed']
  };
  const pair = labels[event.type];
  return pair ? (language === 'es' ? pair[0] : pair[1]) : event.type.replaceAll('.', ' · ');
}

function dueText(task: PersonWorkTask, language: Language): string {
  if (!task.dueDate) return language === 'es' ? 'Sin fecha límite' : 'No due date';
  const value = `${task.dueDate}T${task.dueTime || '12:00'}:00`;
  return formatDateTime(value, language);
}

type DetailTab = 'summary' | 'action' | 'history';

export function PeopleWorkspace({ language }: { language: Language }) {
  const [people, setPeople] = useState<ExpertPerson[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [currentUid, setCurrentUid] = useState('');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<DetailTab>('summary');
  const [history, setHistory] = useState<PersonHistorySnapshot>({ events: [], tasks: [] });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [savingAction, setSavingAction] = useState(false);

  const [actionTitle, setActionTitle] = useState('');
  const [actionType, setActionType] = useState<PersonActionType>('whatsapp');
  const [actionAssigneeUid, setActionAssigneeUid] = useState('');
  const [actionDate, setActionDate] = useState('');
  const [actionTime, setActionTime] = useState('');
  const [actionNote, setActionNote] = useState('');

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    void subscribeExpertPeople((next) => {
      setPeople(next);
      setLoading(false);
      setSelectedId((current) => current || next[0]?.id || '');
    }).then((stop) => { unsubscribe = stop; }).catch(() => setLoading(false));
    void loadExpertWorkspaceTeam().then((team) => {
      const active = team.members.filter((member) => member.status === 'active');
      setMembers(active);
      setCurrentUid(team.currentUid);
      setActionAssigneeUid(team.currentUid);
    }).catch(() => {});
    return () => unsubscribe?.();
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return people;
    return people.filter((person) => [
      person.name,
      person.email,
      person.phone,
      person.latestSource,
      person.firstSource,
      person.currentStage
    ].some((value) => value.toLowerCase().includes(term)));
  }, [people, query]);

  const selected = filtered.find((person) => person.id === selectedId)
    || people.find((person) => person.id === selectedId && !query.trim())
    || filtered[0]
    || null;

  useEffect(() => {
    if (!selected?.id) {
      setHistory({ events: [], tasks: [] });
      return;
    }
    let stop: (() => void) | undefined;
    setHistoryLoading(true);
    void subscribePersonHistory(selected.id, (next) => {
      setHistory(next);
      setHistoryLoading(false);
    }).then((unsubscribe) => { stop = unsubscribe; }).catch(() => setHistoryLoading(false));
    return () => stop?.();
  }, [selected?.id]);

  const counts = useMemo(() => ({
    total: people.length,
    webinar: people.filter((person) => person.currentStage === 'webinar').length,
    student: people.filter((person) => person.currentStage === 'student' || person.currentStage === 'alumni').length,
    mentoring: people.filter((person) => person.currentStage === 'mentoring').length
  }), [people]);

  const resetAction = () => {
    setActionTitle('');
    setActionType('whatsapp');
    setActionAssigneeUid(currentUid);
    setActionDate('');
    setActionTime('');
    setActionNote('');
  };

  const createAction = async () => {
    if (!selected) return;
    if (!actionTitle.trim()) {
      setMessage(language === 'es' ? 'Indica qué acción debe realizarse.' : 'Describe the action to perform.');
      return;
    }
    const assignee = members.find((member) => member.uid === actionAssigneeUid)
      || members.find((member) => member.uid === currentUid)
      || members[0];
    if (!assignee) {
      setMessage(language === 'es' ? 'No hay un responsable disponible.' : 'No assignee is available.');
      return;
    }

    setSavingAction(true);
    setMessage('');
    try {
      await createPersonWorkAction({
        person: selected,
        assignee,
        title: actionTitle,
        type: actionType,
        dueDate: actionDate,
        dueTime: actionTime,
        note: actionNote
      });
      setMessage(language === 'es'
        ? `Acción creada en Trabajo prioritario · ${memberLabel(assignee)}`
        : `Action created in Priority Work · ${memberLabel(assignee)}`);
      resetAction();
      setTab('history');
    } catch {
      setMessage(language === 'es' ? 'No se pudo crear la acción.' : 'Could not create the action.');
    } finally {
      setSavingAction(false);
    }
  };

  const timeline = useMemo(() => {
    const taskItems = history.tasks.map((task) => ({
      key: `task-${task.id}`,
      date: task.completedAt || task.createdAt,
      kind: 'task' as const,
      task
    }));
    const eventItems = history.events.map((event) => ({
      key: `event-${event.id}`,
      date: event.occurredAt,
      kind: 'event' as const,
      event
    }));
    return [...taskItems, ...eventItems]
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 80);
  }, [history]);

  return <div className="space-y-5">
    <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">PEOPLE</p>
          <h3 className="mt-2 text-2xl font-semibold">{language === 'es' ? 'Una persona, una sola historia' : 'One person, one continuous history'}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/50">{language === 'es' ? 'Aquí vive la identidad continua de cada relación. Lead, webinar, alumno y mentoría no crean personas distintas.' : 'This is the continuous identity layer. Lead, webinar, student and mentoring do not create separate people.'}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[['Total', counts.total], [language === 'es' ? 'Webinar' : 'Webinar', counts.webinar], [language === 'es' ? 'Alumnos' : 'Students', counts.student], [language === 'es' ? 'Mentoría' : 'Mentoring', counts.mentoring]].map(([label, value]) => <div key={String(label)} className="min-w-[90px] rounded-xl bg-[#F7F7F5] px-3 py-2.5"><p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-black/35">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p></div>)}
        </div>
      </div>
    </section>

    <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="overflow-hidden rounded-2xl border border-black/10 bg-white">
        <div className="flex flex-col gap-3 border-b border-black/7 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2"><Users className="h-4 w-4 text-[#0A3F4D]" /><p className="text-sm font-semibold">{language === 'es' ? 'Personas' : 'People'}</p><span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold text-black/40">{filtered.length}</span></div>
          <label className="relative block sm:w-[340px]"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={language === 'es' ? 'Buscar por nombre, email o teléfono…' : 'Search by name, email or phone…'} className="w-full rounded-xl border border-black/10 bg-[#FAFAF8] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-black/20" /></label>
        </div>
        <div className="divide-y divide-black/5">
          {filtered.map((person) => <button key={person.id} type="button" onClick={() => { setSelectedId(person.id); setTab('summary'); }} className={`grid w-full gap-2 px-4 py-4 text-left transition md:grid-cols-[minmax(220px,1fr)_140px_180px] md:items-center ${selected?.id === person.id ? 'bg-[#F7F7F5]' : 'hover:bg-black/[0.015]'}`}>
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{person.name}</p><p className="mt-1 truncate text-xs text-black/45">{person.email || person.phone || '—'}</p></div>
            <span className="w-fit rounded-full bg-[#0A3F4D]/8 px-2.5 py-1 text-[10px] font-semibold text-[#0A3F4D]">{stageLabel(person.currentStage, language)}</span>
            <p className="truncate text-xs text-black/45">{person.latestSource || person.firstSource || (language === 'es' ? 'Sin origen' : 'No source')}</p>
          </button>)}
          {!loading && filtered.length === 0 && <div className="p-10 text-center text-sm text-black/40">{language === 'es' ? 'No hay personas que coincidan con la búsqueda.' : 'No people match your search.'}</div>}
          {loading && <div className="p-10 text-center text-sm text-black/40">{language === 'es' ? 'Cargando personas…' : 'Loading people…'}</div>}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-black/10 bg-white">
        {selected ? <>
          <div className="p-5 pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#111413] text-white"><UserRound className="h-5 w-5" /></div><div className="min-w-0"><p className="truncate text-lg font-semibold">{selected.name}</p><p className="text-xs text-black/40">{stageLabel(selected.currentStage, language)} · {selected.latestSource || selected.firstSource || (language === 'es' ? 'sin origen' : 'no source')}</p></div></div>
              <button type="button" onClick={() => setTab('action')} className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#111413] px-3 py-2 text-[10px] font-semibold text-white"><Plus className="h-3.5 w-3.5" />{language === 'es' ? 'Crear acción' : 'Create action'}</button>
            </div>
            <div className="mt-4 flex gap-1 rounded-xl bg-[#F7F7F5] p-1">
              {([
                ['summary', language === 'es' ? 'Resumen' : 'Summary'],
                ['action', language === 'es' ? 'Nueva acción' : 'New action'],
                ['history', language === 'es' ? 'Historial' : 'History']
              ] as [DetailTab, string][]).map(([id, label]) => <button key={id} type="button" onClick={() => setTab(id)} className={`flex-1 rounded-lg px-2.5 py-2 text-[10px] font-semibold ${tab === id ? 'bg-white text-black shadow-sm' : 'text-black/45'}`}>{label}</button>)}
            </div>
          </div>

          {tab === 'summary' && <div className="space-y-4 border-t border-black/6 p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-black/7 p-3"><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-black/35">EMAIL</p><p className="mt-1 truncate text-sm">{selected.email || '—'}</p></div>
              <div className="rounded-xl border border-black/7 p-3"><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-black/35">{language === 'es' ? 'TELÉFONO' : 'PHONE'}</p><p className="mt-1 truncate text-sm">{selected.phone || '—'}</p></div>
            </div>
            <div className="rounded-xl bg-[#F7F7F5] p-4"><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#0A3F4D]">OUTCOME MEMORY</p><p className="mt-2 text-sm leading-6 text-black/60">{memoryText(selected, language)}</p>{typeof selected.outcomeMemory.lastFollowUpResult === 'string' && selected.outcomeMemory.lastFollowUpResult && <p className="mt-2 text-xs leading-5 text-black/45">{language === 'es' ? 'Último resultado: ' : 'Latest result: '}{selected.outcomeMemory.lastFollowUpResult}</p>}</div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setTab('action')} className="rounded-xl border border-black/10 bg-white p-3 text-left"><Plus className="h-4 w-4 text-[#0A3F4D]" /><p className="mt-2 text-xs font-semibold">{language === 'es' ? 'Crear próxima acción' : 'Create next action'}</p></button>
              <button type="button" onClick={() => setTab('history')} className="rounded-xl border border-black/10 bg-white p-3 text-left"><History className="h-4 w-4 text-[#0A3F4D]" /><p className="mt-2 text-xs font-semibold">{language === 'es' ? 'Ver historial completo' : 'View full history'}</p></button>
            </div>
          </div>}

          {tab === 'action' && <div className="space-y-3 border-t border-black/6 p-5">
            <div><p className="text-xs font-semibold">{language === 'es' ? 'Crear acción para esta persona' : 'Create an action for this person'}</p><p className="mt-1 text-[11px] leading-5 text-black/40">{language === 'es' ? 'Úsalo cuando la relación se reactive: por ejemplo, quiere comprar ahora, solicita una llamada o necesita un nuevo seguimiento.' : 'Use this when the relationship reactivates: for example, they want to buy now, request a call, or need another follow-up.'}</p></div>
            <label><span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.12em] text-black/35">{language === 'es' ? 'ACCIÓN' : 'ACTION'}</span><input value={actionTitle} onChange={(event) => setActionTitle(event.target.value)} placeholder={language === 'es' ? 'Ej. Integrar a Formación Escala' : 'E.g. Enroll in Scale Program'} className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm" /></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label><span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.12em] text-black/35">{language === 'es' ? 'TIPO' : 'TYPE'}</span><select value={actionType} onChange={(event) => setActionType(event.target.value as PersonActionType)} className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm"><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="call">{language === 'es' ? 'Llamada' : 'Call'}</option><option value="meeting">{language === 'es' ? 'Reunión' : 'Meeting'}</option><option value="task">{language === 'es' ? 'Tarea interna' : 'Internal task'}</option></select></label>
              <label><span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.12em] text-black/35">{language === 'es' ? 'RESPONSABLE' : 'ASSIGNEE'}</span><select value={actionAssigneeUid} onChange={(event) => setActionAssigneeUid(event.target.value)} className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm">{members.map((member) => <option key={member.uid} value={member.uid}>{memberLabel(member)}</option>)}</select></label>
              <label><span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.12em] text-black/35">{language === 'es' ? 'FECHA' : 'DATE'}</span><input type="date" value={actionDate} onChange={(event) => setActionDate(event.target.value)} className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm" /></label>
              <label><span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.12em] text-black/35">{language === 'es' ? 'HORA' : 'TIME'}</span><input type="time" value={actionTime} onChange={(event) => setActionTime(event.target.value)} className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm" /></label>
            </div>
            <label><span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.12em] text-black/35">{language === 'es' ? 'CONTEXTO / NOTA' : 'CONTEXT / NOTE'}</span><textarea rows={3} value={actionNote} onChange={(event) => setActionNote(event.target.value)} placeholder={language === 'es' ? 'Ej. Se contactó después del webinar; ahora dispone del dinero y quiere entrar a la formación.' : 'E.g. Contacted us after the webinar; now has the budget and wants to join the program.'} className="w-full resize-none rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm" /></label>
            <div className="flex gap-2"><button type="button" disabled={savingAction} onClick={() => void createAction()} className="rounded-full bg-[#0A3F4D] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40">{savingAction ? (language === 'es' ? 'Creando…' : 'Creating…') : (language === 'es' ? 'Crear acción' : 'Create action')}</button><button type="button" onClick={resetAction} className="rounded-full border border-black/10 px-4 py-2.5 text-xs font-semibold text-black/50">{language === 'es' ? 'Limpiar' : 'Clear'}</button></div>
          </div>}

          {tab === 'history' && <div className="max-h-[620px] overflow-y-auto border-t border-black/6">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-black/6 bg-white px-5 py-3"><div className="flex items-center gap-2"><History className="h-4 w-4 text-[#0A3F4D]" /><p className="text-xs font-semibold">{language === 'es' ? 'Historial operativo' : 'Operational history'}</p></div><span className="text-[10px] text-black/35">{timeline.length}</span></div>
            {historyLoading && <div className="p-8 text-center text-sm text-black/35">{language === 'es' ? 'Cargando historial…' : 'Loading history…'}</div>}
            {!historyLoading && timeline.length === 0 && <div className="p-8 text-center text-sm text-black/35">{language === 'es' ? 'Aún no hay acciones o eventos para esta persona.' : 'No actions or events for this person yet.'}</div>}
            <div className="divide-y divide-black/5">{timeline.map((item) => item.kind === 'task' ? <TaskHistoryRow key={item.key} task={item.task} language={language} /> : <EventHistoryRow key={item.key} event={item.event} language={language} />)}</div>
          </div>}
        </> : <div className="grid min-h-[300px] place-items-center text-sm text-black/35">{language === 'es' ? 'Selecciona una persona.' : 'Select a person.'}</div>}
      </section>
    </div>

    {message && <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl bg-[#111413] px-4 py-3 text-xs font-medium text-white shadow-xl">{message}</div>}
  </div>;
}

function TaskHistoryRow({ task, language }: { task: PersonWorkTask; language: Language }) {
  const icon = task.type === 'email' ? Mail : task.type === 'whatsapp' ? MessageCircle : task.type === 'call' ? Phone : CalendarClock;
  const Icon = icon;
  const done = task.status === 'done';
  return <div className="p-4">
    <div className="flex items-start gap-3">
      <div className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${done ? 'bg-[#0A3F4D]/8 text-[#0A3F4D]' : 'bg-black/5 text-black/45'}`}>{done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}</div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{task.title}</p><span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-black/35">{done ? (language === 'es' ? 'Completada' : 'Done') : task.status === 'in-progress' ? (language === 'es' ? 'En curso' : 'In progress') : (language === 'es' ? 'Pendiente' : 'Pending')}</span></div>
        <p className="mt-1 text-[11px] text-black/45">{taskTypeLabel(task.type, language)} · {language === 'es' ? 'Responsable' : 'Assignee'}: {task.assignedToName || '—'}</p>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-black/35"><span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{language === 'es' ? 'Creada' : 'Created'}: {formatDateTime(task.createdAt, language)}</span><span>{language === 'es' ? 'Fecha objetivo' : 'Due'}: {dueText(task, language)}</span></div>
        {task.note && <p className="mt-2 text-xs leading-5 text-black/50">{task.note}</p>}
        {task.result && <div className="mt-2 rounded-lg bg-[#F7F7F5] px-3 py-2 text-xs leading-5 text-black/60"><span className="font-semibold">{language === 'es' ? 'Resultado: ' : 'Result: '}</span>{task.result}</div>}
      </div>
    </div>
  </div>;
}

function EventHistoryRow({ event, language }: { event: PersonRelationshipEvent; language: Language }) {
  const assignedToName = typeof event.metadata.assignedToName === 'string' ? event.metadata.assignedToName : '';
  const result = typeof event.metadata.result === 'string' ? event.metadata.result : '';
  return <div className="p-4">
    <div className="flex items-start gap-3"><div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#0A3F4D]/45" /><div className="min-w-0"><p className="text-xs font-semibold">{eventLabel(event, language)}</p><p className="mt-1 text-[10px] text-black/35">{formatDateTime(event.occurredAt, language)}{assignedToName ? ` · ${language === 'es' ? 'Responsable' : 'Assignee'}: ${assignedToName}` : ''}</p>{result && <p className="mt-1 text-xs text-black/50">{language === 'es' ? 'Resultado: ' : 'Result: '}{result}</p>}</div></div>
  </div>;
}
