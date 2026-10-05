import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
  type Unsubscribe
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
type ClientEnvelope = { record?: ClientLike; session?: ClientLike };
type ClientSnapshot = { docs: Array<{ data: () => unknown }> };

let clientSubscription: Unsubscribe | null = null;
let subscribedWorkspaceId = '';
let remoteRecordFingerprints = new Map<string, string>();
let remoteSessionFingerprints = new Map<string, string>();

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

function fingerprint(value: ClientLike): string {
  return JSON.stringify(value);
}

function fingerprintMap(items: ClientLike[]): Map<string, string> {
  return new Map(items.filter((item) => item?.id).map((item) => [item.id, fingerprint(item)]));
}

function preservePendingLocal(remote: ClientLike[], local: ClientLike[], knownRemote: Map<string, string>): ClientLike[] {
  const remoteById = new Map(remote.map((item) => [item.id, item]));
  const result: ClientLike[] = [];
  const included = new Set<string>();

  local.forEach((localItem) => {
    if (!localItem?.id) return;
    const remoteItem = remoteById.get(localItem.id);
    const knownFingerprint = knownRemote.get(localItem.id);
    const localFingerprint = fingerprint(localItem);
    const remoteFingerprint = remoteItem ? fingerprint(remoteItem) : '';
    const localHasPendingChange = knownFingerprint !== undefined && localFingerprint !== knownFingerprint && localFingerprint !== remoteFingerprint;
    const localIsNewPending = !remoteItem && knownFingerprint === undefined;

    if (localHasPendingChange || localIsNewPending) {
      result.push(localItem);
      included.add(localItem.id);
      return;
    }
    if (remoteItem) {
      result.push(remoteItem);
      included.add(remoteItem.id);
    }
  });

  remote.forEach((remoteItem) => {
    if (!included.has(remoteItem.id)) result.push(remoteItem);
  });
  return result;
}

function defined(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '';
}

function currentTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function clearStructuredNextSession(value: ClientLike): ClientLike {
  const {
    nextSessionAt: _nextSessionAt,
    nextSessionTimeZone: _nextSessionTimeZone,
    nextSessionSource: _nextSessionSource,
    ...rest
  } = value;
  return rest as ClientLike;
}

function normalizeStructuredNextSession(value?: ClientLike): ClientLike | undefined {
  if (!value) return undefined;
  const nextSession = typeof value.nextSession === 'string' ? value.nextSession.trim() : '';
  const storedSource = typeof value.nextSessionSource === 'string' ? value.nextSessionSource : '';
  const storedAt = typeof value.nextSessionAt === 'string' ? value.nextSessionAt.trim() : '';
  if (!nextSession) return storedAt || storedSource ? clearStructuredNextSession(value) : value;
  if (storedAt && storedSource === nextSession) return value;

  const match = nextSession.match(/(\d{4}-\d{2}-\d{2})(?:\s*[·T]\s*|\s+)(\d{2}:\d{2})/);
  if (!match) return storedAt || storedSource ? clearStructuredNextSession(value) : value;
  const localDate = new Date(`${match[1]}T${match[2]}:00`);
  if (!Number.isFinite(localDate.getTime())) return storedAt || storedSource ? clearStructuredNextSession(value) : value;
  return {
    ...value,
    nextSessionAt: localDate.toISOString(),
    nextSessionTimeZone: currentTimeZone(),
    nextSessionSource: nextSession
  };
}

function needsStructuredNextSessionBackfill(value?: ClientLike): boolean {
  if (!value) return false;
  const normalized = normalizeStructuredNextSession(value);
  return Boolean(normalized && fingerprint(normalized) !== fingerprint(value));
}

function buildOutcomeMemory(record?: ClientLike, session?: ClientLike): OutcomeMemory {
  const normalizedRecord = normalizeStructuredNextSession(record);
  const normalizedSession = normalizeStructuredNextSession(session);
  const memory: OutcomeMemory = {
    startingPoint: normalizedRecord?.startingPoint,
    expectedOutcome: normalizedSession?.goal ?? normalizedRecord?.expectedOutcome,
    primaryGoal: normalizedRecord?.primaryGoal,
    currentPhase: normalizedSession?.currentPhase ?? normalizedRecord?.currentPhase,
    currentGap: normalizedSession?.currentGap ?? normalizedRecord?.currentGap,
    planSummary: normalizedSession?.planSummary ?? normalizedRecord?.planSummary,
    blockers: normalizedSession?.blockers ?? normalizedRecord?.blockers,
    milestones: normalizedRecord?.milestones,
    commitments: normalizedSession?.commitments ?? normalizedRecord?.commitments,
    nextAction: normalizedSession?.nextAction ?? normalizedRecord?.nextAction,
    nextSession: normalizedSession?.nextSession ?? normalizedRecord?.nextSession,
    nextSessionAt: normalizedSession?.nextSessionAt ?? normalizedRecord?.nextSessionAt,
    nextSessionTimeZone: normalizedSession?.nextSessionTimeZone ?? normalizedRecord?.nextSessionTimeZone,
    progress: normalizedSession?.week ?? normalizedRecord?.progress
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

function stopClientSubscription(): void {
  clientSubscription?.();
  clientSubscription = null;
  subscribedWorkspaceId = '';
  remoteRecordFingerprints = new Map();
  remoteSessionFingerprints = new Map();
}

function remoteClientState(snapshot: ClientSnapshot): { records: ClientLike[]; sessions: ClientLike[] } {
  const records: ClientLike[] = [];
  const sessions: ClientLike[] = [];
  snapshot.docs.forEach((item) => {
    const data = item.data() as ClientEnvelope;
    const record = normalizeStructuredNextSession(data.record);
    const session = normalizeStructuredNextSession(data.session);
    if (record?.id) records.push(record);
    if (session?.id) sessions.push(session);
  });
  return { records, sessions };
}

async function backfillStructuredNextSessions(workspaceId: string, snapshot: ClientSnapshot): Promise<void> {
  const pending: Array<{ id: string; record?: ClientLike; session?: ClientLike }> = [];
  snapshot.docs.forEach((item) => {
    const data = item.data() as ClientEnvelope;
    if (!needsStructuredNextSessionBackfill(data.record) && !needsStructuredNextSessionBackfill(data.session)) return;
    const record = normalizeStructuredNextSession(data.record);
    const session = normalizeStructuredNextSession(data.session);
    const id = record?.id || session?.id;
    if (id) pending.push({ id, record, session });
  });
  if (!pending.length) return;

  const batch = writeBatch(firestoreDb);
  pending.forEach(({ id, record, session }) => {
    batch.set(clientDocument(workspaceId, id), {
      schemaVersion: SCHEMA_VERSION,
      ...(record ? { record: sanitizeForFirestore(record) } : {}),
      ...(session ? { session: sanitizeForFirestore(session) } : {}),
      outcomeMemory: buildOutcomeMemory(record, session),
      updatedAt: serverTimestamp()
    }, { merge: true });
  });
  await batch.commit();
}

function startClientSubscription(workspaceId: string): void {
  if (clientSubscription && subscribedWorkspaceId === workspaceId) return;
  stopClientSubscription();
  subscribedWorkspaceId = workspaceId;
  clientSubscription = onSnapshot(clientsCollection(workspaceId), (snapshot) => {
    const remote = remoteClientState(snapshot);
    const localRecords = readLocalArray<ClientLike>(CLIENT_RECORD_STORAGE_KEY, workspaceId);
    const localSessions = readLocalArray<ClientLike>(SESSION_CLIENT_STORAGE_KEY, workspaceId);
    const records = preservePendingLocal(remote.records, localRecords, remoteRecordFingerprints);
    const sessions = preservePendingLocal(remote.sessions, localSessions, remoteSessionFingerprints);

    remoteRecordFingerprints = fingerprintMap(remote.records);
    remoteSessionFingerprints = fingerprintMap(remote.sessions);
    writeLocalArray(CLIENT_RECORD_STORAGE_KEY, workspaceId, records);
    writeLocalArray(SESSION_CLIENT_STORAGE_KEY, workspaceId, sessions);
    emitWorkspaceRefresh();
  }, (error) => {
    console.error('[G-KAIS CLIENT MEMORY SUBSCRIPTION ERROR]', error);
  });
}

export async function hydrateExpertsClientMemory(): Promise<HydrationResult> {
  if (typeof window === 'undefined') return 'local';
  const user = await restoredUser();
  if (!user) {
    stopClientSubscription();
    return 'local';
  }
  const workspaceId = await ownerWorkspaceId(user);
  if (!workspaceId) {
    stopClientSubscription();
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
        remoteRecordFingerprints = new Map();
        remoteSessionFingerprints = new Map();
        startClientSubscription(workspaceId);
        emitWorkspaceRefresh();
        return 'firestore';
      }

      emitExpertsPersistenceStatus('saving', 'Sincronizando datos del Workspace…');
      const batch = writeBatch(firestoreDb);
      ids.forEach((clientId) => {
        const record = normalizeStructuredNextSession(localRecords.find((item) => item.id === clientId));
        const session = normalizeStructuredNextSession(localSessions.find((item) => item.id === clientId));
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
      const normalizedRecords = localRecords.map((item) => normalizeStructuredNextSession(item) ?? item);
      const normalizedSessions = localSessions.map((item) => normalizeStructuredNextSession(item) ?? item);
      writeLocalArray(CLIENT_RECORD_STORAGE_KEY, workspaceId, normalizedRecords);
      writeLocalArray(SESSION_CLIENT_STORAGE_KEY, workspaceId, normalizedSessions);
      remoteRecordFingerprints = fingerprintMap(normalizedRecords);
      remoteSessionFingerprints = fingerprintMap(normalizedSessions);
      startClientSubscription(workspaceId);
      emitExpertsPersistenceStatus('saved');
      emitWorkspaceRefresh();
      return 'migrated';
    }

    await backfillStructuredNextSessions(workspaceId, snapshot);
    const remote = remoteClientState(snapshot);
    writeLocalArray(CLIENT_RECORD_STORAGE_KEY, workspaceId, remote.records);
    writeLocalArray(SESSION_CLIENT_STORAGE_KEY, workspaceId, remote.sessions);
    remoteRecordFingerprints = fingerprintMap(remote.records);
    remoteSessionFingerprints = fingerprintMap(remote.sessions);
    startClientSubscription(workspaceId);
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
  const normalizedRecord = normalizeStructuredNextSession(record) ?? record;
  const session = normalizeStructuredNextSession(localSessionClient(record.id, workspaceId));
  await setDoc(clientDocument(workspaceId, record.id), {
    schemaVersion: SCHEMA_VERSION,
    record: sanitizeForFirestore(normalizedRecord),
    outcomeMemory: buildOutcomeMemory(normalizedRecord, session),
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
    const normalizedRecord = normalizeStructuredNextSession(record) ?? record;
    const session = normalizeStructuredNextSession(sessions.find((item) => item.id === record.id));
    batch.set(clientDocument(workspaceId, record.id), {
      schemaVersion: SCHEMA_VERSION,
      record: sanitizeForFirestore(normalizedRecord),
      outcomeMemory: buildOutcomeMemory(normalizedRecord, session),
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
  const normalizedSession = normalizeStructuredNextSession(session) ?? session;
  const record = normalizeStructuredNextSession(localClientRecord(session.id, workspaceId));
  await setDoc(clientDocument(workspaceId, session.id), {
    schemaVersion: SCHEMA_VERSION,
    session: sanitizeForFirestore(normalizedSession),
    outcomeMemory: buildOutcomeMemory(record, normalizedSession),
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
    const normalizedSession = normalizeStructuredNextSession(session) ?? session;
    const record = normalizeStructuredNextSession(records.find((item) => item.id === session.id));
    batch.set(clientDocument(workspaceId, session.id), {
      schemaVersion: SCHEMA_VERSION,
      session: sanitizeForFirestore(normalizedSession),
      outcomeMemory: buildOutcomeMemory(record, normalizedSession),
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
  const record = normalizeStructuredNextSession(localClientRecord(clientId, workspaceId));
  const session = normalizeStructuredNextSession(localSessionClient(clientId, workspaceId));
  if (!record && !session) return;
  await setDoc(clientDocument(workspaceId, clientId), {
    schemaVersion: SCHEMA_VERSION,
    ...(record ? { record: sanitizeForFirestore(record) } : {}),
    ...(session ? { session: sanitizeForFirestore(session) } : {}),
    outcomeMemory: buildOutcomeMemory(record, session),
    updatedAt: serverTimestamp()
  }, { merge: true });
}

if (typeof window !== 'undefined') {
  onAuthStateChanged(firebaseAuth, (user) => {
    if (!user) stopClientSubscription();
  });
}
