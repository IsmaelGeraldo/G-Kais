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

async function workspaceId(): Promise<string> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('AUTH_REQUIRED');
  const id = await resolveActiveExpertWorkspaceId(user);
  if (!id) throw new Error('WORKSPACE_REQUIRED');
  return id;
}

function text(value: unknown): string { return typeof value === 'string' ? value : ''; }

export async function subscribeDashboardWorkItems(
  callback: (items: DashboardWorkItem[]) => void
): Promise<Unsubscribe> {
  const workspace = await workspaceId();
  return onSnapshot(collection(firestoreDb, 'expert_workspaces', workspace, 'work_tasks'), (snapshot) => {
    callback(snapshot.docs.map((item) => {
      const data = item.data() as Record<string, unknown>;
      const task = data.task && typeof data.task === 'object' ? data.task as Record<string, unknown> : {};
      const type = ['email', 'whatsapp', 'call', 'meeting', 'task'].includes(text(task.type)) ? text(task.type) as DashboardWorkItem['type'] : 'task';
      const status = ['pending', 'in-progress', 'done'].includes(text(task.status)) ? text(task.status) as DashboardWorkItem['status'] : 'pending';
      const interactionState = ['queue', 'waiting-reply', 'reply-received'].includes(text(task.interactionState)) ? text(task.interactionState) as DashboardWorkItem['interactionState'] : 'queue';
      const priority = ['high', 'medium', 'normal'].includes(text(task.priority)) ? text(task.priority) as DashboardWorkItem['priority'] : 'normal';
      return {
        id: item.id,
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
    }));
  }, () => callback([]));
}

export async function subscribeDashboardFormationClasses(
  callback: (items: DashboardFormationClass[]) => void
): Promise<Unsubscribe> {
  const workspace = await workspaceId();
  return onSnapshot(collection(firestoreDb, 'expert_workspaces', workspace, 'work_tasks'), (snapshot) => {
    const rows: DashboardFormationClass[] = [];
    snapshot.docs.forEach((item) => {
      const data = item.data() as Record<string, unknown>;
      const task = data.task && typeof data.task === 'object' ? data.task as Record<string, unknown> : {};
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
      const task = data.task && typeof data.task === 'object' ? data.task as Record<string, unknown> : {};
      if (text(task.sourceActionKind) !== 'cohort-meta') return;
      const cohortId = text(task.cohortId);
      const time = text(task.classTime);
      if (cohortId) rows.push({ cohortId, time });
    });
    callback(rows);
  }, () => callback([]));
}
