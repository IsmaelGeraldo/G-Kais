import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  type DocumentReference
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

async function commitDeletes(refs: DocumentReference[]) {
  const unique = Array.from(new Map(refs.map((ref) => [ref.path, ref])).values());
  for (let index = 0; index < unique.length; index += 400) {
    const batch = writeBatch(firestoreDb);
    unique.slice(index, index + 400).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
}

async function cohortMemoryRefs(workspace: string, cohortId: string) {
  const snapshot = await getDocs(query(
    workspaceCollection(workspace, 'work_tasks'),
    where('task.cohortId', '==', cohortId)
  ));
  return snapshot.docs.map((item) => item.ref);
}

export async function deleteCohortCascade(cohortId: string): Promise<{ enrollmentCount: number }> {
  const workspace = await workspaceId();
  const [enrollmentSnapshot, memoryRefs] = await Promise.all([
    getDocs(query(workspaceCollection(workspace, 'enrollments'), where('cohortId', '==', cohortId))),
    cohortMemoryRefs(workspace, cohortId)
  ]);
  await commitDeletes([
    ...enrollmentSnapshot.docs.map((item) => item.ref),
    ...memoryRefs,
    workspaceDocument(workspace, 'cohorts', cohortId)
  ]);
  await appendExpertAuditLog({
    entityType: 'cohort',
    entityId: cohortId,
    action: 'cohort.deleted',
    changes: { enrollmentCount: enrollmentSnapshot.size }
  }).catch((error) => console.error('[G-KAIS COHORT DELETE AUDIT]', error));
  return { enrollmentCount: enrollmentSnapshot.size };
}

export async function deleteFormationCascade(formationId: string): Promise<{ cohortCount: number; enrollmentCount: number }> {
  const workspace = await workspaceId();
  const [cohortSnapshot, enrollmentSnapshot, formationMemorySnapshot] = await Promise.all([
    getDocs(query(workspaceCollection(workspace, 'cohorts'), where('formationId', '==', formationId))),
    getDocs(query(workspaceCollection(workspace, 'enrollments'), where('formationId', '==', formationId))),
    getDocs(query(workspaceCollection(workspace, 'work_tasks'), where('task.formationId', '==', formationId)))
  ]);

  const refs = [
    ...enrollmentSnapshot.docs.map((item) => item.ref),
    ...formationMemorySnapshot.docs.map((item) => item.ref),
    ...cohortSnapshot.docs.map((item) => item.ref),
    workspaceDocument(workspace, 'work_tasks', `formation-meta-${formationId}`),
    workspaceDocument(workspace, 'formations', formationId)
  ];
  await commitDeletes(refs);
  await appendExpertAuditLog({
    entityType: 'formation',
    entityId: formationId,
    action: 'formation.deleted',
    changes: { cohortCount: cohortSnapshot.size, enrollmentCount: enrollmentSnapshot.size }
  }).catch((error) => console.error('[G-KAIS FORMATION DELETE AUDIT]', error));
  return { cohortCount: cohortSnapshot.size, enrollmentCount: enrollmentSnapshot.size };
}

/** Compatibility wrappers retained for older callers. */
export async function deleteEmptyFormation(formationId: string): Promise<void> {
  const workspace = await workspaceId();
  const enrollmentSnapshot = await getDocs(query(workspaceCollection(workspace, 'enrollments'), where('formationId', '==', formationId)));
  if (!enrollmentSnapshot.empty) throw new Error('FORMATION_HAS_ENROLLMENTS');
  await deleteFormationCascade(formationId);
}

export async function deleteEmptyCohort(cohortId: string): Promise<void> {
  const workspace = await workspaceId();
  const enrollmentSnapshot = await getDocs(query(workspaceCollection(workspace, 'enrollments'), where('cohortId', '==', cohortId)));
  if (!enrollmentSnapshot.empty) throw new Error('COHORT_HAS_ENROLLMENTS');
  await deleteCohortCascade(cohortId);
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
