import {
  doc,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../lib/firebase';
import {
  appendExpertAuditLog,
  appendExpertRelationshipEvent,
  resolveActiveExpertWorkspaceId,
  type WorkspaceMember
} from './expertsWorkspaceCore';
import type {
  ExpertPerson,
  ExpertWebinar,
  WebinarRegistration
} from './expertsAcquisition';

export type WebinarWorkActionKind = 'follow-up' | 'enrollment';
export type WebinarWorkActionType = 'email' | 'whatsapp' | 'call' | 'meeting' | 'task';
export type WebinarWorkPriority = 'high' | 'medium' | 'normal';

function sanitize<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => sanitize(item)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, sanitize(item)])
    ) as T;
  }
  return value;
}

async function workspaceId(): Promise<string> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('AUTH_REQUIRED');
  const id = await resolveActiveExpertWorkspaceId(user);
  if (!id) throw new Error('WORKSPACE_REQUIRED');
  return id;
}

function workspaceDocument(workspaceId: string, collectionName: string, id: string) {
  return doc(firestoreDb, 'expert_workspaces', workspaceId, collectionName, id);
}

function reportSecondaryWriteFailure(label: string, error: unknown): void {
  console.error(`[G-KAIS ${label}]`, error);
}

export function webinarWorkActionKind(registration: Pick<WebinarRegistration, 'purchased'>): WebinarWorkActionKind {
  return registration.purchased ? 'enrollment' : 'follow-up';
}

export function webinarWorkPriority(registration: Pick<WebinarRegistration, 'purchased' | 'status' | 'interest'>): WebinarWorkPriority {
  if (registration.purchased) return 'high';
  if (registration.status === 'attended' && registration.interest === 'high') return 'high';
  if (registration.status === 'attended' || registration.interest === 'medium' || registration.interest === 'high') return 'medium';
  return 'normal';
}

export function webinarNeedsWorkAction(registration: WebinarRegistration): boolean {
  if (registration.followUpStatus === 'created' || registration.followUpStatus === 'completed') return false;
  return registration.purchased || registration.status === 'attended' || registration.status === 'no-show';
}

export async function createWebinarWorkAction(input: {
  registration: WebinarRegistration;
  person: ExpertPerson;
  webinar: ExpertWebinar;
  assignee: WorkspaceMember;
  type?: WebinarWorkActionType;
  dueDate?: string;
  dueTime?: string;
  kind?: WebinarWorkActionKind;
  priority?: WebinarWorkPriority;
  note?: string;
}): Promise<string> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('AUTH_REQUIRED');
  const id = await workspaceId();
  const kind = input.kind || webinarWorkActionKind(input.registration);
  const priority = input.priority || webinarWorkPriority(input.registration);
  const canReuseCurrentTask = input.registration.followUpStatus !== 'completed' && Boolean(input.registration.followUpTaskId);
  const taskId = canReuseCurrentTask
    ? input.registration.followUpTaskId!
    : `task-${input.registration.id}-${kind}`;
  const taskRef = workspaceDocument(id, 'work_tasks', taskId);
  const registrationRef = workspaceDocument(id, 'webinar_registrations', input.registration.id);
  const personRef = workspaceDocument(id, 'people', input.person.id);

  const offer = input.webinar.offerLabel.trim() || 'programa comprado';
  const title = kind === 'enrollment'
    ? `Integrar a ${offer}`
    : input.registration.status === 'no-show'
      ? `Recuperar no-show · ${input.webinar.title}`
      : `Seguimiento post-webinar · ${input.webinar.title}`;
  const defaultNote = kind === 'enrollment'
    ? `Compra confirmada en ${input.webinar.title}. Integrar a ${offer} y confirmar acceso / próximos pasos.`
    : input.registration.status === 'no-show'
      ? `Retomar contacto después de no asistir a ${input.webinar.title}.`
      : `Dar seguimiento después de ${input.webinar.title}; no compró${input.registration.interest !== 'unknown' ? ` · interés ${input.registration.interest}` : ''}.`;

  await runTransaction(firestoreDb, async (transaction) => {
    const [taskSnapshot, registrationSnapshot] = await Promise.all([
      transaction.get(taskRef),
      transaction.get(registrationRef)
    ]);
    if (!registrationSnapshot.exists()) throw new Error('WEBINAR_REGISTRATION_NOT_FOUND');

    const existingTask = taskSnapshot.exists()
      ? (taskSnapshot.data() as { task?: Record<string, unknown> }).task || {}
      : {};
    const actionType = input.type || (kind === 'enrollment' ? 'task' : 'whatsapp');
    const dueDate = input.dueDate !== undefined ? input.dueDate : (typeof existingTask.dueDate === 'string' ? existingTask.dueDate : '');
    const dueTime = input.dueTime !== undefined ? input.dueTime : (typeof existingTask.dueTime === 'string' ? existingTask.dueTime : '');
    const createdAt = typeof existingTask.createdAt === 'string' ? existingTask.createdAt : new Date().toISOString();

    transaction.set(taskRef, {
      schemaVersion: 1,
      task: sanitize({
        ...existingTask,
        id: taskId,
        clientId: '',
        clientName: input.person.name,
        personId: input.person.id,
        title,
        type: actionType,
        note: input.note?.trim() || defaultNote,
        dueDate,
        dueTime,
        assignee: input.assignee.displayName || input.assignee.email,
        assignedToUid: input.assignee.uid,
        assignedToName: input.assignee.displayName || input.assignee.email,
        createdByUid: typeof existingTask.createdByUid === 'string' ? existingTask.createdByUid : user.uid,
        status: 'pending',
        createdAt,
        source: 'webinar',
        sourceId: input.webinar.id,
        sourceRegistrationId: input.registration.id,
        sourceActionKind: kind,
        priority,
        confirmationEmail: 'not-required'
      }),
      updatedAt: serverTimestamp()
    }, { merge: true });

    transaction.update(registrationRef, {
      followUpTaskId: taskId,
      followUpStatus: 'created',
      updatedAt: serverTimestamp()
    });

    const personPatch: Record<string, unknown> = {
      'outcomeMemory.webinarFollowUpStatus': 'created',
      'outcomeMemory.webinarNextActionKind': kind,
      'outcomeMemory.nextActionType': actionType,
      'outcomeMemory.nextActionAt': [dueDate, dueTime].filter(Boolean).join(' '),
      'outcomeMemory.nextActionOwnerUid': input.assignee.uid,
      updatedAt: serverTimestamp()
    };
    if (kind === 'enrollment') {
      personPatch['outcomeMemory.nextActionLabel'] = title;
      personPatch['outcomeMemory.purchasedOffer'] = offer;
    }
    transaction.update(personRef, personPatch);
  });

  await appendExpertRelationshipEvent({
    personId: input.person.id,
    type: kind === 'enrollment' ? 'webinar.enrollment_task_created' : 'webinar.followup_created',
    sourceType: 'work_task',
    sourceId: taskId,
    idempotencyKey: `${input.registration.id}:${kind}:created:${taskId}`,
    metadata: {
      webinarId: input.webinar.id,
      registrationId: input.registration.id,
      assignedToUid: input.assignee.uid,
      priority,
      offerLabel: input.webinar.offerLabel
    }
  }).catch((error) => reportSecondaryWriteFailure('RELATIONSHIP EVENT ERROR', error));
  await appendExpertAuditLog({
    entityType: 'work_task',
    entityId: taskId,
    action: kind === 'enrollment' ? 'webinar.enrollment_task_created' : 'webinar.followup_created',
    changes: {
      personId: input.person.id,
      webinarId: input.webinar.id,
      assignedToUid: input.assignee.uid,
      priority,
      kind
    }
  }).catch((error) => reportSecondaryWriteFailure('AUDIT LOG ERROR', error));
  return taskId;
}

export async function markWebinarWorkActionCompleted(input: {
  registrationId: string;
  personId: string;
  result: string;
  kind?: WebinarWorkActionKind;
  taskId?: string;
}): Promise<void> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('AUTH_REQUIRED');
  const id = await workspaceId();
  const registrationRef = workspaceDocument(id, 'webinar_registrations', input.registrationId);
  const personRef = workspaceDocument(id, 'people', input.personId);
  const result = input.result.trim();

  const completion = await runTransaction(firestoreDb, async (transaction) => {
    const isOwner = id === user.uid;
    const registrationSnapshot = await transaction.get(registrationRef);
    if (!registrationSnapshot.exists()) return null;

    const data = registrationSnapshot.data() as Record<string, unknown>;
    const purchased = Boolean(data.purchased);
    const kind = input.kind || (purchased ? 'enrollment' : 'follow-up');
    const trackedTaskId = typeof data.followUpTaskId === 'string' ? data.followUpTaskId : input.taskId || input.registrationId;
    const alreadyCompleted = data.followUpStatus === 'completed' && data.followUpResult === result;

    if (alreadyCompleted) return { kind, trackedTaskId, changed: false };

    transaction.update(registrationRef, {
      followUpStatus: 'completed',
      followUpResult: result,
      followUpCompletedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    if (isOwner) {
      transaction.update(personRef, {
        'outcomeMemory.webinarFollowUpStatus': 'completed',
        'outcomeMemory.webinarNextActionKind': kind,
        'outcomeMemory.lastFollowUpResult': result,
        'outcomeMemory.lastFollowUpAt': new Date().toISOString(),
        'outcomeMemory.nextActionType': '',
        'outcomeMemory.nextActionAt': '',
        'outcomeMemory.nextActionOwnerUid': '',
        'outcomeMemory.nextActionLabel': '',
        updatedAt: serverTimestamp()
      });
    }

    return { kind, trackedTaskId, changed: true };
  });

  if (!completion?.changed) return;
  await appendExpertRelationshipEvent({
    personId: input.personId,
    type: completion.kind === 'enrollment' ? 'webinar.enrollment_task_completed' : 'webinar.followup_completed',
    sourceType: 'work_task',
    sourceId: completion.trackedTaskId,
    idempotencyKey: `${input.registrationId}:${completion.kind}:completed:${completion.trackedTaskId}`,
    metadata: { registrationId: input.registrationId, result }
  }).catch((error) => reportSecondaryWriteFailure('RELATIONSHIP EVENT ERROR', error));
  await appendExpertAuditLog({
    entityType: 'webinar_registration',
    entityId: input.registrationId,
    action: completion.kind === 'enrollment' ? 'webinar.enrollment_task_completed' : 'webinar.followup_completed',
    changes: { personId: input.personId, result, actorUid: user.uid, kind: completion.kind }
  }).catch((error) => reportSecondaryWriteFailure('AUDIT LOG ERROR', error));
}
