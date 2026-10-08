import React, { useEffect, useMemo, useState } from 'react';
import { BellRing, CalendarCheck2, CheckCircle2, ChevronDown, ChevronRight, Clock3, Inbox, ListTodo, Mail, MessageCircle, Pencil, Phone, Search, ShoppingBag, Trash2, UserRoundCheck, UsersRound } from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';
import { loadMentoringClientCache } from '../../services/expertsMentoringClientCache';
import { completeExpertWorkTaskWithNext, hydrateExpertsTaskMemory, persistExpertWorkTask } from '../../services/expertsTaskMemory';
import { appendExpertAuditLog, appendExpertRelationshipEvent, hasWorkspacePermission, loadExpertWorkspaceTeam, workspaceAssigneeLabel, type WorkspaceMember, type WorkspaceTeamState } from '../../services/expertsWorkspaceCore';
import { appendJournal, getWorkPriority, loadTasks, refreshClientNextAction, saveTasks, WORKSPACE_STATE_EVENT, type WorkActionType, type WorkTask } from './workspaceState';
import { BuyerQueueWorkspaceV2 } from './BuyerQueueWorkspaceV2';
import { WorkTimeField } from './WorkTimeField';

type Interaction = 'queue' | 'waiting-reply' | 'reply-received';
type Lane = 'queue' | 'waiting' | 'replied';
type View = 'mine' | 'team';
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
  interactionState?: Interaction;
  awaitingReplySince?: string;
  replyReceivedAt?: string;
  lastInteractionNote?: string;
};
type MentoringClientLink = { id: string; personId?: string };

function stateOf(task: TeamTask): Interaction {
  return task.interactionState === 'waiting-reply' || task.interactionState === 'reply-received' ? task.interactionState : 'queue';
}

function isFollowUp(task: TeamTask) {
  return task.workstream === 'follow-up' || task.sourceActionKind === 'continuity' || (task.source === 'webinar' && task.sourceActionKind === 'follow-up');
}

function isBuyer(task: TeamTask) {
  return task.source === 'webinar' && task.sourceActionKind === 'enrollment';
}

function isInternalAutomation(task: TeamTask) {
  return Boolean(task.workstream?.startsWith('formation-')) ||
    Boolean(task.sourceActionKind?.startsWith('formation-')) ||
    /^confirmar acceso y onboarding/i.test(task.title || '');
}

function memberLabel(member?: WorkspaceMember) {
  return member?.displayName || member?.email || member?.uid || '';
}

function actionLabel(type: WorkActionType, language: Language) {
  if (type === 'whatsapp') return 'WhatsApp';
  if (type === 'email') return 'Email';
  if (type === 'call') return language === 'es' ? 'Llamada' : 'Call';
  if (type === 'meeting') return language === 'es' ? 'Reunión' : 'Meeting';
  return language === 'es' ? 'Tarea' : 'Task';
}

function ActionIcon({ type }: { type: WorkActionType }) {
  if (type === 'email') return <Mail className="h-4 w-4" />;
  if (type === 'whatsapp') return <MessageCircle className="h-4 w-4" />;
  if (type === 'call') return <Phone className="h-4 w-4" />;
  if (type === 'meeting') return <CalendarCheck2 className="h-4 w-4" />;
  return <ListTodo className="h-4 w-4" />;
}

function due(task: TeamTask, language: Language) {
  if (!task.dueDate) return language === 'es' ? 'Sin fecha' : 'No date';
  const date = new Date(`${task.dueDate}T${task.dueTime || '12:00'}:00`);
  return Number.isFinite(date.getTime())
    ? `${new Intl.DateTimeFormat(language === 'es' ? 'es-CL' : 'en-US', { day: '2-digit', month: 'short' }).format(date)}${task.dueTime ? ` · ${task.dueTime}` : ''}`
    : task.dueDate;
}

function priority(task: TeamTask, language: Language) {
  const value = getWorkPriority(task);
  if (value === 'high') return { rank: 0, label: language === 'es' ? 'Alta' : 'High', cls: 'bg-[#A23A32]/9 text-[#8D332C]' };
  if (value === 'medium') return { rank: 1, label: language === 'es' ? 'Media' : 'Medium', cls: 'bg-[#A46F16]/10 text-[#82570F]' };
  return { rank: 2, label: 'Normal', cls: 'bg-[#0A3F4D]/8 text-[#0A3F4D]' };
}

function internalActiveStyle(active: boolean): React.CSSProperties | undefined {
  return active ? {
    background: 'var(--gkais-internal-accent, #111413)',
    color: 'var(--gkais-internal-accent-text, #ffffff)'
  } : undefined;
}

export function PriorityRadarWorkspace({ language, onOpenClient }: { language: Language; onOpenClient: (id: string) => void }) {
  const requested = new URLSearchParams(window.location.search);
  const requestedClientId = requested.get('client') || '';
  const requestedPersonId = requested.get('person') || '';
  const [mainTab, setMainTab] = useState<MainTab>('active');
  const [tasks, setTasks] = useState<TeamTask[]>(() => loadTasks() as TeamTask[]);
  const [team, setTeam] = useState<WorkspaceTeamState | null>(null);
  const [view, setView] = useState<View>('mine');
  const [lane, setLane] = useState<Lane>('queue');
  const [search, setSearch] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [activeId, setActiveId] = useState('');
  const [result, setResult] = useState('');
  const [nextType, setNextType] = useState<WorkActionType>('whatsapp');
  const [nextAssignee, setNextAssignee] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [nextTime, setNextTime] = useState('');
  const [nextNote, setNextNote] = useState('');
  const [savingNext, setSavingNext] = useState(false);
  const [nextError, setNextError] = useState('');
  const [editingId, setEditingId] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editResult, setEditResult] = useState('');
  const [editType, setEditType] = useState<WorkActionType>('task');
  const [editAssignee, setEditAssignee] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');

  useEffect(() => {
    void loadExpertWorkspaceTeam().then((state) => {
      setTeam(state);
      setNextAssignee(state.currentUid);
    }).catch(() => {});
    void hydrateExpertsTaskMemory().then(() => setTasks(loadTasks() as TeamTask[]));
    const refresh = () => setTasks(loadTasks() as TeamTask[]);
    window.addEventListener(WORKSPACE_STATE_EVENT, refresh);
    return () => window.removeEventListener(WORKSPACE_STATE_EVENT, refresh);
  }, []);

  const currentUid = team?.currentUid || '';
  const isOwner = Boolean(team && team.workspaceId === team.currentUid);
  const canReadTeam = Boolean(team && hasWorkspacePermission(team.currentMember.permissions, 'tasks.read.team'));
  const canManageTeam = Boolean(team && hasWorkspacePermission(team.currentMember.permissions, 'tasks.manage'));
  const canManageOwn = Boolean(team && hasWorkspacePermission(team.currentMember.permissions, 'tasks.manage.own'));
  const members = useMemo(() => (team?.members || []).filter((member) => member.status === 'active'), [team]);
  const assigneeOptionLabel = (member: WorkspaceMember) => workspaceAssigneeLabel(member, team?.roles || []);
  // Fields are always visible; editing any next-action detail opts into delegation.
  // An untouched form only completes the current task.
  const hasNextAction = nextType !== 'whatsapp'
    || (nextAssignee || currentUid) !== currentUid
    || Boolean(nextDate || nextTime || nextNote.trim());
  const clientPersonById = useMemo(() => new Map(loadMentoringClientCache<MentoringClientLink>().filter((item) => item.id && item.personId).map((item) => [item.id, item.personId!])), [tasks]);
  const resolvedPersonId = (task: TeamTask) => task.personId || clientPersonById.get(task.clientId) || '';

  const visible = useMemo(() => {
    const source = view === 'team' && canReadTeam
      ? tasks
      : tasks.filter((task) => task.assignedToUid === currentUid || (!task.assignedToUid && isOwner));
    return source.filter((task) => !isFollowUp(task) && !isBuyer(task) && !isInternalAutomation(task));
  }, [tasks, view, canReadTeam, currentUid, isOwner]);

  const active = visible.filter((task) => task.status !== 'done' && !task.deletedAt);
  const sort = (left: TeamTask, right: TeamTask) =>
    `${left.dueDate || '9999-12-31'}${left.dueTime || '23:59'}`.localeCompare(`${right.dueDate || '9999-12-31'}${right.dueTime || '23:59'}`) ||
    priority(left, language).rank - priority(right, language).rank;
  const queues = {
    queue: active.filter((task) => stateOf(task) === 'queue').sort(sort),
    waiting: active.filter((task) => stateOf(task) === 'waiting-reply').sort(sort),
    replied: active.filter((task) => stateOf(task) === 'reply-received').sort(sort)
  };
  const rows = queues[lane].filter((task) => {
    const focused = !requestedClientId && !requestedPersonId
      ? true
      : task.clientId === requestedClientId || resolvedPersonId(task) === requestedPersonId;
    if (!focused) return false;
    const term = search.trim().toLowerCase();
    return !term || [task.clientName, task.title, task.note, task.assignedToName || task.assignee]
      .some((value) => String(value || '').toLowerCase().includes(term));
  });
  const history = visible
    .filter((task) => task.status === 'done' || Boolean(task.deletedAt))
    .filter((task) => !requestedClientId && !requestedPersonId || task.clientId === requestedClientId || resolvedPersonId(task) === requestedPersonId)
    .sort((left, right) => (right.deletedAt || right.completedAt || right.createdAt).localeCompare(left.deletedAt || left.completedAt || left.createdAt));

  const persist = (next: TeamTask[]) => { setTasks(next); saveTasks(next as WorkTask[]); };
  const patch = (task: TeamTask, change: Partial<TeamTask>) => {
    const linkedPersonId = resolvedPersonId(task);
    const updated = { ...task, ...change, ...(!task.personId && linkedPersonId ? { personId: linkedPersonId } : {}) } as TeamTask;
    if (change.status === 'done' && !updated.completedAt) updated.completedAt = new Date().toISOString();
    persist(tasks.map((item) => item.id === task.id ? updated : item));
    if (task.clientId) refreshClientNextAction(task.clientId);
    void persistExpertWorkTask(updated);
    return updated;
  };
  const canWork = (task: TeamTask) => canManageTeam || isOwner || (canManageOwn && task.assignedToUid === currentUid);
  const log = (task: TeamTask, type: string, metadata: Record<string, unknown>) => {
    const personId = resolvedPersonId(task);
    if (personId) void appendExpertRelationshipEvent({ personId, type, sourceType: 'work_task', sourceId: task.id, metadata }).catch(() => {});
  };

  const complete = async (task: TeamTask) => {
    if (savingNext) return;
    setSavingNext(true);
    setNextError('');
    const updated: TeamTask = {
      ...task,
      ...(!task.personId && resolvedPersonId(task) ? { personId: resolvedPersonId(task) } : {}),
      status: 'done',
      interactionState: 'queue',
      result: result.trim(),
      completedByUid: currentUid,
      completedAt: new Date().toISOString()
    };
    try {
      const next = hasNextAction ? buildNextAction(task) : undefined;
      // One atomic commit: no orphan follow-up and no unfinished source task.
      await completeExpertWorkTaskWithNext(updated, next);
      persist(next
        ? [next, ...tasks.map((item) => item.id === task.id ? updated : item)]
        : tasks.map((item) => item.id === task.id ? updated : item));
      if (task.clientId) refreshClientNextAction(task.clientId);
      if (isOwner && task.clientId) appendJournal(task.clientId, 'task-result', language === 'es' ? 'Trabajo completado' : 'Work completed', result || task.title);
      log(updated, 'task.completed', {
        result: result.trim(),
        ...(next ? { nextTaskId: next.id, nextAssignedToUid: next.assignedToUid } : {})
      });
      setActiveId('');
      setResult('');
      setNextNote('');
      setNextDate('');
      setNextTime('');
    } catch (cause) {
      setNextError(language === 'es'
        ? 'No se pudo completar y guardar el trabajo en Firebase. No se modificó ninguna de las dos tareas.'
        : 'Could not complete and save the work in Firebase. Neither task was changed.');
      console.error('WORK_COMPLETE_FAILED', cause);
    } finally {
      setSavingNext(false);
    }
  };

  const waiting = (task: TeamTask) => {
    patch(task, { interactionState: 'waiting-reply', awaitingReplySince: new Date().toISOString(), lastInteractionNote: result.trim(), result: result.trim() || task.result, status: 'pending' });
    log(task, 'interaction.waiting_reply', { channel: task.type, note: result.trim() });
    setActiveId('');
    setResult('');
    setLane('waiting');
  };

  const replied = (task: TeamTask) => {
    patch(task, { interactionState: 'reply-received', replyReceivedAt: new Date().toISOString(), status: 'pending' });
    setActiveId('');
    setLane('replied');
  };

  const remove = (task: TeamTask) => {
    patch(task, { deletedAt: new Date().toISOString(), deletedFromStatus: task.status });
    setActiveId('');
    setResult('');
  };

  const buildNextAction = (task: TeamTask): TeamTask => {
    const assigned = members.find((member) => member.uid === nextAssignee) || team?.currentMember;
    if (!assigned || assigned.status !== 'active') throw new Error('ASSIGNEE_REQUIRED');
    return {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      clientId: task.clientId,
      clientName: task.clientName,
      personId: resolvedPersonId(task) || undefined,
      title: `${actionLabel(nextType, language)} · ${task.clientName}`,
      type: nextType,
      note: nextNote.trim(),
      dueDate: nextDate,
      dueTime: nextTime,
      assignee: memberLabel(assigned),
      assignedToUid: assigned.uid,
      assignedToName: memberLabel(assigned),
      createdByUid: currentUid,
      status: 'pending',
      createdAt: new Date().toISOString(),
      source: 'manual',
      interactionState: 'queue',
      confirmationEmail: nextType === 'meeting' ? 'queued' : 'not-required'
    };
  };

  const beginEdit = (task: TeamTask) => {
    setEditingId(task.id);
    setEditNote(task.note || '');
    setEditResult(task.result || '');
    setEditType(task.type);
    setEditAssignee(task.assignedToUid || currentUid);
    setEditDate(task.dueDate || '');
    setEditTime(task.dueTime || '');
  };

  const saveEdit = (task: TeamTask) => {
    const assigned = members.find((member) => member.uid === editAssignee);
    patch(task, {
      note: editNote.trim(),
      result: editResult.trim(),
      type: editType,
      dueDate: editDate,
      dueTime: editTime,
      ...(assigned ? { assignedToUid: assigned.uid, assignedToName: memberLabel(assigned), assignee: memberLabel(assigned) } : {})
    });
    void appendExpertAuditLog({
      entityType: 'work_task',
      entityId: task.id,
      action: 'task.history_edited',
      changes: { note: editNote, result: editResult, type: editType, assignedToUid: editAssignee, dueDate: editDate, dueTime: editTime }
    }).catch(() => {});
    setEditingId('');
  };

  return <div className="space-y-4">
    <section className="rounded-2xl border border-black/10 bg-white p-4 md:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">PRIORITY WORK</p><h3 className="mt-1.5 text-xl font-semibold">{language === 'es' ? 'Trabajo operativo principal' : 'Primary operating work'}</h3><p className="mt-1.5 max-w-2xl text-sm leading-5 text-black/50">{language === 'es' ? 'Alumnos, clientes 1:1 y relaciones activas. No compradores se trabajan en Relaciones → Seguimiento.' : 'Students, 1:1 clients and active relationships. Non-buyers live in Relationships → Follow-up.'}</p></div>
        <div className="inline-flex h-fit w-fit shrink-0 self-start rounded-xl bg-[#F7F7F5] p-1 lg:self-center"><button type="button" onClick={() => setMainTab('active')} className={`inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-[11px] font-semibold ${mainTab === 'active' ? '' : 'text-black/50'}`} style={internalActiveStyle(mainTab === 'active')}><ListTodo className="h-3.5 w-3.5 shrink-0" />{language === 'es' ? 'Trabajo activo' : 'Active work'}</button><button type="button" onClick={() => setMainTab('buyers')} className={`inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-[11px] font-semibold ${mainTab === 'buyers' ? '' : 'text-black/50'}`} style={internalActiveStyle(mainTab === 'buyers')}><ShoppingBag className="h-3.5 w-3.5 shrink-0" />{language === 'es' ? 'Compradores' : 'Buyers'}</button></div>
      </div>
      {mainTab === 'active' && <div className="mt-4 flex flex-col gap-3 border-t border-black/5 pt-4 lg:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex rounded-xl bg-[#F7F7F5] p-1"><button type="button" onClick={() => setView('mine')} className={`rounded-lg px-3 py-2 text-xs font-semibold ${view === 'mine' ? '' : 'text-black/45'}`} style={internalActiveStyle(view === 'mine')}>{language === 'es' ? 'Mi trabajo' : 'My work'}</button>{canReadTeam && <button type="button" onClick={() => setView('team')} className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold ${view === 'team' ? '' : 'text-black/45'}`} style={internalActiveStyle(view === 'team')}><UsersRound className="h-3.5 w-3.5" />{language === 'es' ? 'Equipo' : 'Team'}</button>}</div>
          <div className="inline-flex rounded-xl border border-black/8 p-1"><LaneButton active={lane === 'queue'} onClick={() => setLane('queue')} icon={ListTodo} label={language === 'es' ? 'Por hacer' : 'To do'} count={queues.queue.length} /><LaneButton active={lane === 'waiting'} onClick={() => setLane('waiting')} icon={Inbox} label={language === 'es' ? 'Interacciones activas' : 'Active interactions'} count={queues.waiting.length} /><LaneButton active={lane === 'replied'} onClick={() => setLane('replied')} icon={BellRing} label={language === 'es' ? 'Respondieron' : 'Replied'} count={queues.replied.length} /></div>
        </div>
        <div className="flex gap-3"><label className="relative block min-w-[280px]"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={language === 'es' ? 'Buscar tarea o persona…' : 'Search task or person…'} className="w-full rounded-xl border border-black/10 py-2 pl-9 pr-3 text-sm" /></label><label className="flex items-center gap-2 text-xs text-black/45"><input type="checkbox" checked={showHistory} onChange={(event) => setShowHistory(event.target.checked)} />{language === 'es' ? 'Historial' : 'History'}</label></div>
      </div>}
      {mainTab === 'active' && (requestedClientId || requestedPersonId) && <p className="mt-3 text-[10px] font-medium text-[#0A3F4D]">{language === 'es' ? 'Vista filtrada al cliente seleccionado desde Mentorías.' : 'View filtered to the client selected from Mentoring.'}</p>}
    </section>

    {mainTab === 'buyers' ? <BuyerQueueWorkspaceV2 language={language} /> : <>
      <section className="overflow-hidden rounded-2xl border border-black/10 bg-white"><div className="gkais-light-scrollbar max-h-[700px] divide-y divide-black/5 overflow-y-auto">{rows.map((task) => {
        const opened = activeId === task.id;
        const state = stateOf(task);
        const taskPriority = priority(task, language);
        const personId = resolvedPersonId(task);
        return <div key={task.id} className="p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_90px_105px_145px_170px_auto] lg:items-center"><div><p className="text-sm font-semibold">{task.title}</p>{personId && isOwner ? <button type="button" onClick={() => onOpenClient(personId)} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[#0A3F4D]">{task.clientName}<ChevronRight className="h-3 w-3" /></button> : <p className="mt-1 text-xs font-medium text-[#0A3F4D]">{task.clientName}</p>}<p className="mt-1 line-clamp-1 text-xs text-black/40">{task.note}</p></div><span className={`w-fit rounded-full px-2.5 py-1 text-[9px] font-semibold ${taskPriority.cls}`}>{taskPriority.label}</span><div className="flex items-center gap-2 text-xs text-black/55"><ActionIcon type={task.type} />{actionLabel(task.type, language)}</div><div className="flex items-center gap-1.5 text-xs text-black/50"><Clock3 className="h-3.5 w-3.5" />{due(task, language)}</div>{canManageTeam || isOwner ? <label className="relative"><UserRoundCheck className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/30" /><select value={task.assignedToUid || currentUid} onChange={(event) => { const member = members.find((item) => item.uid === event.target.value); if (member) patch(task, { assignedToUid: member.uid, assignedToName: memberLabel(member), assignee: memberLabel(member) }); }} className="w-full rounded-lg border border-black/8 bg-white py-1.5 pl-8 pr-2 text-xs">{members.map((member) => <option key={member.uid} value={member.uid}>{assigneeOptionLabel(member)}</option>)}</select></label> : <span className="text-xs text-black/50">{task.assignedToName || task.assignee}</span>}<button type="button" disabled={!canWork(task)} onClick={() => { setActiveId(opened ? '' : task.id); setResult(task.result || task.lastInteractionNote || ''); setNextAssignee(currentUid); setNextType('whatsapp'); setNextDate(''); setNextTime(''); setNextNote(''); setNextError(''); }} className="inline-flex items-center justify-center gap-1 rounded-full bg-[#111413] px-3 py-2 text-[10px] font-semibold text-white disabled:opacity-30">{opened ? (language === 'es' ? 'Cerrar' : 'Close') : (language === 'es' ? 'Trabajar' : 'Work')}<ChevronDown className={`h-3 w-3 ${opened ? 'rotate-180' : ''}`} /></button></div>

          {opened && canWork(task) && state === 'waiting-reply' && <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-[#FAFAF8] p-3"><div><p className="text-xs font-semibold">{language === 'es' ? 'Esperando respuesta' : 'Waiting for reply'}</p><p className="mt-1 text-xs text-black/45">{task.lastInteractionNote || task.note}</p></div><div className="flex gap-2"><button type="button" onClick={() => replied(task)} className="rounded-full bg-[#111413] px-4 py-2 text-xs font-semibold text-white">{language === 'es' ? 'Marcar respuesta recibida' : 'Mark reply received'}</button><button type="button" onClick={() => patch(task, { interactionState: 'queue' })} className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold">{language === 'es' ? 'Volver a por hacer' : 'Return to queue'}</button></div></div>}

          {opened && canWork(task) && state !== 'waiting-reply' && <div className="mt-3 rounded-xl bg-[#FAFAF8] p-3">
            <div className="grid gap-3 2xl:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/40">{language === 'es' ? 'NOTAS / RESULTADO' : 'NOTES / RESULT'}</p>
                <textarea rows={3} value={result} onChange={(event) => setResult(event.target.value)}
                  className="mt-2 w-full min-w-0 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm" />
              </div>
              <div className="gkais-next-action-container min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#0A3F4D]">{language === 'es' ? 'SIGUIENTE ACCIÓN' : 'NEXT ACTION'}</p>
                <div className="gkais-next-action-grid mt-2 grid grid-cols-2 gap-2">
                  <select value={nextType} onChange={(event) => setNextType(event.target.value as WorkActionType)}
                    className="min-w-0 w-full rounded-lg border border-black/10 bg-white px-2 py-2 text-xs">
                    <option value="whatsapp">WhatsApp</option><option value="email">Email</option>
                    <option value="call">{language === 'es' ? 'Llamada' : 'Call'}</option>
                    <option value="meeting">{language === 'es' ? 'Reunión' : 'Meeting'}</option>
                    <option value="task">{language === 'es' ? 'Tarea' : 'Task'}</option>
                  </select>
                  <select value={nextAssignee || currentUid} onChange={(event) => setNextAssignee(event.target.value)}
                    className="min-w-0 w-full rounded-lg border border-black/10 bg-white px-2 py-2 text-xs">
                    {members.map((member) => <option key={member.uid} value={member.uid}>{assigneeOptionLabel(member)}</option>)}
                  </select>
                  <input type="date" value={nextDate} onChange={(event) => setNextDate(event.target.value)}
                    className="min-w-0 w-full rounded-lg border border-black/10 bg-white px-2 py-2 text-xs" />
                  <WorkTimeField value={nextTime} onChange={setNextTime} language={language} />
                </div>
                <input value={nextNote} onChange={(event) => setNextNote(event.target.value)}
                  placeholder={language === 'es' ? 'Pequeña nota' : 'Short note'}
                  className="mt-2 w-full min-w-0 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs" />
                {nextError && <p role="alert" className="mt-2 text-xs text-[#8D332C]">{nextError}</p>}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
              {(task.type === 'whatsapp' || task.type === 'email') && <button type="button" disabled={savingNext}
                onClick={() => waiting(task)}
                className="inline-flex items-center rounded-full border border-[#0A3F4D]/15 bg-white px-4 py-2 text-xs font-semibold text-[#0A3F4D] disabled:opacity-40">
                {language === 'es' ? 'En espera de respuesta' : 'Waiting for reply'}
              </button>}
              <button type="button" disabled={savingNext} onClick={() => remove(task)}
                className="inline-flex items-center gap-1 rounded-full border border-[#A23A32]/15 bg-white px-4 py-2 text-xs font-semibold text-[#8D332C] disabled:opacity-40">
                <Trash2 className="h-3.5 w-3.5" />{language === 'es' ? 'Eliminar' : 'Remove'}
              </button>
              <button type="button" disabled={savingNext} onClick={() => void complete(task)}
                className="inline-flex items-center gap-1 rounded-full bg-[#111413] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">
                <CheckCircle2 className="h-3.5 w-3.5" />{savingNext ? (language === 'es' ? 'Guardando…' : 'Saving…') : (language === 'es' ? 'Completar' : 'Complete')}
              </button>
            </div>
          </div>}
        </div>;
      })}
      {!rows.length && <div className="p-10 text-center text-sm text-black/40">{view === 'team'
        ? (language === 'es' ? 'No hay trabajo asignado a otros miembros del equipo en esta vista.' : 'No work is assigned to other team members in this view.')
        : (language === 'es' ? 'No hay trabajo en esta vista.' : 'No work in this view.')}</div>}</div></section>

      {showHistory && <section className="rounded-2xl border border-black/10 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/40">{language === 'es' ? 'HISTORIAL' : 'HISTORY'}</p><div className="mt-3 divide-y divide-black/5">{history.map((task) => <div key={task.id} className="py-3">{editingId === task.id ? <div className="grid gap-3 rounded-xl bg-[#FAFAF8] p-3 lg:grid-cols-[0.9fr_1.1fr]">
        <div><p className="text-sm font-semibold">{task.clientName}</p><p className="mt-1 text-xs text-black/50">{task.title}</p><p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-black/40">{language === 'es' ? 'NOTAS / RESULTADO' : 'NOTES / RESULT'}</p><textarea rows={2} value={editNote} onChange={(event) => setEditNote(event.target.value)} placeholder={language === 'es' ? 'Nota' : 'Note'} className="mt-2 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-xs" /><textarea rows={2} value={editResult} onChange={(event) => setEditResult(event.target.value)} placeholder={language === 'es' ? 'Resultado' : 'Result'} className="mt-2 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-xs" /><div className="mt-2 flex gap-2"><button type="button" onClick={() => saveEdit(task)} className="rounded-full bg-[#111413] px-4 py-2 text-xs font-semibold text-white">{language === 'es' ? 'Guardar cambios' : 'Save changes'}</button><button type="button" onClick={() => setEditingId('')} className="rounded-full border border-black/10 px-4 py-2 text-xs">{language === 'es' ? 'Cancelar' : 'Cancel'}</button></div></div>
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#0A3F4D]">{language === 'es' ? 'ACCIÓN REGISTRADA' : 'RECORDED ACTION'}</p><div className="mt-2 grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr))]"><select value={editType} onChange={(event) => setEditType(event.target.value as WorkActionType)} className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs"><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="call">{language === 'es' ? 'Llamada' : 'Call'}</option><option value="meeting">{language === 'es' ? 'Reunión' : 'Meeting'}</option><option value="task">{language === 'es' ? 'Tarea' : 'Task'}</option></select><select value={editAssignee || currentUid} onChange={(event) => setEditAssignee(event.target.value)} className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs">{members.map((member) => <option key={member.uid} value={member.uid}>{assigneeOptionLabel(member)}</option>)}</select><input type="date" value={editDate} onChange={(event) => setEditDate(event.target.value)} className="min-w-0 w-full rounded-lg border border-black/10 bg-white px-2 py-2 text-xs" /><input type="time" value={editTime} onChange={(event) => setEditTime(event.target.value)} onClick={(event) => { try { event.currentTarget.showPicker?.(); } catch {} }} className="min-w-0 w-full rounded-lg border border-black/10 bg-white px-2 py-2 text-xs" /></div><div className="mt-2 rounded-lg bg-white px-3 py-2 text-xs text-black/45">{language === 'es' ? 'Edita el registro si la acción, responsable, fecha, hora, nota o resultado fueron ingresados incorrectamente.' : 'Correct the recorded action, owner, date, time, note or result if needed.'}</div></div>
      </div> : <div className="grid gap-2 md:grid-cols-[1fr_150px_auto] md:items-center"><div><p className="text-sm font-semibold">{task.clientName}</p><p className="mt-1 text-xs text-black/45">{task.title}{task.result ? ` · ${task.result}` : ''}</p></div><span className="text-xs text-black/40">{due(task, language)}</span><button type="button" onClick={() => beginEdit(task)} className="inline-flex items-center gap-1 rounded-full bg-[#111413] px-3 py-2 text-[10px] font-semibold text-white"><Pencil className="h-3.5 w-3.5" />{language === 'es' ? 'Editar' : 'Edit'}</button></div>}</div>)}</div></section>}
    </>}
  </div>;
}

function LaneButton({ active, onClick, icon: Icon, label, count }: { active: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }>; label: string; count: number }) {
  return <button type="button" onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${active ? 'bg-[#111413] text-white' : 'text-black/45'}`}><Icon className="h-3.5 w-3.5" />{label}<span>{count}</span></button>;
}
