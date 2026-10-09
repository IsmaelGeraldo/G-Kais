import { useEffect, useMemo, useState } from 'react';
import { onSnapshot, collection, limit, query, where, type Unsubscribe } from 'firebase/firestore';
import { Activity, CheckCircle2, Clock3, AlertCircle, UsersRound, ClipboardList, ShieldCheck } from 'lucide-react';
import { firebaseAuth, firestoreDb } from '../../lib/firebase';
import type { Language } from '../../i18n/LanguageContext';
import { hasWorkspacePermission, loadExpertWorkspaceTeam, type WorkspaceMember, type WorkspaceTeamState } from '../../services/expertsWorkspaceCore';
import { TeamWorkspace } from './TeamWorkspace';

type Task = {
  id: string;
  clientName?: string;
  title?: string;
  type?: string;
  note?: string;
  status?: string;
  deletedAt?: string;
  assignedToUid?: string;
  createdByUid?: string;
  completedByUid?: string;
  createdAt?: string;
  completedAt?: string;
  dueDate?: string;
  dueTime?: string;
};
type ActivityItem = {
  id: string;
  action: string;
  detail: string;
  actorUid: string;
  assignedUid: string;
  date: Date | null;
  source: 'task' | 'event' | 'audit';
};
type FeedEvent = {
  type?: string;
  action?: string;
  actorUid?: string;
  entityType?: string;
  entityId?: string;
  sourceId?: string;
  metadata?: Record<string, unknown>;
  changes?: Record<string, unknown>;
  occurredAt?: unknown;
  createdAt?: unknown;
};
type Panel = 'summary' | 'activity' | 'members';
const MAX_TEAM_TASKS = 400;
const MAX_EVENTS = 220;

function readDate(value: unknown): Date | null {
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    const result = value.toDate();
    return result instanceof Date && !Number.isNaN(result.getTime()) ? result : null;
  }
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string') {
    const result = new Date(value);
    return Number.isNaN(result.getTime()) ? null : result;
  }
  return null;
}

function labelForAction(action: string, language: Language) {
  const labels: Record<string, [string, string]> = {
    'task.created': ['Tarea creada', 'Task created'],
    'task.completed': ['Tarea completada', 'Task completed'],
    'task.history_edited': ['Registro de tarea editado', 'Task record edited'],
    'task.assigned': ['Tarea asignada', 'Task assigned'],
    'task.updated': ['Tarea actualizada', 'Task updated'],
    'task.deleted': ['Tarea eliminada', 'Task removed'],
    'interaction.waiting_reply': ['En espera de respuesta', 'Waiting for reply'],
    'interaction.reply_received': ['Respuesta recibida', 'Reply received'],
    'person.action_created': ['Nueva acción creada', 'New action created'],
    'member.updated': ['Miembro actualizado', 'Member updated'],
    'member.removed': ['Miembro eliminado', 'Member removed']
  };
  const found = labels[action];
  return found ? found[language === 'es' ? 0 : 1] : action.replace(/[._]/g, ' ');
}
function safeDetail(source: FeedEvent): string {
  const fields = source.metadata || source.changes || {};
  for (const value of [fields.title, fields.clientName, fields.displayName, source.entityType, source.sourceId]) {
    if (typeof value === 'string' && value.trim()) return value.trim().slice(0, 150);
  }
  return '';
}
function taskActivities(task: Task): ActivityItem[] {
  const title = task.title || task.clientName || task.id;
  const rows: ActivityItem[] = [];
  const created = readDate(task.createdAt);
  if (created) rows.push({ id: `task-create-${task.id}`, action: 'task.created', detail: title, actorUid: task.createdByUid || '', assignedUid: task.assignedToUid || '', date: created, source: 'task' });
  const completed = readDate(task.completedAt);
  if (completed && task.status === 'done') rows.push({ id: `task-done-${task.id}`, action: 'task.completed', detail: title, actorUid: task.completedByUid || '', assignedUid: task.assignedToUid || '', date: completed, source: 'task' });
  const removed = readDate(task.deletedAt);
  if (removed) rows.push({ id: `task-delete-${task.id}`, action: 'task.deleted', detail: title, actorUid: '', assignedUid: task.assignedToUid || '', date: removed, source: 'task' });
  return rows;
}
function uniqueChunks(uids: string[], size = 10) {
  const all = [...new Set(uids.filter(Boolean))];
  const result: string[][] = [];
  for (let i = 0; i < all.length; i += size) result.push(all.slice(i, i + size));
  return result;
}

export function TeamSupervisionWorkspace({ language }: { language: Language }) {
  const [panel, setPanel] = useState<Panel>('summary');
  const [team, setTeam] = useState<WorkspaceTeamState | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [memberUid, setMemberUid] = useState('all');
  const [period, setPeriod] = useState('30');
  const [search, setSearch] = useState('');
  const es = language === 'es';

  const owner = Boolean(team && team.workspaceId === team.currentUid);
  const permissions = team?.currentMember.permissions || [];
  const hasGlobal = owner || hasWorkspacePermission(permissions, 'members.manage') || hasWorkspacePermission(permissions, 'audit.read');
  const canSeeMembers = owner || hasWorkspacePermission(permissions, 'members.read') || hasWorkspacePermission(permissions, 'members.manage');
  const canReadAudit = owner || hasWorkspacePermission(permissions, 'audit.read');
  const canSeeTeam = Boolean(team && (hasGlobal || team.currentMember.isSupervisor));
  const people = useMemo(() => (team?.members || []).filter((member) => member.status === 'active' && (
    hasGlobal || member.uid === team.currentUid || member.supervisorUid === team.currentUid
  )), [team, hasGlobal]);
  const allowedUids = useMemo(() => new Set(people.map((member) => member.uid)), [people]);
  const names = useMemo(() => new Map(people.map((member) => [member.uid, member.displayName || member.email || member.uid])), [people]);

  useEffect(() => {
    let disposed = false;
    const unsubscribers: Unsubscribe[] = [];
    const taskBuckets = new Map<string, Task[]>();
    const eventBuckets = new Map<string, ActivityItem[]>();
    const publishTasks = () => { if (!disposed) setTasks(Array.from(taskBuckets.values()).flat()); };
    const publishEvents = () => { if (!disposed) setEvents(Array.from(eventBuckets.values()).flat()); };
    const start = async () => {
      try {
        const state = await loadExpertWorkspaceTeam();
        if (disposed) return;
        const user = firebaseAuth.currentUser;
        if (!user || user.uid !== state.currentUid) throw new Error('MEMBERSHIP_REQUIRED');
        const privileged = state.workspaceId === state.currentUid ||
          hasWorkspacePermission(state.currentMember.permissions, 'members.manage') ||
          hasWorkspacePermission(state.currentMember.permissions, 'audit.read');
        const auditAllowed = state.workspaceId === state.currentUid || hasWorkspacePermission(state.currentMember.permissions, 'audit.read');
        const scoped = state.members.filter((member) => member.status === 'active' && (
          privileged || member.uid === state.currentUid || member.supervisorUid === state.currentUid
        ));
        const uids = scoped.map((member) => member.uid);
        setTeam(state);
        if (!privileged && !state.currentMember.isSupervisor) {
          setLoading(false);
          return;
        }
        const taskRef = collection(firestoreDb, 'expert_workspaces', state.workspaceId, 'work_tasks');
        const eventsRef = collection(firestoreDb, 'expert_workspaces', state.workspaceId, 'relationship_events');
        const auditRef = collection(firestoreDb, 'expert_workspaces', state.workspaceId, 'audit_logs');
        const watches = privileged ? [null] : uniqueChunks(uids);
        for (let i = 0; i < watches.length; i += 1) {
          const chunk = watches[i];
          const taskQuery = chunk ? query(taskRef, where('task.assignedToUid', 'in', chunk), limit(MAX_TEAM_TASKS)) : query(taskRef, limit(MAX_TEAM_TASKS));
          unsubscribers.push(onSnapshot(taskQuery, (snapshot) => {
            taskBuckets.set(`task-${i}`, snapshot.docs.map((item) => ({ ...(item.data().task || {}), id: item.id } as Task))
              .filter((task) => task.id && task.type && !String((task as Task & { workstream?: string }).workstream || '').startsWith('formation-')));
            publishTasks();
          }, (cause) => { if (!disposed) setError(cause.message); }));
          const eventQuery = chunk ? query(eventsRef, where('actorUid', 'in', chunk), limit(MAX_EVENTS)) : query(eventsRef, limit(MAX_EVENTS));
          unsubscribers.push(onSnapshot(eventQuery, (snapshot) => {
            eventBuckets.set(`event-${i}`, snapshot.docs.map((item) => {
              const event = item.data() as FeedEvent;
              return {
                id: `event-${item.id}`,
                action: event.type || '',
                detail: safeDetail(event),
                actorUid: event.actorUid || '',
                assignedUid: '',
                date: readDate(event.occurredAt) || readDate(event.createdAt),
                source: 'event' as const
              };
            }));
            publishEvents();
          }, (cause) => { if (!disposed) setError(cause.message); }));
        }
        if (auditAllowed) unsubscribers.push(onSnapshot(query(auditRef, limit(MAX_EVENTS)), (snapshot) => {
          eventBuckets.set('audit', snapshot.docs.map((item) => {
            const event = item.data() as FeedEvent;
            return { id: `audit-${item.id}`, action: event.action || '',
              detail: safeDetail(event), actorUid: event.actorUid || '', assignedUid: '',
              date: readDate(event.occurredAt) || readDate(event.createdAt), source: 'audit' as const };
          }));
          publishEvents();
        }, (cause) => { if (!disposed) setError(cause.message); }));
        setLoading(false);
      } catch (cause) {
        if (!disposed) { setError(cause instanceof Error ? cause.message : 'TEAM_ACTIVITY_UNAVAILABLE'); setLoading(false); }
      }
    };
    void start();
    return () => { disposed = true; unsubscribers.forEach((stop) => stop()); };
  }, []);

  const visibleTasks = useMemo(() => tasks.filter((task) => allowedUids.has(task.assignedToUid || '') &&
    (memberUid === 'all' || task.assignedToUid === memberUid)), [tasks, allowedUids, memberUid]);
  const taskEvents = useMemo(() => visibleTasks.flatMap(taskActivities), [visibleTasks]);
  const since = period === 'all' ? 0 : Date.now() - Number(period) * 86400000;
  const activity = useMemo(() => [...taskEvents, ...events]
    .filter((event) => hasGlobal || allowedUids.has(event.actorUid) || (event.source === 'task' && allowedUids.has(event.assignedUid)))
    .filter((event) => memberUid === 'all' || event.actorUid === memberUid || (event.source === 'task' && event.assignedUid === memberUid))
    .filter((event) => event.date && event.date.getTime() >= since)
    .filter((event) => !search.trim() || [event.action, event.detail, names.get(event.actorUid) || '', names.get(event.assignedUid) || '']
      .some((value) => value.toLowerCase().includes(search.trim().toLowerCase())))
    .sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0)), [taskEvents, events, hasGlobal, allowedUids, memberUid, since, search, names]);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const completed = visibleTasks.filter((task) => task.status === 'done' && !task.deletedAt).length;
  const pending = visibleTasks.filter((task) => task.status !== 'done' && !task.deletedAt).length;
  const overdue = visibleTasks.filter((task) => task.status !== 'done' && !task.deletedAt && task.dueDate && task.dueDate < today).length;
  const dateLabel = (date: Date | null) => date
    ? new Intl.DateTimeFormat(es ? 'es-CL' : 'en-US', { dateStyle: 'short', timeStyle: 'short' }).format(date)
    : '—';

  if (loading) return <section className="rounded-2xl border border-black/10 bg-white p-5 text-sm text-black/45">{es ? 'Cargando supervisión…' : 'Loading supervision…'}</section>;
  if (!canSeeTeam) return <section className="rounded-2xl border border-black/10 bg-white p-5 text-sm text-black/45">{es ? 'Esta vista está reservada para responsables de equipo.' : 'This view is for team leaders.'}</section>;

  return <div className="space-y-5">
    <section className="rounded-2xl border border-black/10 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{es ? 'EQUIPO' : 'TEAM'}</p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold">{es ? 'Supervisión y actividad' : 'Supervision and activity'}</h3>
          <p className="mt-2 text-sm text-black/50">{hasGlobal ? (es ? 'Visión general del Workspace.' : 'Workspace-wide view.') : (es ? 'Actividad de tus miembros a cargo.' : 'Activity for your direct reports.')}</p>
        </div>
        <span className="rounded-full bg-[#F7F7F5] px-3 py-1.5 text-[11px] font-medium text-black/60">{people.length} {es ? 'miembros visibles' : 'visible members'}</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {([
          ['summary', es ? 'Resumen' : 'Summary', Activity],
          ['activity', es ? 'Actividad' : 'Activity', ClipboardList],
          ...(canSeeMembers ? [['members', es ? 'Miembros y permisos' : 'Members and permissions', UsersRound]] : [])
        ] as Array<[Panel, string, typeof Activity]>).map(([id, label, Icon]) =>
          <button type="button" key={id} onClick={() => setPanel(id)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold ${panel === id ? 'bg-[#111413] text-white' : 'border border-black/10 bg-white text-black/55'}`}>
            <Icon className="h-3.5 w-3.5"/>{label}
          </button>)}
      </div>
    </section>

    {error && <div role="alert" className="rounded-xl border border-[#A23A32]/15 bg-white p-3 text-xs text-[#8D332C]">{es ? 'No se pudo cargar parte de la actividad: ' : 'Some activity could not be loaded: '}{error}</div>}

    {panel === 'members' && canSeeMembers ? <TeamWorkspace language={language} /> : <>
      <section className="rounded-2xl border border-black/10 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs text-black/55">{es ? 'Miembro' : 'Member'} <select value={memberUid} onChange={(event) => setMemberUid(event.target.value)} className="ml-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs text-black/75">
            <option value="all">{es ? 'Todos los visibles' : 'All visible'}</option>
            {people.map((member) => <option key={member.uid} value={member.uid}>{member.displayName || member.email || member.uid}</option>)}
          </select></label>
          <label className="text-xs text-black/55">{es ? 'Periodo' : 'Period'} <select value={period} onChange={(event) => setPeriod(event.target.value)} className="ml-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs text-black/75">
            <option value="7">{es ? '7 días' : '7 days'}</option>
            <option value="30">{es ? '30 días' : '30 days'}</option>
            <option value="90">{es ? '90 días' : '90 days'}</option>
            <option value="all">{es ? 'Todo lo cargado' : 'All loaded'}</option>
          </select></label>
          <input aria-label={es ? 'Buscar actividad' : 'Search activity'} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={es ? 'Buscar actividad…' : 'Search activity…'} className="min-w-[180px] flex-1 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs" />
        </div>
        <p className="mt-2 text-[10px] text-black/40">{es ? 'Actividad disponible en Firebase. Las métricas corresponden a los registros cargados, no a un informe histórico exhaustivo.' : 'Available Firebase activity. Metrics reflect loaded records, not an exhaustive historical report.'}</p>
      </section>

      {panel === 'summary' && <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          {label: es ? 'Completadas' : 'Completed', count: completed, Icon: CheckCircle2},
          {label: es ? 'Pendientes' : 'Pending', count: pending, Icon: Clock3},
          {label: es ? 'Vencidas' : 'Overdue', count: overdue, Icon: AlertCircle}
        ].map(({label, count, Icon}) => <div key={label} className="rounded-2xl border border-black/10 bg-white p-5">
          <Icon className="h-4 w-4 text-black/55"/>
          <p className="mt-3 text-2xl font-semibold tabular-nums text-[#111413]">{count}</p>
          <p className="mt-1 text-xs text-black/50">{label}</p>
        </div>)}
      </div>}

      <section className="overflow-hidden rounded-2xl border border-black/10 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-black/55"/><p className="text-sm font-semibold">{es ? 'Registro de actividad' : 'Activity history'}</p></div>
          <span className="text-[11px] text-black/40">{activity.length} {es ? 'registros visibles' : 'visible records'}</span>
        </div>
        <div className="gkais-light-scrollbar mt-3 max-h-[560px] divide-y divide-black/5 overflow-y-auto">
          {activity.slice(0, panel === 'summary' ? 12 : 180).map((item) => <div key={item.id} className="flex items-start gap-3 py-3">
            <Activity className="mt-0.5 h-4 w-4 shrink-0 text-black/35"/>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[#111413]">{labelForAction(item.action, language)}</p>
              {item.detail && <p className="mt-0.5 break-words text-xs text-black/55">{item.detail}</p>}
              <p className="mt-1 text-[11px] text-black/40">{item.actorUid && names.has(item.actorUid) ? (es ? 'Realizado por: ' : 'By: ') + names.get(item.actorUid) : item.assignedUid && names.has(item.assignedUid) ? (es ? 'Responsable: ' : 'Assignee: ') + names.get(item.assignedUid) : (es ? 'Responsable no registrado' : 'Actor not recorded')}</p>
            </div>
            <span className="shrink-0 text-[10px] tabular-nums text-black/40">{dateLabel(item.date)}</span>
          </div>)}
          {!activity.length && <p className="py-10 text-center text-sm text-black/40">{es ? 'Todavía no hay registros para estos filtros.' : 'No records match these filters.'}</p>}
        </div>
      </section>
    </>}
  </div>;
}
