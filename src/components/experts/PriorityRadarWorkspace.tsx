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
  Phone,
  RotateCcw,
  Search,
  Send,
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
import { PriorityTaskSpecialPanel } from './PriorityTaskSpecialPanel';

type InteractionState = 'queue' | 'waiting-reply' | 'reply-received';
type WorkLane = 'queue' | 'waiting' | 'replied';
type TaskView = 'mine' | 'team';

type TeamTask = Omit<WorkTask, 'source'> & {
  source?: WorkTask['source'] | 'webinar' | 'webinar-continuity' | 'formation';
  assignedToUid?: string;
  assignedToName?: string;
  createdByUid?: string;
  completedByUid?: string;
  personId?: string;
  sourceId?: string;
  sourceRegistrationId?: string;
  sourceActionKind?: 'follow-up' | 'enrollment' | 'continuity' | 'student-progress' | string;
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
  try {
    const date = new Date(`${task.dueDate}T${task.dueTime || '12:00'}:00`);
    const formatted = new Intl.DateTimeFormat(language === 'es' ? 'es-CL' : 'en-US', { day: '2-digit', month: 'short' }).format(date);
    return `${formatted}${task.dueTime ? ` · ${task.dueTime}` : ''}`;
  } catch {
    return `${task.dueDate}${task.dueTime ? ` · ${task.dueTime}` : ''}`;
  }
}

function formatMoment(value: string | undefined, language: Language): string {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === 'es' ? 'es-CL' : 'en-US', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  }).format(date);
}

function priorityMeta(task: TeamTask, language: Language) {
  const priority = getWorkPriority(task as WorkTask);
  if (priority === 'high') return { value: 0, label: language === 'es' ? 'Alta' : 'High', className: 'bg-[#A23A32]/9 text-[#8D332C]' };
  if (priority === 'medium') return { value: 1, label: language === 'es' ? 'Media' : 'Medium', className: 'bg-[#A46F16]/10 text-[#82570F]' };
  return { value: 2, label: 'Normal', className: 'bg-[#0A3F4D]/8 text-[#0A3F4D]' };
}

function memberLabel(member?: WorkspaceMember) {
  return member?.displayName || member?.email || 'Sin responsable';
}

function isSpecialTask(task: TeamTask) {
  return task.sourceActionKind === 'enrollment' || (task.sourceActionKind === 'follow-up' && task.source === 'webinar');
}

function interactionState(task: TeamTask): InteractionState {
  return task.interactionState === 'waiting-reply' || task.interactionState === 'reply-received'
    ? task.interactionState
    : 'queue';
}

function isAsyncChannel(task: TeamTask) {
  return task.type === 'whatsapp' || task.type === 'email';
}

function taskSort(a: TeamTask, b: TeamTask) {
  const aDate = `${a.dueDate || '9999-12-31'}${a.dueTime || '23:59'}`;
  const bDate = `${b.dueDate || '9999-12-31'}${b.dueTime || '23:59'}`;
  const dateCompare = aDate.localeCompare(bDate);
  if (dateCompare !== 0) return dateCompare;
  return priorityMeta(a, 'es').value - priorityMeta(b, 'es').value;
}

export function PriorityRadarWorkspace({ language, onOpenClient }: { language: Language; onOpenClient: (id: string) => void }) {
  const [tasks, setTasks] = useState<TeamTask[]>(() => loadTasks() as TeamTask[]);
  const [team, setTeam] = useState<WorkspaceTeamState | null>(null);
  const [view, setView] = useState<TaskView>('mine');
  const [lane, setLane] = useState<WorkLane>('queue');
  const [showDone, setShowDone] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [resultDraft, setResultDraft] = useState('');
  const [newType, setNewType] = useState<WorkActionType>('whatsapp');
  const [newNote, setNewNote] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newAssigneeUid, setNewAssigneeUid] = useState('');

  const refreshTeam = async () => {
    try {
      const next = await loadExpertWorkspaceTeam();
      setTeam(next);
      if (!newAssigneeUid) setNewAssigneeUid(next.currentUid);
    } catch {}
  };

  useEffect(() => {
    void refreshTeam();
    void hydrateExpertsTaskMemory().then(() => setTasks(loadTasks() as TeamTask[]));
    const refresh = () => setTasks(loadTasks() as TeamTask[]);
    window.addEventListener(WORKSPACE_STATE_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(WORKSPACE_STATE_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const currentUid = team?.currentUid || '';
  const isOwner = Boolean(team && team.workspaceId === team.currentUid);
  const canReadTeam = Boolean(team && hasWorkspacePermission(team.currentMember.permissions, 'tasks.read.team'));
  const canManageTeam = Boolean(team && hasWorkspacePermission(team.currentMember.permissions, 'tasks.manage'));
  const canManageOwn = Boolean(team && hasWorkspacePermission(team.currentMember.permissions, 'tasks.manage.own'));
  const activeMembers = useMemo(() => (team?.members || []).filter((member) => member.status === 'active'), [team]);

  useEffect(() => {
    if (view === 'team' && !canReadTeam) setView('mine');
  }, [canReadTeam, view]);

  const visibleTasks = useMemo(() => {
    if (view === 'team' && canReadTeam) return tasks;
    return tasks.filter((task) => task.assignedToUid === currentUid || (!task.assignedToUid && isOwner));
  }, [tasks, view, canReadTeam, currentUid, isOwner]);

  const activeTasks = useMemo(() => visibleTasks.filter((task) => task.status !== 'done' && !task.deletedAt), [visibleTasks]);
  const queueTasks = useMemo(() => activeTasks.filter((task) => interactionState(task) === 'queue').sort(taskSort), [activeTasks]);
  const waitingTasks = useMemo(() => activeTasks.filter((task) => interactionState(task) === 'waiting-reply').sort(taskSort), [activeTasks]);
  const repliedTasks = useMemo(() => activeTasks.filter((task) => interactionState(task) === 'reply-received').sort(taskSort), [activeTasks]);
  const laneTasks = lane === 'queue' ? queueTasks : lane === 'waiting' ? waitingTasks : repliedTasks;

  const openTasks = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return laneTasks;
    return laneTasks.filter((task) => [
      task.title,
      task.clientName,
      task.note || '',
      task.lastInteractionNote || '',
      task.assignedToName || task.assignee || '',
      actionLabel(task.type, language)
    ].some((value) => value.toLowerCase().includes(term)));
  }, [laneTasks, language, search]);

  const historyTasks = useMemo(() => visibleTasks
    .filter((task) => task.status === 'done' || Boolean(task.deletedAt))
    .sort((a, b) => (b.deletedAt || b.completedAt || b.createdAt).localeCompare(a.deletedAt || a.completedAt || a.createdAt)), [visibleTasks]);

  const teamCounts = useMemo(() => activeMembers.map((member) => ({
    member,
    count: tasks.filter((task) => task.assignedToUid === member.uid && task.status !== 'done' && !task.deletedAt).length
  })), [activeMembers, tasks]);

  const persistTasks = (next: TeamTask[]) => {
    setTasks(next);
    saveTasks(next as WorkTask[]);
  };

  const patchTask = (task: TeamTask, patch: Partial<TeamTask>) => {
    const normalized: Partial<TeamTask> = { ...patch };
    if (patch.status === 'done' && task.status !== 'done' && !patch.completedAt) normalized.completedAt = new Date().toISOString();
    if (patch.status && patch.status !== 'done') normalized.completedAt = undefined;
    const updated = { ...task, ...normalized } as TeamTask;
    const next = tasks.map((item) => item.id === task.id ? updated : item);
    persistTasks(next);
    void persistExpertWorkTask(updated);
    return updated;
  };

  const canWork = (task: TeamTask) => canManageTeam || (canManageOwn && task.assignedToUid === currentUid) || isOwner;

  const setAssignee = (task: TeamTask, uid: string) => {
    if (!canManageTeam && !isOwner) return;
    const member = activeMembers.find((item) => item.uid === uid);
    if (!member) return;
    const updated = patchTask(task, {
      assignedToUid: member.uid,
      assignedToName: memberLabel(member),
      assignee: memberLabel(member)
    });
    if (isOwner && task.clientId) appendJournal(task.clientId, 'task', language === 'es' ? 'Tarea reasignada' : 'Task reassigned', `${task.title} → ${memberLabel(member)}`);
    void appendExpertAuditLog({ entityType: 'work_task', entityId: task.id, action: 'task.reassigned', changes: { assignedToUid: updated.assignedToUid, assignedToName: updated.assignedToName } }).catch(() => {});
  };

  const toggleWork = (task: TeamTask) => {
    if (activeTaskId === task.id) {
      setActiveTaskId(null);
      return;
    }
    setActiveTaskId(task.id);
    setResultDraft(task.result || task.lastInteractionNote || '');
    setNewAssigneeUid(task.assignedToUid || currentUid);
  };

  const logInteractionEvent = (task: TeamTask, type: string, metadata: Record<string, unknown>) => {
    if (!task.personId) return;
    void appendExpertRelationshipEvent({
      personId: task.personId,
      type,
      sourceType: 'work_task',
      sourceId: task.id,
      metadata
    }).catch(() => {});
  };

  const markWaiting = (task: TeamTask) => {
    if (!canWork(task) || !isAsyncChannel(task)) return;
    const note = resultDraft.trim();
    const now = new Date().toISOString();
    patchTask(task, {
      status: 'pending',
      interactionState: 'waiting-reply',
      awaitingReplySince: now,
      replyReceivedAt: '',
      lastInteractionNote: note,
      result: note || task.result
    });
    logInteractionEvent(task, 'interaction.waiting_reply', { channel: task.type, note, assignedToUid: task.assignedToUid || '' });
    void appendExpertAuditLog({ entityType: 'work_task', entityId: task.id, action: 'interaction.waiting_reply', changes: { channel: task.type, awaitingReplySince: now } }).catch(() => {});
    setActiveTaskId(null);
    setResultDraft('');
    setLane('waiting');
  };

  const markReplyReceived = (task: TeamTask) => {
    if (!canWork(task)) return;
    const now = new Date().toISOString();
    patchTask(task, {
      status: 'pending',
      interactionState: 'reply-received',
      replyReceivedAt: now
    });
    logInteractionEvent(task, 'interaction.reply_received', { channel: task.type, replyReceivedAt: now });
    void appendExpertAuditLog({ entityType: 'work_task', entityId: task.id, action: 'interaction.reply_received', changes: { channel: task.type, replyReceivedAt: now } }).catch(() => {});
    setActiveTaskId(null);
    setLane('replied');
  };

  const returnToQueue = (task: TeamTask) => {
    if (!canWork(task)) return;
    patchTask(task, { interactionState: 'queue', status: 'pending' });
    setActiveTaskId(null);
    setLane('queue');
  };

  const finishTask = (task: TeamTask, result: string) => {
    if (!canWork(task)) return;
    const cleanResult = result.trim();
    const updated = patchTask(task, {
      status: 'done',
      interactionState: 'queue',
      result: cleanResult,
      completedByUid: currentUid
    });
    if (isOwner && task.clientId) appendJournal(task.clientId, 'task-result', language === 'es' ? 'Trabajo completado' : 'Work completed', cleanResult || task.title);
    void appendExpertAuditLog({ entityType: 'work_task', entityId: task.id, action: 'task.completed', changes: { result: cleanResult, clientId: task.clientId, personId: task.personId || '' } }).catch(() => {});
    if (updated.personId) logInteractionEvent(updated, 'task.completed', { title: updated.title, result: cleanResult, completedByUid: currentUid });
    setActiveTaskId(null);
    setResultDraft('');
  };

  const removeTask = (task: TeamTask) => {
    if (!canWork(task)) return;
    const deletedAt = new Date().toISOString();
    patchTask(task, { deletedAt, deletedFromStatus: task.status });
    if (isOwner && task.clientId) appendJournal(task.clientId, 'task', language === 'es' ? 'Tarea enviada al historial' : 'Task moved to history', task.title);
    if (activeTaskId === task.id) setActiveTaskId(null);
  };

  const recoverTask = (task: TeamTask) => {
    if (!canWork(task)) return;
    patchTask(task, {
      status: task.deletedFromStatus || 'pending',
      deletedAt: undefined,
      deletedFromStatus: undefined,
      interactionState: 'queue'
    });
  };

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
    persistTasks([nextTask, ...tasks]);
    void persistExpertWorkTask(nextTask);
    void appendExpertAuditLog({ entityType: 'work_task', entityId: nextTask.id, action: 'task.created', changes: { assignedToUid: assignee.uid, clientId: task.clientId, personId: task.personId || '' } }).catch(() => {});
    if (isOwner && task.clientId) appendJournal(task.clientId, 'task', language === 'es' ? 'Nueva acción desde Trabajo prioritario' : 'New action from Priority Work', `${actionLabel(newType, language)} · ${clean} · ${memberLabel(assignee)}`);
    setNewNote('');
    setNewDate('');
    setNewTime('');
  };

  const pendingCount = queueTasks.length;
  const waitingCount = waitingTasks.length;
  const repliedCount = repliedTasks.length;
  const delegatedCount = activeTasks.filter((task) => task.assignedToUid && task.assignedToUid !== currentUid).length;

  const laneDescription = lane === 'queue'
    ? (language === 'es' ? 'Ejecuta en orden. Cuando un WhatsApp o email quede esperando respuesta, sácalo de esta cola.' : 'Execute in order. Move WhatsApp or email work out of this queue when waiting for a reply.')
    : lane === 'waiting'
      ? (language === 'es' ? 'Interacciones ya iniciadas que no deben bloquear la cola principal.' : 'Started interactions that should not block the main queue.')
      : (language === 'es' ? 'Estas personas respondieron y vuelven a requerir atención del responsable.' : 'These people replied and need the assignee’s attention again.');

  return <div className="space-y-4">
    <section className="rounded-2xl border border-black/10 bg-white p-4 md:p-5">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">PRIORITY WORK</p>
          <h3 className="mt-1.5 text-xl font-semibold">{view === 'mine' ? (language === 'es' ? 'Mi trabajo' : 'My work') : (language === 'es' ? 'Trabajo del equipo' : 'Team work')}</h3>
          <p className="mt-1.5 max-w-2xl text-sm leading-5 text-black/50">{laneDescription}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="min-w-[92px] rounded-xl bg-[#111413] px-3 py-2 text-white"><p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-white/55">{language === 'es' ? 'POR HACER' : 'TO DO'}</p><p className="mt-1 text-lg font-semibold">{pendingCount}</p></div>
          <div className="min-w-[92px] rounded-xl border border-black/8 bg-[#FAFAF8] px-3 py-2"><p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-black/35">{language === 'es' ? 'ESPERANDO' : 'WAITING'}</p><p className="mt-1 text-lg font-semibold">{waitingCount}</p></div>
          <div className={`min-w-[92px] rounded-xl border px-3 py-2 ${repliedCount ? 'border-[#A23A32]/20 bg-[#A23A32]/6' : 'border-black/8 bg-[#FAFAF8]'}`}><p className={`text-[8px] font-semibold uppercase tracking-[0.12em] ${repliedCount ? 'text-[#8D332C]' : 'text-black/35'}`}>{language === 'es' ? 'RESPONDIERON' : 'REPLIED'}</p><p className={`mt-1 text-lg font-semibold ${repliedCount ? 'text-[#8D332C]' : ''}`}>{repliedCount}</p></div>
          {view === 'team' && <div className="min-w-[92px] rounded-xl border border-black/8 bg-[#FAFAF8] px-3 py-2"><p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-black/35">{language === 'es' ? 'DELEGADAS' : 'DELEGATED'}</p><p className="mt-1 text-lg font-semibold">{delegatedCount}</p></div>}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-black/5 pt-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex rounded-full border border-black/10 bg-[#F7F7F5] p-1">
            <button type="button" onClick={() => setView('mine')} className={`rounded-full px-4 py-2 text-xs font-semibold ${view === 'mine' ? 'bg-[#111413] text-white' : 'text-black/45'}`}>{language === 'es' ? 'Mi trabajo' : 'My work'}</button>
            {canReadTeam && <button type="button" onClick={() => setView('team')} className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold ${view === 'team' ? 'bg-[#111413] text-white' : 'text-black/45'}`}><UsersRound className="h-3.5 w-3.5" />{language === 'es' ? 'Equipo' : 'Team'}</button>}
          </div>
          <div className="inline-flex rounded-full border border-black/10 bg-white p-1">
            <button type="button" onClick={() => { setLane('queue'); setActiveTaskId(null); }} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold ${lane === 'queue' ? 'bg-[#111413] text-white' : 'text-black/45'}`}><ListTodo className="h-3.5 w-3.5" />{language === 'es' ? 'Por hacer' : 'To do'} <span>{pendingCount}</span></button>
            <button type="button" onClick={() => { setLane('waiting'); setActiveTaskId(null); }} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold ${lane === 'waiting' ? 'bg-[#111413] text-white' : 'text-black/45'}`}><Inbox className="h-3.5 w-3.5" />{language === 'es' ? 'Interacciones activas' : 'Active interactions'} <span>{waitingCount}</span></button>
            <button type="button" onClick={() => { setLane('replied'); setActiveTaskId(null); }} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold ${lane === 'replied' ? 'bg-[#111413] text-white' : repliedCount ? 'text-[#8D332C]' : 'text-black/45'}`}><BellRing className="h-3.5 w-3.5" />{language === 'es' ? 'Respondieron' : 'Replied'} <span>{repliedCount}</span></button>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <label className="relative block w-full sm:max-w-[360px]"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={language === 'es' ? 'Buscar tarea, persona o responsable…' : 'Search task, person or assignee…'} className="w-full rounded-xl border border-black/10 bg-[#FAFAF8] py-2 pl-9 pr-3 text-sm" /></label>
          <label className="flex shrink-0 items-center gap-2 text-xs text-black/45"><input type="checkbox" checked={showDone} onChange={(event) => setShowDone(event.target.checked)} />{language === 'es' ? 'Historial' : 'History'}</label>
        </div>
      </div>
    </section>

    {view === 'team' && canReadTeam && <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{teamCounts.map(({ member, count }) => <div key={member.uid} className="rounded-xl border border-black/8 bg-white p-3"><p className="truncate text-xs font-semibold">{memberLabel(member)}</p><p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-black/35">{count} {language === 'es' ? 'abiertas' : 'open'}</p></div>)}</section>}

    <section className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_10px_30px_rgba(10,10,10,0.025)]">
      <div className="hidden grid-cols-[minmax(240px,1.25fr)_90px_105px_145px_170px_100px] gap-3 border-b border-black/7 bg-[#FAFAF8] px-4 py-2.5 text-[9px] font-semibold uppercase tracking-[0.13em] text-black/35 lg:grid"><span>{language === 'es' ? 'Trabajo' : 'Work'}</span><span>{language === 'es' ? 'Prioridad' : 'Priority'}</span><span>{language === 'es' ? 'Tipo' : 'Type'}</span><span>{language === 'es' ? 'Cuándo' : 'When'}</span><span>{language === 'es' ? 'Responsable' : 'Assignee'}</span><span /></div>
      <div className="max-h-[650px] divide-y divide-black/5 overflow-y-auto">
        {openTasks.map((task) => {
          const priority = priorityMeta(task, language);
          const opened = activeTaskId === task.id;
          const taskCanWork = canWork(task);
          const specialAssignee = activeMembers.find((member) => member.uid === task.assignedToUid) || team?.currentMember || activeMembers[0];
          const state = interactionState(task);
          return <div key={task.id} className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(240px,1.25fr)_90px_105px_145px_170px_100px] lg:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">{task.title}</p>
                {task.sourceActionKind === 'enrollment' && <span className="rounded-full bg-[#1E7A4D]/10 px-2 py-0.5 text-[9px] font-semibold text-[#17603D]">{language === 'es' ? 'COMPRÓ' : 'PURCHASED'}</span>}
                {task.sourceActionKind === 'follow-up' && task.source === 'webinar' && <span className="rounded-full bg-[#A46F16]/10 px-2 py-0.5 text-[9px] font-semibold text-[#82570F]">{language === 'es' ? 'NO COMPRÓ' : 'NO PURCHASE'}</span>}
                {state === 'waiting-reply' && <span className="rounded-full bg-black/5 px-2 py-0.5 text-[9px] font-semibold text-black/45">{language === 'es' ? 'ESPERANDO RESPUESTA' : 'WAITING FOR REPLY'}</span>}
                {state === 'reply-received' && <span className="rounded-full bg-[#A23A32]/9 px-2 py-0.5 text-[9px] font-semibold text-[#8D332C]">{language === 'es' ? 'RESPONDIÓ' : 'REPLIED'}</span>}
              </div>
              {(task.personId || task.clientId) && isOwner
                ? <button type="button" onClick={() => onOpenClient(task.personId || task.clientId)} className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-[#0A3F4D] hover:underline">{task.clientName}<ChevronRight className="h-3 w-3" /></button>
                : <p className="mt-0.5 text-xs font-medium text-[#0A3F4D]">{task.clientName}</p>}
              {task.note && <p className="mt-0.5 line-clamp-1 text-xs leading-5 text-black/45">{task.note}</p>}
              {state === 'waiting-reply' && <p className="mt-1 text-[10px] text-black/35">{language === 'es' ? 'Esperando desde' : 'Waiting since'} {formatMoment(task.awaitingReplySince, language)}</p>}
              {state === 'reply-received' && <p className="mt-1 text-[10px] font-medium text-[#8D332C]">{language === 'es' ? 'Respuesta recibida' : 'Reply received'} · {formatMoment(task.replyReceivedAt, language)}</p>}
            </div>
            <span className={`w-fit rounded-full px-2.5 py-1 text-[9px] font-semibold ${priority.className}`}>{priority.label}</span>
            <div className="flex items-center gap-2 text-xs text-black/55"><ActionIcon kind={task.type} /><span>{actionLabel(task.type, language)}</span></div>
            <div className="flex items-center gap-2 text-xs text-black/55"><Clock3 className="h-3.5 w-3.5" /><span>{formatDue(task, language)}</span></div>
            {canManageTeam || isOwner
              ? <label className="relative"><UserRoundCheck className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/30" /><select value={task.assignedToUid || currentUid} onChange={(event) => setAssignee(task, event.target.value)} className="w-full rounded-lg border border-black/8 bg-white py-1.5 pl-8 pr-2 text-xs">{activeMembers.map((member) => <option key={member.uid} value={member.uid}>{memberLabel(member)}</option>)}</select></label>
              : <div className="flex items-center gap-2 text-xs text-black/55"><UserRoundCheck className="h-3.5 w-3.5" /><span className="truncate">{task.assignedToName || task.assignee}</span></div>}
            <button type="button" disabled={!taskCanWork} onClick={() => toggleWork(task)} className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#111413] px-3 py-1.5 text-[10px] font-semibold text-white disabled:opacity-30">{opened ? (language === 'es' ? 'Cerrar' : 'Close') : (language === 'es' ? 'Trabajar' : 'Work')}<ChevronDown className={`h-3 w-3 transition ${opened ? 'rotate-180' : ''}`} /></button>

            {opened && taskCanWork && state === 'waiting-reply' && <div className="rounded-xl border border-black/8 bg-[#FAFAF8] p-4 lg:col-span-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div><p className="text-xs font-semibold">{language === 'es' ? 'Interacción activa · esperando respuesta' : 'Active interaction · waiting for reply'}</p><p className="mt-1 text-xs leading-5 text-black/45">{task.lastInteractionNote || (language === 'es' ? 'El contacto ya fue realizado.' : 'The contact has already been made.')}</p></div>
                <div className="flex flex-wrap gap-2"><button type="button" onClick={() => markReplyReceived(task)} className="inline-flex items-center gap-1.5 rounded-full bg-[#111413] px-4 py-2 text-xs font-semibold text-white"><BellRing className="h-3.5 w-3.5" />{language === 'es' ? 'Marcar respuesta recibida' : 'Mark reply received'}</button><button type="button" onClick={() => returnToQueue(task)} className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-black/55">{language === 'es' ? 'Volver a por hacer' : 'Return to queue'}</button></div>
              </div>
              <p className="mt-3 text-[10px] text-black/35">{language === 'es' ? 'Cuando conectemos WhatsApp/email, este cambio podrá ocurrir automáticamente mediante webhook. Mientras tanto puedes marcar la respuesta manualmente.' : 'Once WhatsApp/email are connected, this can update automatically via webhook. Until then, replies can be marked manually.'}</p>
            </div>}

            {opened && taskCanWork && state !== 'waiting-reply' && isSpecialTask(task) && specialAssignee && <div className="space-y-3 lg:col-span-6">
              {isAsyncChannel(task) && <div className="flex justify-end"><button type="button" onClick={() => markWaiting(task)} className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-black/60"><Send className="h-3.5 w-3.5" />{language === 'es' ? 'Contacto enviado · esperar respuesta' : 'Contact sent · wait for reply'}</button></div>}
              <PriorityTaskSpecialPanel task={task} language={language} assignee={specialAssignee} onCompleted={(result) => finishTask(task, result)} />
            </div>}

            {opened && taskCanWork && state !== 'waiting-reply' && !isSpecialTask(task) && <div className="rounded-xl border border-black/8 bg-[#FAFAF8] p-3 lg:col-span-6">
              <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/38">{state === 'reply-received' ? (language === 'es' ? 'CONTINUAR INTERACCIÓN' : 'CONTINUE INTERACTION') : (language === 'es' ? 'EJECUTAR TAREA' : 'EXECUTE TASK')}</p>
                  <label className="mt-2 block"><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'RESULTADO / NOTA' : 'RESULT / NOTE'}</span><textarea value={resultDraft} onChange={(event) => setResultDraft(event.target.value)} rows={3} className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm" /></label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" onClick={() => finishTask(task, resultDraft)} className="inline-flex items-center gap-1.5 rounded-full bg-[#111413] px-4 py-2 text-xs font-semibold text-white"><CheckCircle2 className="h-3.5 w-3.5" />{language === 'es' ? 'Guardar y completar' : 'Save & complete'}</button>
                    {isAsyncChannel(task) && <button type="button" onClick={() => markWaiting(task)} className="inline-flex items-center gap-1.5 rounded-full border border-[#0A3F4D]/15 bg-white px-4 py-2 text-xs font-semibold text-[#0A3F4D]"><Send className="h-3.5 w-3.5" />{language === 'es' ? 'En espera de respuesta' : 'Waiting for reply'}</button>}
                    <button type="button" onClick={() => removeTask(task)} className="inline-flex items-center gap-1.5 rounded-full border border-[#A23A32]/15 bg-white px-4 py-2 text-xs font-semibold text-[#8D332C]"><Trash2 className="h-3.5 w-3.5" />{language === 'es' ? 'Enviar al historial' : 'Move to history'}</button>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0A3F4D]">{language === 'es' ? 'NUEVA ACCIÓN SI SE REQUIERE' : 'NEW ACTION IF NEEDED'}</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    <select value={newType} onChange={(event) => setNewType(event.target.value as WorkActionType)} className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="call">{language === 'es' ? 'Llamada' : 'Call'}</option><option value="meeting">{language === 'es' ? 'Reunión' : 'Meeting'}</option><option value="task">{language === 'es' ? 'Tarea interna' : 'Internal task'}</option></select>
                    <select value={newAssigneeUid || currentUid} disabled={!canManageTeam && !isOwner} onChange={(event) => setNewAssigneeUid(event.target.value)} className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm disabled:bg-black/[0.03]">{activeMembers.map((member) => <option key={member.uid} value={member.uid}>{memberLabel(member)}</option>)}</select>
                    <input type="date" value={newDate} onChange={(event) => setNewDate(event.target.value)} className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm" />
                    <input type="time" value={newTime} onChange={(event) => setNewTime(event.target.value)} className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm" />
                  </div>
                  <div className="mt-2 flex gap-2"><input value={newNote} onChange={(event) => setNewNote(event.target.value)} placeholder={language === 'es' ? 'Qué debe hacerse' : 'What needs to be done'} className="min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm" /><button type="button" onClick={() => createFollowUp(task)} className="shrink-0 rounded-full bg-[#0A3F4D] px-4 py-2 text-xs font-semibold text-white">{language === 'es' ? 'Agregar acción' : 'Add action'}</button></div>
                </div>
              </div>
            </div>}
          </div>;
        })}
        {openTasks.length === 0 && <div className="grid min-h-[210px] place-items-center p-8 text-center text-sm text-black/40">{search.trim()
          ? (language === 'es' ? 'No hay tareas que coincidan con la búsqueda.' : 'No tasks match the search.')
          : lane === 'queue'
            ? (language === 'es' ? 'No hay tareas pendientes en la cola principal.' : 'No pending work in the main queue.')
            : lane === 'waiting'
              ? (language === 'es' ? 'No hay interacciones esperando respuesta.' : 'No interactions are waiting for a reply.')
              : (language === 'es' ? 'No hay respuestas nuevas pendientes de atender.' : 'No new replies need attention.')}</div>}
      </div>
    </section>

    {showDone && <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
      <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">{language === 'es' ? 'HISTORIAL DE TAREAS' : 'TASK HISTORY'}</p><h3 className="mt-2 text-lg font-semibold">{language === 'es' ? 'Completadas y eliminadas' : 'Completed and removed'}</h3></div><span className="rounded-full bg-[#0A3F4D]/8 px-3 py-1.5 text-xs font-semibold text-[#0A3F4D]">{historyTasks.length}</span></div>
      <div className="mt-4 max-h-[430px] divide-y divide-black/5 overflow-y-auto rounded-xl border border-black/7">
        {historyTasks.map((task) => <div key={task.id} className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_160px_170px_auto] md:items-center">
          <div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{task.title}</p><span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${task.deletedAt ? 'bg-[#A23A32]/9 text-[#8D332C]' : 'bg-[#0A3F4D]/8 text-[#0A3F4D]'}`}>{task.deletedAt ? (language === 'es' ? 'ELIMINADA' : 'REMOVED') : (language === 'es' ? 'COMPLETADA' : 'COMPLETED')}</span></div><p className="mt-1 text-xs text-black/45">{task.clientName}{task.result ? ` · ${task.result}` : ''}</p></div>
          <span className="text-xs text-black/50">{task.assignedToName || task.assignee}</span>
          <span className="text-xs text-black/45">{formatDue(task, language)}</span>
          {task.deletedAt && <button type="button" disabled={!canWork(task)} onClick={() => recoverTask(task)} className="inline-flex items-center gap-1.5 rounded-full border border-[#0A3F4D]/15 bg-white px-3 py-2 text-[10px] font-semibold text-[#0A3F4D] disabled:opacity-30"><RotateCcw className="h-3.5 w-3.5" />{language === 'es' ? 'Recuperar' : 'Recover'}</button>}
        </div>)}
        {historyTasks.length === 0 && <div className="p-6 text-center text-sm text-black/40">{language === 'es' ? 'Aún no hay tareas en el historial.' : 'No task history yet.'}</div>}
      </div>
    </section>}
  </div>;
}
