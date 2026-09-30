import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../lib/firebase';

const TASK_STORAGE_KEY = 'gkais-experts-work-tasks-v1';
const WORKSPACE_STATE_EVENT = 'gkais:workspace-state-changed';
const SCHEMA_VERSION = 1;
const BATCH_SIZE = 400;

type StoredTask = Record<string, unknown> & {
  id: string;
  clientId: string;
  createdAt: string;
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

let lastTaskFingerprint = '';
let hydratedUid = '';

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

function tasksCollection(uid: string) {
  return collection(firestoreDb, 'expert_workspaces', uid, 'work_tasks');
}

function taskDocument(uid: string, taskId: string) {
  return doc(firestoreDb, 'expert_workspaces', uid, 'work_tasks', taskId);
}

function mergeRemoteWithLocal(remote: StoredTask[], local: StoredTask[]): StoredTask[] {
  const merged = new Map<string, StoredTask>();
  local.forEach((task) => { if (task?.id) merged.set(task.id, task); });
  remote.forEach((task) => { if (task?.id) merged.set(task.id, task); });
  return Array.from(merged.values()).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

async function writeTaskBatch(uid: string, tasks: StoredTask[], migrated: boolean): Promise<void> {
  for (let start = 0; start < tasks.length; start += BATCH_SIZE) {
    const batch = writeBatch(firestoreDb);
    tasks.slice(start, start + BATCH_SIZE).forEach((task) => {
      batch.set(taskDocument(uid, task.id), {
        schemaVersion: SCHEMA_VERSION,
        task: sanitizeForFirestore(task),
        ...(migrated ? { migratedAt: serverTimestamp() } : {}),
        updatedAt: serverTimestamp()
      }, { merge: true });
    });
    await batch.commit();
  }
}

export async function hydrateExpertsTaskMemory(): Promise<'firestore' | 'local'> {
  if (typeof window === 'undefined') return 'local';
  const user = await restoredUser();
  if (!user) return 'local';

  try {
    const snapshot = await getDocs(tasksCollection(user.uid));
    const remote = snapshot.docs
      .map((item) => (item.data() as TaskEnvelope).task)
      .filter((item): item is StoredTask => Boolean(item?.id));

    let local = readLocalTasks();
    if (!remote.length && !local.length) {
      local = PILOT_TASKS;
      writeLocalTasks(local);
    }

    const remoteIds = new Set(remote.map((task) => task.id));
    const missingRemote = local.filter((task) => task?.id && !remoteIds.has(task.id));
    if (missingRemote.length) await writeTaskBatch(user.uid, missingRemote, true);

    const merged = mergeRemoteWithLocal(remote, local);
    writeLocalTasks(merged);
    lastTaskFingerprint = fingerprint(merged);
    hydratedUid = user.uid;
    emitWorkspaceRefresh();
    return 'firestore';
  } catch {
    return 'local';
  }
}

async function syncTasksFromLocal(): Promise<void> {
  const user = firebaseAuth.currentUser;
  if (!user || hydratedUid !== user.uid) return;

  const tasks = readLocalTasks();
  const nextFingerprint = fingerprint(tasks);
  if (nextFingerprint === lastTaskFingerprint) return;

  try {
    await writeTaskBatch(user.uid, tasks, false);
    lastTaskFingerprint = nextFingerprint;
  } catch {}
}

if (typeof window !== 'undefined') {
  let syncTimer: number | undefined;

  const scheduleSync = () => {
    if (syncTimer !== undefined) window.clearTimeout(syncTimer);
    syncTimer = window.setTimeout(() => {
      syncTimer = undefined;
      void syncTasksFromLocal();
    }, 120);
  };

  onAuthStateChanged(firebaseAuth, (user) => {
    if (!user) {
      hydratedUid = '';
      lastTaskFingerprint = '';
      return;
    }
    if (hydratedUid === user.uid) return;
    void hydrateExpertsTaskMemory();
  });

  window.addEventListener(WORKSPACE_STATE_EVENT, scheduleSync);
  window.addEventListener('storage', (event) => {
    if (event.key === TASK_STORAGE_KEY) scheduleSync();
  });
}
