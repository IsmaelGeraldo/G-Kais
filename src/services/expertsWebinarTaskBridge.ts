import { appendExpertRelationshipEvent } from './expertsWorkspaceCore';
import { markWebinarWorkActionCompleted, type WebinarWorkActionKind } from './expertsWebinarActions';

const TASK_STORAGE_KEY = 'gkais-experts-work-tasks-v1';
const WORKSPACE_STATE_EVENT = 'gkais:workspace-state-changed';

type WebinarTask = {
  id?: string;
  status?: string;
  result?: string;
  personId?: string;
  sourceId?: string;
  sourceRegistrationId?: string;
  sourceActionKind?: WebinarWorkActionKind;
  createdAt?: string;
};

const synced = new Set<string>();
const inFlight = new Set<string>();
const leadEventsSynced = new Set<string>();
const leadEventsInFlight = new Set<string>();
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

function taskDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : undefined;
}

async function syncCanonicalLeadEvents(tasks: WebinarTask[]) {
  const leads = tasks.filter((task) =>
    task.sourceActionKind === 'follow-up' &&
    typeof task.sourceRegistrationId === 'string' && task.sourceRegistrationId &&
    typeof task.personId === 'string' && task.personId
  );

  for (const task of leads) {
    const key = task.sourceRegistrationId!;
    if (leadEventsSynced.has(key) || leadEventsInFlight.has(key)) continue;
    leadEventsInFlight.add(key);
    try {
      // The deterministic key makes historical backfill and future sync safe to repeat.
      await appendExpertRelationshipEvent({
        personId: task.personId!,
        type: 'lead_entered',
        sourceType: 'webinar_registration',
        sourceId: task.sourceRegistrationId!,
        idempotencyKey: `lead-entered:${task.sourceRegistrationId}`,
        occurredAt: taskDate(task.createdAt),
        metadata: {
          webinarId: task.sourceId || '',
          registrationId: task.sourceRegistrationId!,
          taskId: task.id || ''
        }
      });
      leadEventsSynced.add(key);
    } catch {
    } finally {
      leadEventsInFlight.delete(key);
    }
  }
}

async function syncCompletedWebinarTasks(tasks: WebinarTask[]) {
  const completed = tasks.filter((task) =>
    task.status === 'done' &&
    typeof task.sourceRegistrationId === 'string' && task.sourceRegistrationId &&
    typeof task.personId === 'string' && task.personId
  );

  for (const task of completed) {
    const key = `${task.id || ''}:${task.sourceRegistrationId}:${task.sourceActionKind || ''}:${task.result || ''}`;
    if (synced.has(key) || inFlight.has(key)) continue;
    inFlight.add(key);
    try {
      await markWebinarWorkActionCompleted({
        registrationId: task.sourceRegistrationId!,
        personId: task.personId!,
        result: task.result || '',
        kind: task.sourceActionKind,
        taskId: task.id
      });
      synced.add(key);
    } catch {
    } finally {
      inFlight.delete(key);
    }
  }
}

async function syncWebinarTasks() {
  const tasks = readTasks();
  await syncCanonicalLeadEvents(tasks);
  await syncCompletedWebinarTasks(tasks);
}

function scheduleSync() {
  if (typeof window === 'undefined') return;
  if (timer !== undefined) window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    timer = undefined;
    void syncWebinarTasks();
  }, 180);
}

if (typeof window !== 'undefined') {
  window.addEventListener(WORKSPACE_STATE_EVENT, scheduleSync);
  window.addEventListener('storage', (event) => {
    if (event.key === TASK_STORAGE_KEY) scheduleSync();
  });
  scheduleSync();
}
