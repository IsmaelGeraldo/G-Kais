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

const JOURNAL_STORAGE_KEY = 'gkais-experts-client-journal-v1';
const SESSION_SUMMARY_STORAGE_KEY = 'gkais-experts-session-summaries-v1';
const WORKSPACE_STATE_EVENT = 'gkais:workspace-state-changed';
const SCHEMA_VERSION = 1;
const BATCH_SIZE = 400;

type StoredItem = Record<string, unknown> & {
  id: string;
  clientId: string;
  createdAt: string;
};

type RemoteEnvelope<T extends StoredItem> = {
  schemaVersion?: number;
  entry?: T;
  summary?: T;
};

let lastJournalFingerprint = '';
let lastSessionsFingerprint = '';

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
  if (Array.isArray(value)) return value.map((item) => sanitizeForFirestore(item)) as T;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, sanitizeForFirestore(item)]);
    return Object.fromEntries(entries) as T;
  }
  return value;
}

function fingerprint(items: StoredItem[]): string {
  return JSON.stringify(items);
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

function journalCollection(uid: string) {
  return collection(firestoreDb, 'expert_workspaces', uid, 'journal_entries');
}

function journalDocument(uid: string, entryId: string) {
  return doc(firestoreDb, 'expert_workspaces', uid, 'journal_entries', entryId);
}

function sessionCollection(uid: string) {
  return collection(firestoreDb, 'expert_workspaces', uid, 'session_summaries');
}

function sessionDocument(uid: string, summaryId: string) {
  return doc(firestoreDb, 'expert_workspaces', uid, 'session_summaries', summaryId);
}

function mergeRemoteWithLocal<T extends StoredItem>(remote: T[], local: T[]): T[] {
  const merged = new Map<string, T>();
  local.forEach((item) => { if (item?.id) merged.set(item.id, item); });
  remote.forEach((item) => { if (item?.id) merged.set(item.id, item); });
  return Array.from(merged.values()).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

async function writeJournalBatch(uid: string, entries: StoredItem[], migrated: boolean): Promise<void> {
  for (let start = 0; start < entries.length; start += BATCH_SIZE) {
    const batch = writeBatch(firestoreDb);
    entries.slice(start, start + BATCH_SIZE).forEach((entry) => {
      batch.set(journalDocument(uid, entry.id), {
        schemaVersion: SCHEMA_VERSION,
        entry: sanitizeForFirestore(entry),
        ...(migrated ? { migratedAt: serverTimestamp() } : {}),
        updatedAt: serverTimestamp()
      }, { merge: true });
    });
    await batch.commit();
  }
}

async function writeSessionBatch(uid: string, summaries: StoredItem[], migrated: boolean): Promise<void> {
  for (let start = 0; start < summaries.length; start += BATCH_SIZE) {
    const batch = writeBatch(firestoreDb);
    summaries.slice(start, start + BATCH_SIZE).forEach((summary) => {
      batch.set(sessionDocument(uid, summary.id), {
        schemaVersion: SCHEMA_VERSION,
        summary: sanitizeForFirestore(summary),
        ...(migrated ? { migratedAt: serverTimestamp() } : {}),
        updatedAt: serverTimestamp()
      }, { merge: true });
    });
    await batch.commit();
  }
}

async function hydrateJournal(uid: string): Promise<boolean> {
  const snapshot = await getDocs(journalCollection(uid));
  const remote = snapshot.docs
    .map((item) => (item.data() as RemoteEnvelope<StoredItem>).entry)
    .filter((item): item is StoredItem => Boolean(item?.id));
  const local = readLocalArray<StoredItem>(JOURNAL_STORAGE_KEY);
  const remoteIds = new Set(remote.map((item) => item.id));
  const missingRemote = local.filter((item) => item?.id && !remoteIds.has(item.id));
  if (missingRemote.length) await writeJournalBatch(uid, missingRemote, true);
  const merged = mergeRemoteWithLocal(remote, local);
  if (merged.length || local.length) writeLocalArray(JOURNAL_STORAGE_KEY, merged);
  lastJournalFingerprint = fingerprint(merged);
  return remote.length > 0 || missingRemote.length > 0;
}

async function hydrateSessions(uid: string): Promise<boolean> {
  const snapshot = await getDocs(sessionCollection(uid));
  const remote = snapshot.docs
    .map((item) => (item.data() as RemoteEnvelope<StoredItem>).summary)
    .filter((item): item is StoredItem => Boolean(item?.id));
  const local = readLocalArray<StoredItem>(SESSION_SUMMARY_STORAGE_KEY);
  const remoteIds = new Set(remote.map((item) => item.id));
  const missingRemote = local.filter((item) => item?.id && !remoteIds.has(item.id));
  if (missingRemote.length) await writeSessionBatch(uid, missingRemote, true);
  const merged = mergeRemoteWithLocal(remote, local);
  if (merged.length || local.length) writeLocalArray(SESSION_SUMMARY_STORAGE_KEY, merged);
  lastSessionsFingerprint = fingerprint(merged);
  return remote.length > 0 || missingRemote.length > 0;
}

export async function hydrateExpertsRelationshipMemory(): Promise<'firestore' | 'local'> {
  if (typeof window === 'undefined') return 'local';
  const user = await restoredUser();
  if (!user) return 'local';
  try {
    const [journalChanged, sessionsChanged] = await Promise.all([
      hydrateJournal(user.uid),
      hydrateSessions(user.uid)
    ]);
    if (journalChanged || sessionsChanged) emitWorkspaceRefresh();
    return 'firestore';
  } catch {
    return 'local';
  }
}

export async function persistExpertJournalEntry(entry: StoredItem): Promise<void> {
  if (!entry?.id || !entry.clientId) return;
  const user = await restoredUser();
  if (!user) return;
  try {
    await setDoc(journalDocument(user.uid, entry.id), {
      schemaVersion: SCHEMA_VERSION,
      entry: sanitizeForFirestore(entry),
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch {}
}

export async function persistExpertSessionSummary(summary: StoredItem): Promise<void> {
  if (!summary?.id || !summary.clientId) return;
  const user = await restoredUser();
  if (!user) return;
  try {
    await setDoc(sessionDocument(user.uid, summary.id), {
      schemaVersion: SCHEMA_VERSION,
      summary: sanitizeForFirestore(summary),
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch {}
}

async function syncRelationshipMemoryFromLocal(): Promise<void> {
  const user = await restoredUser();
  if (!user) return;

  const journal = readLocalArray<StoredItem>(JOURNAL_STORAGE_KEY);
  const summaries = readLocalArray<StoredItem>(SESSION_SUMMARY_STORAGE_KEY);
  const journalFingerprint = fingerprint(journal);
  const sessionsFingerprint = fingerprint(summaries);

  try {
    if (journalFingerprint !== lastJournalFingerprint) {
      await writeJournalBatch(user.uid, journal, false);
      lastJournalFingerprint = journalFingerprint;
    }
    if (sessionsFingerprint !== lastSessionsFingerprint) {
      await writeSessionBatch(user.uid, summaries, false);
      lastSessionsFingerprint = sessionsFingerprint;
    }
  } catch {}
}

if (typeof window !== 'undefined') {
  let syncTimer: number | undefined;
  const scheduleSync = () => {
    if (syncTimer !== undefined) window.clearTimeout(syncTimer);
    syncTimer = window.setTimeout(() => {
      syncTimer = undefined;
      void syncRelationshipMemoryFromLocal();
    }, 120);
  };

  void hydrateExpertsRelationshipMemory();
  window.addEventListener(WORKSPACE_STATE_EVENT, scheduleSync);
  window.addEventListener('storage', (event) => {
    if (event.key === JOURNAL_STORAGE_KEY || event.key === SESSION_SUMMARY_STORAGE_KEY) scheduleSync();
  });
}
