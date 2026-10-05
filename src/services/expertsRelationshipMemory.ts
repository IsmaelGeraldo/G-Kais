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
import {
  scopedWorkspaceStorageKey,
  setActiveExpertWorkspaceStorageScope
} from './expertsWorkspaceStorage';

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

let journalSubscription: Unsubscribe | null = null;
let sessionSubscription: Unsubscribe | null = null;
let subscribedWorkspaceId = '';
let remoteJournalFingerprints = new Map<string, string>();
let remoteSessionFingerprints = new Map<string, string>();
let syncTimer: number | undefined;

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
  try {
    window.localStorage.setItem(scopedWorkspaceStorageKey(baseKey, workspaceId), JSON.stringify(value));
  } catch {}
}

function clearOwnerOnlyRelationshipCache(workspaceId: string): void {
  if (!workspaceId) return;
  writeLocalArray(JOURNAL_STORAGE_KEY, workspaceId, []);
  writeLocalArray(SESSION_SUMMARY_STORAGE_KEY, workspaceId, []);
  remoteJournalFingerprints = new Map();
  remoteSessionFingerprints = new Map();
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

function itemFingerprint(item: StoredItem): string {
  return JSON.stringify(item);
}

function fingerprintMap(items: StoredItem[]): Map<string, string> {
  return new Map(items.filter((item) => item?.id).map((item) => [item.id, itemFingerprint(item)]));
}

function sortNewest(items: StoredItem[]): StoredItem[] {
  return [...items].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

function preservePendingLocal(remote: StoredItem[], local: StoredItem[], knownRemote: Map<string, string>): StoredItem[] {
  const remoteById = new Map(remote.map((item) => [item.id, item]));
  const merged = new Map<string, StoredItem>();

  remote.forEach((item) => merged.set(item.id, item));
  local.forEach((localItem) => {
    if (!localItem?.id) return;
    const remoteItem = remoteById.get(localItem.id);
    const knownFingerprint = knownRemote.get(localItem.id);
    const localFingerprint = itemFingerprint(localItem);
    const remoteFingerprint = remoteItem ? itemFingerprint(remoteItem) : '';
    const localHasPendingChange = knownFingerprint !== undefined && localFingerprint !== knownFingerprint && localFingerprint !== remoteFingerprint;
    const localIsNewPending = !remoteItem && knownFingerprint === undefined;
    if (localHasPendingChange || localIsNewPending) merged.set(localItem.id, localItem);
  });

  return sortNewest(Array.from(merged.values()));
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

async function ownerWorkspaceId(user: User): Promise<string | null> {
  if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('invite')) return null;
  const workspaceId = await resolveActiveExpertWorkspaceId(user);
  if (!workspaceId) return null;
  setActiveExpertWorkspaceStorageScope(workspaceId);
  if (workspaceId !== user.uid) {
    clearOwnerOnlyRelationshipCache(workspaceId);
    return null;
  }
  return workspaceId;
}

function journalCollection(workspaceId: string) {
  return collection(firestoreDb, 'expert_workspaces', workspaceId, 'journal_entries');
}

function journalDocument(workspaceId: string, entryId: string) {
  return doc(firestoreDb, 'expert_workspaces', workspaceId, 'journal_entries', entryId);
}

function sessionCollection(workspaceId: string) {
  return collection(firestoreDb, 'expert_workspaces', workspaceId, 'session_summaries');
}

function sessionDocument(workspaceId: string, summaryId: string) {
  return doc(firestoreDb, 'expert_workspaces', workspaceId, 'session_summaries', summaryId);
}

async function writeJournalBatch(workspaceId: string, entries: StoredItem[], migrated: boolean): Promise<void> {
  for (let start = 0; start < entries.length; start += BATCH_SIZE) {
    const batch = writeBatch(firestoreDb);
    entries.slice(start, start + BATCH_SIZE).forEach((entry) => {
      batch.set(journalDocument(workspaceId, entry.id), {
        schemaVersion: SCHEMA_VERSION,
        entry: sanitizeForFirestore(entry),
        ...(migrated ? { migratedAt: serverTimestamp() } : {}),
        updatedAt: serverTimestamp()
      }, { merge: true });
    });
    await batch.commit();
  }
}

async function writeSessionBatch(workspaceId: string, summaries: StoredItem[], migrated: boolean): Promise<void> {
  for (let start = 0; start < summaries.length; start += BATCH_SIZE) {
    const batch = writeBatch(firestoreDb);
    summaries.slice(start, start + BATCH_SIZE).forEach((summary) => {
      batch.set(sessionDocument(workspaceId, summary.id), {
        schemaVersion: SCHEMA_VERSION,
        summary: sanitizeForFirestore(summary),
        ...(migrated ? { migratedAt: serverTimestamp() } : {}),
        updatedAt: serverTimestamp()
      }, { merge: true });
    });
    await batch.commit();
  }
}

function remoteJournal(snapshot: { docs: Array<{ data: () => unknown }> }): StoredItem[] {
  return snapshot.docs
    .map((item) => (item.data() as RemoteEnvelope<StoredItem>).entry)
    .filter((item): item is StoredItem => Boolean(item?.id));
}

function remoteSessions(snapshot: { docs: Array<{ data: () => unknown }> }): StoredItem[] {
  return snapshot.docs
    .map((item) => (item.data() as RemoteEnvelope<StoredItem>).summary)
    .filter((item): item is StoredItem => Boolean(item?.id));
}

function stopRelationshipSubscriptions(): void {
  journalSubscription?.();
  sessionSubscription?.();
  journalSubscription = null;
  sessionSubscription = null;
  subscribedWorkspaceId = '';
  remoteJournalFingerprints = new Map();
  remoteSessionFingerprints = new Map();
}

function startRelationshipSubscriptions(workspaceId: string): void {
  if (journalSubscription && sessionSubscription && subscribedWorkspaceId === workspaceId) return;
  stopRelationshipSubscriptions();
  subscribedWorkspaceId = workspaceId;

  journalSubscription = onSnapshot(journalCollection(workspaceId), (snapshot) => {
    const remote = remoteJournal(snapshot);
    const local = readLocalArray<StoredItem>(JOURNAL_STORAGE_KEY, workspaceId);
    const merged = preservePendingLocal(remote, local, remoteJournalFingerprints);
    remoteJournalFingerprints = fingerprintMap(remote);
    writeLocalArray(JOURNAL_STORAGE_KEY, workspaceId, merged);
    emitWorkspaceRefresh();
  }, (error) => console.error('[G-KAIS JOURNAL SUBSCRIPTION ERROR]', error));

  sessionSubscription = onSnapshot(sessionCollection(workspaceId), (snapshot) => {
    const remote = remoteSessions(snapshot);
    const local = readLocalArray<StoredItem>(SESSION_SUMMARY_STORAGE_KEY, workspaceId);
    const merged = preservePendingLocal(remote, local, remoteSessionFingerprints);
    remoteSessionFingerprints = fingerprintMap(remote);
    writeLocalArray(SESSION_SUMMARY_STORAGE_KEY, workspaceId, merged);
    emitWorkspaceRefresh();
  }, (error) => console.error('[G-KAIS SESSION SUMMARY SUBSCRIPTION ERROR]', error));
}

async function hydrateJournal(workspaceId: string): Promise<boolean> {
  const snapshot = await getDocs(journalCollection(workspaceId));
  const remote = remoteJournal(snapshot);
  const local = readLocalArray<StoredItem>(JOURNAL_STORAGE_KEY, workspaceId);
  const remoteIds = new Set(remote.map((item) => item.id));
  const missingRemote = local.filter((item) => item?.id && !remoteIds.has(item.id));
  if (missingRemote.length) await writeJournalBatch(workspaceId, missingRemote, true);
  const merged = sortNewest([...remote, ...missingRemote]);
  writeLocalArray(JOURNAL_STORAGE_KEY, workspaceId, merged);
  remoteJournalFingerprints = fingerprintMap(merged);
  return remote.length > 0 || missingRemote.length > 0;
}

async function hydrateSessions(workspaceId: string): Promise<boolean> {
  const snapshot = await getDocs(sessionCollection(workspaceId));
  const remote = remoteSessions(snapshot);
  const local = readLocalArray<StoredItem>(SESSION_SUMMARY_STORAGE_KEY, workspaceId);
  const remoteIds = new Set(remote.map((item) => item.id));
  const missingRemote = local.filter((item) => item?.id && !remoteIds.has(item.id));
  if (missingRemote.length) await writeSessionBatch(workspaceId, missingRemote, true);
  const merged = sortNewest([...remote, ...missingRemote]);
  writeLocalArray(SESSION_SUMMARY_STORAGE_KEY, workspaceId, merged);
  remoteSessionFingerprints = fingerprintMap(merged);
  return remote.length > 0 || missingRemote.length > 0;
}

export async function hydrateExpertsRelationshipMemory(): Promise<'firestore' | 'local'> {
  if (typeof window === 'undefined') return 'local';
  const user = await restoredUser();
  if (!user) {
    stopRelationshipSubscriptions();
    return 'local';
  }
  const workspaceId = await ownerWorkspaceId(user);
  if (!workspaceId) {
    stopRelationshipSubscriptions();
    emitWorkspaceRefresh();
    return 'local';
  }
  try {
    const [journalChanged, sessionsChanged] = await Promise.all([
      hydrateJournal(workspaceId),
      hydrateSessions(workspaceId)
    ]);
    startRelationshipSubscriptions(workspaceId);
    if (journalChanged || sessionsChanged) emitWorkspaceRefresh();
    return 'firestore';
  } catch (error) {
    console.error('[G-KAIS RELATIONSHIP MEMORY HYDRATION ERROR]', error);
    return 'local';
  }
}

export async function persistExpertJournalEntry(entry: StoredItem): Promise<void> {
  if (!entry?.id || !entry.clientId) return;
  const user = await restoredUser();
  if (!user) return;
  const workspaceId = await ownerWorkspaceId(user);
  if (!workspaceId) return;
  await setDoc(journalDocument(workspaceId, entry.id), {
    schemaVersion: SCHEMA_VERSION,
    entry: sanitizeForFirestore(entry),
    updatedAt: serverTimestamp()
  }, { merge: true });
}

export async function persistExpertSessionSummary(summary: StoredItem): Promise<void> {
  if (!summary?.id || !summary.clientId) return;
  const user = await restoredUser();
  if (!user) return;
  const workspaceId = await ownerWorkspaceId(user);
  if (!workspaceId) return;
  await setDoc(sessionDocument(workspaceId, summary.id), {
    schemaVersion: SCHEMA_VERSION,
    summary: sanitizeForFirestore(summary),
    updatedAt: serverTimestamp()
  }, { merge: true });
}

async function syncRelationshipMemoryFromLocal(): Promise<void> {
  const user = await restoredUser();
  if (!user) return;
  const workspaceId = await ownerWorkspaceId(user);
  if (!workspaceId) return;

  const journal = readLocalArray<StoredItem>(JOURNAL_STORAGE_KEY, workspaceId);
  const summaries = readLocalArray<StoredItem>(SESSION_SUMMARY_STORAGE_KEY, workspaceId);
  const changedJournal = journal.filter((item) => remoteJournalFingerprints.get(item.id) !== itemFingerprint(item));
  const changedSessions = summaries.filter((item) => remoteSessionFingerprints.get(item.id) !== itemFingerprint(item));

  try {
    if (changedJournal.length) {
      await writeJournalBatch(workspaceId, changedJournal, false);
      changedJournal.forEach((item) => remoteJournalFingerprints.set(item.id, itemFingerprint(item)));
    }
    if (changedSessions.length) {
      await writeSessionBatch(workspaceId, changedSessions, false);
      changedSessions.forEach((item) => remoteSessionFingerprints.set(item.id, itemFingerprint(item)));
    }
  } catch (error) {
    console.error('[G-KAIS RELATIONSHIP MEMORY SYNC ERROR]', error);
  }
}

function scheduleSync(): void {
  if (typeof window === 'undefined') return;
  if (syncTimer !== undefined) window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => {
    syncTimer = undefined;
    void syncRelationshipMemoryFromLocal();
  }, 120);
}

if (typeof window !== 'undefined') {
  void hydrateExpertsRelationshipMemory();
  window.addEventListener(WORKSPACE_STATE_EVENT, scheduleSync);
  window.addEventListener('storage', (event) => {
    if (event.key?.startsWith(JOURNAL_STORAGE_KEY) || event.key?.startsWith(SESSION_SUMMARY_STORAGE_KEY)) scheduleSync();
  });
  onAuthStateChanged(firebaseAuth, (user) => {
    if (!user) stopRelationshipSubscriptions();
  });
}
