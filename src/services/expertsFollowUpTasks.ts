import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../lib/firebase';
import type { ExpertPerson } from './expertsAcquisition';
import {
  appendExpertAuditLog,
  appendExpertRelationshipEvent,
  resolveActiveExpertWorkspaceId,
  type WorkspaceMember
} from './expertsWorkspaceCore';

export type FollowUpActionType = 'email' | 'whatsapp' | 'call' | 'meeting' | 'task';

async function workspaceId(): Promise<string> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('AUTH_REQUIRED');
  const id = await resolveActiveExpertWorkspaceId(user);
  if (!id) throw new Error('WORKSPACE_REQUIRED');
  return id;
}

export async function scheduleExpertFollowUpTask(input: {
  person: Pick<ExpertPerson, 'id' | 'name'>;
  assignee: WorkspaceMember;
  type: FollowUpActionType;
  dueDate?: string;
  dueTime?: string;
  title?: string;
  note?: string;
  sourceId?: string;
}): Promise<string> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('AUTH_REQUIRED');
  const workspace = await workspaceId();
  const taskId = `task-nurture-${input.person.id}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const assignedToName = input.assignee.displayName || input.assignee.email || input.assignee.uid;
  const title = input.title?.trim() || 'Seguimiento de continuidad';
  const note = input.note?.trim() || 'Revisar aprendizaje, actividad y próxima oportunidad.';
  const createdAt = new Date().toISOString();

  await setDoc(doc(firestoreDb, 'expert_workspaces', workspace, 'work_tasks', taskId), {
    schemaVersion: 1,
    task: {
      id: taskId,
      clientId: '',
      clientName: input.person.name,
      personId: input.person.id,
      title,
      type: input.type,
      note,
      dueDate: input.dueDate || '',
      dueTime: input.dueTime || '',
      assignee: assignedToName,
      assignedToUid: input.assignee.uid,
      assignedToName,
      createdByUid: user.uid,
      status: 'pending',
      createdAt,
      source: 'nurture',
      sourceId: input.sourceId || input.person.id,
      sourceActionKind: 'continuity',
      workstream: 'follow-up',
      interactionState: 'queue',
      priority: 'normal',
      confirmationEmail: 'not-required'
    },
    updatedAt: serverTimestamp()
  });

  await appendExpertRelationshipEvent({
    personId: input.person.id,
    type: 'nurture.task_created',
    sourceType: 'work_task',
    sourceId: taskId,
    idempotencyKey: `${taskId}:created`,
    metadata: {
      type: input.type,
      dueDate: input.dueDate || '',
      dueTime: input.dueTime || '',
      assignedToUid: input.assignee.uid,
      title
    }
  }).catch(() => {});

  await appendExpertAuditLog({
    entityType: 'work_task',
    entityId: taskId,
    action: 'nurture.task_created',
    changes: { personId: input.person.id, assignedToUid: input.assignee.uid, type: input.type }
  }).catch(() => {});

  return taskId;
}
