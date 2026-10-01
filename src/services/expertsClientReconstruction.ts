import { onAuthStateChanged, type User } from 'firebase/auth';
import { firebaseAuth } from '../lib/firebase';
import {
  hydrateExpertsClientMemory,
  persistExpertSessionClients
} from './expertsClientMemory';

const CLIENT_RECORD_STORAGE_KEY = 'gkais-experts-client-records-v2';
const SESSION_CLIENT_STORAGE_KEY = 'gkais-experts-session-clients-v2';
const WORKSPACE_STATE_EVENT = 'gkais:workspace-state-changed';

type ClientLike = Record<string, unknown> & { id: string };

type CommitmentLike = {
  id?: string;
  label?: string;
  status?: 'pending' | 'done' | 'overdue';
};

type SessionCommitment = {
  id: string;
  label: string;
  status: 'pending' | 'done' | 'overdue';
};

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

function genericCopilot() {
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

function commitmentList(record: ClientLike): SessionCommitment[] {
  const raw = Array.isArray(record.commitments) ? record.commitments as CommitmentLike[] : [];
  return raw
    .map((item, index): SessionCommitment => ({
      id: typeof item.id === 'string' && item.id ? item.id : `${record.id}-commitment-${index}`,
      label: typeof item.label === 'string' ? item.label : '',
      status: item.status === 'done' || item.status === 'overdue' ? item.status : 'pending'
    }))
    .filter((item) => item.label);
}

function sessionFromRecord(record: ClientLike): ClientLike {
  return {
    id: record.id,
    name: typeof record.name === 'string' ? record.name : record.id,
    company: typeof record.company === 'string' ? record.company : '',
    program: typeof record.program === 'string' ? record.program : '',
    week: typeof record.progress === 'string' ? record.progress : '',
    goal: typeof record.expectedOutcome === 'string' ? record.expectedOutcome : '',
    nextAction: typeof record.nextAction === 'string' ? record.nextAction : '',
    nextSession: typeof record.nextSession === 'string' ? record.nextSession : '',
    currentPhase: typeof record.currentPhase === 'string' ? record.currentPhase : '',
    currentGap: typeof record.currentGap === 'string' ? record.currentGap : '',
    planSummary: typeof record.planSummary === 'string' ? record.planSummary : '',
    blockers: Array.isArray(record.blockers) ? record.blockers : [],
    commitments: commitmentList(record),
    copilot: genericCopilot()
  };
}

async function ensureSessionCoverage(): Promise<void> {
  if (typeof window === 'undefined') return;
  const records = readLocalArray<ClientLike>(CLIENT_RECORD_STORAGE_KEY).filter((item) => item?.id);
  if (!records.length) return;

  const sessions = readLocalArray<ClientLike>(SESSION_CLIENT_STORAGE_KEY).filter((item) => item?.id);
  const existingIds = new Set(sessions.map((item) => item.id));
  const missing = records.filter((record) => !existingIds.has(record.id)).map(sessionFromRecord);
  if (!missing.length) return;

  const next = [...sessions, ...missing];
  writeLocalArray(SESSION_CLIENT_STORAGE_KEY, next);
  await persistExpertSessionClients(next);
  window.dispatchEvent(new CustomEvent(WORKSPACE_STATE_EVENT));
}

async function reconstructForUser(user: User): Promise<void> {
  await hydrateExpertsClientMemory();
  if (firebaseAuth.currentUser?.uid !== user.uid) return;
  await ensureSessionCoverage();
}

if (typeof window !== 'undefined') {
  let hydratedUid = '';

  onAuthStateChanged(firebaseAuth, (user) => {
    if (!user) {
      hydratedUid = '';
      return;
    }
    if (hydratedUid === user.uid) return;
    hydratedUid = user.uid;
    void reconstructForUser(user);
  });
}
