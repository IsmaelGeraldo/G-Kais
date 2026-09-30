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

const CLIENT_RECORD_STORAGE_KEY = 'gkais-experts-client-records-v2';
const SESSION_CLIENT_STORAGE_KEY = 'gkais-experts-session-clients-v2';
const WORKSPACE_STATE_EVENT = 'gkais:workspace-state-changed';
const SCHEMA_VERSION = 1;

type ClientLike = Record<string, unknown> & { id: string };
type HydrationResult = 'firestore' | 'migrated' | 'local';

function readLocalArray<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
}

function writeLocalArray(key: string, value: unknown[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function emitWorkspaceRefresh(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(WORKSPACE_STATE_EVENT));
}

function sanitizeForFirestore<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForFirestore(item)) as T;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, sanitizeForFirestore(item)]);
    return Object.fromEntries(entries) as T;
  }
  return value;
}

async function restoredUser(): Promise<User | null> {
  if (firebaseAuth.currentUser) return firebaseAuth.currentUser;
  return new Promise((resolve) => {
    let settled = false;
    let unsubscribe = () => {};
    const finish = (user: User | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      unsubscribe();
      resolve(user);
    };
    const timer = window.setTimeout(() => finish(firebaseAuth.currentUser), 1800);
    unsubscribe = onAuthStateChanged(firebaseAuth, (user) => finish(user), () => finish(null));
  });
}

function clientsCollection(uid: string) {
  return collection(firestoreDb, 'expert_workspaces', uid, 'clients');
}

function clientDocument(uid: string, clientId: string) {
  return doc(firestoreDb, 'expert_workspaces', uid, 'clients', clientId);
}

function localClientRecord(clientId: string): ClientLike | undefined {
  return readLocalArray<ClientLike>(CLIENT_RECORD_STORAGE_KEY).find((item) => item?.id === clientId);
}

function localSessionClient(clientId: string): ClientLike | undefined {
  return readLocalArray<ClientLike>(SESSION_CLIENT_STORAGE_KEY).find((item) => item?.id === clientId);
}

export async function hydrateExpertsClientMemory(): Promise<HydrationResult> {
  if (typeof window === 'undefined') return 'local';
  const user = await restoredUser();
  if (!user) return 'local';

  try {
    const snapshot = await getDocs(clientsCollection(user.uid));
    const localRecords = readLocalArray<ClientLike>(CLIENT_RECORD_STORAGE_KEY);
    const localSessions = readLocalArray<ClientLike>(SESSION_CLIENT_STORAGE_KEY);

    if (snapshot.empty) {
      const ids = Array.from(new Set([
        ...localRecords.map((item) => item.id),
        ...localSessions.map((item) => item.id)
      ].filter(Boolean)));

      if (!ids.length) return 'local';

      const batch = writeBatch(firestoreDb);
      ids.forEach((clientId) => {
        const record = localRecords.find((item) => item.id === clientId);
        const session = localSessions.find((item) => item.id === clientId);
        batch.set(clientDocument(user.uid, clientId), {
          schemaVersion: SCHEMA_VERSION,
          ...(record ? { record: sanitizeForFirestore(record) } : {}),
          ...(session ? { session: sanitizeForFirestore(session) } : {}),
          migratedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });
      await batch.commit();
      return 'migrated';
    }

    const records: ClientLike[] = [];
    const sessions: ClientLike[] = [];
    snapshot.docs.forEach((item) => {
      const data = item.data() as { record?: ClientLike; session?: ClientLike };
      if (data.record?.id) records.push(data.record);
      if (data.session?.id) sessions.push(data.session);
    });

    if (records.length) writeLocalArray(CLIENT_RECORD_STORAGE_KEY, records);
    if (sessions.length) writeLocalArray(SESSION_CLIENT_STORAGE_KEY, sessions);
    if (records.length || sessions.length) emitWorkspaceRefresh();
    return 'firestore';
  } catch {
    return 'local';
  }
}

export async function persistExpertClientRecord(record: ClientLike): Promise<void> {
  if (!record?.id) return;
  const user = await restoredUser();
  if (!user) return;
  try {
    await setDoc(clientDocument(user.uid, record.id), {
      schemaVersion: SCHEMA_VERSION,
      record: sanitizeForFirestore(record),
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch {}
}

export async function persistExpertClientRecords(records: ClientLike[]): Promise<void> {
  const valid = records.filter((item) => item?.id);
  if (!valid.length) return;
  const user = await restoredUser();
  if (!user) return;
  try {
    const batch = writeBatch(firestoreDb);
    valid.forEach((record) => {
      batch.set(clientDocument(user.uid, record.id), {
        schemaVersion: SCHEMA_VERSION,
        record: sanitizeForFirestore(record),
        updatedAt: serverTimestamp()
      }, { merge: true });
    });
    await batch.commit();
  } catch {}
}

export async function persistExpertSessionClient(session: ClientLike): Promise<void> {
  if (!session?.id) return;
  const user = await restoredUser();
  if (!user) return;
  try {
    await setDoc(clientDocument(user.uid, session.id), {
      schemaVersion: SCHEMA_VERSION,
      session: sanitizeForFirestore(session),
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch {}
}

export async function persistExpertSessionClients(sessions: ClientLike[]): Promise<void> {
  const valid = sessions.filter((item) => item?.id);
  if (!valid.length) return;
  const user = await restoredUser();
  if (!user) return;
  try {
    const batch = writeBatch(firestoreDb);
    valid.forEach((session) => {
      batch.set(clientDocument(user.uid, session.id), {
        schemaVersion: SCHEMA_VERSION,
        session: sanitizeForFirestore(session),
        updatedAt: serverTimestamp()
      }, { merge: true });
    });
    await batch.commit();
  } catch {}
}

export async function persistExpertClientMemory(clientId: string): Promise<void> {
  if (!clientId) return;
  const record = localClientRecord(clientId);
  const session = localSessionClient(clientId);
  if (record) await persistExpertClientRecord(record);
  if (session) await persistExpertSessionClient(session);
}
