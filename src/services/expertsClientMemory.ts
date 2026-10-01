import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../lib/firebase';
import { resolveActiveExpertWorkspaceId } from './expertsWorkspaceCore';
import { emitExpertsPersistenceStatus } from './expertsPersistenceStatus';
import {
  scopedWorkspaceStorageKey,
  setActiveExpertWorkspaceStorageScope
} from './expertsWorkspaceStorage';

const CLIENT_RECORD_STORAGE_KEY = 'gkais-experts-client-records-v2';
const SESSION_CLIENT_STORAGE_KEY = 'gkais-experts-session-clients-v2';
const WORKSPACE_STATE_EVENT = 'gkais:workspace-state-changed';
const SCHEMA_VERSION = 1;

type ClientLike = Record<string, unknown> & { id: string };
type HydrationResult = 'firestore' | 'migrated' | 'local';
type OutcomeMemory = Record<string, unknown>;

function readLocalArray<T>(baseKey: string, workspaceId: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(scopedWorkspaceStorageKey(baseKey, workspaceId)) || '[]');
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
}

function writeLocalArray(baseKey: string, workspaceId: string, value: unknown[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(scopedWorkspaceStorageKey(baseKey, workspaceId), JSON.stringify(value));
}

function emitWorkspaceRefresh(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(WORKSPACE_STATE_EVENT));
}

function sanitizeForFirestore<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => sanitizeForFirestore(item)) as T;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, sanitizeForFirestore(item)]);
    return Object.fromEntries(entries) as T;
  }
  return value;
}

function defined(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '';
}

function buildOutcomeMemory(record?: ClientLike, session?: ClientLike): OutcomeMemory {
  const memory: OutcomeMemory = {
    startingPoint: record?.startingPoint,
    expectedOutcome: session?.goal ?? record?.expectedOutcome,
    primaryGoal: record?.primaryGoal,
    currentPhase: session?.currentPhase ?? record?.currentPhase,
    currentGap: session?.currentGap ?? record?.currentGap,
    planSummary: session?.planSummary ?? record?.planSummary,
    blockers: session?.blockers ?? record?.blockers,
    milestones: record?.milestones,
    commitments: session?.commitments ?? record?.commitments,
    nextAction: session?.nextAction ?? record?.nextAction,
    nextSession: session?.nextSession ?? record?.nextSession,
    progress: session?.week ?? record?.progress
  };
  return sanitizeForFirestore(Object.fromEntries(Object.entries(memory).filter(([, value]) => defined(value))));
}

async function restoredUser(): Promise<User | null> {
  if (firebaseAuth.currentUser) return firebaseAuth.currentUser;
  return new Promise((resolve) => {
    let finished = false;
    let unsubscribe = () => {};
    const finish = (user: User | null) => {
      if (finished) return;
      finished = true;
      unsubscribe();
      resolve(user);
    };
    unsubscribe = onAuthStateChanged(firebaseAuth, (user) => finish(user), () => finish(null));
  });
}

async function ownerWorkspaceId(user: User): Promise<string | null> {
  if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('invite')) return null;
  const workspaceId = await resolveActiveExpertWorkspaceId(user);
  if (!workspaceId) return null;
  setActiveExpertWorkspaceStorageScope(workspaceId);
  return workspaceId === user.uid ? workspaceId : null;
}

function clientsCollection(workspaceId: string) {
  return collection(firestoreDb, 'expert_workspaces', workspaceId, 'clients');
}

function clientDocument(workspaceId: string, clientId: string) {
  return doc(firestoreDb, 'expert_workspaces', workspaceId, 'clients', clientId);
}

function localClientRecord(clientId: string, workspaceId: string): ClientLike | undefined {
  return readLocalArray<ClientLike>(CLIENT_RECORD_STORAGE_KEY, workspaceId).find((item) => item?.id === clientId);
}

function localSessionClient(clientId: string, workspaceId: string): ClientLike | undefined {
  return readLocalArray<ClientLike>(SESSION_CLIENT_STORAGE_KEY, workspaceId).find((item) => item?.id === clientId);
}

export async function hydrateExpertsClientMemory(): Promise<HydrationResult> {
  if (typeof window === 'undefined') return 'local';
  const user = await restoredUser();
  if (!user) return 'local';
  const workspaceId = await ownerWorkspaceId(user);
  if (!workspaceId) {
    emitWorkspaceRefresh();
    return 'local';
  }

  try {
    const snapshot = await getDocs(clientsCollection(workspaceId));
    const localRecords = readLocalArray<ClientLike>(CLIENT_RECORD_STORAGE_KEY, workspaceId);
    const localSessions = readLocalArray<ClientLike>(SESSION_CLIENT_STORAGE_KEY, workspaceId);

    if (snapshot.empty) {
      const ids = Array.from(new Set([
        ...localRecords.map((item) => item.id),
        ...localSessions.map((item) => item.id)
      ].filter(Boolean)));

      if (!ids.length) {
        writeLocalArray(CLIENT_RECORD_STORAGE_KEY, workspaceId, []);
        writeLocalArray(SESSION_CLIENT_STORAGE_KEY, workspaceId, []);
        emitWorkspaceRefresh();
        return 'firestore';
      }

      emitExpertsPersistenceStatus('saving', 'Sincronizando datos del Workspace…');
      const batch = writeBatch(firestoreDb);
      ids.forEach((clientId) => {
        const record = localRecords.find((item) => item.id === clientId);
        const session = localSessions.find((item) => item.id === clientId);
        batch.set(clientDocument(workspaceId, clientId), {
          schemaVersion: SCHEMA_VERSION,
          ...(record ? { record: sanitizeForFirestore(record) } : {}),
          ...(session ? { session: sanitizeForFirestore(session) } : {}),
          outcomeMemory: buildOutcomeMemory(record, session),
          migratedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });
      await batch.commit();
      emitExpertsPersistenceStatus('saved');
      emitWorkspaceRefresh();
      return 'migrated';
    }

    const records: ClientLike[] = [];
    const sessions: ClientLike[] = [];
    snapshot.docs.forEach((item) => {
      const data = item.data() as { record?: ClientLike; session?: ClientLike };
      if (data.record?.id) records.push(data.record);
      if (data.session?.id) sessions.push(data.session);
    });

    writeLocalArray(CLIENT_RECORD_STORAGE_KEY, workspaceId, records);
    writeLocalArray(SESSION_CLIENT_STORAGE_KEY, workspaceId, sessions);
    emitWorkspaceRefresh();
    return 'firestore';
  } catch (error) {
    console.error('[G-KAIS CLIENT MEMORY HYDRATION ERROR]', error);
    emitExpertsPersistenceStatus('error', 'No se pudo sincronizar la información del Workspace.');
    return 'local';
  }
}

export async function persistExpertClientRecord(record: ClientLike): Promise<void> {
  if (!record?.id) return;
  const user = await restoredUser();
  if (!user) return;
  const workspaceId = await ownerWorkspaceId(user);
  if (!workspaceId) return;
  const session = localSessionClient(record.id, workspaceId);
  await setDoc(clientDocument(workspaceId, record.id), {
    schemaVersion: SCHEMA_VERSION,
    record: sanitizeForFirestore(record),
    outcomeMemory: buildOutcomeMemory(record, session),
    updatedAt: serverTimestamp()
  }, { merge: true });
}

export async function persistExpertClientRecords(records: ClientLike[]): Promise<void> {
  const valid = records.filter((item) => item?.id);
  if (!valid.length) return;
  const user = await restoredUser();
  if (!user) return;
  const workspaceId = await ownerWorkspaceId(user);
  if (!workspaceId) return;
  const sessions = readLocalArray<ClientLike>(SESSION_CLIENT_STORAGE_KEY, workspaceId);
  const batch = writeBatch(firestoreDb);
  valid.forEach((record) => {
    const session = sessions.find((item) => item.id === record.id);
    batch.set(clientDocument(workspaceId, record.id), {
      schemaVersion: SCHEMA_VERSION,
      record: sanitizeForFirestore(record),
      outcomeMemory: buildOutcomeMemory(record, session),
      updatedAt: serverTimestamp()
    }, { merge: true });
  });
  await batch.commit();
}

export async function persistExpertSessionClient(session: ClientLike): Promise<void> {
  if (!session?.id) return;
  const user = await restoredUser();
  if (!user) return;
  const workspaceId = await ownerWorkspaceId(user);
  if (!workspaceId) return;
  const record = localClientRecord(session.id, workspaceId);
  await setDoc(clientDocument(workspaceId, session.id), {
    schemaVersion: SCHEMA_VERSION,
    session: sanitizeForFirestore(session),
    outcomeMemory: buildOutcomeMemory(record, session),
    updatedAt: serverTimestamp()
  }, { merge: true });
}

export async function persistExpertSessionClients(sessions: ClientLike[]): Promise<void> {
  const valid = sessions.filter((item) => item?.id);
  if (!valid.length) return;
  const user = await restoredUser();
  if (!user) return;
  const workspaceId = await ownerWorkspaceId(user);
  if (!workspaceId) return;
  const records = readLocalArray<ClientLike>(CLIENT_RECORD_STORAGE_KEY, workspaceId);
  const batch = writeBatch(firestoreDb);
  valid.forEach((session) => {
    const record = records.find((item) => item.id === session.id);
    batch.set(clientDocument(workspaceId, session.id), {
      schemaVersion: SCHEMA_VERSION,
      session: sanitizeForFirestore(session),
      outcomeMemory: buildOutcomeMemory(record, session),
      updatedAt: serverTimestamp()
    }, { merge: true });
  });
  await batch.commit();
}

export async function persistExpertClientMemory(clientId: string): Promise<void> {
  if (!clientId) return;
  const user = await restoredUser();
  if (!user) return;
  const workspaceId = await ownerWorkspaceId(user);
  if (!workspaceId) return;
  const record = localClientRecord(clientId, workspaceId);
  const session = localSessionClient(clientId, workspaceId);
  if (!record && !session) return;
  await setDoc(clientDocument(workspaceId, clientId), {
    schemaVersion: SCHEMA_VERSION,
    ...(record ? { record: sanitizeForFirestore(record) } : {}),
    ...(session ? { session: sanitizeForFirestore(session) } : {}),
    outcomeMemory: buildOutcomeMemory(record, session),
    updatedAt: serverTimestamp()
  }, { merge: true });
}
