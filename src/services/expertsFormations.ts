import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  updateDoc,
  type Unsubscribe
} from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../lib/firebase';
import { createExpertCohort, createExpertEnrollment, createExpertFormation } from './expertsRelationshipFoundation';
import { recordOperationalBuyerEvent } from './expertsBuyerEvents';
import {
  appendExpertAuditLog,
  appendExpertRelationshipEvent,
  resolveActiveExpertWorkspaceId,
  type WorkspaceMember
} from './expertsWorkspaceCore';

export type FormationStatus = 'draft' | 'active' | 'archived';
export type CohortStatus = 'planned' | 'active' | 'completed' | 'cancelled';
export type EnrollmentStatus = 'active' | 'completed' | 'withdrawn' | 'refunded';

export type ExpertFormation = {
  id: string;
  title: string;
  status: FormationStatus;
};

export type ExpertCohort = {
  id: string;
  formationId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  status: CohortStatus;
};

export type ExpertEnrollment = {
  id: string;
  personId: string;
  formationId: string;
  cohortId: string;
  status: EnrollmentStatus;
  progress: number;
  joinedAt?: Date;
};

export type EnrollmentAttention = {
  level: 'high' | 'medium' | 'normal';
  label: string;
  reason: string;
} | null;

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

function toDate(value: unknown): Date | undefined {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return undefined;
}

function mapFormation(id: string, data: Record<string, unknown>): ExpertFormation {
  return {
    id,
    title: typeof data.title === 'string' ? data.title : '',
    status: (typeof data.status === 'string' ? data.status : 'draft') as FormationStatus
  };
}

function mapCohort(id: string, data: Record<string, unknown>): ExpertCohort {
  return {
    id,
    formationId: typeof data.formationId === 'string' ? data.formationId : '',
    title: typeof data.title === 'string' ? data.title : '',
    startsAt: typeof data.startsAt === 'string' ? data.startsAt : '',
    endsAt: typeof data.endsAt === 'string' ? data.endsAt : '',
    status: (typeof data.status === 'string' ? data.status : 'planned') as CohortStatus
  };
}

function mapEnrollment(id: string, data: Record<string, unknown>): ExpertEnrollment {
  return {
    id,
    personId: typeof data.personId === 'string' ? data.personId : '',
    formationId: typeof data.formationId === 'string' ? data.formationId : '',
    cohortId: typeof data.cohortId === 'string' ? data.cohortId : '',
    status: (typeof data.status === 'string' ? data.status : 'active') as EnrollmentStatus,
    progress: typeof data.progress === 'number' ? Math.max(0, Math.min(100, Math.round(data.progress))) : 0,
    joinedAt: toDate(data.joinedAt)
  };
}

export async function subscribeExpertFormations(callback: (items: ExpertFormation[]) => void): Promise<Unsubscribe> {
  const id = await workspaceId();
  return onSnapshot(workspaceCollection(id, 'formations'), (snapshot) => {
    callback(snapshot.docs
      .map((item) => mapFormation(item.id, item.data() as Record<string, unknown>))
      .sort((a, b) => a.title.localeCompare(b.title)));
  }, (error) => {
    console.error('[G-KAIS FORMATIONS SUBSCRIPTION]', error);
    callback([]);
  });
}

export async function subscribeExpertCohorts(callback: (items: ExpertCohort[]) => void): Promise<Unsubscribe> {
  const id = await workspaceId();
  return onSnapshot(workspaceCollection(id, 'cohorts'), (snapshot) => {
    callback(snapshot.docs
      .map((item) => mapCohort(item.id, item.data() as Record<string, unknown>))
      .sort((a, b) => `${b.startsAt}${b.title}`.localeCompare(`${a.startsAt}${a.title}`)));
  }, (error) => {
    console.error('[G-KAIS COHORTS SUBSCRIPTION]', error);
    callback([]);
  });
}

export async function subscribeExpertEnrollments(callback: (items: ExpertEnrollment[]) => void): Promise<Unsubscribe> {
  const id = await workspaceId();
  return onSnapshot(workspaceCollection(id, 'enrollments'), (snapshot) => {
    callback(snapshot.docs
      .map((item) => mapEnrollment(item.id, item.data() as Record<string, unknown>))
      .sort((a, b) => (b.joinedAt?.getTime() || 0) - (a.joinedAt?.getTime() || 0)));
  }, (error) => {
    console.error('[G-KAIS ENROLLMENTS SUBSCRIPTION]', error);
    callback([]);
  });
}

export async function createOperationalFormation(input: { title: string; status?: FormationStatus }): Promise<string> {
  const title = input.title.trim();
  if (!title) throw new Error('FORMATION_TITLE_REQUIRED');
  const id = await createExpertFormation({ title, status: input.status || 'active' });
  await appendExpertAuditLog({ entityType: 'formation', entityId: id, action: 'formation.created', changes: { title, status: input.status || 'active' } })
    .catch((error) => reportSecondaryWriteFailure('AUDIT LOG ERROR', error));
  return id;
}

export async function updateOperationalFormation(id: string, patch: { title?: string; status?: FormationStatus }): Promise<void> {
  const workspace = await workspaceId();
  const cleanPatch: Record<string, unknown> = {};
  if (patch.title !== undefined) {
    const title = patch.title.trim();
    if (!title) throw new Error('FORMATION_TITLE_REQUIRED');
    cleanPatch.title = title;
  }
  if (patch.status !== undefined) cleanPatch.status = patch.status;
  await updateDoc(workspaceDocument(workspace, 'formations', id), { ...cleanPatch, updatedAt: serverTimestamp() });
  await appendExpertAuditLog({ entityType: 'formation', entityId: id, action: 'formation.updated', changes: cleanPatch })
    .catch((error) => reportSecondaryWriteFailure('AUDIT LOG ERROR', error));
}

export async function createOperationalCohort(input: {
  formationId: string;
  title: string;
  startsAt?: string;
  endsAt?: string;
  status?: CohortStatus;
}): Promise<string> {
  const title = input.title.trim();
  if (!input.formationId) throw new Error('FORMATION_REQUIRED');
  if (!title) throw new Error('COHORT_TITLE_REQUIRED');
  const id = await createExpertCohort({
    formationId: input.formationId,
    title,
    startsAt: input.startsAt || '',
    endsAt: input.endsAt || '',
    status: input.status || 'planned'
  });
  await appendExpertAuditLog({ entityType: 'cohort', entityId: id, action: 'cohort.created', changes: { formationId: input.formationId, title, startsAt: input.startsAt || '', endsAt: input.endsAt || '', status: input.status || 'planned' } })
    .catch((error) => reportSecondaryWriteFailure('AUDIT LOG ERROR', error));
  return id;
}

export async function updateOperationalCohort(id: string, patch: Partial<Omit<ExpertCohort, 'id' | 'formationId'>>): Promise<void> {
  const workspace = await workspaceId();
  const cleanPatch: Record<string, unknown> = {};
  if (patch.title !== undefined) {
    const title = patch.title.trim();
    if (!title) throw new Error('COHORT_TITLE_REQUIRED');
    cleanPatch.title = title;
  }
  if (patch.startsAt !== undefined) cleanPatch.startsAt = patch.startsAt;
  if (patch.endsAt !== undefined) cleanPatch.endsAt = patch.endsAt;
  if (patch.status !== undefined) cleanPatch.status = patch.status;
  await updateDoc(workspaceDocument(workspace, 'cohorts', id), { ...cleanPatch, updatedAt: serverTimestamp() });
  await appendExpertAuditLog({ entityType: 'cohort', entityId: id, action: 'cohort.updated', changes: cleanPatch })
    .catch((error) => reportSecondaryWriteFailure('AUDIT LOG ERROR', error));
}

export async function enrollExpertPerson(input: {
  personId: string;
  formationId: string;
  cohortId: string;
  status?: EnrollmentStatus;
  progress?: number;
}): Promise<string> {
  const id = await createExpertEnrollment({
    personId: input.personId,
    formationId: input.formationId,
    cohortId: input.cohortId,
    status: input.status || 'active',
    progress: input.progress || 0
  });
  await appendExpertRelationshipEvent({
    personId: input.personId,
    type: 'formation.enrolled',
    sourceType: 'enrollment',
    sourceId: id,
    idempotencyKey: `${id}:enrolled`,
    metadata: { formationId: input.formationId, cohortId: input.cohortId, status: input.status || 'active' }
  }).catch((error) => reportSecondaryWriteFailure('RELATIONSHIP EVENT ERROR', error));
  const enrollmentStatus = input.status || 'active';
  if (enrollmentStatus !== 'withdrawn' && enrollmentStatus !== 'refunded') {
    await recordOperationalBuyerEvent({
      personId: input.personId,
      kind: 'formation',
      sourceType: 'enrollment',
      sourceId: id,
      metadata: {
        formationId: input.formationId,
        cohortId: input.cohortId,
        status: enrollmentStatus
      }
    }).catch((error) => reportSecondaryWriteFailure('BUYER EVENT ERROR', error));
  }
  await appendExpertAuditLog({ entityType: 'enrollment', entityId: id, action: 'formation.enrolled', changes: { personId: input.personId, formationId: input.formationId, cohortId: input.cohortId } })
    .catch((error) => reportSecondaryWriteFailure('AUDIT LOG ERROR', error));
  return id;
}

export async function updateExpertEnrollment(input: {
  enrollment: ExpertEnrollment;
  status?: EnrollmentStatus;
  progress?: number;
}): Promise<void> {
  const previous = input.enrollment;
  const status = input.status || previous.status;
  const progress = input.progress === undefined ? previous.progress : Math.max(0, Math.min(100, Math.round(input.progress)));
  await createExpertEnrollment({
    personId: previous.personId,
    formationId: previous.formationId,
    cohortId: previous.cohortId,
    status,
    progress
  });
  const eventType = status === 'completed' && previous.status !== 'completed'
    ? 'formation.completed'
    : 'formation.progress_updated';
  await appendExpertRelationshipEvent({
    personId: previous.personId,
    type: eventType,
    sourceType: 'enrollment',
    sourceId: previous.id,
    idempotencyKey: `${previous.id}:${eventType}:${status}:${progress}`,
    metadata: { formationId: previous.formationId, cohortId: previous.cohortId, status, progress }
  }).catch((error) => reportSecondaryWriteFailure('RELATIONSHIP EVENT ERROR', error));
}

export function enrollmentAttention(enrollment: ExpertEnrollment, language: 'es' | 'en'): EnrollmentAttention {
  if (enrollment.status !== 'active') return null;
  if (enrollment.progress === 0) {
    return {
      level: 'high',
      label: language === 'es' ? 'Inicio pendiente' : 'Start pending',
      reason: language === 'es' ? 'Está activo, pero todavía no registra progreso.' : 'Active enrollment with no recorded progress yet.'
    };
  }
  if (enrollment.progress < 25) {
    return {
      level: 'medium',
      label: language === 'es' ? 'Progreso bajo' : 'Low progress',
      reason: language === 'es' ? 'Conviene confirmar acceso, claridad y próximos pasos.' : 'Confirm access, clarity and next steps.'
    };
  }
  return null;
}

export async function createEnrollmentAttentionTask(input: {
  enrollment: ExpertEnrollment;
  personName: string;
  formationTitle: string;
  cohortTitle: string;
  assignee: WorkspaceMember;
  language: 'es' | 'en';
}): Promise<string> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('AUTH_REQUIRED');
  const workspace = await workspaceId();
  const signal = enrollmentAttention(input.enrollment, input.language);
  const taskId = `task-${input.enrollment.id}-progress`;
  const taskRef = workspaceDocument(workspace, 'work_tasks', taskId);
  const personRef = workspaceDocument(workspace, 'people', input.enrollment.personId);

  await runTransaction(firestoreDb, async (transaction) => {
    const [taskSnapshot, personSnapshot] = await Promise.all([
      transaction.get(taskRef),
      transaction.get(personRef)
    ]);
    if (!personSnapshot.exists()) throw new Error('PERSON_NOT_FOUND');
    const existingTask = taskSnapshot.exists()
      ? (taskSnapshot.data() as { task?: Record<string, unknown> }).task || {}
      : {};
    const createdAt = typeof existingTask.createdAt === 'string' ? existingTask.createdAt : new Date().toISOString();
    const title = input.language === 'es'
      ? `Revisar avance · ${input.formationTitle}`
      : `Review progress · ${input.formationTitle}`;
    const note = signal?.reason || (input.language === 'es'
      ? `Revisar el avance de ${input.personName} en ${input.cohortTitle}.`
      : `Review ${input.personName}'s progress in ${input.cohortTitle}.`);

    transaction.set(taskRef, {
      schemaVersion: 1,
      task: {
        ...existingTask,
        id: taskId,
        clientId: '',
        clientName: input.personName,
        personId: input.enrollment.personId,
        title,
        type: 'task',
        note,
        dueDate: '',
        dueTime: '',
        assignee: input.assignee.displayName || input.assignee.email,
        assignedToUid: input.assignee.uid,
        assignedToName: input.assignee.displayName || input.assignee.email,
        createdByUid: typeof existingTask.createdByUid === 'string' ? existingTask.createdByUid : user.uid,
        status: 'pending',
        createdAt,
        source: 'formation',
        sourceId: input.enrollment.id,
        sourceActionKind: 'student-progress',
        priority: signal?.level || 'normal',
        confirmationEmail: 'not-required'
      },
      updatedAt: serverTimestamp()
    }, { merge: true });

    const currentMemory = personSnapshot.data().outcomeMemory && typeof personSnapshot.data().outcomeMemory === 'object'
      ? personSnapshot.data().outcomeMemory as Record<string, unknown>
      : {};
    transaction.set(personRef, {
      outcomeMemory: {
        ...currentMemory,
        studentAttentionStatus: 'created',
        studentAttentionTaskId: taskId,
        nextActionLabel: title,
        nextActionOwnerUid: input.assignee.uid
      },
      updatedAt: serverTimestamp()
    }, { merge: true });
  });

  await appendExpertRelationshipEvent({
    personId: input.enrollment.personId,
    type: 'formation.attention_created',
    sourceType: 'work_task',
    sourceId: taskId,
    idempotencyKey: `${input.enrollment.id}:attention:${taskId}`,
    metadata: { formationId: input.enrollment.formationId, cohortId: input.enrollment.cohortId, progress: input.enrollment.progress }
  }).catch((error) => reportSecondaryWriteFailure('RELATIONSHIP EVENT ERROR', error));
  return taskId;
}
