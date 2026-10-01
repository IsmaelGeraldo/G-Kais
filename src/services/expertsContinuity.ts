import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  type Unsubscribe
} from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../lib/firebase';
import {
  appendExpertAuditLog,
  appendExpertRelationshipEvent,
  resolveActiveExpertWorkspaceId,
  type WorkspaceMember
} from './expertsWorkspaceCore';
import type { ExpertPerson, ExpertWebinar, WebinarRegistration } from './expertsAcquisition';

export type NoPurchaseReason =
  | 'unknown'
  | 'budget'
  | 'timing'
  | 'not-fit'
  | 'needs-trust'
  | 'decision'
  | 'not-interested'
  | 'other';

export type ContinuityPath =
  | 'community'
  | 'youtube'
  | 'free-resources'
  | 'future-offer'
  | 'scholarship'
  | 'history-only';

export type ContinuityStatus = 'unassigned' | 'recorded' | 'active';

export type ContinuityState = {
  reason: NoPurchaseReason;
  note: string;
  path: ContinuityPath;
  status: ContinuityStatus;
  webinarId: string;
  taskId: string;
};

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

function reportSecondaryWriteFailure(label: string, error: unknown): void {
  console.error(`[G-KAIS ${label}]`, error);
}

async function workspaceId(): Promise<string> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('AUTH_REQUIRED');
  const id = await resolveActiveExpertWorkspaceId(user);
  if (!id) throw new Error('WORKSPACE_REQUIRED');
  return id;
}

function workspaceCollection(id: string, name: string) {
  return collection(firestoreDb, 'expert_workspaces', id, name);
}

function workspaceDocument(id: string, collectionName: string, documentId: string) {
  return doc(firestoreDb, 'expert_workspaces', id, collectionName, documentId);
}

function mapRegistration(id: string, data: Record<string, unknown>): WebinarRegistration {
  return {
    id,
    personId: typeof data.personId === 'string' ? data.personId : '',
    webinarId: typeof data.webinarId === 'string' ? data.webinarId : '',
    status: (typeof data.status === 'string' ? data.status : 'registered') as WebinarRegistration['status'],
    attendanceMinutes: typeof data.attendanceMinutes === 'number' ? data.attendanceMinutes : 0,
    purchased: Boolean(data.purchased),
    interest: (typeof data.interest === 'string' ? data.interest : 'unknown') as WebinarRegistration['interest'],
    followUpTaskId: typeof data.followUpTaskId === 'string' ? data.followUpTaskId : undefined,
    followUpStatus: typeof data.followUpStatus === 'string' ? data.followUpStatus as WebinarRegistration['followUpStatus'] : undefined,
    followUpResult: typeof data.followUpResult === 'string' ? data.followUpResult : undefined
  };
}

export async function subscribeAllWebinarRegistrations(callback: (items: WebinarRegistration[]) => void): Promise<Unsubscribe> {
  const id = await workspaceId();
  return onSnapshot(workspaceCollection(id, 'webinar_registrations'), (snapshot) => {
    callback(snapshot.docs.map((item) => mapRegistration(item.id, item.data() as Record<string, unknown>)));
  }, (error) => {
    console.error('[G-KAIS CONTINUITY REGISTRATIONS]', error);
    callback([]);
  });
}

function safeReason(value: unknown): NoPurchaseReason {
  return ['unknown', 'budget', 'timing', 'not-fit', 'needs-trust', 'decision', 'not-interested', 'other'].includes(String(value))
    ? value as NoPurchaseReason
    : 'unknown';
}

function safePath(value: unknown): ContinuityPath {
  return ['community', 'youtube', 'free-resources', 'future-offer', 'scholarship', 'history-only'].includes(String(value))
    ? value as ContinuityPath
    : 'history-only';
}

export function continuityState(person: ExpertPerson, webinarId?: string): ContinuityState {
  const memory = person.outcomeMemory || {};
  const savedWebinarId = typeof memory.continuityWebinarId === 'string' ? memory.continuityWebinarId : '';
  const sameWebinar = !webinarId || !savedWebinarId || savedWebinarId === webinarId;
  if (!sameWebinar) {
    return { reason: 'unknown', note: '', path: 'history-only', status: 'unassigned', webinarId: webinarId || '', taskId: '' };
  }
  return {
    reason: safeReason(memory.continuityReason),
    note: typeof memory.continuityNote === 'string' ? memory.continuityNote : '',
    path: safePath(memory.continuityPath),
    status: memory.continuityStatus === 'active' || memory.continuityStatus === 'recorded' ? memory.continuityStatus : 'unassigned',
    webinarId: savedWebinarId || webinarId || '',
    taskId: typeof memory.continuityTaskId === 'string' ? memory.continuityTaskId : ''
  };
}

export function continuityReasonLabel(reason: NoPurchaseReason, language: 'es' | 'en'): string {
  const es: Record<NoPurchaseReason, string> = {
    unknown: 'Aún no sabemos',
    budget: 'Falta de dinero / presupuesto',
    timing: 'No es el momento',
    'not-fit': 'La oferta no encaja',
    'needs-trust': 'Necesita más confianza / evidencia',
    decision: 'Debe decidirlo con otra persona',
    'not-interested': 'No tiene interés ahora',
    other: 'Otro motivo'
  };
  const en: Record<NoPurchaseReason, string> = {
    unknown: 'Not known yet',
    budget: 'Budget / affordability',
    timing: 'Timing is not right',
    'not-fit': 'Offer is not a fit',
    'needs-trust': 'Needs more trust / evidence',
    decision: 'Needs another decision maker',
    'not-interested': 'Not interested right now',
    other: 'Other reason'
  };
  return (language === 'es' ? es : en)[reason];
}

export function continuityPathLabel(path: ContinuityPath, language: 'es' | 'en'): string {
  const es: Record<ContinuityPath, string> = {
    community: 'Comunidad gratuita',
    youtube: 'YouTube / contenido abierto',
    'free-resources': 'Recursos gratuitos',
    'future-offer': 'Nueva oportunidad más adelante',
    scholarship: 'Posible beca / sorteo de cupo',
    'history-only': 'Mantener historial, sin acción ahora'
  };
  const en: Record<ContinuityPath, string> = {
    community: 'Free community',
    youtube: 'YouTube / open content',
    'free-resources': 'Free resources',
    'future-offer': 'Future opportunity',
    scholarship: 'Possible scholarship / seat draw',
    'history-only': 'Keep history, no action now'
  };
  return (language === 'es' ? es : en)[path];
}

export function suggestedContinuityPath(reason: NoPurchaseReason): ContinuityPath {
  if (reason === 'budget') return 'community';
  if (reason === 'timing') return 'future-offer';
  if (reason === 'needs-trust') return 'youtube';
  if (reason === 'decision') return 'free-resources';
  if (reason === 'not-fit' || reason === 'not-interested') return 'history-only';
  return 'free-resources';
}

export async function saveWebinarContinuity(input: {
  registration: WebinarRegistration;
  person: ExpertPerson;
  webinar: ExpertWebinar;
  reason: NoPurchaseReason;
  note?: string;
  path: ContinuityPath;
  assignee: WorkspaceMember;
  language: 'es' | 'en';
}): Promise<{ taskId: string; status: ContinuityStatus }> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('AUTH_REQUIRED');
  if (input.registration.purchased) throw new Error('ALREADY_PURCHASED');
  const id = await workspaceId();
  const personRef = workspaceDocument(id, 'people', input.person.id);
  const registrationRef = workspaceDocument(id, 'webinar_registrations', input.registration.id);
  const shouldCreateTask = input.path !== 'history-only';
  const taskId = `task-${input.registration.id}-continuity`;
  const taskRef = workspaceDocument(id, 'work_tasks', taskId);
  const status: ContinuityStatus = shouldCreateTask ? 'active' : 'recorded';
  const reasonLabel = continuityReasonLabel(input.reason, input.language);
  const pathLabel = continuityPathLabel(input.path, input.language);
  const title = input.language === 'es' ? `Continuidad · ${pathLabel}` : `Continuity · ${pathLabel}`;
  const note = input.note?.trim() || (input.language === 'es'
    ? `No compró en ${input.webinar.title}. Motivo: ${reasonLabel}. Mantener la relación mediante ${pathLabel.toLowerCase()}.`
    : `Did not purchase after ${input.webinar.title}. Reason: ${reasonLabel}. Keep the relationship through ${pathLabel.toLowerCase()}.`);

  await runTransaction(firestoreDb, async (transaction) => {
    const [personSnapshot, registrationSnapshot, taskSnapshot] = await Promise.all([
      transaction.get(personRef),
      transaction.get(registrationRef),
      shouldCreateTask ? transaction.get(taskRef) : Promise.resolve(null)
    ]);
    if (!personSnapshot.exists()) throw new Error('PERSON_NOT_FOUND');
    if (!registrationSnapshot.exists()) throw new Error('WEBINAR_REGISTRATION_NOT_FOUND');
    const currentMemory = personSnapshot.data().outcomeMemory && typeof personSnapshot.data().outcomeMemory === 'object'
      ? personSnapshot.data().outcomeMemory as Record<string, unknown>
      : {};

    transaction.set(personRef, {
      outcomeMemory: sanitize({
        ...currentMemory,
        continuityReason: input.reason,
        continuityNote: input.note?.trim() || '',
        continuityPath: input.path,
        continuityStatus: status,
        continuityWebinarId: input.webinar.id,
        continuityRegistrationId: input.registration.id,
        continuityTaskId: shouldCreateTask ? taskId : '',
        continuityUpdatedAt: new Date().toISOString()
      }),
      updatedAt: serverTimestamp()
    }, { merge: true });

    if (shouldCreateTask) {
      const existingTask = taskSnapshot?.exists()
        ? (taskSnapshot.data() as { task?: Record<string, unknown> }).task || {}
        : {};
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
          type: input.path === 'future-offer' ? 'task' : 'whatsapp',
          note,
          dueDate: typeof existingTask.dueDate === 'string' ? existingTask.dueDate : '',
          dueTime: typeof existingTask.dueTime === 'string' ? existingTask.dueTime : '',
          assignee: input.assignee.displayName || input.assignee.email,
          assignedToUid: input.assignee.uid,
          assignedToName: input.assignee.displayName || input.assignee.email,
          createdByUid: typeof existingTask.createdByUid === 'string' ? existingTask.createdByUid : user.uid,
          status: 'pending',
          createdAt,
          source: 'webinar-continuity',
          sourceId: input.webinar.id,
          sourceRegistrationId: input.registration.id,
          sourceActionKind: 'continuity',
          priority: input.reason === 'budget' && input.path === 'scholarship' ? 'medium' : 'normal',
          confirmationEmail: 'not-required'
        }),
        updatedAt: serverTimestamp()
      }, { merge: true });
      transaction.update(registrationRef, {
        followUpTaskId: taskId,
        followUpStatus: 'created',
        updatedAt: serverTimestamp()
      });
    }
  });

  await appendExpertRelationshipEvent({
    personId: input.person.id,
    type: 'webinar.continuity_planned',
    sourceType: 'webinar',
    sourceId: input.webinar.id,
    idempotencyKey: `${input.registration.id}:continuity:${input.reason}:${input.path}`,
    metadata: {
      registrationId: input.registration.id,
      reason: input.reason,
      note: input.note?.trim() || '',
      path: input.path,
      taskId: shouldCreateTask ? taskId : ''
    }
  }).catch((error) => reportSecondaryWriteFailure('RELATIONSHIP EVENT ERROR', error));
  await appendExpertAuditLog({
    entityType: 'person',
    entityId: input.person.id,
    action: 'continuity.updated',
    changes: { webinarId: input.webinar.id, registrationId: input.registration.id, reason: input.reason, path: input.path, status }
  }).catch((error) => reportSecondaryWriteFailure('AUDIT LOG ERROR', error));

  return { taskId: shouldCreateTask ? taskId : '', status };
}
