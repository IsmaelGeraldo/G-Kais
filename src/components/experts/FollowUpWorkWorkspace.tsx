import React, { useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Inbox,
  ListTodo,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  RotateCcw,
  Search,
  Trash2,
  UserRoundCheck
} from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';
import { subscribeExpertPeople, type ExpertPerson } from '../../services/expertsAcquisition';
import { hydrateExpertsTaskMemory, persistExpertWorkTask } from '../../services/expertsTaskMemory';
import {
  appendExpertAuditLog,
  appendExpertRelationshipEvent,
  loadExpertWorkspaceTeam,
  type WorkspaceMember,
  type WorkspaceTeamState
} from '../../services/expertsWorkspaceCore';
import {
  getWorkPriority,
  loadTasks,
  saveTasks,
  WORKSPACE_STATE_EVENT,
  type WorkActionType,
  type WorkTask
} from './workspaceState';
import { FollowUpTaskPanel } from './FollowUpTaskPanel';

type InteractionState = 'queue' | 'waiting-reply' | 'reply-received';
type Lane = 'queue' | 'waiting' | 'replied';

type FollowTask = WorkTask & {
  personId?: string;
  sourceId?: string;
  sourceRegistrationId?: string;
  sourceActionKind?: string;
  assignedToUid?: string;
  assignedToName?: string;
  createdByUid?: string;
  completedByUid?: string;
  workstream?: string;
  interactionState?: InteractionState;
  awaitingReplySince?: string;
  replyReceivedAt?: string;
  lastInteractionNote?: string;
};

function isFollowUpTask(task: FollowTask) {
  return task.workstream === 'follow-up' || task.sourceActionKind === 'continuity' || (task.source === 'webinar' && task.sourceActionKind === 'follow-up');
}

function stateOf(task: FollowTask): InteractionState {
  return task.interactionState === 'waiting-reply' || task.interactionState === 'reply-received' ? task.interactionState : 'queue';
}

function asyncChannel(task: FollowTask) {
  return task.type === 'whatsapp' || task.type === 'email';
}

function actionLabel(type: WorkActionType, language: Language) {
  if (type === 'email') return 'Email';
  if (type === 'whatsapp') return 'WhatsApp';
  if (type === 'call') return language === 'es' ? 'Llamada' : 'Call';
  if (type === 'meeting') return language === 'es' ? 'Reunión' : 'Meeting';
  return language === 'es' ? 'Tarea interna' : 'Internal task';
}

function ActionIcon({ type }: { type: WorkActionType }) {
  if (type === 'email') return <Mail className="h-4 w-4" />;
  if (type === 'whatsapp') return <MessageCircle className="h-4 w-4" />;
  if (type === 'call') return <Phone className="h-4 w-4" />;
  return <ListTodo className="h-4 w-4" />;
}

function dueLabel(task: FollowTask, language: Language) {
  if (!task.dueDate) return language === 'es' ? 'Sin fecha' : 'No date';
  const date = new Date(`${task.dueDate}T${task.dueTime || '12:00'}:00`);
  if (!Number.isFinite(date.getTime())) return task.dueDate;
  const label = new Intl.DateTimeFormat(language === 'es' ? 'es-CL' : 'en-US', { day: '2-digit', month: 'short' }).format(date);
  return `${label}${task.dueTime ? ` · ${task.dueTime}` : ''}`;
}

function priorityClass(task: FollowTask) {
  const priority = getWorkPriority(task);
  if (priority === 'high') return 'bg-[#A23A32]/9 text-[#8D332C]';
  if (priority === 'medium') return 'bg-[#A46F16]/10 text-[#82570F]';
  return 'bg-[#0A3F4D]/8 text-[#0A3F4D]';
}

export function FollowUpWorkWorkspace({ language }: { language: Language }) {
  const [tasks, setTasks] = useState<FollowTask[]>(() => loadTasks() as FollowTask[]);
  const [people, setPeople] = useState<ExpertPerson[]>([]);
  const [team, setTeam] = useState<WorkspaceTeamState | null>(null);
  const [lane, setLane] = useState<Lane>('queue');
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState('');
  const [contactNote, setContactNote] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editResult, setEditResult] = useState('');
  const [editType, setEditType] = useState<WorkActionType>('task');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');

  useEffect(() => {
    let stopPeople: (() => void) | undefined;
    void subscribeExpertPeople(setPeople).then((stop) => { stopPeople = stop; }).catch(() => {});
    void loadExpertWorkspaceTeam().then(setTeam).catch(() => {});
    void hydrateExpertsTaskMemory().then(() => setTasks(loadTasks() as FollowTask[]));
    const refresh = () => setTasks(loadTasks() as FollowTask[]);
    window.addEventListener(WORKSPACE_STATE_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => { stopPeople?.(); window.removeEventListener(WORKSPACE_STATE_EVENT, refresh); window.removeEventListener('storage', refresh); };
  }, []);

  const currentUid = team?.currentUid || '';
  const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const scoped = useMemo(() => tasks.filter(isFollowUpTask), [tasks]);
  const active = useMemo(() => scoped.filter((task) => task.status !== 'done' && !task.deletedAt), [scoped]);
  const queues = useMemo(() => ({
    queue: active.filter((task) => stateOf(task) === 'queue'),
    waiting: active.filter((task) => stateOf(task) === 'waiting-reply'),
    replied: active.filter((task) => stateOf(task) === 'reply-received')
  }), [active]);
  const history = useMemo(() => scoped.filter((task) => task.status === 'done' || Boolean(task.deletedAt)).sort((a, b) => (b.deletedAt || b.completedAt || b.createdAt).localeCompare(a.deletedAt || a.completedAt || a.createdAt)), [scoped]);
  const laneTasks = useMemo(() => {
    const term = search.trim().toLowerCase();
    return queues[lane]
      .slice()
      .sort((a, b) => `${a.dueDate || '9999-12-31'}${a.dueTime || '23:59'}`.localeCompare(`${b.dueDate || '9999-12-31'}${b.dueTime || '23:59'}`))
      .filter((task) => !term || [task.title, task.clientName, task.note, task.assignedToName || task.assignee].some((value) => String(value || '').toLowerCase().includes(term)));
  }, [lane, queues, search]);

  const persist = (next: FollowTask[]) => { setTasks(next); saveTasks(next as WorkTask[]); };
  const patch = (task: FollowTask, change: Partial<FollowTask>) => {
    const updated = { ...task, ...change } as FollowTask;
    if (change.status === 'done' && !updated.completedAt) updated.completedAt = new Date().toISOString();
    const next = tasks.map((item) => item.id === task.id ? updated : item);
    persist(next);
    void persistExpertWorkTask(updated);
    return updated;
  };

  const assigneeFor = (task: FollowTask): WorkspaceMember | undefined => {
    const members = team?.members.filter((member) => member.status === 'active') || [];
    return members.find((member) => member.uid === task.assignedToUid) || team?.currentMember || members[0];
  };

  const logEvent = (task: FollowTask, type: string, metadata: Record<string, unknown>) => {
    if (!task.personId) return;
    void appendExpertRelationshipEvent({ personId: task.personId, type, sourceType: 'work_task', sourceId: task.id, metadata }).catch(() => {});
  };

  const markWaiting = (task: FollowTask) => {
    const now = new Date().toISOString();
    patch(task, { interactionState: 'waiting-reply', awaitingReplySince: now, replyReceivedAt: '', lastInteractionNote: contactNote.trim() || task.lastInteractionNote || '', status: 'pending' });
    logEvent(task, 'interaction.waiting_reply', { channel: task.type, note: contactNote.trim() });
    setActiveId(''); setContactNote(''); setLane('waiting');
  };

  const markReplied = (task: FollowTask) => {
    const now = new Date().toISOString();
    patch(task, { interactionState: 'reply-received', replyReceivedAt: now, status: 'pending' });
    logEvent(task, 'interaction.reply_received', { channel: task.type, replyReceivedAt: now });
    setActiveId(''); setLane('replied');
  };

  const complete = (task: FollowTask, result: string) => {
    patch(task, { status: 'done', interactionState: 'queue', result: result.trim(), completedByUid: currentUid });
    logEvent(task, 'task.completed', { result: result.trim(), workstream: 'follow-up' });
    setActiveId(''); setContactNote('');
  };

  const remove = (task: FollowTask) => {
    patch(task, { deletedAt: new Date().toISOString(), deletedFromStatus: task.status });
    setActiveId('');
  };

  const recover = (task: FollowTask) => patch(task, { deletedAt: undefined, deletedFromStatus: undefined, status: 'pending', interactionState: 'queue' });

  const beginEdit = (task: FollowTask) => {
    setEditingId(task.id); setEditTitle(task.title); setEditNote(task.note || ''); setEditResult(task.result || ''); setEditType(task.type); setEditDate(task.dueDate || ''); setEditTime(task.dueTime || '');
  };

  const saveEdit = (task: FollowTask) => {
    if (!editTitle.trim()) return;
    patch(task, { title: editTitle.trim(), note: editNote.trim(), result: editResult.trim(), type: editType, dueDate: editDate, dueTime: editTime });
    void appendExpertAuditLog({ entityType: 'work_task', entityId: task.id, action: 'task.history_edited', changes: { title: editTitle.trim(), type: editType } }).catch(() => {});
    setEditingId('');
  };

  return <div className="space-y-4">
    <section className="rounded-2xl border border-black/10 bg-white p-4 md:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'SEGUIMIENTO' : 'FOLLOW-UP'}</p><h3 className="mt-1.5 text-xl font-semibold">{language === 'es' ? 'Mesa secundaria de relaciones' : 'Secondary relationship work desk'}</h3><p className="mt-1.5 max-w-2xl text-sm leading-5 text-black/50">{language === 'es' ? 'Aquí se trabajan no compradores y personas en continuidad gratuita. La lógica es la misma que Priority Work, sin mezclar estas relaciones con clientes y alumnos activos.' : 'Work non-buyers and free-continuity relationships here without mixing them into the active-customer queue.'}</p></div>
        <div className="flex gap-2"><Metric label={language === 'es' ? 'POR HACER' : 'TO DO'} value={queues.queue.length} dark /><Metric label={language === 'es' ? 'ESPERANDO' : 'WAITING'} value={queues.waiting.length} /><Metric label={language === 'es' ? 'RESPONDIERON' : 'REPLIED'} value={queues.replied.length} alert={queues.replied.length > 0} /></div>
      </div>
      <div className="mt-4 flex flex-col gap-3 border-t border-black/5 pt-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex w-fit rounded-full border border-black/10 bg-[#F7F7F5] p-1"><LaneButton active={lane === 'queue'} onClick={() => setLane('queue')} icon={ListTodo} label={language === 'es' ? 'Por hacer' : 'To do'} count={queues.queue.length} /><LaneButton active={lane === 'waiting'} onClick={() => setLane('waiting')} icon={Inbox} label={language === 'es' ? 'Interacciones activas' : 'Active interactions'} count={queues.waiting.length} /><LaneButton active={lane === 'replied'} onClick={() => setLane('replied')} icon={BellRing} label={language === 'es' ? 'Respondieron' : 'Replied'} count={queues.replied.length} alert={queues.replied.length > 0} /></div>
        <div className="flex gap-3"><label className="relative block min-w-[280px]"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={language === 'es' ? 'Buscar persona o tarea…' : 'Search person or task…'} className="w-full rounded-xl border border-black/10 bg-white py-2 pl-9 pr-3 text-sm" /></label><label className="flex items-center gap-2 text-xs text-black/45"><input type="checkbox" checked={showHistory} onChange={(e) => setShowHistory(e.target.checked)} />{language === 'es' ? 'Historial' : 'History'}</label></div>
      </div>
    </section>

    <section className="overflow-hidden rounded-2xl border border-black/10 bg-white">
      <div className="max-h-[720px] divide-y divide-black/5 overflow-y-auto">{laneTasks.map((task) => {
        const opened = activeId === task.id;
        const person = task.personId ? peopleById.get(task.personId) : undefined;
        const assignee = assigneeFor(task);
        const state = stateOf(task);
        return <div key={task.id} className="p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_105px_145px_170px_auto] lg:items-center">
            <div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{task.title}</p>{state === 'waiting-reply' && <span className="rounded-full bg-black/5 px-2 py-0.5 text-[9px] font-semibold text-black/45">{language === 'es' ? 'ESPERANDO' : 'WAITING'}</span>}{state === 'reply-received' && <span className="rounded-full bg-[#A23A32]/9 px-2 py-0.5 text-[9px] font-semibold text-[#8D332C]">{language === 'es' ? 'RESPONDIÓ' : 'REPLIED'}</span>}</div><p className="mt-1 text-xs font-medium text-[#0A3F4D]">{task.clientName}</p><p className="mt-1 line-clamp-1 text-xs text-black/40">{task.note}</p></div>
            <div className="flex items-center gap-2 text-xs text-black/55"><ActionIcon type={task.type} /><span>{actionLabel(task.type, language)}</span></div>
            <div className="flex items-center gap-1.5 text-xs text-black/50"><Clock3 className="h-3.5 w-3.5" />{dueLabel(task, language)}</div>
            <div className="flex items-center gap-1.5 text-xs text-black/50"><UserRoundCheck className="h-3.5 w-3.5" /><span className="truncate">{task.assignedToName || task.assignee}</span></div>
            <button type="button" onClick={() => { setActiveId(opened ? '' : task.id); setContactNote(task.lastInteractionNote || ''); }} className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#111413] px-3 py-2 text-[10px] font-semibold text-white">{opened ? (language === 'es' ? 'Cerrar' : 'Close') : (language === 'es' ? 'Trabajar' : 'Work')}<ChevronDown className={`h-3 w-3 transition ${opened ? 'rotate-180' : ''}`} /></button>
          </div>

          {opened && state === 'waiting-reply' && <div className="mt-3 rounded-xl border border-black/8 bg-[#FAFAF8] p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-xs font-semibold">{language === 'es' ? 'Esperando respuesta' : 'Waiting for reply'}</p><p className="mt-1 text-xs text-black/45">{task.lastInteractionNote || (language === 'es' ? 'El contacto ya fue realizado.' : 'The contact has already been made.')}</p></div><div className="flex gap-2"><button type="button" onClick={() => markReplied(task)} className="rounded-full bg-[#111413] px-4 py-2 text-xs font-semibold text-white">{language === 'es' ? 'Marcar respuesta recibida' : 'Mark reply received'}</button><button type="button" onClick={() => patch(task, { interactionState: 'queue' })} className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-black/55">{language === 'es' ? 'Volver a por hacer' : 'Return to queue'}</button></div></div></div>}

          {opened && state !== 'waiting-reply' && person && assignee && <div className="mt-3 space-y-3">
            {asyncChannel(task) && <div className="rounded-xl border border-black/8 bg-[#FAFAF8] p-3"><label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'NOTA DEL CONTACTO' : 'CONTACT NOTE'}</span><textarea value={contactNote} onChange={(e) => setContactNote(e.target.value)} rows={2} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm" /></label><div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={() => markWaiting(task)} className="rounded-full border border-[#0A3F4D]/15 bg-white px-4 py-2 text-xs font-semibold text-[#0A3F4D]">{language === 'es' ? 'En espera de respuesta' : 'Waiting for reply'}</button><button type="button" onClick={() => remove(task)} className="rounded-full border border-[#A23A32]/15 bg-white px-4 py-2 text-xs font-semibold text-[#8D332C]"><Trash2 className="mr-1 inline h-3.5 w-3.5" />{language === 'es' ? 'Eliminar' : 'Remove'}</button></div></div>}
            <FollowUpTaskPanel task={task} person={person} assignee={assignee} language={language} onCompleted={(result) => complete(task, result)} />
          </div>}
        </div>;
      })}{laneTasks.length === 0 && <div className="grid min-h-[220px] place-items-center p-8 text-center text-sm text-black/40">{language === 'es' ? 'No hay trabajo en esta vista.' : 'No work in this view.'}</div>}</div>
    </section>

    {showHistory && <section className="rounded-2xl border border-black/10 bg-white p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/40">{language === 'es' ? 'HISTORIAL' : 'HISTORY'}</p><h3 className="mt-1 text-lg font-semibold">{language === 'es' ? 'Completadas y eliminadas' : 'Completed and removed'}</h3></div><span className="rounded-full bg-black/5 px-3 py-1.5 text-xs font-semibold">{history.length}</span></div><div className="mt-4 divide-y divide-black/5 rounded-xl border border-black/7">{history.map((task) => <div key={task.id} className="p-4">{editingId === task.id ? <div className="grid gap-2 md:grid-cols-2"><input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="rounded-lg border border-black/10 px-3 py-2 text-sm" /><select value={editType} onChange={(e) => setEditType(e.target.value as WorkActionType)} className="rounded-lg border border-black/10 px-3 py-2 text-sm"><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="call">{language === 'es' ? 'Llamada' : 'Call'}</option><option value="meeting">{language === 'es' ? 'Reunión' : 'Meeting'}</option><option value="task">{language === 'es' ? 'Tarea' : 'Task'}</option></select><textarea value={editNote} onChange={(e) => setEditNote(e.target.value)} rows={2} className="rounded-lg border border-black/10 px-3 py-2 text-sm md:col-span-2" /><textarea value={editResult} onChange={(e) => setEditResult(e.target.value)} rows={2} className="rounded-lg border border-black/10 px-3 py-2 text-sm md:col-span-2" /><input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="rounded-lg border border-black/10 px-3 py-2 text-sm" /><input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} className="rounded-lg border border-black/10 px-3 py-2 text-sm" /><div className="flex gap-2 md:col-span-2"><button type="button" onClick={() => saveEdit(task)} className="rounded-full bg-[#111413] px-4 py-2 text-xs font-semibold text-white">{language === 'es' ? 'Guardar' : 'Save'}</button><button type="button" onClick={() => setEditingId('')} className="rounded-full border border-black/10 px-4 py-2 text-xs font-semibold">{language === 'es' ? 'Cancelar' : 'Cancel'}</button></div></div> : <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_150px_auto] md:items-center"><div><p className="text-sm font-semibold">{task.title}</p><p className="mt-1 text-xs text-black/45">{task.clientName}{task.result ? ` · ${task.result}` : ''}</p></div><span className="text-xs text-black/45">{dueLabel(task, language)}</span><div className="flex gap-2"><button type="button" onClick={() => beginEdit(task)} className="inline-flex items-center gap-1 rounded-full border border-black/10 px-3 py-2 text-[10px] font-semibold"><Pencil className="h-3.5 w-3.5" />{language === 'es' ? 'Editar' : 'Edit'}</button>{task.deletedAt && <button type="button" onClick={() => recover(task)} className="inline-flex items-center gap-1 rounded-full border border-[#0A3F4D]/15 px-3 py-2 text-[10px] font-semibold text-[#0A3F4D]"><RotateCcw className="h-3.5 w-3.5" />{language === 'es' ? 'Recuperar' : 'Recover'}</button>}</div></div>}</div>)}{history.length === 0 && <div className="p-7 text-center text-sm text-black/40">{language === 'es' ? 'Sin historial todavía.' : 'No history yet.'}</div>}</div></section>}
  </div>;
}

function Metric({ label, value, dark = false, alert = false }: { label: string; value: number; dark?: boolean; alert?: boolean }) {
  return <div className={`min-w-[92px] rounded-xl border px-3 py-2 ${dark ? 'border-[#111413] bg-[#111413] text-white' : alert ? 'border-[#A23A32]/20 bg-[#A23A32]/6 text-[#8D332C]' : 'border-black/8 bg-[#FAFAF8]'}`}><p className={`text-[8px] font-semibold uppercase tracking-[0.12em] ${dark ? 'text-white/55' : 'opacity-60'}`}>{label}</p><p className="mt-1 text-lg font-semibold">{value}</p></div>;
}

function LaneButton({ active, onClick, icon: Icon, label, count, alert = false }: { active: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }>; label: string; count: number; alert?: boolean }) {
  return <button type="button" onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold ${active ? 'bg-[#111413] text-white' : alert ? 'text-[#8D332C]' : 'text-black/45'}`}><Icon className="h-3.5 w-3.5" />{label} <span>{count}</span></button>;
}
