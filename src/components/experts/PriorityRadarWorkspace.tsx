import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  ListTodo,
  Mail,
  MessageCircle,
  Phone,
  RotateCcw,
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

type TeamTask = WorkTask & {
  assignedToUid?: string;
  assignedToName?: string;
  createdByUid?: string;
  completedByUid?: string;
  personId?: string;
};

type TaskView = 'mine' | 'team';

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

function formatDue(task: WorkTask, language: Language): string {
  if (!task.dueDate) return language === 'es' ? 'Sin fecha' : 'No date';
  try {
    const date = new Date(`${task.dueDate}T${task.dueTime || '12:00'}:00`);
    const formatted = new Intl.DateTimeFormat(language === 'es' ? 'es-CL' : 'en-US', { day: '2-digit', month: 'short' }).format(date);
    return `${formatted}${task.dueTime ? ` · ${task.dueTime}` : ''}`;
  } catch {
    return `${task.dueDate}${task.dueTime ? ` · ${task.dueTime}` : ''}`;
  }
}

function priorityMeta(task: WorkTask, language: Language) {
  const priority = getWorkPriority(task);
  if (priority === 'high') return { label: language === 'es' ? 'Alta' : 'High', className: 'bg-[#A23A32]/9 text-[#8D332C]' };
  if (priority === 'medium') return { label: language === 'es' ? 'Media' : 'Medium', className: 'bg-[#A46F16]/10 text-[#82570F]' };
  return { label: 'Normal', className: 'bg-[#0A3F4D]/8 text-[#0A3F4D]' };
}

function memberLabel(member?: WorkspaceMember) {
  return member?.displayName || member?.email || 'Sin responsable';
}

export function PriorityRadarWorkspace({ language, onOpenClient }: { language: Language; onOpenClient: (id: string) => void }) {
  const [tasks, setTasks] = useState<TeamTask[]>(() => loadTasks() as TeamTask[]);
  const [team, setTeam] = useState<WorkspaceTeamState | null>(null);
  const [view, setView] = useState<TaskView>('mine');
  const [showDone, setShowDone] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [resultDraft, setResultDraft] = useState('');
  const [newType, setNewType] = useState<WorkActionType>('whatsapp');
  const [newNote, setNewNote] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newAssigneeUid, setNewAssigneeUid] = useState('');
  const [editingHistoryTaskId, setEditingHistoryTaskId] = useState<string | null>(null);
  const [historyTitle, setHistoryTitle] = useState('');
  const [historyNote, setHistoryNote] = useState('');
  const [historyResult, setHistoryResult] = useState('');
  const [historyType, setHistoryType] = useState<WorkActionType>('task');
  const [historyDate, setHistoryDate] = useState('');
  const [historyTime, setHistoryTime] = useState('');

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

  const openTasks = useMemo(() => visibleTasks
    .filter((task) => task.status !== 'done' && !task.deletedAt)
    .sort((a, b) => `${a.dueDate || '9999-12-31'}${a.dueTime || '23:59'}`.localeCompare(`${b.dueDate || '9999-12-31'}${b.dueTime || '23:59'}`)), [visibleTasks]);
  const historyTasks = useMemo(() => visibleTasks
    .filter((task) => task.status === 'done' || Boolean(task.deletedAt))
    .sort((a, b) => (b.deletedAt || b.completedAt || b.createdAt).localeCompare(a.deletedAt || a.completedAt || a.createdAt)), [visibleTasks]);

  const teamCounts = useMemo(() => activeMembers.map((member) => ({
    member,
    count: tasks.filter((task) => task.assignedToUid === member.uid && task.status !== 'done' && !task.deletedAt).length
  })), [activeMembers, tasks]);

  const persistTasks = (next: TeamTask[]) => {
    setTasks(next);
    saveTasks(next);
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
    setResultDraft(task.result || '');
    setNewAssigneeUid(task.assignedToUid || currentUid);
  };

  const completeTask = (task: TeamTask) => {
    if (!canWork(task)) return;
    const result = resultDraft.trim();
    const updated = patchTask(task, { status: 'done', result, completedByUid: currentUid });
    if (isOwner && task.clientId) appendJournal(task.clientId, 'task-result', language === 'es' ? 'Trabajo completado' : 'Work completed', result || task.title);
    void appendExpertAuditLog({ entityType: 'work_task', entityId: task.id, action: 'task.completed', changes: { result, clientId: task.clientId, personId: task.personId || '' } }).catch(() => {});
    if (updated.personId) void appendExpertRelationshipEvent({ personId: updated.personId, type: 'task.completed', sourceType: 'work_task', sourceId: updated.id, metadata: { title: updated.title, result, completedByUid: currentUid } }).catch(() => {});
    setActiveTaskId(null);
    setResultDraft('');
  };

  const removeTask = (task: TeamTask) => {
    if (!canWork(task)) return;
    const deletedAt = new Date().toISOString();
    patchTask(task, { deletedAt, deletedFromStatus: task.status });
    if (isOwner && task.clientId) appendJournal(task.clientId, 'task', language === 'es' ? 'Tarea enviada al historial' : 'Task moved to history', task.title);
    if (activeTaskId === task.id) setActiveTaskId(null);
    if (editingHistoryTaskId === task.id) setEditingHistoryTaskId(null);
  };

  const recoverTask = (task: TeamTask) => {
    if (!canWork(task)) return;
    patchTask(task, { status: task.deletedFromStatus || 'pending', deletedAt: undefined, deletedFromStatus: undefined });
  };

  const beginHistoryEdit = (task: TeamTask) => {
    setEditingHistoryTaskId(task.id);
    setHistoryTitle(task.title);
    setHistoryNote(task.note || '');
    setHistoryResult(task.result || '');
    setHistoryType(task.type);
    setHistoryDate(task.dueDate || '');
    setHistoryTime(task.dueTime || '');
  };

  const saveHistoryEdit = (task: TeamTask) => {
    if (!canWork(task)) return;
    const title = historyTitle.trim();
    if (!title) return;
    patchTask(task, {
      title,
      note: historyNote.trim(),
      result: historyResult.trim(),
      type: historyType,
      dueDate: historyDate,
      dueTime: historyTime
    });
    setEditingHistoryTaskId(null);
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
      createdAt: new Date().toISOString(),
      source: 'manual',
      confirmationEmail: newType === 'meeting' ? 'queued' : 'not-required'
    };
    const next = [nextTask, ...tasks];
    persistTasks(next);
    void persistExpertWorkTask(nextTask);
    void appendExpertAuditLog({ entityType: 'work_task', entityId: nextTask.id, action: 'task.created', changes: { assignedToUid: assignee.uid, clientId: task.clientId, personId: task.personId || '' } }).catch(() => {});
    if (isOwner && task.clientId) appendJournal(task.clientId, 'task', language === 'es' ? 'Nueva acción desde Trabajo prioritario' : 'New action from Priority Work', `${actionLabel(newType, language)} · ${clean} · ${memberLabel(assignee)}`);
    setNewNote('');
    setNewDate('');
    setNewTime('');
  };

  const pendingCount = openTasks.length;
  const delegatedCount = openTasks.filter((task) => task.assignedToUid && task.assignedToUid !== currentUid).length;

  return <div className="space-y-5">
    <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'PRIORITY WORK' : 'PRIORITY WORK'}</p>
          <h3 className="mt-2 text-xl font-semibold">{view === 'mine' ? (language === 'es' ? 'Mi trabajo' : 'My work') : (language === 'es' ? 'Trabajo del equipo' : 'Team work')}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/50">{view === 'mine' ? (language === 'es' ? 'Aquí ves únicamente el trabajo asignado a tu cuenta.' : 'This view only shows work assigned to your account.') : (language === 'es' ? 'Supervisa responsables, prioridades y resultados sin mezclar el trabajo de cada persona.' : 'Supervise owners, priorities and outcomes without mixing each person’s work.')}</p>
        </div>
        <div className="flex gap-2">
          <div className="rounded-xl bg-[#F7F7F5] px-3.5 py-2.5"><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-black/35">{language === 'es' ? 'ABIERTAS' : 'OPEN'}</p><p className="mt-1 text-lg font-semibold">{pendingCount}</p></div>
          {view === 'team' && <div className="rounded-xl bg-[#F7F7F5] px-3.5 py-2.5"><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-black/35">{language === 'es' ? 'DELEGADAS' : 'DELEGATED'}</p><p className="mt-1 text-lg font-semibold">{delegatedCount}</p></div>}
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-3 border-t border-black/5 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex w-fit rounded-full border border-black/10 bg-[#F7F7F5] p-1">
          <button type="button" onClick={() => setView('mine')} className={`rounded-full px-4 py-2 text-xs font-semibold ${view === 'mine' ? 'bg-[#111413] text-white' : 'text-black/45'}`}>{language === 'es' ? 'Mi trabajo' : 'My work'}</button>
          {canReadTeam && <button type="button" onClick={() => setView('team')} className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold ${view === 'team' ? 'bg-[#111413] text-white' : 'text-black/45'}`}><UsersRound className="h-3.5 w-3.5" />{language === 'es' ? 'Trabajo del equipo' : 'Team work'}</button>}
        </div>
        <label className="flex items-center gap-2 text-xs text-black/45"><input type="checkbox" checked={showDone} onChange={(event) => setShowDone(event.target.checked)} />{language === 'es' ? 'Mostrar historial' : 'Show history'}</label>
      </div>
    </section>

    {view === 'team' && canReadTeam && <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{teamCounts.map(({ member, count }) => <div key={member.uid} className="rounded-xl border border-black/8 bg-white p-3"><p className="truncate text-xs font-semibold">{memberLabel(member)}</p><p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-black/35">{count} {language === 'es' ? 'pendientes' : 'open'}</p></div>)}</section>}

    <section className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_10px_30px_rgba(10,10,10,0.025)]">
      <div className="hidden grid-cols-[minmax(240px,1.25fr)_90px_105px_145px_170px_100px] gap-3 border-b border-black/7 bg-[#FAFAF8] px-4 py-3 text-[9px] font-semibold uppercase tracking-[0.13em] text-black/35 lg:grid"><span>{language === 'es' ? 'Trabajo' : 'Work'}</span><span>{language === 'es' ? 'Prioridad' : 'Priority'}</span><span>{language === 'es' ? 'Tipo' : 'Type'}</span><span>{language === 'es' ? 'Cuándo' : 'When'}</span><span>{language === 'es' ? 'Responsable' : 'Assignee'}</span><span /></div>
      <div className="divide-y divide-black/5">
        {openTasks.map((task) => {
          const priority = priorityMeta(task, language);
          const opened = activeTaskId === task.id;
          const taskCanWork = canWork(task);
          return <div key={task.id} className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(240px,1.25fr)_90px_105px_145px_170px_100px] lg:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{task.title}</p>{task.source === 'session' && <span className="rounded-full bg-[#4556A6]/8 px-2 py-0.5 text-[9px] font-semibold text-[#4556A6]">{language === 'es' ? 'DESDE SESIÓN' : 'FROM SESSION'}</span>}</div>
              {isOwner && task.clientId ? <button type="button" onClick={() => onOpenClient(task.clientId)} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[#0A3F4D] hover:underline">{task.clientName}<ChevronRight className="h-3 w-3" /></button> : <p className="mt-1 text-xs font-medium text-[#0A3F4D]">{task.clientName}</p>}
              {task.note && <p className="mt-1 line-clamp-2 text-xs leading-5 text-black/45">{task.note}</p>}
            </div>
            <span className={`w-fit rounded-full px-2.5 py-1 text-[9px] font-semibold ${priority.className}`}>{priority.label}</span>
            <div className="flex items-center gap-2 text-xs text-black/55"><ActionIcon kind={task.type} /><span>{actionLabel(task.type, language)}</span></div>
            <div className="flex items-center gap-2 text-xs text-black/55"><Clock3 className="h-3.5 w-3.5" /><span>{formatDue(task, language)}</span></div>
            {canManageTeam || isOwner ? <label className="relative"><UserRoundCheck className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/30" /><select value={task.assignedToUid || currentUid} onChange={(event) => setAssignee(task, event.target.value)} className="w-full rounded-lg border border-black/8 bg-white py-2 pl-8 pr-2 text-xs">{activeMembers.map((member) => <option key={member.uid} value={member.uid}>{memberLabel(member)}</option>)}</select></label> : <div className="flex items-center gap-2 text-xs text-black/55"><UserRoundCheck className="h-3.5 w-3.5" /><span className="truncate">{task.assignedToName || task.assignee}</span></div>}
            <button type="button" disabled={!taskCanWork} onClick={() => toggleWork(task)} className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#111413] px-3 py-2 text-[10px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-30">{opened ? (language === 'es' ? 'Cerrar' : 'Close') : (language === 'es' ? 'Trabajar' : 'Work')}<ChevronDown className={`h-3 w-3 transition ${opened ? 'rotate-180' : ''}`} /></button>

            {opened && taskCanWork && <div className="rounded-xl border border-black/8 bg-[#FAFAF8] p-3 lg:col-span-6">
              <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/38">{language === 'es' ? 'EJECUTAR TAREA' : 'EXECUTE TASK'}</p>
                  <label className="mt-2 block"><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'RESULTADO / NOTA' : 'RESULT / NOTE'}</span><textarea value={resultDraft} onChange={(event) => setResultDraft(event.target.value)} rows={3} className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm" /></label>
                  <div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={() => completeTask(task)} className="inline-flex items-center gap-1.5 rounded-full bg-[#111413] px-4 py-2 text-xs font-semibold text-white"><CheckCircle2 className="h-3.5 w-3.5" />{language === 'es' ? 'Guardar y completar' : 'Save & complete'}</button><button type="button" onClick={() => removeTask(task)} className="inline-flex items-center gap-1.5 rounded-full border border-[#A23A32]/15 bg-white px-4 py-2 text-xs font-semibold text-[#8D332C]"><Trash2 className="h-3.5 w-3.5" />{language === 'es' ? 'Enviar al historial' : 'Move to history'}</button></div>
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
        {openTasks.length === 0 && <div className="p-8 text-center text-sm text-black/40">{language === 'es' ? 'No hay trabajo pendiente en esta vista.' : 'No pending work in this view.'}</div>}
      </div>
    </section>

    {showDone && <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
      <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">{language === 'es' ? 'HISTORIAL DE TAREAS' : 'TASK HISTORY'}</p><h3 className="mt-2 text-lg font-semibold">{language === 'es' ? 'Completadas y eliminadas' : 'Completed and removed'}</h3></div><span className="rounded-full bg-[#0A3F4D]/8 px-3 py-1.5 text-xs font-semibold text-[#0A3F4D]">{historyTasks.length}</span></div>
      <div className="mt-4 max-h-[430px] overflow-y-auto rounded-xl border border-black/7"><div className="divide-y divide-black/5">{historyTasks.map((task) => {
        const editing = editingHistoryTaskId === task.id;
        return <div key={task.id} className="p-4"><div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_150px_auto] md:items-center"><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{task.title}</p><span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${task.deletedAt ? 'bg-[#A23A32]/9 text-[#8D332C]' : 'bg-[#0A3F4D]/8 text-[#0A3F4D]'}`}>{task.deletedAt ? (language === 'es' ? 'ELIMINADA' : 'REMOVED') : (language === 'es' ? 'COMPLETADA' : 'COMPLETED')}</span></div><p className="mt-1 text-xs text-black/45">{task.clientName}{task.result ? ` · ${task.result}` : ''}</p></div><span className="text-xs text-black/50">{task.assignedToName || task.assignee}</span><span className="text-xs text-black/45">{formatDue(task, language)}</span><div className="flex flex-wrap justify-end gap-2">{task.deletedAt ? <button type="button" disabled={!canWork(task)} onClick={() => recoverTask(task)} className="inline-flex items-center gap-1.5 rounded-full border border-[#0A3F4D]/15 bg-white px-3 py-2 text-[10px] font-semibold text-[#0A3F4D] disabled:opacity-30"><RotateCcw className="h-3.5 w-3.5" />{language === 'es' ? 'Recuperar' : 'Recover'}</button> : <button type="button" disabled={!canWork(task)} onClick={() => editing ? setEditingHistoryTaskId(null) : beginHistoryEdit(task)} className="rounded-full border border-black/10 bg-white px-3 py-2 text-[10px] font-semibold text-black/55 disabled:opacity-30">{editing ? (language === 'es' ? 'Cerrar' : 'Close') : (language === 'es' ? 'Editar' : 'Edit')}</button>}</div></div>{editing && !task.deletedAt && <div className="mt-3 rounded-xl border border-black/8 bg-[#FAFAF8] p-3"><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.5fr)_130px_130px_105px_auto] xl:items-end"><label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'TAREA' : 'TASK'}</span><input value={historyTitle} onChange={(event) => setHistoryTitle(event.target.value)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm" /></label><label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'TIPO' : 'TYPE'}</span><select value={historyType} onChange={(event) => setHistoryType(event.target.value as WorkActionType)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="call">{language === 'es' ? 'Llamada' : 'Call'}</option><option value="meeting">{language === 'es' ? 'Reunión' : 'Meeting'}</option><option value="task">{language === 'es' ? 'Tarea interna' : 'Internal task'}</option></select></label><input type="date" value={historyDate} onChange={(event) => setHistoryDate(event.target.value)} className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm" /><input type="time" value={historyTime} onChange={(event) => setHistoryTime(event.target.value)} className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm" /><button type="button" onClick={() => saveHistoryEdit(task)} className="rounded-lg bg-[#111413] px-4 py-2 text-xs font-semibold text-white">{language === 'es' ? 'Guardar' : 'Save'}</button><label className="md:col-span-1 xl:col-span-2"><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'NOTA' : 'NOTE'}</span><textarea value={historyNote} onChange={(event) => setHistoryNote(event.target.value)} rows={1} className="w-full resize-none rounded-lg border border-black/10 bg-white px-3 py-2 text-sm" /></label><label className="md:col-span-1 xl:col-span-3"><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'RESULTADO' : 'RESULT'}</span><textarea value={historyResult} onChange={(event) => setHistoryResult(event.target.value)} rows={1} className="w-full resize-none rounded-lg border border-black/10 bg-white px-3 py-2 text-sm" /></label></div></div>}</div>;
      })}{historyTasks.length === 0 && <div className="p-6 text-center text-sm text-black/40">{language === 'es' ? 'Aún no hay tareas en el historial.' : 'No task history yet.'}</div>}</div></div>
    </section>}
  </div>;
}
