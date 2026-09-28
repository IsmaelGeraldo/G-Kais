export type WorkActionType = 'email' | 'call' | 'meeting' | 'task';
export type WorkTaskStatus = 'pending' | 'in-progress' | 'done';

export type WorkTask = {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  type: WorkActionType;
  note: string;
  dueDate: string;
  dueTime: string;
  assignee: string;
  status: WorkTaskStatus;
  createdAt: string;
  source?: 'attention' | 'session' | 'manual';
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
  company?: string;
  program?: string;
  week?: string;
  goal?: string;
  nextAction?: string;
  nextSession?: string;
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

export const SESSION_CLIENT_STORAGE_KEY = 'gkais-experts-session-clients-v2';
export const JOURNAL_STORAGE_KEY = 'gkais-experts-client-journal-v1';
export const TASK_STORAGE_KEY = 'gkais-experts-work-tasks-v1';
export const WORKSPACE_STATE_EVENT = 'gkais:workspace-state-changed';
const CLIENT_RECORD_STORAGE_KEY = 'gkais-experts-client-records-v2';

const INITIAL_TASKS: WorkTask[] = [
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

function safeParseArray<T>(key: string, fallback: T[]): T[] {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as T[] : fallback;
  } catch {
    return fallback;
  }
}

function fallbackCopilot() {
  return {
    summary: 'Revisa el contexto del cliente, los compromisos y la última bitácora antes de la sesión.',
    gap: 'Confirmar qué cambió desde la última conversación y cuál es la brecha actual.',
    known: ['Existe una relación activa en G-KAIS.'],
    risks: ['La preparación puede estar incompleta hasta revisar la información más reciente.'],
    questions: [
      '¿Qué cambió desde la última conversación?',
      '¿Qué bloqueó el avance?',
      '¿Cuál debería ser la próxima acción concreta?'
    ],
    howHelp: ['Convertir la conversación en una decisión y una próxima acción visible.'],
    plan: ['Revisar contexto.', 'Aclarar bloqueadores.', 'Cerrar con próxima acción.'],
    callOpening: 'Quiero partir conectando lo que acordamos con lo que realmente ocurrió desde la última conversación.'
  };
}

export function emitWorkspaceStateChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(WORKSPACE_STATE_EVENT));
}

export function loadSessionClients(): SharedSessionClient[] {
  return safeParseArray<SharedSessionClient>(SESSION_CLIENT_STORAGE_KEY, []);
}

function syncClientRecordsFromSession(clients: SharedSessionClient[]): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(CLIENT_RECORD_STORAGE_KEY);
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
      const derivedStatus = currentStatus === 'attention' && live.commitments && overdueCount === 0
        ? 'active'
        : currentStatus;
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
        blockers: live.blockers ?? typed.blockers,
        commitments: live.commitments?.map((item) => ({ label: item.label, status: item.status })) ?? typed.commitments,
        status: derivedStatus,
        attentionReason: derivedAttentionReason
      };
    });

    window.localStorage.setItem(CLIENT_RECORD_STORAGE_KEY, JSON.stringify(nextRecords));
  } catch {}
}

export function saveSessionClients(clients: SharedSessionClient[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SESSION_CLIENT_STORAGE_KEY, JSON.stringify(clients));
    syncClientRecordsFromSession(clients);
    emitWorkspaceStateChanged();
  } catch {}
}

export function updateSessionClient(
  clientId: string,
  updater: (client: SharedSessionClient) => SharedSessionClient
): void {
  const clients = loadSessionClients();
  const existing = clients.find((client) => client.id === clientId);

  if (existing) {
    saveSessionClients(clients.map((client) => client.id === clientId ? updater(client) : client));
    return;
  }

  const seed: SharedSessionClient = {
    id: clientId,
    name: clientId,
    company: '',
    program: '',
    week: '',
    goal: '',
    nextAction: '',
    nextSession: '',
    blockers: [],
    commitments: [],
    copilot: fallbackCopilot()
  };
  saveSessionClients([...clients, updater(seed)]);
}

export function loadJournal(): JournalEntry[] {
  return safeParseArray<JournalEntry>(JOURNAL_STORAGE_KEY, []);
}

export function appendJournal(
  clientId: string,
  type: string,
  title: string,
  body: string
): JournalEntry | null {
  if (typeof window === 'undefined' || !body.trim()) return null;
  const entry: JournalEntry = {
    id: `journal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    clientId,
    type,
    title,
    body: body.trim(),
    createdAt: new Date().toISOString()
  };
  try {
    const entries = loadJournal();
    window.localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify([entry, ...entries]));
    emitWorkspaceStateChanged();
    return entry;
  } catch {
    return null;
  }
}

function reconcileTask(task: WorkTask, clients: SharedSessionClient[]): WorkTask {
  if (!task.sourceCommitmentLabel) return task;
  const client = clients.find((item) => item.id === task.clientId);
  const commitment = client?.commitments?.find((item) => item.label === task.sourceCommitmentLabel);
  if (!commitment) return task;
  if (commitment.status === 'done' && task.status !== 'done') return { ...task, status: 'done' };
  if (commitment.status !== 'done' && task.status === 'done' && task.source === 'attention') return { ...task, status: 'pending' };
  return task;
}

export function loadTasks(): WorkTask[] {
  const stored = safeParseArray<WorkTask>(TASK_STORAGE_KEY, INITIAL_TASKS);
  const clients = loadSessionClients();
  const reconciled = stored.map((task) => reconcileTask(task, clients));
  if (typeof window !== 'undefined' && JSON.stringify(reconciled) !== JSON.stringify(stored)) {
    try { window.localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(reconciled)); } catch {}
  }
  return reconciled;
}

export function saveTasks(tasks: WorkTask[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(tasks));
    emitWorkspaceStateChanged();
  } catch {}
}

export function addWorkTask(input: Omit<WorkTask, 'id' | 'createdAt' | 'status'> & { status?: WorkTaskStatus }): WorkTask {
  const task: WorkTask = {
    ...input,
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    status: input.status ?? 'pending'
  };
  saveTasks([task, ...loadTasks()]);
  return task;
}

export function updateWorkTask(taskId: string, patch: Partial<WorkTask>): WorkTask[] {
  const tasks = loadTasks().map((task) => task.id === taskId ? { ...task, ...patch } : task);
  saveTasks(tasks);
  return tasks;
}
