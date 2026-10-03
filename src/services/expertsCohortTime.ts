import { collection, doc, onSnapshot, serverTimestamp, setDoc, updateDoc, type Unsubscribe } from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../lib/firebase';
import { resolveActiveExpertWorkspaceId } from './expertsWorkspaceCore';

async function workspaceId(): Promise<string> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('AUTH_REQUIRED');
  const id = await resolveActiveExpertWorkspaceId(user);
  if (!id) throw new Error('WORKSPACE_REQUIRED');
  return id;
}

export async function subscribeCohortClassTimes(callback: (values: Record<string, string>) => void): Promise<Unsubscribe> {
  const workspace = await workspaceId();
  return onSnapshot(collection(firestoreDb, 'expert_workspaces', workspace, 'work_tasks'), (snapshot) => {
    const values: Record<string, string> = {};
    snapshot.docs.forEach((item) => {
      const data = item.data() as Record<string, unknown>;
      const task = data.task && typeof data.task === 'object' ? data.task as Record<string, unknown> : {};
      if (task.sourceActionKind !== 'cohort-meta') return;
      const cohortId = typeof task.cohortId === 'string' ? task.cohortId : '';
      if (!cohortId) return;
      values[cohortId] = typeof task.classTime === 'string' ? task.classTime : '';
    });
    callback(values);
  }, () => callback({}));
}

export async function saveCohortClassTime(input: { cohortId: string; time: string }): Promise<void> {
  const workspace = await workspaceId();
  const id = `cohort-meta-${input.cohortId}`;
  const ref = doc(firestoreDb, 'expert_workspaces', workspace, 'work_tasks', id);
  try {
    await updateDoc(ref, { 'task.classTime': input.time, updatedAt: serverTimestamp() });
  } catch {
    const user = firebaseAuth.currentUser;
    if (!user) throw new Error('AUTH_REQUIRED');
    const now = new Date().toISOString();
    await setDoc(ref, {
      schemaVersion: 1,
      task: {
        id,
        clientId: '',
        clientName: 'Cohorte',
        personId: '',
        title: 'Horario de cohorte',
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
        cohortId: input.cohortId,
        classTime: input.time,
        confirmationEmail: 'not-required'
      },
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
}
