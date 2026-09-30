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
import { resolveActiveExpertWorkspaceId } from './expertsWorkspaceCore';

const CLIENT_RECORD_STORAGE_KEY = 'gkais-experts-client-records-v2';
const SESSION_CLIENT_STORAGE_KEY = 'gkais-experts-session-clients-v2';
const WORKSPACE_STATE_EVENT = 'gkais:workspace-state-changed';
const SCHEMA_VERSION = 1;

type ClientLike = Record<string, unknown> & { id: string };
type HydrationResult = 'firestore' | 'migrated' | 'local';
type OutcomeMemory = Record<string, unknown>;

const PILOT_CLIENT_RECORDS: ClientLike[] = [
  {
    id: 'sofia',
    name: 'Sofía Martínez',
    initials: 'SM',
    company: 'Sofía Martínez Consulting',
    businessType: 'Mentoría de negocio',
    email: 'sofia@example.com',
    phone: '+56 9 5555 0101',
    program: 'Mentoría Escala',
    startDate: '12 ago 2026',
    duration: '24 semanas',
    progress: 'Semana 7 / 24',
    status: 'attention',
    nextAction: 'Revisar compromisos antes de la próxima sesión',
    primaryGoal: 'US$15k mensuales',
    currentPhase: 'Adquisición',
    nextSession: 'Martes · 15:30',
    startingPoint: 'Dependencia de referidos y seguimiento comercial irregular.',
    expectedOutcome: 'Crear adquisición predecible y llegar a US$15k/mes.',
    currentGap: 'Funnel activo, pero ejecución inconsistente y volumen insuficiente.',
    planSummary: 'Validar el funnel con suficiente volumen, estabilizar la rutina comercial y aumentar la ejecución semanal antes de cambiar la estrategia.',
    blockers: ['Ejecución inconsistente', 'Dificultad delegando'],
    milestones: [
      { label: 'Oferta redefinida', status: 'done' },
      { label: 'Landing publicada', status: 'done' }
    ],
    commitments: [
      { label: 'Publicar 3 piezas de contenido', status: 'overdue' },
      { label: 'Contactar 25 prospectos', status: 'pending' },
      { label: 'Revisión comercial cada viernes', status: 'done' }
    ]
  },
  {
    id: 'andres',
    name: 'Andrés Silva',
    initials: 'AS',
    company: 'Silva Growth',
    businessType: 'Consultoría comercial',
    email: 'andres@example.com',
    phone: '+56 9 5555 0102',
    program: 'Mentoría Escala',
    startDate: '15 jul 2026',
    duration: '24 semanas',
    progress: 'Semana 11 / 24',
    status: 'active',
    nextAction: 'Sesión hoy 10:00',
    primaryGoal: 'US$20k mensuales',
    currentPhase: 'Conversión',
    nextSession: 'Hoy · 10:00',
    startingPoint: 'Buen volumen de oportunidades, pero cierre comercial inconsistente.',
    expectedOutcome: 'Aumentar la tasa de cierre y estabilizar ingresos mensuales.',
    currentGap: 'El equipo genera reuniones, pero no existe un proceso de venta consistente.',
    planSummary: 'Estandarizar diagnóstico, propuesta y seguimiento antes de aumentar inversión en adquisición.',
    blockers: ['Seguimiento irregular'],
    milestones: [{ label: 'Guion de diagnóstico definido', status: 'done' }],
    commitments: [
      { label: 'Revisar 5 llamadas grabadas', status: 'done' },
      { label: 'Enviar follow-up dentro de 24h', status: 'pending' }
    ]
  },
  {
    id: 'diego',
    name: 'Diego Rojas',
    initials: 'DR',
    company: 'Rojas Advisory',
    businessType: 'Asesoría estratégica',
    email: 'diego@example.com',
    phone: '+56 9 5555 0103',
    program: 'Mentoría Escala',
    startDate: '20 abr 2026',
    duration: '24 semanas',
    progress: 'Semana 22 / 24',
    status: 'renewal',
    nextAction: 'Preparar conversación de renovación',
    primaryGoal: 'Consolidar equipo y delegar delivery',
    currentPhase: 'Renovación',
    nextSession: 'Jueves · 12:00',
    startingPoint: 'El fundador concentraba ventas, delivery y operación.',
    expectedOutcome: 'Delegar operación y mantener crecimiento sin aumentar carga personal.',
    currentGap: 'La delegación mejoró, pero aún existen decisiones críticas concentradas en el fundador.',
    planSummary: 'Cerrar el ciclo actual midiendo avances, identificar el siguiente cuello de botella y decidir si una segunda etapa tiene valor claro.',
    blockers: ['Decisiones centralizadas'],
    milestones: [{ label: 'Responsabilidades del equipo definidas', status: 'done' }],
    commitments: [
      { label: 'Documentar SOP de onboarding', status: 'pending' },
      { label: 'Preparar métricas de cierre del programa', status: 'done' }
    ]
  }
];

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

function clearOwnerOnlyClientCache(): void {
  writeLocalArray(CLIENT_RECORD_STORAGE_KEY, []);
  writeLocalArray(SESSION_CLIENT_STORAGE_KEY, []);
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

function defined(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '';
}

function buildOutcomeMemory(record?: ClientLike, session?: ClientLike): OutcomeMemory {
  const memory: OutcomeMemory = {
    startingPoint: record?.startingPoint,
    expectedOutcome: session?.goal ?? record?.expectedOutcome,
    primaryGoal: record?.primaryGoal,
    currentPhase: session?.currentPhase ?? record?.currentPhase,
    currentGap: session?.currentGap ?? record?.currentGap,
    planSummary: session?.planSummary ?? record?.planSummary,
    blockers: session?.blockers ?? record?.blockers,
    milestones: record?.milestones,
    commitments: session?.commitments ?? record?.commitments,
    nextAction: session?.nextAction ?? record?.nextAction,
    nextSession: session?.nextSession ?? record?.nextSession,
    progress: session?.week ?? record?.progress
  };
  return sanitizeForFirestore(Object.fromEntries(Object.entries(memory).filter(([, value]) => defined(value))));
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
  if (!workspaceId || workspaceId !== user.uid) {
    clearOwnerOnlyClientCache();
    return null;
  }
  return workspaceId;
}

function clientsCollection(workspaceId: string) {
  return collection(firestoreDb, 'expert_workspaces', workspaceId, 'clients');
}

function clientDocument(workspaceId: string, clientId: string) {
  return doc(firestoreDb, 'expert_workspaces', workspaceId, 'clients', clientId);
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
  const workspaceId = await ownerWorkspaceId(user);
  if (!workspaceId) {
    emitWorkspaceRefresh();
    return 'local';
  }

  try {
    const snapshot = await getDocs(clientsCollection(workspaceId));
    const storedRecords = readLocalArray<ClientLike>(CLIENT_RECORD_STORAGE_KEY);
    const localSessions = readLocalArray<ClientLike>(SESSION_CLIENT_STORAGE_KEY);

    if (snapshot.empty) {
      const localRecords = storedRecords.length ? storedRecords : PILOT_CLIENT_RECORDS;
      if (!storedRecords.length) writeLocalArray(CLIENT_RECORD_STORAGE_KEY, localRecords);

      const ids = Array.from(new Set([
        ...localRecords.map((item) => item.id),
        ...localSessions.map((item) => item.id)
      ].filter(Boolean)));

      if (!ids.length) return 'local';

      const batch = writeBatch(firestoreDb);
      ids.forEach((clientId) => {
        const record = localRecords.find((item) => item.id === clientId);
        const session = localSessions.find((item) => item.id === clientId);
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
      emitWorkspaceRefresh();
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
  const workspaceId = await ownerWorkspaceId(user);
  if (!workspaceId) return;
  const session = localSessionClient(record.id);
  try {
    await setDoc(clientDocument(workspaceId, record.id), {
      schemaVersion: SCHEMA_VERSION,
      record: sanitizeForFirestore(record),
      outcomeMemory: buildOutcomeMemory(record, session),
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch {}
}

export async function persistExpertClientRecords(records: ClientLike[]): Promise<void> {
  const valid = records.filter((item) => item?.id);
  if (!valid.length) return;
  const user = await restoredUser();
  if (!user) return;
  const workspaceId = await ownerWorkspaceId(user);
  if (!workspaceId) return;
  const sessions = readLocalArray<ClientLike>(SESSION_CLIENT_STORAGE_KEY);
  try {
    const batch = writeBatch(firestoreDb);
    valid.forEach((record) => {
      const session = sessions.find((item) => item.id === record.id);
      batch.set(clientDocument(workspaceId, record.id), {
        schemaVersion: SCHEMA_VERSION,
        record: sanitizeForFirestore(record),
        outcomeMemory: buildOutcomeMemory(record, session),
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
  const workspaceId = await ownerWorkspaceId(user);
  if (!workspaceId) return;
  const record = localClientRecord(session.id);
  try {
    await setDoc(clientDocument(workspaceId, session.id), {
      schemaVersion: SCHEMA_VERSION,
      session: sanitizeForFirestore(session),
      outcomeMemory: buildOutcomeMemory(record, session),
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch {}
}

export async function persistExpertSessionClients(sessions: ClientLike[]): Promise<void> {
  const valid = sessions.filter((item) => item?.id);
  if (!valid.length) return;
  const user = await restoredUser();
  if (!user) return;
  const workspaceId = await ownerWorkspaceId(user);
  if (!workspaceId) return;
  const records = readLocalArray<ClientLike>(CLIENT_RECORD_STORAGE_KEY);
  try {
    const batch = writeBatch(firestoreDb);
    valid.forEach((session) => {
      const record = records.find((item) => item.id === session.id);
      batch.set(clientDocument(workspaceId, session.id), {
        schemaVersion: SCHEMA_VERSION,
        session: sanitizeForFirestore(session),
        outcomeMemory: buildOutcomeMemory(record, session),
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
  if (!record && !session) return;
  const user = await restoredUser();
  if (!user) return;
  const workspaceId = await ownerWorkspaceId(user);
  if (!workspaceId) return;
  try {
    await setDoc(clientDocument(workspaceId, clientId), {
      schemaVersion: SCHEMA_VERSION,
      ...(record ? { record: sanitizeForFirestore(record) } : {}),
      ...(session ? { session: sanitizeForFirestore(session) } : {}),
      outcomeMemory: buildOutcomeMemory(record, session),
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch {}
}
