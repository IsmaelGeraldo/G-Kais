import { markWebinarFollowUpCompleted } from './expertsAcquisition';

const TASK_STORAGE_KEY = 'gkais-experts-work-tasks-v1';
const WORKSPACE_STATE_EVENT = 'gkais:workspace-state-changed';

type WebinarTask = {
  id?: string;
  status?: string;
  result?: string;
  personId?: string;
  sourceRegistrationId?: string;
};

const synced = new Set<string>();
let timer: number | undefined;

function readTasks(): WebinarTask[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(TASK_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed as WebinarTask[] : [];
  } catch {
    return [];
  }
}

async function syncCompletedWebinarTasks() {
  const completed = readTasks().filter((task) =>
    task.status === 'done' &&
    typeof task.sourceRegistrationId === 'string' && task.sourceRegistrationId &&
    typeof task.personId === 'string' && task.personId
  );

  for (const task of completed) {
    const key = `${task.id || ''}:${task.sourceRegistrationId}:${task.result || ''}`;
    if (synced.has(key)) continue;
    try {
      await markWebinarFollowUpCompleted(task.sourceRegistrationId!, task.personId!, task.result || '');
      synced.add(key);
    } catch {}
  }
}

function scheduleSync() {
  if (typeof window === 'undefined') return;
  if (timer !== undefined) window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    timer = undefined;
    void syncCompletedWebinarTasks();
  }, 180);
}

if (typeof window !== 'undefined') {
  window.addEventListener(WORKSPACE_STATE_EVENT, scheduleSync);
  window.addEventListener('storage', (event) => {
    if (event.key === TASK_STORAGE_KEY) scheduleSync();
  });
  scheduleSync();
}
