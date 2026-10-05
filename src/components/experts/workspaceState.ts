import {
  hydrateExpertsClientMemory,
  persistExpertClientRecords,
  persistExpertSessionClients
} from '../../services/expertsClientMemory';
import { emitExpertsPersistenceStatus } from '../../services/expertsPersistenceStatus';
import { scopedWorkspaceStorageKey } from '../../services/expertsWorkspaceStorage';

export type WorkActionType = 'email' | 'whatsapp' | 'call' | 'meeting' | 'task';
export type WorkTaskStatus = 'pending' | 'in-progress' | 'done';
export type WorkPriority = 'high' | 'medium' | 'normal';

export type WorkTask = {
  id: string;
  clientId: string;
  clientName: string;
  personId?: string;
  title: string;
  type: WorkActionType;
  note: string;
  dueDate: string;
  dueTime: string;
  assignee: string;
  status: WorkTaskStatus;
  createdAt: string;
  completedAt?: string;
  deletedAt?: string;
  deletedFromStatus?: WorkTaskStatus;
  result?: string;
  source?: 'attention' | 'session' | 'manual' | 'people' | 'webinar' | 'webinar-continuity' | 'formation' | 'nurture';
  sourceCommitmentLabel?: string;
  confirmationEmail?: 'not-required' | 'queued' | 'sent';
};

export type SharedCommitment = {
  id: string;
  label: string;
  status: 'pending' | 'done' | 'overdue';
};

export type SharedSessionClient = {
  id: string;
  name: string;
  personId?: string;
  company?: string;
  program?: string;
  week?: string;
  goal?: string;
  nextAction?: string;
  nextSession?: string;
  currentPhase?: string;
  currentGap?: string;
  planSummary?: string;
  blockers?: string[];
  commitments?: SharedCommitment[];
  copilot?: {
    summary: string;
    gap: string;
    known: string[];
    risks: string[];
    questions: string[];
    howHelp: string[];
    plan: string[];
    callOpening: string;
  };
  [key: string]: unknown;
};

export type JournalEntry = {
  id: string;
  clientId: string;
  type: string;
  title: string;
  body: string;
  createdAt: string;
};

export type SessionSummary = {
  id: string;
  clientId: string;
  clientName: string;
  createdAt: string;
  durationMinutes?: number;
  mood: string;
  openingNotes: string;
  reviewStatus: string;
  reviewReason: string;
  reviewNotes: string;
  reviewLearning: string;
  diagnosisStatus: string;
  currentProblem: string;
  rootCause: string;
  attemptedSolutions: string;
  blockers: string[];
  decision: string;
  solution: string;
  planPhase: string;
  planSummary: string;
  clientCommitments: string[];
  mentorActions: string[];
  expectedResult: string;
  successMeasure: string;
  nextAction: string;
  nextSession: string;
};

export const SESSION_CLIENT_STORAGE_KEY = 'gkais-experts-session-clients-v2';
export const JOURNAL_STORAGE_KEY = 'gkais-experts-client-journal-v1';
export const TASK_STORAGE_KEY = 'gkais-experts-work-tasks-v1';
export const SESSION_SUMMARY_STORAGE_KEY = 'gkais-experts-session-summaries-v1';
export const WORKSPACE_STATE_EVENT = 'gkais:workspace-state-changed';
export const SESSION_STAGE_EVENT = 'gkais:session-stage-completed';
const CLIENT_RECORD_STORAGE_KEY = 'gkais-experts-client-records-v2';

if (typeof window !== 'undefined') {
  void hydrateExpertsClientMemory();
}

function storageKey(baseKey: string): string {
  return scopedWorkspaceStorageKey(baseKey);
}

function safeParseArray<T>(baseKey: string, fallback: T[]): T[] {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(storageKey(baseKey));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as T[] : fallback;
  } catch {
    return fallback;
  }
}

function reportRemotePersistence(operation: Promise<unknown>): void {
  emitExpertsPersistenceStatus('saving');
  void operation
    .then(() => emitExpertsPersistenceStatus('saved'))
    .catch((error) => {
      console.error('[G-KAIS PERSISTENCE ERROR]', error);
      emitExpertsPersistenceStatus('error');
    });
}

function fallbackCopilot() {
  return {
    summary: 'Revisa el contexto del cliente, los compromisos y la última bitácora antes de la sesión.',
    gap: 'Confirmar qué cambió desde la última conversación y cuál es la brecha actual.',
    known: ['Existe una relación activa en G-KAIS.'],
    risks: ['La preparación puede estar incompleta hasta revisar la información más reciente.'],
    questions: ['¿Qué cambió desde la última conversación?', '¿Qué bloqueó el avance?', '¿Cuál debería ser la próxima acción concreta?'],
    howHelp: ['Convertir la conversación en una decisión y una próxima acción visible.'],
    plan: ['Revisar contexto.', 'Aclarar bloqueadores.', 'Cerrar con próxima acción.'],
    callOpening: 'Quiero partir conectando lo que acordamos con lo que realmente ocurrió desde la última conversación.'
  };
}

function dueTimestamp(task: WorkTask): number {
  if (!task.dueDate) return Number.MAX_SAFE_INTEGER;
  const value = new Date(`${task.dueDate}T${task.dueTime || '23:59'}:00`).getTime();
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
}

function actionTypeLabel(type: WorkActionType): string {
  if (type === 'email') return 'Email';
  if (type === 'whatsapp') return 'WhatsApp';
  if (type === 'call') return 'Llamada';
  if (type === 'meeting') return 'Reunión';
  return 'Tarea interna';
}

function taskAsNextAction(task?: WorkTask): string {
  if (!task) return '';
  const detail = task.note.trim() || task.title.trim();
  return [actionTypeLabel(task.type), detail, task.dueDate || '', task.dueTime || ''].filter(Boolean).join(' · ');
}

function nextMeetingText(task?: WorkTask): string {
  if (!task?.dueDate) return '';
  return `${task.dueDate}${task.dueTime ? ` · ${task.dueTime}` : ''}`;
}

export function getWorkPriority(task: WorkTask, now = new Date()): WorkPriority {
  if (!task.dueDate) return 'normal';
  const due = new Date(`${task.dueDate}T${task.dueTime || '23:59'}:00`);
  if (!Number.isFinite(due.getTime())) return 'normal';
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startTomorrow = startToday + 24 * 60 * 60 * 1000;
  const dueTime = due.getTime();
  if (dueTime < now.getTime() || dueTime < startTomorrow) return 'high';
  if (dueTime < startTomorrow + 48 * 60 * 60 * 1000) return 'medium';
  return 'normal';
}

export function emitWorkspaceStateChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(WORKSPACE_STATE_EVENT));
}

export function emitSessionStageCompleted(clientId: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SESSION_STAGE_EVENT, { detail: { clientId } }));
}

export function loadSessionClients(): SharedSessionClient[] {
  return safeParseArray<SharedSessionClient>(SESSION_CLIENT_STORAGE_KEY, []);
}

async function syncClientRecordsFromSession(clients: SharedSessionClient[]): Promise<void> {
  if (typeof window === 'undefined') return;
  const raw = window.localStorage.getItem(storageKey(CLIENT_RECORD_STORAGE_KEY));
  if (!raw) return;
  const records = JSON.parse(raw);
  if (!Array.isArray(records)) return;
  const nextRecords = records.map((record) => {
    if (!record || typeof record !== 'object') return record;
    const typed = record as Record<string, unknown>;
    const id = typeof typed.id === 'string' ? typed.id : '';
    const live = clients.find((client) => client.id === id);
    if (!live) return record;
    const overdueCount = live.commitments?.filter((commitment) => commitment.status === 'overdue').length ?? 0;
    const currentStatus = typeof typed.status === 'string' ? typed.status : 'active';
    const derivedStatus = currentStatus === 'attention' && live.commitments && overdueCount === 0 ? 'active' : currentStatus;
    const derivedAttentionReason = currentStatus === 'attention' && overdueCount > 0
      ? `${overdueCount} compromiso${overdueCount === 1 ? '' : 's'} vencido${overdueCount === 1 ? '' : 's'} pendiente${overdueCount === 1 ? '' : 's'} de resolver.`
      : typed.attentionReason;
    return {
      ...typed,
      company: live.company ?? typed.company,
      program: live.program ?? typed.program,
      progress: live.week ?? typed.progress,
      expectedOutcome: live.goal ?? typed.expectedOutcome,
      nextAction: live.nextAction ?? typed.nextAction,
      nextSession: live.nextSession ?? typed.nextSession,
      currentPhase: live.currentPhase ?? typed.currentPhase,
      currentGap: live.currentGap ?? typed.currentGap,
      planSummary: live.planSummary ?? typed.planSummary,
      blockers: live.blockers ?? typed.blockers,
      commitments: live.commitments?.map((item) => ({ label: item.label, status: item.status })) ?? typed.commitments,
      status: derivedStatus,
      attentionReason: derivedAttentionReason
    };
  });
  window.localStorage.setItem(storageKey(CLIENT_RECORD_STORAGE_KEY), JSON.stringify(nextRecords));
  await persistExpertClientRecords(nextRecords);
}

export function saveSessionClients(clients: SharedSessionClient[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(SESSION_CLIENT_STORAGE_KEY), JSON.stringify(clients));
    reportRemotePersistence(Promise.all([
      persistExpertSessionClients(clients),
      syncClientRecordsFromSession(clients)
    ]));
    emitWorkspaceStateChanged();
  } catch (error) {
    console.error('[G-KAIS LOCAL SAVE ERROR]', error);
    emitExpertsPersistenceStatus('error');
  }
}

export function updateSessionClient(clientId: string, updater: (client: SharedSessionClient) => SharedSessionClient): void {
  const clients = loadSessionClients();
  const existing = clients.find((client) => client.id === clientId);
  if (!existing) return;
  saveSessionClients(clients.map((client) => client.id === clientId ? updater(client) : client));
}

export function loadJournal(): JournalEntry[] {
  return safeParseArray<JournalEntry>(JOURNAL_STORAGE_KEY, []);
}

export function appendJournal(clientId: string, type: string, title: string, body: string): JournalEntry | null {
  if (typeof window === 'undefined' || !body.trim()) return null;
  const entry: JournalEntry = { id: `journal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, clientId, type, title, body: body.trim(), createdAt: new Date().toISOString() };
  try {
    const entries = loadJournal();
    window.localStorage.setItem(storageKey(JOURNAL_STORAGE_KEY), JSON.stringify([entry, ...entries]));
    emitWorkspaceStateChanged();
    return entry;
  } catch (error) {
    console.error('[G-KAIS JOURNAL SAVE ERROR]', error);
    emitExpertsPersistenceStatus('error');
    return null;
  }
}

export function loadSessionSummaries(): SessionSummary[] {
  return safeParseArray<SessionSummary>(SESSION_SUMMARY_STORAGE_KEY, []);
}

export function saveSessionSummary(summary: SessionSummary): SessionSummary[] {
  if (typeof window === 'undefined') return [];
  const current = loadSessionSummaries();
  const next = [summary, ...current.filter((item) => item.id !== summary.id)];
  try {
    window.localStorage.setItem(storageKey(SESSION_SUMMARY_STORAGE_KEY), JSON.stringify(next));
    emitWorkspaceStateChanged();
  } catch (error) {
    console.error('[G-KAIS SESSION SUMMARY SAVE ERROR]', error);
    emitExpertsPersistenceStatus('error');
  }
  return next;
}

function reconcileTask(task: WorkTask, clients: SharedSessionClient[]): WorkTask {
  if (task.deletedAt || !task.sourceCommitmentLabel) return task;
  const client = clients.find((item) => item.id === task.clientId);
  const commitment = client?.commitments?.find((item) => item.label === task.sourceCommitmentLabel);
  if (!commitment) return task;
  if (commitment.status === 'done' && task.status !== 'done') return { ...task, status: 'done', completedAt: task.completedAt || new Date().toISOString() };
  if (commitment.status !== 'done' && task.status === 'done' && task.source === 'attention') return { ...task, status: 'pending', completedAt: undefined };
  return task;
}

export function loadTasks(): WorkTask[] {
  const stored = safeParseArray<WorkTask>(TASK_STORAGE_KEY, []);
  const clients = loadSessionClients();
  const reconciled = stored.map((task) => reconcileTask(task, clients));
  if (typeof window !== 'undefined' && JSON.stringify(reconciled) !== JSON.stringify(stored)) {
    try {
      window.localStorage.setItem(storageKey(TASK_STORAGE_KEY), JSON.stringify(reconciled));
    } catch (error) {
      console.error('[G-KAIS TASK RECONCILE ERROR]', error);
      emitExpertsPersistenceStatus('error');
    }
  }
  return reconciled;
}

function syncClientOperationalState(clientId: string, tasks: WorkTask[]): void {
  if (typeof window === 'undefined' || !clientId) return;
  const open = tasks.filter((task) => task.clientId === clientId && task.status !== 'done' && !task.deletedAt).sort((a, b) => dueTimestamp(a) - dueTimestamp(b));
  const nextAction = taskAsNextAction(open[0]);
  const nextMeeting = open.filter((task) => task.type === 'meeting').sort((a, b) => dueTimestamp(a) - dueTimestamp(b))[0];
  const nextSession = nextMeetingText(nextMeeting);
  const persistence: Promise<void>[] = [];
  try {
    const rawRecords = window.localStorage.getItem(storageKey(CLIENT_RECORD_STORAGE_KEY));
    if (rawRecords) {
      const records = JSON.parse(rawRecords);
      if (Array.isArray(records)) {
        const nextRecords = records.map((record) => record?.id === clientId ? { ...record, nextAction, ...(nextMeeting ? { nextSession } : {}) } : record);
        window.localStorage.setItem(storageKey(CLIENT_RECORD_STORAGE_KEY), JSON.stringify(nextRecords));
        persistence.push(persistExpertClientRecords(nextRecords));
      }
    }
    const sessionClients = loadSessionClients();
    if (sessionClients.some((client) => client.id === clientId)) {
      const nextSessionClients = sessionClients.map((client) => client.id === clientId ? { ...client, nextAction, ...(nextMeeting ? { nextSession } : {}) } : client);
      window.localStorage.setItem(storageKey(SESSION_CLIENT_STORAGE_KEY), JSON.stringify(nextSessionClients));
      persistence.push(persistExpertSessionClients(nextSessionClients));
    }
  } catch (error) {
    console.error('[G-KAIS OPERATIONAL SYNC ERROR]', error);
    emitExpertsPersistenceStatus('error');
  }
  if (persistence.length) reportRemotePersistence(Promise.all(persistence));
  emitWorkspaceStateChanged();
}

export function refreshClientNextAction(clientId: string): void {
  syncClientOperationalState(clientId, loadTasks());
}

export function saveTasks(tasks: WorkTask[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(TASK_STORAGE_KEY), JSON.stringify(tasks));
    emitWorkspaceStateChanged();
  } catch (error) {
    console.error('[G-KAIS TASK SAVE ERROR]', error);
    emitExpertsPersistenceStatus('error');
  }
}

export function addWorkTask(input: Omit<WorkTask, 'id' | 'createdAt' | 'status'> & { status?: WorkTaskStatus }): WorkTask {
  const task: WorkTask = { ...input, id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, createdAt: new Date().toISOString(), status: input.status ?? 'pending' };
  const tasks = [task, ...loadTasks()];
  saveTasks(tasks);
  syncClientOperationalState(task.clientId, tasks);
  return task;
}

export function updateWorkTask(taskId: string, patch: Partial<WorkTask>): WorkTask[] {
  const before = loadTasks();
  const touched = before.find((task) => task.id === taskId);
  const normalizedPatch: Partial<WorkTask> = { ...patch };
  if (patch.status === 'done' && touched?.status !== 'done' && !patch.completedAt) normalizedPatch.completedAt = new Date().toISOString();
  if (patch.status && patch.status !== 'done') normalizedPatch.completedAt = undefined;
  const tasks = before.map((task) => task.id === taskId ? { ...task, ...normalizedPatch } : task);
  saveTasks(tasks);
  if (touched?.clientId) syncClientOperationalState(touched.clientId, tasks);
  return tasks;
}

export function deleteWorkTask(taskId: string): WorkTask[] {
  const before = loadTasks();
  const touched = before.find((task) => task.id === taskId);
  if (!touched) return before;
  const deletedAt = new Date().toISOString();
  const tasks = before.map((task) => task.id === taskId ? { ...task, deletedAt, deletedFromStatus: task.status } : task);
  saveTasks(tasks);
  syncClientOperationalState(touched.clientId, tasks);
  return tasks;
}

export function recoverWorkTask(taskId: string): WorkTask[] {
  const before = loadTasks();
  const touched = before.find((task) => task.id === taskId);
  if (!touched) return before;
  const restoredStatus = touched.deletedFromStatus || 'pending';
  const tasks = before.map((task) => task.id === taskId ? { ...task, status: restoredStatus, deletedAt: undefined, deletedFromStatus: undefined } : task);
  saveTasks(tasks);
  syncClientOperationalState(touched.clientId, tasks);
  return tasks;
}
