import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../lib/firebase';
import { upsertExpertPerson } from './expertsRelationshipFoundation';
import { enrollExpertPerson } from './expertsFormations';
import { appendExpertAuditLog, resolveActiveExpertWorkspaceId } from './expertsWorkspaceCore';

async function workspaceId(): Promise<string> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('AUTH_REQUIRED');
  const id = await resolveActiveExpertWorkspaceId(user);
  if (!id) throw new Error('WORKSPACE_REQUIRED');
  return id;
}

function workspaceCollection(workspaceId: string, name: string) {
  return collection(firestoreDb, 'expert_workspaces', workspaceId, name);
}

function workspaceDocument(workspaceId: string, collectionName: string, id: string) {
  return doc(firestoreDb, 'expert_workspaces', workspaceId, collectionName, id);
}

async function deleteCohortMemory(workspace: string, cohortId: string) {
  const planSnapshot = await getDocs(query(
    workspaceCollection(workspace, 'work_tasks'),
    where('task.cohortId', '==', cohortId)
  ));
  await Promise.all([
    ...planSnapshot.docs.map((item) => deleteDoc(item.ref)),
    deleteDoc(workspaceDocument(workspace, 'work_tasks', `cohort-meta-${cohortId}`)).catch(() => {})
  ]);
}

export async function deleteEmptyFormation(formationId: string): Promise<void> {
  const workspace = await workspaceId();
  const enrollmentSnapshot = await getDocs(query(workspaceCollection(workspace, 'enrollments'), where('formationId', '==', formationId)));
  if (!enrollmentSnapshot.empty) throw new Error('FORMATION_HAS_ENROLLMENTS');

  const cohortSnapshot = await getDocs(query(workspaceCollection(workspace, 'cohorts'), where('formationId', '==', formationId)));
  await Promise.all(cohortSnapshot.docs.map(async (item) => {
    await deleteCohortMemory(workspace, item.id);
    await deleteDoc(item.ref);
  }));
  await deleteDoc(workspaceDocument(workspace, 'work_tasks', `formation-meta-${formationId}`)).catch(() => {});
  await deleteDoc(workspaceDocument(workspace, 'formations', formationId));
  await appendExpertAuditLog({
    entityType: 'formation',
    entityId: formationId,
    action: 'formation.deleted',
    changes: { deletedCohortCount: cohortSnapshot.size }
  }).catch((error) => console.error('[G-KAIS FORMATION DELETE AUDIT]', error));
}

export async function deleteEmptyCohort(cohortId: string): Promise<void> {
  const workspace = await workspaceId();
  const enrollmentSnapshot = await getDocs(query(workspaceCollection(workspace, 'enrollments'), where('cohortId', '==', cohortId)));
  if (!enrollmentSnapshot.empty) throw new Error('COHORT_HAS_ENROLLMENTS');
  await deleteCohortMemory(workspace, cohortId);
  await deleteDoc(workspaceDocument(workspace, 'cohorts', cohortId));
  await appendExpertAuditLog({
    entityType: 'cohort',
    entityId: cohortId,
    action: 'cohort.deleted',
    changes: {}
  }).catch((error) => console.error('[G-KAIS COHORT DELETE AUDIT]', error));
}

export async function createBuyerAndEnroll(input: {
  name: string;
  email?: string;
  phone?: string;
  source?: string;
  formationId: string;
  cohortId: string;
  progress?: number;
}): Promise<{ personId: string; enrollmentId: string }> {
  const person = await upsertExpertPerson({
    name: input.name,
    email: input.email,
    phone: input.phone,
    source: input.source?.trim() || 'formation-direct-sale',
    stage: 'student',
    outcomeMemory: {
      acquisitionPath: input.source?.trim() || 'formation-direct-sale',
      purchasedOutsideWebinar: true
    }
  });
  const enrollmentId = await enrollExpertPerson({
    personId: person.personId,
    formationId: input.formationId,
    cohortId: input.cohortId,
    status: 'active',
    progress: input.progress || 0
  });
  return { personId: person.personId, enrollmentId };
}
