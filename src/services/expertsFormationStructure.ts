import { doc, onSnapshot, serverTimestamp, setDoc, type Unsubscribe } from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../lib/firebase';
import { resolveActiveExpertWorkspaceId } from './expertsWorkspaceCore';

export type FormationStructure = {
  learning: string;
  expectedOutcome: string;
  /** Compatibility with the previous single-description model. */
  description: string;
};

export type CohortStructure = {
  classesPerWeek: number;
  classDays: number[];
};

const EMPTY_FORMATION: FormationStructure = { learning: '', expectedOutcome: '', description: '' };
const EMPTY_COHORT: CohortStructure = { classesPerWeek: 1, classDays: [] };

async function workspaceId(): Promise<string> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('AUTH_REQUIRED');
  const id = await resolveActiveExpertWorkspaceId(user);
  if (!id) throw new Error('WORKSPACE_REQUIRED');
  return id;
}

function taskDocument(workspace: string, id: string) {
  return doc(firestoreDb, 'expert_workspaces', workspace, 'work_tasks', id);
}

function formationMetaId(formationId: string) {
  return `formation-meta-${formationId}`;
}

function cohortMetaId(cohortId: string) {
  return `cohort-meta-${cohortId}`;
}

export async function subscribeFormationStructure(
  formationId: string,
  callback: (value: FormationStructure) => void
): Promise<Unsubscribe> {
  const workspace = await workspaceId();
  return onSnapshot(taskDocument(workspace, formationMetaId(formationId)), (snapshot) => {
    if (!snapshot.exists()) return callback(EMPTY_FORMATION);
    const task = snapshot.data().task as Record<string, unknown> | undefined;
    const legacyDescription = typeof task?.description === 'string' ? task.description : '';
    const learning = typeof task?.learning === 'string' ? task.learning : legacyDescription;
    const expectedOutcome = typeof task?.expectedOutcome === 'string' ? task.expectedOutcome : '';
    callback({ learning, expectedOutcome, description: legacyDescription || learning });
  }, () => callback(EMPTY_FORMATION));
}

export async function saveFormationStructure(input: {
  formationId: string;
  formationTitle: string;
  learning?: string;
  expectedOutcome?: string;
  /** Compatibility with Stage 4.5D callers. */
  description?: string;
}): Promise<void> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('AUTH_REQUIRED');
  const workspace = await workspaceId();
  const id = formationMetaId(input.formationId);
  const now = new Date().toISOString();
  const learning = (input.learning ?? input.description ?? '').trim();
  const expectedOutcome = (input.expectedOutcome ?? '').trim();
  await setDoc(taskDocument(workspace, id), {
    schemaVersion: 1,
    task: {
      id,
      clientId: '',
      clientName: input.formationTitle,
      personId: '',
      title: `Estructura · ${input.formationTitle}`,
      type: 'task',
      note: [learning, expectedOutcome].filter(Boolean).join('\n\n'),
      dueDate: '',
      dueTime: '',
      assignee: 'Formación',
      assignedToUid: user.uid,
      assignedToName: user.displayName || user.email || 'Mentor',
      createdByUid: user.uid,
      status: 'done',
      createdAt: now,
      completedAt: now,
      source: 'formation',
      sourceId: input.formationId,
      sourceActionKind: 'formation-meta',
      workstream: 'formation-meta',
      description: learning,
      learning,
      expectedOutcome,
      confirmationEmail: 'not-required'
    },
    updatedAt: serverTimestamp()
  }, { merge: true });
}

export async function subscribeCohortStructure(
  cohortId: string,
  callback: (value: CohortStructure) => void
): Promise<Unsubscribe> {
  const workspace = await workspaceId();
  return onSnapshot(taskDocument(workspace, cohortMetaId(cohortId)), (snapshot) => {
    if (!snapshot.exists()) return callback(EMPTY_COHORT);
    const task = snapshot.data().task as Record<string, unknown> | undefined;
    const classDays = Array.isArray(task?.classDays)
      ? task.classDays.filter((value): value is number => typeof value === 'number' && value >= 0 && value <= 6)
      : [];
    const classesPerWeek = typeof task?.classesPerWeek === 'number'
      ? Math.max(1, Math.min(7, Math.round(task.classesPerWeek)))
      : Math.max(1, classDays.length || 1);
    callback({ classesPerWeek, classDays });
  }, () => callback(EMPTY_COHORT));
}

export async function saveCohortStructure(input: {
  formationId: string;
  cohortId: string;
  cohortTitle: string;
  classesPerWeek: number;
  classDays: number[];
}): Promise<void> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('AUTH_REQUIRED');
  const workspace = await workspaceId();
  const id = cohortMetaId(input.cohortId);
  const now = new Date().toISOString();
  const classDays = Array.from(new Set(input.classDays))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6)
    .sort((a, b) => a - b);
  const classesPerWeek = Math.max(1, Math.min(7, Math.round(input.classesPerWeek || classDays.length || 1)));
  await setDoc(taskDocument(workspace, id), {
    schemaVersion: 1,
    task: {
      id,
      clientId: '',
      clientName: input.cohortTitle,
      personId: '',
      title: `Estructura de cohorte · ${input.cohortTitle}`,
      type: 'task',
      note: '',
      dueDate: '',
      dueTime: '',
      assignee: 'Formación',
      assignedToUid: user.uid,
      assignedToName: user.displayName || user.email || 'Mentor',
      createdByUid: user.uid,
      status: 'done',
      createdAt: now,
      completedAt: now,
      source: 'formation',
      sourceId: input.cohortId,
      sourceActionKind: 'cohort-meta',
      workstream: 'formation-meta',
      formationId: input.formationId,
      cohortId: input.cohortId,
      classesPerWeek,
      classDays,
      confirmationEmail: 'not-required'
    },
    updatedAt: serverTimestamp()
  }, { merge: true });
}
