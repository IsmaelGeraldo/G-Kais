import { collection, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../lib/firebase';
import { resolveActiveExpertWorkspaceId } from './expertsWorkspaceCore';

export type DashboardWorkItem = {
  id: string;
  clientId: string;
  clientName: string;
  personId: string;
  title: string;
  type: 'email' | 'whatsapp' | 'call' | 'meeting' | 'task';
  note: string;
  result: string;
  dueDate: string;
  dueTime: string;
  assignee: string;
  assignedToUid: string;
  status: 'pending' | 'in-progress' | 'done';
  interactionState: 'queue' | 'waiting-reply' | 'reply-received';
  priority: 'high' | 'medium' | 'normal';
  source: string;
  sourceId: string;
  sourceActionKind: string;
  workstream: string;
  createdAt: string;
  completedAt: string;
  deletedAt: string;
};

export type DashboardFormationClass = {
  id: string;
  formationId: string;
  cohortId: string;
  cohortTitle: string;
  classNumber: number;
  title: string;
  date: string;
  time: string;
  status: 'pending' | 'done';
  archived: boolean;
};

export type DashboardCohortTime = { cohortId: string; time: string };
export type DashboardMentoringBuyer = {
  id: string;
  personId: string;
  createdAt: string;
  startDate: string;
};

async function workspaceId(): Promise<string> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('AUTH_REQUIRED');
  const id = await resolveActiveExpertWorkspaceId(user);
  if (!id) throw new Error('WORKSPACE_REQUIRED');
  return id;
}

function text(value: unknown): string { return typeof value === 'string' ? value : ''; }
function object(value: unknown): Record<string, unknown> { return value && typeof value === 'object' ? value as Record<string, unknown> : {}; }
function isoDate(value: unknown): string {
  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : '';
  }
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : '';
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    const date = (value as { toDate: () => Date }).toDate();
    return Number.isFinite(date.getTime()) ? date.toISOString() : '';
  }
  return '';
}

function dashboardWorkItem(id: string, task: Record<string, unknown>): DashboardWorkItem {
  const type = ['email', 'whatsapp', 'call', 'meeting', 'task'].includes(text(task.type)) ? text(task.type) as DashboardWorkItem['type'] : 'task';
  const status = ['pending', 'in-progress', 'done'].includes(text(task.status)) ? text(task.status) as DashboardWorkItem['status'] : 'pending';
  const interactionState = ['queue', 'waiting-reply', 'reply-received'].includes(text(task.interactionState)) ? text(task.interactionState) as DashboardWorkItem['interactionState'] : 'queue';
  const priority = ['high', 'medium', 'normal'].includes(text(task.priority)) ? text(task.priority) as DashboardWorkItem['priority'] : 'normal';
  return {
    id,
    clientId: text(task.clientId),
    clientName: text(task.clientName),
    personId: text(task.personId),
    title: text(task.title),
    type,
    note: text(task.note),
    result: text(task.result),
    dueDate: text(task.dueDate),
    dueTime: text(task.dueTime),
    assignee: text(task.assignee),
    assignedToUid: text(task.assignedToUid),
    status,
    interactionState,
    priority,
    source: text(task.source),
    sourceId: text(task.sourceId),
    sourceActionKind: text(task.sourceActionKind),
    workstream: text(task.workstream),
    createdAt: text(task.createdAt),
    completedAt: text(task.completedAt),
    deletedAt: text(task.deletedAt)
  };
}

function canonicalLeadMetricRows(snapshot: { docs: Array<{ id: string; data: () => unknown }> }): DashboardWorkItem[] {
  return snapshot.docs.flatMap((item) => {
    const data = item.data() as Record<string, unknown>;
    if (text(data.type) !== 'lead_entered') return [];
    const personId = text(data.personId);
    const createdAt = isoDate(data.occurredAt);
    if (!personId || !createdAt) return [];
    return [{
      id: `metric-lead-${item.id}`,
      clientId: '',
      clientName: '',
      personId,
      title: '',
      type: 'task' as const,
      note: '',
      result: '',
      dueDate: '',
      dueTime: '',
      assignee: '',
      assignedToUid: '',
      status: 'done' as const,
      interactionState: 'queue' as const,
      priority: 'normal' as const,
      source: 'webinar',
      sourceId: text(data.sourceId),
      sourceActionKind: 'follow-up',
      workstream: 'canonical-lead-event',
      createdAt,
      completedAt: createdAt,
      deletedAt: 'metric-only'
    }];
  });
}

export async function subscribeDashboardWorkItems(
  callback: (items: DashboardWorkItem[]) => void
): Promise<Unsubscribe> {
  const workspace = await workspaceId();
  let workItems: DashboardWorkItem[] = [];
  let canonicalLeads: DashboardWorkItem[] = [];
  const emit = () => callback([...workItems, ...canonicalLeads]);

  const unsubscribeTasks = onSnapshot(collection(firestoreDb, 'expert_workspaces', workspace, 'work_tasks'), (snapshot) => {
    workItems = snapshot.docs.map((item) => {
      const data = item.data() as Record<string, unknown>;
      return dashboardWorkItem(item.id, object(data.task));
    });
    emit();
  }, () => {
    workItems = [];
    emit();
  });

  const unsubscribeEvents = onSnapshot(collection(firestoreDb, 'expert_workspaces', workspace, 'relationship_events'), (snapshot) => {
    canonicalLeads = canonicalLeadMetricRows(snapshot);
    emit();
  }, () => {
    canonicalLeads = [];
    emit();
  });

  return () => {
    unsubscribeTasks();
    unsubscribeEvents();
  };
}

export async function subscribeDashboardFormationClasses(
  callback: (items: DashboardFormationClass[]) => void
): Promise<Unsubscribe> {
  const workspace = await workspaceId();
  return onSnapshot(collection(firestoreDb, 'expert_workspaces', workspace, 'work_tasks'), (snapshot) => {
    const rows: DashboardFormationClass[] = [];
    snapshot.docs.forEach((item) => {
      const data = item.data() as Record<string, unknown>;
      const task = object(data.task);
      if (text(task.sourceActionKind) !== 'formation-plan') return;
      rows.push({
        id: item.id,
        formationId: text(task.formationId),
        cohortId: text(task.cohortId),
        cohortTitle: text(task.clientName),
        classNumber: typeof task.classNumber === 'number' ? task.classNumber : 0,
        title: text(task.planTitle) || text(task.title),
        date: text(task.dueDate),
        time: text(task.dueTime),
        status: task.planStatus === 'done' ? 'done' : 'pending',
        archived: task.planVisibility === 'archived'
      });
    });
    callback(rows.sort((a, b) => `${a.date}${a.time}${a.classNumber}`.localeCompare(`${b.date}${b.time}${b.classNumber}`)));
  }, () => callback([]));
}

export async function subscribeDashboardCohortTimes(
  callback: (items: DashboardCohortTime[]) => void
): Promise<Unsubscribe> {
  const workspace = await workspaceId();
  return onSnapshot(collection(firestoreDb, 'expert_workspaces', workspace, 'work_tasks'), (snapshot) => {
    const rows: DashboardCohortTime[] = [];
    snapshot.docs.forEach((item) => {
      const data = item.data() as Record<string, unknown>;
      const task = object(data.task);
      if (text(task.sourceActionKind) !== 'cohort-meta') return;
      const cohortId = text(task.cohortId);
      const time = text(task.classTime);
      if (cohortId) rows.push({ cohortId, time });
    });
    callback(rows);
  }, () => callback([]));
}

export async function subscribeDashboardMentoringBuyers(
  callback: (items: DashboardMentoringBuyer[]) => void
): Promise<Unsubscribe> {
  const workspace = await workspaceId();
  return onSnapshot(collection(firestoreDb, 'expert_workspaces', workspace, 'clients'), (snapshot) => {
    callback(snapshot.docs.map((item) => {
      const data = item.data() as Record<string, unknown>;
      const record = object(data.record);
      return {
        id: item.id,
        personId: text(record.personId),
        createdAt: text(record.createdAt),
        startDate: text(record.startDate)
      };
    }));
  }, () => callback([]));
}
