import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../lib/firebase';

const SCHEMA_VERSION = 1;
const WORKSPACE_STATE_EVENT = 'gkais:workspace-state-changed';

export type RelationshipStage = 'lead' | 'webinar' | 'student' | 'alumni' | 'mentoring';
export type PersonIdentityInput = {
  name: string;
  email?: string;
  phone?: string;
  source?: string;
  stage?: RelationshipStage;
  outcomeMemory?: Record<string, unknown>;
};

export type PersonResolution = {
  personId: string;
  created: boolean;
};

type ClientEnvelope = {
  record?: Record<string, unknown> & { id?: string; personId?: string };
  session?: Record<string, unknown> & { id?: string; personId?: string };
  outcomeMemory?: Record<string, unknown>;
};

const STAGE_RANK: Record<RelationshipStage, number> = {
  lead: 1,
  webinar: 2,
  student: 3,
  alumni: 4,
  mentoring: 5
};

function normalizeEmail(value?: string): string {
  return (value || '').trim().toLowerCase();
}

function normalizePhone(value?: string): string {
  return (value || '').replace(/\D/g, '');
}

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

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function restoredUser(): Promise<User | null> {
  if (firebaseAuth.currentUser) return firebaseAuth.currentUser;
  return new Promise((resolve) => {
    let unsubscribe = () => {};
    const finish = (user: User | null) => {
      unsubscribe();
      resolve(user);
    };
    unsubscribe = onAuthStateChanged(firebaseAuth, (user) => finish(user), () => finish(null));
  });
}

function workspaceCollection(uid: string, name: string) {
  return collection(firestoreDb, 'expert_workspaces', uid, name);
}

function workspaceDocument(uid: string, collectionName: string, id: string) {
  return doc(firestoreDb, 'expert_workspaces', uid, collectionName, id);
}

function strongerStage(current: unknown, next: RelationshipStage): RelationshipStage {
  const currentStage = typeof current === 'string' && current in STAGE_RANK ? current as RelationshipStage : 'lead';
  return STAGE_RANK[next] >= STAGE_RANK[currentStage] ? next : currentStage;
}

async function singleIdentityMatch(uid: string, field: 'normalizedEmail' | 'normalizedPhone', value: string) {
  if (!value) return null;
  const snapshot = await getDocs(query(workspaceCollection(uid, 'people'), where(field, '==', value), limit(2)));
  if (snapshot.size > 1) throw new Error('IDENTITY_CONFLICT');
  return snapshot.empty ? null : snapshot.docs[0];
}

async function resolveExistingPerson(uid: string, email: string, phone: string) {
  const [emailMatch, phoneMatch] = await Promise.all([
    singleIdentityMatch(uid, 'normalizedEmail', email),
    singleIdentityMatch(uid, 'normalizedPhone', phone)
  ]);
  if (emailMatch && phoneMatch && emailMatch.id !== phoneMatch.id) throw new Error('IDENTITY_CONFLICT');
  return emailMatch || phoneMatch;
}

export async function upsertExpertPerson(input: PersonIdentityInput): Promise<PersonResolution> {
  const user = await restoredUser();
  if (!user) throw new Error('AUTH_REQUIRED');

  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);
  if (!name) throw new Error('PERSON_NAME_REQUIRED');
  if (!email && !phone) throw new Error('PERSON_IDENTITY_REQUIRED');

  const existing = await resolveExistingPerson(user.uid, email, phone);
  const stage = input.stage || 'lead';
  const source = (input.source || '').trim();

  if (existing) {
    const current = existing.data() as Record<string, unknown>;
    const currentMemory = current.outcomeMemory && typeof current.outcomeMemory === 'object'
      ? current.outcomeMemory as Record<string, unknown>
      : {};
    await setDoc(existing.ref, {
      schemaVersion: SCHEMA_VERSION,
      name,
      email: email || current.email || '',
      phone: phone || current.phone || '',
      normalizedEmail: email || current.normalizedEmail || '',
      normalizedPhone: phone || current.normalizedPhone || '',
      currentStage: strongerStage(current.currentStage, stage),
      ...(source ? { latestSource: source } : {}),
      outcomeMemory: sanitize({ ...currentMemory, ...(input.outcomeMemory || {}) }),
      updatedAt: serverTimestamp()
    }, { merge: true });
    return { personId: existing.id, created: false };
  }

  const personId = createId('person');
  await setDoc(workspaceDocument(user.uid, 'people', personId), {
    schemaVersion: SCHEMA_VERSION,
    name,
    email,
    phone,
    normalizedEmail: email,
    normalizedPhone: phone,
    firstSource: source,
    latestSource: source,
    currentStage: stage,
    outcomeMemory: sanitize(input.outcomeMemory || {}),
    sourceRefs: {},
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return { personId, created: true };
}

export async function linkMentoringClientToPerson(clientId: string, personId: string): Promise<void> {
  const user = await restoredUser();
  if (!user || !clientId || !personId) return;
  const clientRef = workspaceDocument(user.uid, 'clients', clientId);
  const clientSnapshot = await getDoc(clientRef);
  if (!clientSnapshot.exists()) return;
  const data = clientSnapshot.data() as ClientEnvelope;
  const update: Record<string, unknown> = {
    'record.personId': personId,
    updatedAt: serverTimestamp()
  };
  if (data.session?.id) update['session.personId'] = personId;
  await updateDoc(clientRef, update);
  await updateDoc(workspaceDocument(user.uid, 'people', personId), {
    'sourceRefs.clientIds': arrayUnion(clientId),
    currentStage: 'mentoring',
    updatedAt: serverTimestamp()
  });
}

let backfillRunning = false;
export async function backfillExpertClientsIntoPeople(): Promise<void> {
  if (backfillRunning) return;
  const user = await restoredUser();
  if (!user) return;
  backfillRunning = true;
  try {
    const snapshot = await getDocs(workspaceCollection(user.uid, 'clients'));
    for (const clientDoc of snapshot.docs) {
      const envelope = clientDoc.data() as ClientEnvelope;
      const record = envelope.record;
      if (!record?.id || typeof record.name !== 'string') continue;

      let personId = typeof record.personId === 'string' ? record.personId : '';
      if (!personId) {
        const email = typeof record.email === 'string' ? record.email : '';
        const phone = typeof record.phone === 'string' ? record.phone : '';
        if (!email && !phone) continue;
        const resolved = await upsertExpertPerson({
          name: record.name,
          email,
          phone,
          source: 'mentoring-client',
          stage: 'mentoring',
          outcomeMemory: sanitize(envelope.outcomeMemory || {})
        });
        personId = resolved.personId;
      }
      await linkMentoringClientToPerson(clientDoc.id, personId);
    }
  } finally {
    backfillRunning = false;
  }
}

export async function createExpertWebinar(input: { title: string; startsAt?: string; source?: string; status?: 'draft' | 'scheduled' | 'completed' | 'cancelled' }): Promise<string> {
  const user = await restoredUser();
  if (!user) throw new Error('AUTH_REQUIRED');
  const id = createId('webinar');
  await setDoc(workspaceDocument(user.uid, 'webinars', id), {
    schemaVersion: SCHEMA_VERSION,
    title: input.title.trim(),
    startsAt: input.startsAt || '',
    source: (input.source || '').trim(),
    status: input.status || 'draft',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return id;
}

export async function recordExpertWebinarRegistration(input: PersonIdentityInput & {
  webinarId: string;
  status?: 'registered' | 'attended' | 'no-show';
  attendanceMinutes?: number;
  purchased?: boolean;
  interest?: 'unknown' | 'low' | 'medium' | 'high';
}): Promise<{ registrationId: string; personId: string }> {
  const user = await restoredUser();
  if (!user) throw new Error('AUTH_REQUIRED');
  const person = await upsertExpertPerson({ ...input, stage: 'webinar' });
  const registrationId = createId('webreg');
  await setDoc(workspaceDocument(user.uid, 'webinar_registrations', registrationId), {
    schemaVersion: SCHEMA_VERSION,
    personId: person.personId,
    webinarId: input.webinarId,
    status: input.status || 'registered',
    attendanceMinutes: Math.max(0, Math.round(input.attendanceMinutes || 0)),
    purchased: Boolean(input.purchased),
    interest: input.interest || 'unknown',
    registeredAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  await updateDoc(workspaceDocument(user.uid, 'people', person.personId), {
    'sourceRefs.webinarIds': arrayUnion(input.webinarId),
    'outcomeMemory.lastWebinarId': input.webinarId,
    updatedAt: serverTimestamp()
  });
  return { registrationId, personId: person.personId };
}

export async function createExpertFormation(input: { title: string; status?: 'draft' | 'active' | 'archived' }): Promise<string> {
  const user = await restoredUser();
  if (!user) throw new Error('AUTH_REQUIRED');
  const id = createId('formation');
  await setDoc(workspaceDocument(user.uid, 'formations', id), {
    schemaVersion: SCHEMA_VERSION,
    title: input.title.trim(),
    status: input.status || 'draft',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return id;
}

export async function createExpertCohort(input: { formationId: string; title: string; startsAt?: string; endsAt?: string; status?: 'planned' | 'active' | 'completed' | 'cancelled' }): Promise<string> {
  const user = await restoredUser();
  if (!user) throw new Error('AUTH_REQUIRED');
  const id = createId('cohort');
  await setDoc(workspaceDocument(user.uid, 'cohorts', id), {
    schemaVersion: SCHEMA_VERSION,
    formationId: input.formationId,
    title: input.title.trim(),
    startsAt: input.startsAt || '',
    endsAt: input.endsAt || '',
    status: input.status || 'planned',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return id;
}

export async function createExpertEnrollment(input: {
  personId: string;
  formationId: string;
  cohortId: string;
  status?: 'active' | 'completed' | 'withdrawn' | 'refunded';
  progress?: number;
}): Promise<string> {
  const user = await restoredUser();
  if (!user) throw new Error('AUTH_REQUIRED');
  const id = createId('enrollment');
  const progress = Math.max(0, Math.min(100, Math.round(input.progress || 0)));
  await setDoc(workspaceDocument(user.uid, 'enrollments', id), {
    schemaVersion: SCHEMA_VERSION,
    personId: input.personId,
    formationId: input.formationId,
    cohortId: input.cohortId,
    status: input.status || 'active',
    progress,
    joinedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  await updateDoc(workspaceDocument(user.uid, 'people', input.personId), {
    currentStage: input.status === 'completed' ? 'alumni' : 'student',
    'sourceRefs.formationIds': arrayUnion(input.formationId),
    'sourceRefs.cohortIds': arrayUnion(input.cohortId),
    'outcomeMemory.currentFormationId': input.formationId,
    'outcomeMemory.currentCohortId': input.cohortId,
    updatedAt: serverTimestamp()
  });
  return id;
}

let backfilledUid = '';
if (typeof window !== 'undefined') {
  let syncTimer: number | undefined;
  const scheduleBackfill = () => {
    if (syncTimer !== undefined) window.clearTimeout(syncTimer);
    syncTimer = window.setTimeout(() => {
      syncTimer = undefined;
      void backfillExpertClientsIntoPeople().catch(() => {});
    }, 200);
  };

  onAuthStateChanged(firebaseAuth, (user) => {
    if (!user) {
      backfilledUid = '';
      return;
    }
    if (backfilledUid === user.uid) return;
    backfilledUid = user.uid;
    scheduleBackfill();
  });
  window.addEventListener(WORKSPACE_STATE_EVENT, scheduleBackfill);
}
