import React, { useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  CalendarCheck2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Inbox,
  ListTodo,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  RotateCcw,
  Search,
  ShoppingBag,
  Trash2,
  UserRoundCheck,
  UsersRound
} from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';
import { hydrateExpertsTaskMemory, persistExpertWorkTask } from '../../services/expertsTaskMemory';
import {
  appendExpertAuditLog,
  appendExpertRelationshipEvent,
  hasWorkspacePermission,
  loadExpertWorkspaceTeam,
  type WorkspaceMember,
  type WorkspaceTeamState
} from '../../services/expertsWorkspaceCore';
import {
  appendJournal,
  getWorkPriority,
  loadTasks,
  saveTasks,
  WORKSPACE_STATE_EVENT,
  type WorkActionType,
  type WorkTask,
  type WorkTaskStatus
} from './workspaceState';
import { BuyerQueueWorkspace } from './BuyerQueueWorkspace';

type InteractionState = 'queue' | 'waiting-reply' | 'reply-received';
type WorkLane = 'queue' | 'waiting' | 'replied';
type TaskView = 'mine' | 'team';
type MainTab = 'active' | 'buyers';

type TeamTask = WorkTask & {
  assignedToUid?: string;
  assignedToName?: string;
  createdByUid?: string;
  completedByUid?: string;
  personId?: string;
  sourceId?: string;
  sourceRegistrationId?: string;
  sourceActionKind?: string;
  workstream?: string;
  interactionState?: InteractionState;
  awaitingReplySince?: string;
  replyReceivedAt?: string;
  lastInteractionNote?: string;
};

function ActionIcon({ kind }: { kind: WorkActionType }) {
  if (kind === 'email') return <Mail className="h-4 w-4" />;
  if (kind === 'whatsapp') return <MessageCircle className="h-4 w-4" />;
  if (kind === 'call') return <Phone className="h-4 w-4" />;
  if (kind === 'meeting') return <CalendarCheck2 className="h-4 w-4" />;
  return <ListTodo className="h-4 w-4" />;
}

function actionLabel(type: WorkActionType, language: Language): string {
  if (type === 'email') return 'Email';
  if (type === 'whatsapp') return 'WhatsApp';
  if (type === 'call') return language === 'es' ? 'Llamada' : 'Call';
  if (type === 'meeting') return language === 'es' ? 'Reunión' : 'Meeting';
  return language === 'es' ? 'Tarea interna' : 'Internal task';
}

function formatDue(task: Pick<WorkTask, 'dueDate' | 'dueTime'>, language: Language): string {
  if (!task.dueDate) return language === 'es' ? 'Sin fecha' : 'No date';
  const date = new Date(`${task.dueDate}T${task.dueTime || '12:00'}:00`);
  if (!Number.isFinite(date.getTime())) return task.dueDate;
  const formatted = new Intl.DateTimeFormat(language === 'es' ? 'es-CL' : 'en-US', { day: '2-digit', month: 'short' }).format(date);
  return `${formatted}${task.dueTime ? ` · ${task.dueTime}` : ''}`;
}

function priorityMeta(task: TeamTask, language: Language) {
  const priority = getWorkPriority(task);
  if (priority === 'high') return { value: 0, label: language === 'es' ? 'Alta' : 'High', className: 'bg-[#A23A32]/9 text-[#8D332C]' };
  if (priority === 'medium') return { value: 1, label: language === 'es' ? 'Media' : 'Medium', className: 'bg-[#A46F16]/10 text-[#82570F]' };
  return { value: 2, label: 'Normal', className: 'bg-[#0A3F4D]/8 text-[#0A3F4D]' };
}

function stateOf(task: TeamTask): InteractionState {
  return task.interactionState === 'waiting-reply' || task.interactionState === 'reply-received' ? task.interactionState : 'queue';
}

function asyncChannel(task: TeamTask) {
  return task.type === 'whatsapp' || task.type === 'email';
}

function memberLabel(member?: WorkspaceMember) {
  return member?.displayName || member?.email || member?.uid || 'Sin responsable';
}

function isFollowUpTask(task: TeamTask) {
  return task.workstream === 'follow-up' || task.sourceActionKind === 'continuity' || (task.source === 'webinar' && task.sourceActionKind === 'follow-up');
}

function isBuyerTask(task: TeamTask) {
  return task.source === 'webinar' && task.sourceActionKind === 'enrollment';
}

function taskSort(a: TeamTask, b: TeamTask) {
  const dateCompare = `${a.dueDate || '9999-12-31'}${a.dueTime || '23:59'}`.localeCompare(`${b.dueDate || '9999-12-31'}${b.dueTime || '23:59'}`);
  if (dateCompare !== 0) return dateCompare;
  return priorityMeta(a, 'es').value - priorityMeta(b, 'es').value;
}

export function PriorityRadarWorkspace({ language, onOpenClient }: { language: Language; onOpenClient: (id: string) => void }) {
  const [mainTab, setMainTab] = useState<MainTab>('active');
  const [tasks, setTasks] = useState<TeamTask[]>(() => loadTasks() as TeamTask[]);
  const [team, setTeam] = useState<WorkspaceTeamState | null>(null);
  const [view, setView] = useState<TaskView>('mine');
  const [lane, setLane] = useState<WorkLane>('queue');
  const [showHistory, setShowHistory] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTaskId, setActiveTaskId] = useState('');
  const [resultDraft, setResultDraft] = useState('');
  const [newType, setNewType] = useState<WorkActionType>('whatsapp');
  const [newNote, setNewNote] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newAssigneeUid, setNewAssigneeUid] = useState('');
  const [editingId, setEditingId] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editResult, setEditResult] = useState('');
  const [editType, setEditType] = useState<WorkActionType>('task');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');

  useEffect(() => {
    void loadExpertWorkspaceTeam().then((next) => {
      setTeam(next);
      setNewAssigneeUid((current) => current || next.currentUid);
    }).catch(() => {});
    void hydrateExpertsTaskMemory().then(() => setTasks(loadTasks() as TeamTask[]));
    const refresh = () => setTasks(loadTasks() as TeamTask[]);
    window.addEventListener(WORKSPACE_STATE_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => { window.removeEventListener(WORKSPACE_STATE_EVENT, refresh); window.removeEventListener('storage', refresh); };
  }, []);

  const currentUid = team?.currentUid || '';
  const isOwner = Boolean(team && team.workspaceId === team.currentUid);
  const canReadTeam = Boolean(team && hasWorkspacePermission(team.currentMember.permissions, 'tasks.read.team'));
  const canManageTeam = Boolean(team && hasWorkspacePermission(team.currentMember.permissions, 'tasks.manage'));
  const canManageOwn = Boolean(team && hasWorkspacePermission(team.currentMember.permissions, 'tasks.manage.own'));
  const activeMembers = useMemo(() => (team?.members || []).filter((member) => member.status === 'active'), [team]);

  useEffect(() => { if (view === 'team' && !canReadTeam) setView('mine'); }, [canReadTeam, view]);

  const visibleTasks = useMemo(() => {
    const source = view === 'team' && canReadTeam ? tasks : tasks.filter((task) => task.assignedToUid === currentUid || (!task.assignedToUid && isOwner));
    return source.filter((task) => !isFollowUpTask(task) && !isBuyerTask(task));
  }, [tasks, view, canReadTeam, currentUid, isOwner]);

  const activeTasks = useMemo(() => visibleTasks.filter((task) => task.status !== 'done' && !task.deletedAt), [visibleTasks]);
  const queues = useMemo(() => ({
    queue: activeTasks.filter((task) => stateOf(task) === 'queue').sort(taskSort),
    waiting: activeTasks.filter((task) => stateOf(task) === 'waiting-reply').sort(taskSort),
    replied: activeTasks.filter((task) => stateOf(task) === 'reply-received').sort(taskSort)
  }), [activeTasks]);
  const laneTasks = useMemo(() => {
    const term = search.trim().toLowerCase();
    return queues[lane].filter((task) => !term || [task.title, task.clientName, task.note || '', task.assignedToName || task.assignee].some((value) => String(value).toLowerCase().includes(term)));
  }, [queues, lane, search]);
  const historyTasks = useMemo(() => visibleTasks.filter((task) => task.status === 'done' || Boolean(task.deletedAt)).sort((a, b) => (b.deletedAt || b.completedAt || b.createdAt).localeCompare(a.deletedAt || a.completedAt || a.createdAt)), [visibleTasks]);

  const persist = (next: TeamTask[]) => { setTasks(next); saveTasks(next as WorkTask[]); };
  const patchTask = (task: TeamTask, change: Partial<TeamTask>) => {
    const updated = { ...task, ...change } as TeamTask;
    if (change.status === 'done' && !updated.completedAt) updated.completedAt = new Date().toISOString();
    const next = tasks.map((item) => item.id === task.id ? updated : item);
    persist(next);
    void persistExpertWorkTask(updated);
    return updated;
  };
  const canWork = (task: TeamTask) => canManageTeam || (canManageOwn && task.assignedToUid === currentUid) || isOwner;

  const setAssignee = (task: TeamTask, uid: string) => {
    if (!canManageTeam && !isOwner) return;
    const member = activeMembers.find((item) => item.uid === uid);
    if (!member) return;
    patchTask(task, { assignedToUid: member.uid, assignedToName: memberLabel(member), assignee: memberLabel(member) });
  };

  const logEvent = (task: TeamTask, type: string, metadata: Record<string, unknown>) => {
    if (!task.personId) return;
    void appendExpertRelationshipEvent({ personId: task.personId, type, sourceType: 'work_task', sourceId: task.id, metadata }).catch(() => {});
  };

  const markWaiting = (task: TeamTask) => {
    const now = new Date().toISOString();
    patchTask(task, { interactionState: 'waiting-reply', awaitingReplySince: now, replyReceivedAt: '', lastInteractionNote: resultDraft.trim(), result: resultDraft.trim() || task.result, status: 'pending' });
    logEvent(task, 'interaction.waiting_reply', { channel: task.type, note: resultDraft.trim() });
    setActiveTaskId(''); setResultDraft(''); setLane('waiting');
  };

  const markReplyReceived = (task: TeamTask) => {
    const now = new Date().toISOString();
    patchTask(task, { interactionState: 'reply-received', replyReceivedAt: now, status: 'pending' });
    logEvent(task, 'interaction.reply_received', { channel: task.type, replyReceivedAt: now });
    setActiveTaskId(''); setLane('replied');
  };

  const completeTask = (task: TeamTask) => {
    const result = resultDraft.trim();
    const updated = patchTask(task, { status: 'done', interactionState: 'queue', result, completedByUid: currentUid });
    if (isOwner && task.clientId) appendJournal(task.clientId, 'task-result', language === 'es' ? 'Trabajo completado' : 'Work completed', result || task.title);
    logEvent(updated, 'task.completed', { title: updated.title, result, completedByUid: currentUid });
    void appendExpertAuditLog({ entityType: 'work_task', entityId: task.id, action: 'task.completed', changes: { result, personId: task.personId || '', clientId: task.clientId } }).catch(() => {});
    setActiveTaskId(''); setResultDraft('');
  };

  const removeTask = (task: TeamTask) => {
    patchTask(task, { deletedAt: new Date().toISOString(), deletedFromStatus: task.status });
    setActiveTaskId(''); setResultDraft('');
  };

  const recoverTask = (task: TeamTask) => patchTask(task, { deletedAt: undefined, deletedFromStatus: undefined, status: task.deletedFromStatus || 'pending', interactionState: 'queue' });

  const createFollowUp = (task: TeamTask) => {
    const clean = newNote.trim();
    if (!clean || !team) return;
    const assignee = activeMembers.find((member) => member.uid === newAssigneeUid) || team.currentMember;
    const nextTask: TeamTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      clientId: task.clientId,
      clientName: task.clientName,
      personId: task.personId,
      title: clean,
      type: newType,
      note: clean,
      dueDate: newDate,
      dueTime: newTime,
      assignee: memberLabel(assignee),
      assignedToUid: assignee.uid,
      assignedToName: memberLabel(assignee),
      createdByUid: currentUid,
      status: 'pending' as WorkTaskStatus,
      interactionState: 'queue',
      createdAt: new Date().toISOString(),
      source: 'manual',
      confirmationEmail: newType === 'meeting' ? 'queued' : 'not-required'
    };
    persist([nextTask, ...tasks]);
    void persistExpertWorkTask(nextTask);
    setNewNote(''); setNewDate(''); setNewTime('');
  };

  const beginEdit = (task: TeamTask) => {
    setEditingId(task.id); setEditTitle(task.title); setEditNote(task.note || ''); setEditResult(task.result || ''); setEditType(task.type); setEditDate(task.dueDate || ''); setEditTime(task.dueTime || '');
  };

  const saveEdit = (task: TeamTask) => {
    if (!editTitle.trim()) return;
    patchTask(task, { title: editTitle.trim(), note: editNote.trim(), result: editResult.trim(), type: editType, dueDate: editDate, dueTime: editTime });
    void appendExpertAuditLog({ entityType: 'work_task', entityId: task.id, action: 'task.history_edited', changes: { title: editTitle.trim(), type: editType } }).catch(() => {});
    setEditingId('');
  };

  if (mainTab === 'buyers') {
    return <div className="space-y-4"><TopTabs language={language} active={mainTab} onChange={setMainTab} buyerCount={tasks.filter(isBuyerTask).filter((task) => task.status !== 'done' && !task.deletedAt).length} /><BuyerQueueWorkspace language={language} /></div>;
  }

  return <div className="space-y-4">
    <TopTabs language={language} active={mainTab} onChange={setMainTab} buyerCount={tasks.filter(isBuyerTask).filter((task) => task.status !== 'done' && !task.deletedAt).length} />

    <section className="rounded-2xl border border-black/10 bg-white p-4 md:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">PRIORITY WORK</p><h3 className="mt-1.5 text-xl font-semibold">{view === 'mine' ? (language === 'es' ? 'Trabajo activo' : 'Active work') : (language === 'es' ? 'Trabajo activo del equipo' : 'Team active work')}</h3><p className="mt-1.5 max-w-2xl text-sm leading-5 text-black/50">{language === 'es' ? 'Esta mesa queda reservada para alumnos, clientes 1:1 y relaciones activas. No compradores viven en Seguimiento; compras nuevas en Compradores.' : 'This desk is reserved for active students, 1:1 clients and active relationships. Non-buyers live in Follow-up; new purchases in Buyers.'}</p></div><div className="flex gap-2"><Metric label={language === 'es' ? 'POR HACER' : 'TO DO'} value={queues.queue.length} dark /><Metric label={language === 'es' ? 'ESPERANDO' : 'WAITING'} value={queues.waiting.length} /><Metric label={language === 'es' ? 'RESPONDIERON' : 'REPLIED'} value={queues.replied.length} alert={queues.replied.length > 0} /></div></div>
      <div className="mt-4 flex flex-col gap-3 border-t border-black/5 pt-4 xl:flex-row xl:items-center xl:justify-between"><div className="flex flex-wrap gap-2"><div className="inline-flex rounded-full border border-black/10 bg-[#F7F7F5] p-1"><button type="button" onClick={() => setView('mine')} className={`rounded-full px-4 py-2 text-xs font-semibold ${view === 'mine' ? 'bg-[#111413] text-white' : 'text-black/45'}`}>{language === 'es' ? 'Mi trabajo' : 'My work'}</button>{canReadTeam && <button type="button" onClick={() => setView('team')} className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold ${view === 'team' ? 'bg-[#111413] text-white' : 'text-black/45'}`}><UsersRound className="h-3.5 w-3.5" />{language === 'es' ? 'Equipo' : 'Team'}</button>}</div><div className="inline-flex rounded-full border border-black/10 bg-white p-1"><LaneButton active={lane === 'queue'} onClick={() => { setLane('queue'); setActiveTaskId(''); }} icon={ListTodo} label={language === 'es' ? 'Por hacer' : 'To do'} count={queues.queue.length} /><LaneButton active={lane === 'waiting'} onClick={() => { setLane('waiting'); setActiveTaskId(''); }} icon={Inbox} label={language === 'es' ? 'Interacciones activas' : 'Active interactions'} count={queues.waiting.length} /><LaneButton active={lane === 'replied'} onClick={() => { setLane('replied'); setActiveTaskId(''); }} icon={BellRing} label={language === 'es' ? 'Respondieron' : 'Replied'} count={queues.replied.length} alert={queues.replied.length > 0} /></div></div><div className="flex gap-3"><label className="relative block min-w-[280px]"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={language === 'es' ? 'Buscar tarea o persona…' : 'Search task or person…'} className="w-full rounded-xl border border-black/10 bg-white py-2 pl-9 pr-3 text-sm" /></label><label className="flex items-center gap-2 text-xs text-black/45"><input type="checkbox" checked={showHistory} onChange={(e) => setShowHistory(e.target.checked)} />{language === 'es' ? 'Historial' : 'History'}</label></div></div>
    </section>

    <section className="overflow-hidden rounded-2xl border border-black/10 bg-white"><div className="max-h-[700px] divide-y divide-black/5 overflow-y-auto">{laneTasks.map((task) => {
      const opened = activeTaskId === task.id;
      const state = stateOf(task);
      const priority = priorityMeta(task, language);
      const taskCanWork = canWork(task);
      return <div key={task.id} className="p-4"><div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_90px_105px_145px_170px_auto] lg:items-center"><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{task.title}</p>{state === 'waiting-reply' && <span className="rounded-full bg-black/5 px-2 py-0.5 text-[9px] font-semibold text-black/45">{language === 'es' ? 'ESPERANDO' : 'WAITING'}</span>}{state === 'reply-received' && <span className="rounded-full bg-[#A23A32]/9 px-2 py-0.5 text-[9px] font-semibold text-[#8D332C]">{language === 'es' ? 'RESPONDIÓ' : 'REPLIED'}</span>}</div>{(task.personId || task.clientId) && isOwner ? <button type="button" onClick={() => onOpenClient(task.personId || task.clientId)} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[#0A3F4D] hover:underline">{task.clientName}<ChevronRight className="h-3 w-3" /></button> : <p className="mt-1 text-xs font-medium text-[#0A3F4D]">{task.clientName}</p>}<p className="mt-1 line-clamp-1 text-xs text-black/40">{task.note}</p></div><span className={`w-fit rounded-full px-2.5 py-1 text-[9px] font-semibold ${priority.className}`}>{priority.label}</span><div className="flex items-center gap-2 text-xs text-black/55"><ActionIcon kind={task.type} />{actionLabel(task.type, language)}</div><div className="flex items-center gap-1.5 text-xs text-black/50"><Clock3 className="h-3.5 w-3.5" />{formatDue(task, language)}</div>{canManageTeam || isOwner ? <label className="relative"><UserRoundCheck className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/30" /><select value={task.assignedToUid || currentUid} onChange={(e) => setAssignee(task, e.target.value)} className="w-full rounded-lg border border-black/8 bg-white py-1.5 pl-8 pr-2 text-xs">{activeMembers.map((member) => <option key={member.uid} value={member.uid}>{memberLabel(member)}</option>)}</select></label> : <span className="truncate text-xs text-black/50">{task.assignedToName || task.assignee}</span>}<button type="button" disabled={!taskCanWork} onClick={() => { setActiveTaskId(opened ? '' : task.id); setResultDraft(task.result || task.lastInteractionNote || ''); }} className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#111413] px-3 py-2 text-[10px] font-semibold text-white disabled:opacity-30">{opened ? (language === 'es' ? 'Cerrar' : 'Close') : (language === 'es' ? 'Trabajar' : 'Work')}<ChevronDown className={`h-3 w-3 transition ${opened ? 'rotate-180' : ''}`} /></button></div>

      {opened && taskCanWork && state === 'waiting-reply' && <div className="mt-3 rounded-xl border border-black/8 bg-[#FAFAF8] p-3"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-xs font-semibold">{language === 'es' ? 'Interacción activa · esperando respuesta' : 'Active interaction · waiting for reply'}</p><p className="mt-1 text-xs text-black/45">{task.lastInteractionNote || task.note}</p></div><div className="flex gap-2"><button type="button" onClick={() => markReplyReceived(task)} className="rounded-full bg-[#111413] px-4 py-2 text-xs font-semibold text-white">{language === 'es' ? 'Marcar respuesta recibida' : 'Mark reply received'}</button><button type="button" onClick={() => patchTask(task, { interactionState: 'queue' })} className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-black/55">{language === 'es' ? 'Volver a por hacer' : 'Return to queue'}</button></div></div></div>}

      {opened && taskCanWork && state !== 'waiting-reply' && <div className="mt-3 rounded-xl border border-black/8 bg-[#FAFAF8] p-3"><label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'RESULTADO / NOTA' : 'RESULT / NOTE'}</span><textarea value={resultDraft} onChange={(e) => setResultDraft(e.target.value)} rows={2} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm" /></label><div className="mt-2 flex flex-wrap items-center gap-2"><button type="button" onClick={() => completeTask(task)} className="inline-flex items-center gap-1.5 rounded-full bg-[#111413] px-4 py-2 text-xs font-semibold text-white"><CheckCircle2 className="h-3.5 w-3.5" />{language === 'es' ? 'Completar' : 'Complete'}</button>{asyncChannel(task) && <button type="button" onClick={() => markWaiting(task)} className="rounded-full border border-[#0A3F4D]/15 bg-white px-4 py-2 text-xs font-semibold text-[#0A3F4D]">{language === 'es' ? 'En espera de respuesta' : 'Waiting for reply'}</button>}<button type="button" onClick={() => removeTask(task)} className="inline-flex items-center gap-1.5 rounded-full border border-[#A23A32]/15 bg-white px-4 py-2 text-xs font-semibold text-[#8D332C]"><Trash2 className="h-3.5 w-3.5" />{language === 'es' ? 'Eliminar' : 'Remove'}</button></div><div className="mt-3 grid gap-2 border-t border-black/5 pt-3 sm:grid-cols-2 xl:grid-cols-[130px_150px_140px_120px_minmax(200px,1fr)_auto]"><select value={newType} onChange={(e) => setNewType(e.target.value as WorkActionType)} className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs"><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="call">{language === 'es' ? 'Llamada' : 'Call'}</option><option value="meeting">{language === 'es' ? 'Reunión' : 'Meeting'}</option><option value="task">{language === 'es' ? 'Tarea' : 'Task'}</option></select><select value={newAssigneeUid || currentUid} onChange={(e) => setNewAssigneeUid(e.target.value)} className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs">{activeMembers.map((member) => <option key={member.uid} value={member.uid}>{memberLabel(member)}</option>)}</select><input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs" /><input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs" /><input value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder={language === 'es' ? 'Nueva acción si se requiere' : 'New action if needed'} className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs" /><button type="button" onClick={() => createFollowUp(task)} className="rounded-full bg-[#0A3F4D] px-4 py-2 text-xs font-semibold text-white">{language === 'es' ? 'Agregar' : 'Add'}</button></div></div>}
    </div>;
    })}{laneTasks.length === 0 && <div className="grid min-h-[220px] place-items-center p-8 text-center text-sm text-black/40">{language === 'es' ? 'No hay trabajo en esta vista.' : 'No work in this view.'}</div>}</div></section>

    {showHistory && <section className="rounded-2xl border border-black/10 bg-white p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/40">{language === 'es' ? 'HISTORIAL DE PRIORITY WORK' : 'PRIORITY WORK HISTORY'}</p><h3 className="mt-1 text-lg font-semibold">{language === 'es' ? 'Completadas y eliminadas' : 'Completed and removed'}</h3></div><span className="rounded-full bg-black/5 px-3 py-1.5 text-xs font-semibold">{historyTasks.length}</span></div><div className="mt-4 divide-y divide-black/5 rounded-xl border border-black/7">{historyTasks.map((task) => <div key={task.id} className="p-4">{editingId === task.id ? <div className="grid gap-2 md:grid-cols-2"><input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="rounded-lg border border-black/10 px-3 py-2 text-sm" /><select value={editType} onChange={(e) => setEditType(e.target.value as WorkActionType)} className="rounded-lg border border-black/10 px-3 py-2 text-sm"><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="call">{language === 'es' ? 'Llamada' : 'Call'}</option><option value="meeting">{language === 'es' ? 'Reunión' : 'Meeting'}</option><option value="task">{language === 'es' ? 'Tarea' : 'Task'}</option></select><textarea value={editNote} onChange={(e) => setEditNote(e.target.value)} rows={2} className="rounded-lg border border-black/10 px-3 py-2 text-sm md:col-span-2" /><textarea value={editResult} onChange={(e) => setEditResult(e.target.value)} rows={2} className="rounded-lg border border-black/10 px-3 py-2 text-sm md:col-span-2" /><input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="rounded-lg border border-black/10 px-3 py-2 text-sm" /><input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} className="rounded-lg border border-black/10 px-3 py-2 text-sm" /><div className="flex gap-2 md:col-span-2"><button type="button" onClick={() => saveEdit(task)} className="rounded-full bg-[#111413] px-4 py-2 text-xs font-semibold text-white">{language === 'es' ? 'Guardar cambios' : 'Save changes'}</button><button type="button" onClick={() => setEditingId('')} className="rounded-full border border-black/10 px-4 py-2 text-xs font-semibold">{language === 'es' ? 'Cancelar' : 'Cancel'}</button></div></div> : <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_150px_160px_auto] md:items-center"><div><p className="text-sm font-semibold">{task.title}</p><p className="mt-1 text-xs text-black/45">{task.clientName}{task.result ? ` · ${task.result}` : ''}</p></div><span className="text-xs text-black/45">{task.assignedToName || task.assignee}</span><span className="text-xs text-black/45">{formatDue(task, language)}</span><div className="flex gap-2"><button type="button" onClick={() => beginEdit(task)} className="inline-flex items-center gap-1 rounded-full border border-black/10 px-3 py-2 text-[10px] font-semibold"><Pencil className="h-3.5 w-3.5" />{language === 'es' ? 'Editar' : 'Edit'}</button>{task.deletedAt && <button type="button" onClick={() => recoverTask(task)} className="inline-flex items-center gap-1 rounded-full border border-[#0A3F4D]/15 px-3 py-2 text-[10px] font-semibold text-[#0A3F4D]"><RotateCcw className="h-3.5 w-3.5" />{language === 'es' ? 'Recuperar' : 'Recover'}</button>}</div></div>}</div>)}{historyTasks.length === 0 && <div className="p-7 text-center text-sm text-black/40">{language === 'es' ? 'Sin historial todavía.' : 'No history yet.'}</div>}</div></section>}
  </div>;
}

function TopTabs({ language, active, onChange, buyerCount }: { language: Language; active: MainTab; onChange: (tab: MainTab) => void; buyerCount: number }) {
  return <section className="rounded-2xl border border-black/10 bg-white p-2"><div className="inline-flex rounded-xl bg-[#F7F7F5] p-1"><button type="button" onClick={() => onChange('active')} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold ${active === 'active' ? 'bg-[#111413] text-white' : 'text-black/50'}`}><ListTodo className="h-4 w-4" />{language === 'es' ? 'Trabajo activo' : 'Active work'}</button><button type="button" onClick={() => onChange('buyers')} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold ${active === 'buyers' ? 'bg-[#111413] text-white' : buyerCount ? 'text-[#17603D]' : 'text-black/50'}`}><ShoppingBag className="h-4 w-4" />{language === 'es' ? 'Compradores' : 'Buyers'}{buyerCount > 0 && <span className={`rounded-full px-2 py-0.5 text-[9px] ${active === 'buyers' ? 'bg-white/15 text-white' : 'bg-[#1E7A4D]/10 text-[#17603D]'}`}>{buyerCount}</span>}</button></div></section>;
}

function Metric({ label, value, dark = false, alert = false }: { label: string; value: number; dark?: boolean; alert?: boolean }) {
  return <div className={`min-w-[92px] rounded-xl border px-3 py-2 ${dark ? 'border-[#111413] bg-[#111413] text-white' : alert ? 'border-[#A23A32]/20 bg-[#A23A32]/6 text-[#8D332C]' : 'border-black/8 bg-[#FAFAF8]'}`}><p className={`text-[8px] font-semibold uppercase tracking-[0.12em] ${dark ? 'text-white/55' : 'opacity-60'}`}>{label}</p><p className="mt-1 text-lg font-semibold">{value}</p></div>;
}

function LaneButton({ active, onClick, icon: Icon, label, count, alert = false }: { active: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }>; label: string; count: number; alert?: boolean }) {
  return <button type="button" onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold ${active ? 'bg-[#111413] text-white' : alert ? 'text-[#8D332C]' : 'text-black/45'}`}><Icon className="h-3.5 w-3.5" />{label} <span>{count}</span></button>;
}
