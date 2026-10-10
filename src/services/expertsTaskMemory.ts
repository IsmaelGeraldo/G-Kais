import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type Unsubscribe
} from 'firebase/firestore';
import { firebaseAuth, firestoreDb, firebaseTarget } from '../lib/firebase';
import { canSyncOwnerLocalTaskCache, mayImportLegacyTasksToNewWorkspace } from './expertsTaskBootstrap';
import {
  getCurrentExpertWorkspaceMember,
  hasWorkspacePermission,
  resolveActiveExpertWorkspaceId
} from './expertsWorkspaceCore';

const TASK_STORAGE_KEY = 'gkais-experts-work-tasks-v1';
const WORKSPACE_STATE_EVENT = 'gkais:workspace-state-changed';
const SCHEMA_VERSION = 1;
const BATCH_SIZE = 400;

type StoredTask = Record<string, unknown> & {
  id: string;
  clientId: string;
  createdAt: string;
  assignedToUid?: string;
  assignedToName?: string;
  createdByUid?: string;
};

type TaskEnvelope = {
  schemaVersion?: number;
  task?: StoredTask;
};

const PILOT_TASKS: StoredTask[] = [
  {
    id: 'task-sofia-followup',
    clientId: 'sofia',
    clientName: 'Sofía Martínez',
    title: 'Enviar seguimiento por compromiso vencido',
    type: 'email',
    note: 'Confirmar qué bloqueó la ejecución y acordar el siguiente paso antes de la próxima sesión.',
    dueDate: '2026-09-28',
    dueTime: '17:00',
    assignee: 'Equipo',
    status: 'pending',
    createdAt: '2026-09-28T12:00:00.000Z',
    source: 'attention',
    sourceCommitmentLabel: 'Publicar 3 piezas de contenido',
    confirmationEmail: 'not-required'
  },
  {
    id: 'task-diego-renewal',
    clientId: 'diego',
    clientName: 'Diego Rojas',
    title: 'Confirmar reunión de renovación',
    type: 'meeting',
    note: 'Coordinar una conversación antes del cierre del programa.',
    dueDate: '2026-09-30',
    dueTime: '12:00',
    assignee: 'Mentor',
    status: 'pending',
    createdAt: '2026-09-28T12:05:00.000Z',
    source: 'attention',
    confirmationEmail: 'queued'
  },
  {
    id: 'task-valentina-call',
    clientId: 'valentina',
    clientName: 'Valentina Cruz',
    title: 'Llamar para confirmar diagnóstico',
    type: 'call',
    note: 'Alta intención y conversación sin siguiente paso.',
    dueDate: '2026-09-29',
    dueTime: '11:00',
    assignee: 'Equipo',
    status: 'pending',
    createdAt: '2026-09-28T12:10:00.000Z',
    source: 'attention',
    confirmationEmail: 'not-required'
  }
];

let hydratedKey = '';
let taskSubscription: Unsubscribe | null = null;
let lastOwnerLocalFingerprint = '';
let ownerSyncTimer: number | undefined;

function readLocalTasks(): StoredTask[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(TASK_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed as StoredTask[] : [];
  } catch {
    return [];
  }
}

function writeLocalTasks(tasks: StoredTask[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(tasks));
  } catch {}
}

function emitWorkspaceRefresh(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(WORKSPACE_STATE_EVENT));
}

// Only QA surfaces Firestore subscription/read errors. Do not treat failed reads
// as empty task collections or silently hide a permissions regression.
function reportTaskSyncError(cause?: unknown): void {
  if (firebaseTarget !== 'qa' || typeof window === 'undefined') return;
  const value = cause && typeof cause === 'object' && 'code' in cause
    ? String((cause as { code?: unknown }).code || 'unknown')
    : cause ? 'read-unavailable' : '';
  window.dispatchEvent(new CustomEvent('gkais:task-sync-error', { detail: value }));
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

function fingerprint(tasks: StoredTask[]): string {
  return JSON.stringify(tasks);
}

/**
 * Formation plans/metadata reuse work_tasks for existing permissions and sync,
 * but they are not actionable work. Keep them out of the local operational
 * task cache so Dashboard/Priority Work never count them as open work.
 */
function isOperationalLocalTask(task: StoredTask): boolean {
  const workstream = typeof task.workstream === 'string' ? task.workstream : '';
  const actionKind = typeof task.sourceActionKind === 'string' ? task.sourceActionKind : '';
  return !workstream.startsWith('formation-') && !actionKind.startsWith('formation-');
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

function tasksCollection(workspaceId: string) {
  return collection(firestoreDb, 'expert_workspaces', workspaceId, 'work_tasks');
}

function taskDocument(workspaceId: string, taskId: string) {
  return doc(firestoreDb, 'expert_workspaces', workspaceId, 'work_tasks', taskId);
}

function withOwnerAssignment(tasks: StoredTask[], user: User): StoredTask[] {
  const displayName = user.displayName || user.email || 'Owner';
  return tasks.map((task) => task.assignedToUid ? task : {
    ...task,
    assignedToUid: user.uid,
    assignedToName: displayName,
    createdByUid: task.createdByUid || user.uid,
    assignee: typeof task.assignee === 'string' && task.assignee ? task.assignee : displayName
  });
}

async function writeTaskBatch(workspaceId: string, tasks: StoredTask[], migrated: boolean): Promise<void> {
  for (let start = 0; start < tasks.length; start += BATCH_SIZE) {
    const batch = writeBatch(firestoreDb);
    tasks.slice(start, start + BATCH_SIZE).forEach((task) => {
      batch.set(taskDocument(workspaceId, task.id), {
        schemaVersion: SCHEMA_VERSION,
        task: sanitizeForFirestore(task),
        ...(migrated ? { migratedAt: serverTimestamp() } : {}),
        updatedAt: serverTimestamp()
      }, { merge: true });
    });
    await batch.commit();
  }
}

async function readableTaskQuery() {
  const user = firebaseAuth.currentUser;
  const context = await getCurrentExpertWorkspaceMember();
  if (!user || !context) return null;
  const { workspaceId, member } = context;
  const canReadTeam = hasWorkspacePermission(member.permissions, 'tasks.read.team');
  const canReadOwn = hasWorkspacePermission(member.permissions, 'tasks.read.own');
  if (canReadTeam) return { workspaceId, ref: tasksCollection(workspaceId), team: true };
  if (canReadOwn) return {
    workspaceId,
    ref: query(tasksCollection(workspaceId), where('task.assignedToUid', '==', user.uid)),
    team: false
  };
  return { workspaceId, ref: null, team: false };
}

export async function persistExpertWorkTask(task: StoredTask, options?: { throwOnError?: boolean }): Promise<void> {
  const user = firebaseAuth.currentUser;
  const workspaceId = await resolveActiveExpertWorkspaceId(user);
  if (!user || !workspaceId || !task?.id) {
    if (options?.throwOnError) throw new Error('TASK_SAVE_UNAVAILABLE');
    return;
  }
  try {
    await setDoc(taskDocument(workspaceId, task.id), {
      schemaVersion: SCHEMA_VERSION,
      task: sanitizeForFirestore({ ...task, createdByUid: task.createdByUid || user.uid }),
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (cause) {
    if (options?.throwOnError) throw cause;
  }
}

/**
 * Mark the current action done and (optionally) create its delegated follow-up
 * in a single Firestore batch. If either write is rejected, neither is applied.
 */
export async function completeExpertWorkTaskWithNext(
  completed: StoredTask,
  next?: StoredTask
): Promise<void> {
  const user = firebaseAuth.currentUser;
  const workspaceId = await resolveActiveExpertWorkspaceId(user);
  if (!user || !workspaceId || !completed.id) throw new Error('TASK_SAVE_UNAVAILABLE');
  if (next && (!next.id || next.id === completed.id)) throw new Error('INVALID_NEXT_TASK');
  if (completed.status !== 'done') throw new Error('COMPLETED_STATUS_REQUIRED');
  if (next && next.status !== 'pending') throw new Error('NEXT_ACTION_MUST_BE_PENDING');

  const batch = writeBatch(firestoreDb);
  for (const task of next ? [completed, next] : [completed]) {
    batch.set(taskDocument(workspaceId, task.id), {
      schemaVersion: SCHEMA_VERSION,
      task: sanitizeForFirestore({ ...task, createdByUid: task.createdByUid || user.uid }),
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
  await batch.commit();
}

async function syncOwnerLegacyTasksFromLocal(): Promise<void> {
  const user = firebaseAuth.currentUser;
  if (!user || typeof window === 'undefined') return;
  const workspaceId = await resolveActiveExpertWorkspaceId(user);
  if (!workspaceId || workspaceId !== user.uid) return;
  // QA may never sync a stale browser cache before Firestore is loaded.
  if (!canSyncOwnerLocalTaskCache(firebaseTarget, hydratedKey, user.uid, workspaceId)) return;

  const local = withOwnerAssignment(readLocalTasks().filter(isOperationalLocalTask), user);
  const nextFingerprint = fingerprint(local);
  if (!local.length || nextFingerprint === lastOwnerLocalFingerprint) return;

  try {
    if (fingerprint(readLocalTasks()) !== nextFingerprint) writeLocalTasks(local);
    await writeTaskBatch(workspaceId, local, false);
    lastOwnerLocalFingerprint = nextFingerprint;
  } catch {}
}

function scheduleOwnerLegacySync() {
  if (typeof window === 'undefined') return;
  if (ownerSyncTimer !== undefined) window.clearTimeout(ownerSyncTimer);
  ownerSyncTimer = window.setTimeout(() => {
    ownerSyncTimer = undefined;
    void syncOwnerLegacyTasksFromLocal();
  }, 160);
}

export async function hydrateExpertsTaskMemory(): Promise<'firestore' | 'local'> {
  if (typeof window === 'undefined') return 'local';
  const user = await restoredUser();
  if (!user) return 'local';
  if (new URLSearchParams(window.location.search).get('invite')) return 'local';

  try {
    const readable = await readableTaskQuery();
    if (!readable?.ref) {
      writeLocalTasks([]);
      emitWorkspaceRefresh();
      return 'firestore';
    }

    const snapshot = await getDocs(readable.ref);
    const allRemote = snapshot.docs
      .map((item) => (item.data() as TaskEnvelope).task)
      .filter((item): item is StoredTask => Boolean(item?.id))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    let remote = allRemote.filter(isOperationalLocalTask);
    const isOwnerWorkspace = readable.workspaceId === user.uid;

    // A new QA Workspace must start empty. Never import local browser history
    // or bundled pilot data into an isolated Firebase project.
    if (isOwnerWorkspace && allRemote.length === 0 && mayImportLegacyTasksToNewWorkspace(firebaseTarget)) {
      let local = readLocalTasks().filter(isOperationalLocalTask);
      if (!local.length) local = PILOT_TASKS;
      local = withOwnerAssignment(local, user);
      if (local.length) await writeTaskBatch(readable.workspaceId, local, true);
      remote = local;
    } else if (isOwnerWorkspace) {
      const normalized = withOwnerAssignment(remote, user);
      const changed = normalized.some((task, index) => task.assignedToUid !== remote[index]?.assignedToUid);
      if (changed) {
        await writeTaskBatch(readable.workspaceId, normalized, false);
        remote = normalized;
      }
    }

    writeLocalTasks(remote);
    reportTaskSyncError();
    lastOwnerLocalFingerprint = isOwnerWorkspace ? fingerprint(remote) : '';
    hydratedKey = `${user.uid}:${readable.workspaceId}`;
    emitWorkspaceRefresh();
    await startTaskSubscription();
    return 'firestore';
  } catch (cause) {
    reportTaskSyncError(cause);
    return 'local';
  }
}

async function startTaskSubscription(): Promise<void> {
  if (typeof window === 'undefined') return;
  const user = firebaseAuth.currentUser;
  if (!user || new URLSearchParams(window.location.search).get('invite')) return;
  const readable = await readableTaskQuery();
  if (!readable?.ref) return;

  taskSubscription?.();
  taskSubscription = onSnapshot(readable.ref, (snapshot) => {
    const remote = snapshot.docs
      .map((item) => (item.data() as TaskEnvelope).task)
      .filter((item): item is StoredTask => Boolean(item?.id))
      .filter(isOperationalLocalTask)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    writeLocalTasks(remote);
    reportTaskSyncError();
    if (readable.workspaceId === user.uid) lastOwnerLocalFingerprint = fingerprint(remote);
    emitWorkspaceRefresh();
  }, reportTaskSyncError);
}

if (typeof window !== 'undefined') {
  onAuthStateChanged(firebaseAuth, (user) => {
    taskSubscription?.();
    taskSubscription = null;
    hydratedKey = '';
    lastOwnerLocalFingerprint = '';
    if (!user) {
      writeLocalTasks([]);
      return;
    }
    if (new URLSearchParams(window.location.search).get('invite')) return;
    void hydrateExpertsTaskMemory();
  });

  window.addEventListener(WORKSPACE_STATE_EVENT, scheduleOwnerLegacySync);
  window.addEventListener('storage', (event) => {
    if (event.key === TASK_STORAGE_KEY) scheduleOwnerLegacySync();
  });
  window.addEventListener('gkais:workspace-membership-changed', () => {
    const user = firebaseAuth.currentUser;
    if (!user) return;
    const nextKey = `${user.uid}:`;
    if (!hydratedKey.startsWith(nextKey)) hydratedKey = '';
    void hydrateExpertsTaskMemory();
  });
}
