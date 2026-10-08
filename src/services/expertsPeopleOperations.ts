import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Timestamp,
  type Unsubscribe
} from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../lib/firebase';
import type { ExpertPerson } from './expertsAcquisition';
import {
  appendExpertAuditLog,
  appendExpertRelationshipEvent,
  resolveActiveExpertWorkspaceId,
  type WorkspaceMember
} from './expertsWorkspaceCore';

export type PersonActionType = 'email' | 'whatsapp' | 'call' | 'meeting' | 'task';

export type PersonRelationshipEvent = {
  id: string;
  type: string;
  sourceType: string;
  sourceId: string;
  actorUid: string;
  metadata: Record<string, unknown>;
  occurredAt: string;
};

export type PersonWorkTask = {
  id: string;
  title: string;
  type: PersonActionType;
  note: string;
  status: 'pending' | 'in-progress' | 'done';
  assignedToUid: string;
  assignedToName: string;
  dueDate: string;
  dueTime: string;
  result: string;
  createdAt: string;
  completedAt: string;
  source: string;
};

export type PersonHistorySnapshot = {
  events: PersonRelationshipEvent[];
  tasks: PersonWorkTask[];
};

function asIso(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as Timestamp).toDate === 'function') {
    try { return (value as Timestamp).toDate().toISOString(); } catch { return ''; }
  }
  return '';
}

function safeMap(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

async function activeWorkspaceId(): Promise<string> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('AUTH_REQUIRED');
  const workspaceId = await resolveActiveExpertWorkspaceId(user);
  if (!workspaceId) throw new Error('WORKSPACE_REQUIRED');
  return workspaceId;
}

export async function subscribePersonHistory(
  personId: string,
  callback: (history: PersonHistorySnapshot) => void
): Promise<Unsubscribe> {
  const workspaceId = await activeWorkspaceId();
  let events: PersonRelationshipEvent[] = [];
  let tasks: PersonWorkTask[] = [];
  const emit = () => callback({ events, tasks });

  const eventsQuery = query(
    collection(firestoreDb, 'expert_workspaces', workspaceId, 'relationship_events'),
    where('personId', '==', personId)
  );
  const tasksQuery = query(
    collection(firestoreDb, 'expert_workspaces', workspaceId, 'work_tasks'),
    where('task.personId', '==', personId)
  );

  const stopEvents = onSnapshot(eventsQuery, (snapshot) => {
    events = snapshot.docs.map((item) => {
      const data = item.data() as Record<string, unknown>;
      return {
        id: item.id,
        type: typeof data.type === 'string' ? data.type : 'relationship.event',
        sourceType: typeof data.sourceType === 'string' ? data.sourceType : '',
        sourceId: typeof data.sourceId === 'string' ? data.sourceId : '',
        actorUid: typeof data.actorUid === 'string' ? data.actorUid : '',
        metadata: safeMap(data.metadata),
        occurredAt: asIso(data.occurredAt) || asIso(data.createdAt)
      };
    }).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    emit();
  }, () => {
    events = [];
    emit();
  });

  const stopTasks = onSnapshot(tasksQuery, (snapshot) => {
    tasks = snapshot.docs.map((item) => {
      const envelope = item.data() as { task?: Record<string, unknown> };
      const task = envelope.task || {};
      return {
        id: item.id,
        title: typeof task.title === 'string' ? task.title : 'Acción',
        type: (typeof task.type === 'string' ? task.type : 'task') as PersonActionType,
        note: typeof task.note === 'string' ? task.note : '',
        status: (typeof task.status === 'string' ? task.status : 'pending') as PersonWorkTask['status'],
        assignedToUid: typeof task.assignedToUid === 'string' ? task.assignedToUid : '',
        assignedToName: typeof task.assignedToName === 'string'
          ? task.assignedToName
          : typeof task.assignee === 'string' ? task.assignee : '',
        dueDate: typeof task.dueDate === 'string' ? task.dueDate : '',
        dueTime: typeof task.dueTime === 'string' ? task.dueTime : '',
        result: typeof task.result === 'string' ? task.result : '',
        createdAt: typeof task.createdAt === 'string' ? task.createdAt : '',
        completedAt: typeof task.completedAt === 'string' ? task.completedAt : '',
        source: typeof task.source === 'string' ? task.source : ''
      };
    }).sort((a, b) => (b.completedAt || b.createdAt).localeCompare(a.completedAt || a.createdAt));
    emit();
  }, () => {
    tasks = [];
    emit();
  });

  return () => {
    stopEvents();
    stopTasks();
  };
}

export async function createPersonWorkAction(input: {
  person: ExpertPerson;
  assignee: WorkspaceMember;
  title: string;
  type: PersonActionType;
  dueDate?: string;
  dueTime?: string;
  note?: string;
}): Promise<string> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('AUTH_REQUIRED');
  const workspaceId = await activeWorkspaceId();
  const title = input.title.trim();
  if (!title) throw new Error('ACTION_TITLE_REQUIRED');

  const taskId = `task-person-${input.person.id}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const createdAt = new Date().toISOString();
  const assignedToName = input.assignee.displayName || input.assignee.email || input.assignee.uid;
  const dueDate = input.dueDate || '';
  const dueTime = input.dueTime || '';

  await setDoc(doc(firestoreDb, 'expert_workspaces', workspaceId, 'work_tasks', taskId), {
    schemaVersion: 1,
    task: {
      id: taskId,
      clientId: '',
      clientName: input.person.name,
      personId: input.person.id,
      title,
      type: input.type,
      note: input.note?.trim() || '',
      dueDate,
      dueTime,
      assignee: assignedToName,
      assignedToUid: input.assignee.uid,
      assignedToName,
      createdByUid: user.uid,
      status: 'pending',
      createdAt,
      source: 'people',
      sourceId: input.person.id,
      sourceActionKind: 'manual',
      priority: 'normal',
      confirmationEmail: 'not-required'
    },
    updatedAt: serverTimestamp()
  });

  // Global person-profile edits are owner-only. Team members can delegate
  // actions without failing on an unrelated restricted profile update.
  if (workspaceId === user.uid) {
    const personRef = doc(firestoreDb, 'expert_workspaces', workspaceId, 'people', input.person.id);
    await setDoc(personRef, {
    outcomeMemory: {
      ...(input.person.outcomeMemory || {}),
      nextActionType: input.type,
      nextActionLabel: title,
      nextActionAt: [dueDate, dueTime].filter(Boolean).join(' '),
      nextActionOwnerUid: input.assignee.uid
    },
    updatedAt: serverTimestamp()
    }, { merge: true });
  }

  await appendExpertRelationshipEvent({
    personId: input.person.id,
    type: 'person.action_created',
    sourceType: 'work_task',
    sourceId: taskId,
    idempotencyKey: `${taskId}:created`,
    metadata: {
      title,
      type: input.type,
      assignedToUid: input.assignee.uid,
      assignedToName,
      dueDate,
      dueTime,
      note: input.note?.trim() || ''
    }
  }).catch(() => {});

  await appendExpertAuditLog({
    entityType: 'work_task',
    entityId: taskId,
    action: 'person.action_created',
    changes: {
      personId: input.person.id,
      assignedToUid: input.assignee.uid,
      type: input.type,
      title,
      dueDate,
      dueTime
    }
  }).catch(() => {});

  return taskId;
}
