import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe
} from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../lib/firebase';
import { upsertExpertPerson } from './expertsRelationshipFoundation';
import {
  appendExpertAuditLog,
  appendExpertRelationshipEvent,
  resolveActiveExpertWorkspaceId,
  type WorkspaceMember
} from './expertsWorkspaceCore';

const SCHEMA_VERSION = 1;

export type ExpertPerson = {
  id: string;
  name: string;
  email: string;
  phone: string;
  firstSource: string;
  latestSource: string;
  currentStage: 'lead' | 'webinar' | 'student' | 'alumni' | 'mentoring';
  outcomeMemory: Record<string, unknown>;
};

export type ExpertWebinarStatus = 'draft' | 'scheduled' | 'completed' | 'cancelled';
export type ExpertWebinar = {
  id: string;
  title: string;
  startsAt: string;
  source: string;
  platform: string;
  externalUrl: string;
  offerLabel: string;
  status: ExpertWebinarStatus;
};

export type WebinarAttendanceStatus = 'registered' | 'attended' | 'no-show';
export type WebinarInterest = 'unknown' | 'low' | 'medium' | 'high';
export type WebinarRegistration = {
  id: string;
  personId: string;
  webinarId: string;
  status: WebinarAttendanceStatus;
  attendanceMinutes: number;
  purchased: boolean;
  interest: WebinarInterest;
  followUpTaskId?: string;
  followUpStatus?: 'needed' | 'created' | 'completed' | 'not-needed';
  followUpResult?: string;
};

function randomId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function relationshipId(prefix: string, left: string, right: string): string {
  return `${prefix}-${left}-${right}`.slice(0, 420);
}

function sanitizePlain<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => sanitizePlain(item)) as T;
  if (value && typeof value === 'object') {
    if (value instanceof Date) return value;
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, sanitizePlain(item)])
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

function mapPerson(id: string, data: Record<string, unknown>): ExpertPerson {
  return {
    id,
    name: typeof data.name === 'string' ? data.name : '',
    email: typeof data.email === 'string' ? data.email : '',
    phone: typeof data.phone === 'string' ? data.phone : '',
    firstSource: typeof data.firstSource === 'string' ? data.firstSource : '',
    latestSource: typeof data.latestSource === 'string' ? data.latestSource : '',
    currentStage: (typeof data.currentStage === 'string' ? data.currentStage : 'lead') as ExpertPerson['currentStage'],
    outcomeMemory: data.outcomeMemory && typeof data.outcomeMemory === 'object' ? data.outcomeMemory as Record<string, unknown> : {}
  };
}

function mapWebinar(id: string, data: Record<string, unknown>): ExpertWebinar {
  return {
    id,
    title: typeof data.title === 'string' ? data.title : '',
    startsAt: typeof data.startsAt === 'string' ? data.startsAt : '',
    source: typeof data.source === 'string' ? data.source : '',
    platform: typeof data.platform === 'string' ? data.platform : '',
    externalUrl: typeof data.externalUrl === 'string' ? data.externalUrl : '',
    offerLabel: typeof data.offerLabel === 'string' ? data.offerLabel : '',
    status: (typeof data.status === 'string' ? data.status : 'draft') as ExpertWebinarStatus
  };
}

function mapRegistration(id: string, data: Record<string, unknown>): WebinarRegistration {
  return {
    id,
    personId: typeof data.personId === 'string' ? data.personId : '',
    webinarId: typeof data.webinarId === 'string' ? data.webinarId : '',
    status: (typeof data.status === 'string' ? data.status : 'registered') as WebinarAttendanceStatus,
    attendanceMinutes: typeof data.attendanceMinutes === 'number' ? data.attendanceMinutes : 0,
    purchased: Boolean(data.purchased),
    interest: (typeof data.interest === 'string' ? data.interest : 'unknown') as WebinarInterest,
    followUpTaskId: typeof data.followUpTaskId === 'string' ? data.followUpTaskId : undefined,
    followUpStatus: typeof data.followUpStatus === 'string' ? data.followUpStatus as WebinarRegistration['followUpStatus'] : undefined,
    followUpResult: typeof data.followUpResult === 'string' ? data.followUpResult : undefined
  };
}

export function webinarNeedsFollowUp(registration: WebinarRegistration): boolean {
  if (registration.purchased) return false;
  if (registration.followUpStatus === 'created' || registration.followUpStatus === 'completed') return false;
  return registration.status === 'attended' || registration.status === 'no-show';
}

export function webinarSignalLevel(registration: WebinarRegistration): 'high' | 'medium' | 'normal' {
  if (registration.purchased) return 'normal';
  if (registration.status === 'attended' && registration.interest === 'high') return 'high';
  if (registration.status === 'attended' || registration.interest === 'medium' || registration.interest === 'high') return 'medium';
  return 'normal';
}

export async function loadExpertPeople(): Promise<ExpertPerson[]> {
  const id = await workspaceId();
  const snapshot = await getDocs(workspaceCollection(id, 'people'));
  return snapshot.docs
    .map((item) => mapPerson(item.id, item.data() as Record<string, unknown>))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadExpertWebinars(): Promise<ExpertWebinar[]> {
  const id = await workspaceId();
  const snapshot = await getDocs(workspaceCollection(id, 'webinars'));
  return snapshot.docs
    .map((item) => mapWebinar(item.id, item.data() as Record<string, unknown>))
    .sort((a, b) => (b.startsAt || '').localeCompare(a.startsAt || ''));
}

export async function loadWebinarRegistrations(webinarId: string): Promise<WebinarRegistration[]> {
  const id = await workspaceId();
  const snapshot = await getDocs(query(workspaceCollection(id, 'webinar_registrations'), where('webinarId', '==', webinarId)));
  return snapshot.docs.map((item) => mapRegistration(item.id, item.data() as Record<string, unknown>));
}

export async function subscribeExpertPeople(callback: (people: ExpertPerson[]) => void): Promise<Unsubscribe> {
  const id = await workspaceId();
  return onSnapshot(workspaceCollection(id, 'people'), (snapshot) => {
    callback(snapshot.docs
      .map((item) => mapPerson(item.id, item.data() as Record<string, unknown>))
      .sort((a, b) => a.name.localeCompare(b.name)));
  }, () => callback([]));
}

export async function subscribeExpertWebinars(callback: (webinars: ExpertWebinar[]) => void): Promise<Unsubscribe> {
  const id = await workspaceId();
  return onSnapshot(workspaceCollection(id, 'webinars'), (snapshot) => {
    callback(snapshot.docs
      .map((item) => mapWebinar(item.id, item.data() as Record<string, unknown>))
      .sort((a, b) => (b.startsAt || '').localeCompare(a.startsAt || '')));
  }, () => callback([]));
}

export async function subscribeWebinarRegistrations(webinarId: string, callback: (registrations: WebinarRegistration[]) => void): Promise<Unsubscribe> {
  const id = await workspaceId();
  return onSnapshot(query(workspaceCollection(id, 'webinar_registrations'), where('webinarId', '==', webinarId)), (snapshot) => {
    callback(snapshot.docs.map((item) => mapRegistration(item.id, item.data() as Record<string, unknown>)));
  }, () => callback([]));
}

export async function createOperationalWebinar(input: {
  title: string;
  startsAt: string;
  source?: string;
  platform?: string;
  externalUrl?: string;
  offerLabel?: string;
  status?: ExpertWebinarStatus;
}): Promise<string> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('AUTH_REQUIRED');
  const id = await workspaceId();
  const title = input.title.trim();
  if (!title) throw new Error('TITLE_REQUIRED');
  const webinarId = randomId('webinar');
  await setDoc(workspaceDocument(id, 'webinars', webinarId), {
    schemaVersion: SCHEMA_VERSION,
    title,
    startsAt: input.startsAt || '',
    source: (input.source || '').trim(),
    platform: (input.platform || '').trim(),
    externalUrl: (input.externalUrl || '').trim(),
    offerLabel: (input.offerLabel || '').trim(),
    status: input.status || 'scheduled',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  await appendExpertAuditLog({
    entityType: 'webinar',
    entityId: webinarId,
    action: 'webinar.created',
    changes: { title, startsAt: input.startsAt || '', platform: input.platform || '', offerLabel: input.offerLabel || '' }
  }).catch((error) => reportSecondaryWriteFailure('AUDIT LOG ERROR', error));
  return webinarId;
}

export async function updateOperationalWebinar(webinarId: string, patch: Partial<Omit<ExpertWebinar, 'id'>>): Promise<void> {
  const id = await workspaceId();
  await updateDoc(workspaceDocument(id, 'webinars', webinarId), {
    ...sanitizePlain(patch),
    updatedAt: serverTimestamp()
  });
  await appendExpertAuditLog({ entityType: 'webinar', entityId: webinarId, action: 'webinar.updated', changes: sanitizePlain(patch) })
    .catch((error) => reportSecondaryWriteFailure('AUDIT LOG ERROR', error));
}

export async function recordOperationalWebinarRegistration(input: {
  webinarId: string;
  name: string;
  email?: string;
  phone?: string;
  status?: WebinarAttendanceStatus;
  attendanceMinutes?: number;
  purchased?: boolean;
  interest?: WebinarInterest;
}): Promise<{ registrationId: string; personId: string }> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('AUTH_REQUIRED');
  const id = await workspaceId();
  const person = await upsertExpertPerson({
    name: input.name,
    email: input.email,
    phone: input.phone,
    source: 'webinar',
    stage: 'webinar'
  });
  const registrationId = relationshipId('webreg', input.webinarId, person.personId);
  const registrationRef = workspaceDocument(id, 'webinar_registrations', registrationId);
  const personRef = workspaceDocument(id, 'people', person.personId);

  const saved = await runTransaction(firestoreDb, async (transaction) => {
    const [existingSnapshot, personSnapshot] = await Promise.all([
      transaction.get(registrationRef),
      transaction.get(personRef)
    ]);
    if (!personSnapshot.exists()) throw new Error('PERSON_NOT_FOUND');
    const previous = existingSnapshot.exists()
      ? mapRegistration(existingSnapshot.id, existingSnapshot.data() as Record<string, unknown>)
      : null;
    const status = input.status || previous?.status || 'registered';
    const attendanceMinutes = Math.max(0, Math.min(10000, Math.round(input.attendanceMinutes ?? previous?.attendanceMinutes ?? 0)));
    const purchased = input.purchased ?? previous?.purchased ?? false;
    const interest = input.interest || previous?.interest || 'unknown';
    const followUpStatus: WebinarRegistration['followUpStatus'] = purchased
      ? 'not-needed'
      : previous?.followUpStatus === 'created' || previous?.followUpStatus === 'completed'
        ? previous.followUpStatus
        : (status === 'attended' || status === 'no-show') ? 'needed' : undefined;
    const currentMemory = personSnapshot.data().outcomeMemory && typeof personSnapshot.data().outcomeMemory === 'object'
      ? personSnapshot.data().outcomeMemory as Record<string, unknown>
      : {};

    transaction.set(registrationRef, {
      schemaVersion: SCHEMA_VERSION,
      personId: person.personId,
      webinarId: input.webinarId,
      status,
      attendanceMinutes,
      purchased,
      interest,
      followUpStatus: followUpStatus || deleteField(),
      ...(!existingSnapshot.exists() ? { registeredAt: serverTimestamp() } : {}),
      updatedAt: serverTimestamp()
    }, { merge: true });
    transaction.set(personRef, {
      latestSource: 'webinar',
      outcomeMemory: sanitizePlain({
        ...currentMemory,
        lastWebinarId: input.webinarId,
        lastWebinarRegistrationId: registrationId,
        lastWebinarStatus: status,
        lastWebinarAttendanceMinutes: attendanceMinutes,
        lastWebinarPurchased: purchased,
        lastWebinarInterest: interest,
        webinarFollowUpStatus: followUpStatus || 'not-needed'
      }),
      updatedAt: serverTimestamp()
    }, { merge: true });

    return { previous, status, attendanceMinutes, purchased, interest };
  });

  if (!saved.previous) {
    await appendExpertRelationshipEvent({
      personId: person.personId,
      type: 'webinar.registered',
      sourceType: 'webinar',
      sourceId: input.webinarId,
      idempotencyKey: `${registrationId}:registered`,
      metadata: { registrationId }
    }).catch((error) => reportSecondaryWriteFailure('RELATIONSHIP EVENT ERROR', error));
  }
  if (!saved.previous || saved.previous.status !== saved.status) {
    const eventType = saved.status === 'attended' ? 'webinar.attended' : saved.status === 'no-show' ? 'webinar.no_show' : 'webinar.registered';
    await appendExpertRelationshipEvent({
      personId: person.personId,
      type: eventType,
      sourceType: 'webinar',
      sourceId: input.webinarId,
      idempotencyKey: `${registrationId}:${saved.status}`,
      metadata: { registrationId, attendanceMinutes: saved.attendanceMinutes, interest: saved.interest }
    }).catch((error) => reportSecondaryWriteFailure('RELATIONSHIP EVENT ERROR', error));
  }
  if (saved.purchased && !saved.previous?.purchased) {
    await appendExpertRelationshipEvent({
      personId: person.personId,
      type: 'webinar.purchased',
      sourceType: 'webinar',
      sourceId: input.webinarId,
      idempotencyKey: `${registrationId}:purchased`,
      metadata: { registrationId, interest: saved.interest }
    }).catch((error) => reportSecondaryWriteFailure('RELATIONSHIP EVENT ERROR', error));
  }
  await appendExpertAuditLog({
    entityType: 'webinar_registration',
    entityId: registrationId,
    action: saved.previous ? 'webinar.registration_updated' : 'webinar.registration_created',
    changes: {
      personId: person.personId,
      webinarId: input.webinarId,
      status: saved.status,
      purchased: saved.purchased,
      interest: saved.interest,
      attendanceMinutes: saved.attendanceMinutes
    }
  }).catch((error) => reportSecondaryWriteFailure('AUDIT LOG ERROR', error));

  return { registrationId, personId: person.personId };
}

export async function createWebinarFollowUp(input: {
  registration: WebinarRegistration;
  person: ExpertPerson;
  webinar: ExpertWebinar;
  assignee: WorkspaceMember;
  type?: 'email' | 'whatsapp' | 'call' | 'meeting' | 'task';
  dueDate?: string;
  dueTime?: string;
  note?: string;
}): Promise<string> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('AUTH_REQUIRED');
  const id = await workspaceId();
  const taskId = input.registration.followUpTaskId || `task-${input.registration.id}`;
  const taskRef = workspaceDocument(id, 'work_tasks', taskId);
  const registrationRef = workspaceDocument(id, 'webinar_registrations', input.registration.id);
  const personRef = workspaceDocument(id, 'people', input.person.id);
  const note = input.note?.trim() || (input.registration.status === 'no-show'
    ? `Retomar contacto después de no asistir a ${input.webinar.title}.`
    : `Dar seguimiento después de ${input.webinar.title}; no compró${input.registration.interest !== 'unknown' ? ` · interés ${input.registration.interest}` : ''}.`);
  const title = input.registration.status === 'no-show'
    ? `Recuperar no-show · ${input.webinar.title}`
    : `Seguimiento post-webinar · ${input.webinar.title}`;

  await runTransaction(firestoreDb, async (transaction) => {
    const [taskSnapshot, registrationSnapshot, personSnapshot] = await Promise.all([
      transaction.get(taskRef),
      transaction.get(registrationRef),
      transaction.get(personRef)
    ]);
    if (!registrationSnapshot.exists()) throw new Error('WEBINAR_REGISTRATION_NOT_FOUND');
    if (!personSnapshot.exists()) throw new Error('PERSON_NOT_FOUND');
    const existingCreatedAt = taskSnapshot.exists()
      ? ((taskSnapshot.data() as { task?: { createdAt?: string } }).task?.createdAt || new Date().toISOString())
      : new Date().toISOString();
    const currentMemory = personSnapshot.data().outcomeMemory && typeof personSnapshot.data().outcomeMemory === 'object'
      ? personSnapshot.data().outcomeMemory as Record<string, unknown>
      : {};

    transaction.set(taskRef, {
      schemaVersion: SCHEMA_VERSION,
      task: sanitizePlain({
        id: taskId,
        clientId: '',
        clientName: input.person.name,
        personId: input.person.id,
        title,
        type: input.type || 'whatsapp',
        note,
        dueDate: input.dueDate || '',
        dueTime: input.dueTime || '',
        assignee: input.assignee.displayName || input.assignee.email,
        assignedToUid: input.assignee.uid,
        assignedToName: input.assignee.displayName || input.assignee.email,
        createdByUid: user.uid,
        status: 'pending',
        createdAt: existingCreatedAt,
        source: 'webinar',
        sourceId: input.webinar.id,
        sourceRegistrationId: input.registration.id,
        confirmationEmail: 'not-required'
      }),
      updatedAt: serverTimestamp()
    }, { merge: true });
    transaction.update(registrationRef, {
      followUpTaskId: taskId,
      followUpStatus: 'created',
      updatedAt: serverTimestamp()
    });
    transaction.set(personRef, {
      outcomeMemory: sanitizePlain({
        ...currentMemory,
        webinarFollowUpStatus: 'created',
        nextActionType: input.type || 'whatsapp',
        nextActionAt: [input.dueDate || '', input.dueTime || ''].filter(Boolean).join(' '),
        nextActionOwnerUid: input.assignee.uid
      }),
      updatedAt: serverTimestamp()
    }, { merge: true });
  });

  await appendExpertRelationshipEvent({
    personId: input.person.id,
    type: 'webinar.followup_created',
    sourceType: 'work_task',
    sourceId: taskId,
    idempotencyKey: `${input.registration.id}:followup_created`,
    metadata: { webinarId: input.webinar.id, registrationId: input.registration.id, assignedToUid: input.assignee.uid }
  }).catch((error) => reportSecondaryWriteFailure('RELATIONSHIP EVENT ERROR', error));
  await appendExpertAuditLog({
    entityType: 'work_task',
    entityId: taskId,
    action: 'webinar.followup_created',
    changes: { personId: input.person.id, webinarId: input.webinar.id, assignedToUid: input.assignee.uid }
  }).catch((error) => reportSecondaryWriteFailure('AUDIT LOG ERROR', error));
  return taskId;
}

export async function syncWebinarFollowUpOutcome(personId: string, result: string): Promise<void> {
  const user = firebaseAuth.currentUser;
  if (!user) return;
  const id = await workspaceId();
  if (id !== user.uid) return;
  const personRef = workspaceDocument(id, 'people', personId);
  const snapshot = await getDoc(personRef);
  if (!snapshot.exists()) return;
  const currentMemory = snapshot.data().outcomeMemory && typeof snapshot.data().outcomeMemory === 'object'
    ? snapshot.data().outcomeMemory as Record<string, unknown>
    : {};
  if (currentMemory.webinarFollowUpStatus === 'completed' && currentMemory.lastFollowUpResult === result.trim()) return;
  await setDoc(personRef, {
    outcomeMemory: sanitizePlain({
      ...currentMemory,
      webinarFollowUpStatus: 'completed',
      lastFollowUpResult: result.trim(),
      lastFollowUpAt: new Date().toISOString(),
      nextActionType: '',
      nextActionAt: '',
      nextActionOwnerUid: ''
    }),
    updatedAt: serverTimestamp()
  }, { merge: true });
}

export async function markWebinarFollowUpCompleted(registrationId: string, personId: string, result: string): Promise<void> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('AUTH_REQUIRED');
  const id = await workspaceId();
  const registrationRef = workspaceDocument(id, 'webinar_registrations', registrationId);
  const personRef = workspaceDocument(id, 'people', personId);
  const cleanResult = result.trim();

  const registration = await runTransaction(firestoreDb, async (transaction) => {
    const isOwner = id === user.uid;
    const [registrationSnapshot, personSnapshot] = await Promise.all([
      transaction.get(registrationRef),
      isOwner ? transaction.get(personRef) : Promise.resolve(null)
    ]);
    if (!registrationSnapshot.exists()) return null;
    const mapped = mapRegistration(registrationSnapshot.id, registrationSnapshot.data() as Record<string, unknown>);
    if (mapped.followUpStatus !== 'completed' || mapped.followUpResult !== cleanResult) {
      transaction.update(registrationRef, {
        followUpStatus: 'completed',
        followUpResult: cleanResult,
        followUpCompletedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    if (isOwner && personSnapshot?.exists()) {
      const currentMemory = personSnapshot.data().outcomeMemory && typeof personSnapshot.data().outcomeMemory === 'object'
        ? personSnapshot.data().outcomeMemory as Record<string, unknown>
        : {};
      transaction.set(personRef, {
        outcomeMemory: sanitizePlain({
          ...currentMemory,
          webinarFollowUpStatus: 'completed',
          lastFollowUpResult: cleanResult,
          lastFollowUpAt: new Date().toISOString(),
          nextActionType: '',
          nextActionAt: '',
          nextActionOwnerUid: ''
        }),
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
    return mapped;
  });

  if (!registration) return;
  await appendExpertRelationshipEvent({
    personId,
    type: 'webinar.followup_completed',
    sourceType: 'work_task',
    sourceId: registration.followUpTaskId || registrationId,
    idempotencyKey: `${registrationId}:followup_completed`,
    metadata: { webinarId: registration.webinarId, registrationId, result: cleanResult }
  }).catch((error) => reportSecondaryWriteFailure('RELATIONSHIP EVENT ERROR', error));
  await appendExpertAuditLog({
    entityType: 'webinar_registration',
    entityId: registrationId,
    action: 'webinar.followup_completed',
    changes: { personId, result: cleanResult, actorUid: user.uid }
  }).catch((error) => reportSecondaryWriteFailure('AUDIT LOG ERROR', error));
}
