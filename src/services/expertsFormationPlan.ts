import { collection, deleteDoc, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, where, type Unsubscribe } from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../lib/firebase';
import { appendExpertAuditLog, resolveActiveExpertWorkspaceId } from './expertsWorkspaceCore';

export type FormationPlanClass = {
  id: string;
  formationId: string;
  cohortId: string;
  classNumber: number;
  /** Compatibility with the Stage 4.5C plan model. */
  dayNumber: number;
  title: string;
  teachingItems: string[];
  date: string;
  mentorNotes: string;
  faq: string;
  status: 'pending' | 'done';
  createdAt: string;
  updatedAt?: string;
};

export type FormationPlanDay = FormationPlanClass;

async function workspaceId() {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('AUTH_REQUIRED');
  const id = await resolveActiveExpertWorkspaceId(user);
  if (!id) throw new Error('WORKSPACE_REQUIRED');
  return id;
}

function mapClass(id: string, data: Record<string, unknown>): FormationPlanClass {
  const task = (data.task && typeof data.task === 'object' ? data.task : {}) as Record<string, unknown>;
  const classNumber = typeof task.classNumber === 'number'
    ? task.classNumber
    : typeof task.dayNumber === 'number' ? task.dayNumber : 0;
  const planStatus = task.planStatus === 'done' || task.planStatus === 'pending'
    ? task.planStatus
    : task.status === 'done' ? 'done' : 'pending';
  return {
    id,
    formationId: typeof task.formationId === 'string' ? task.formationId : '',
    cohortId: typeof task.cohortId === 'string' ? task.cohortId : '',
    classNumber,
    dayNumber: classNumber,
    title: typeof task.planTitle === 'string' ? task.planTitle : (typeof task.title === 'string' ? task.title : ''),
    teachingItems: Array.isArray(task.teachingItems)
      ? task.teachingItems.filter((value): value is string => typeof value === 'string')
      : [],
    date: typeof task.dueDate === 'string' ? task.dueDate : '',
    mentorNotes: typeof task.mentorNotes === 'string' ? task.mentorNotes : '',
    faq: typeof task.faq === 'string' ? task.faq : '',
    status: planStatus,
    createdAt: typeof task.createdAt === 'string' ? task.createdAt : '',
    updatedAt: typeof task.updatedAt === 'string' ? task.updatedAt : undefined
  };
}

export async function subscribeFormationPlan(
  cohortId: string,
  callback: (items: FormationPlanClass[]) => void
): Promise<Unsubscribe> {
  const workspace = await workspaceId();
  const planQuery = query(
    collection(firestoreDb, 'expert_workspaces', workspace, 'work_tasks'),
    where('task.workstream', '==', 'formation-plan')
  );
  return onSnapshot(planQuery, (snapshot) => {
    callback(snapshot.docs
      .map((item) => mapClass(item.id, item.data() as Record<string, unknown>))
      .filter((item) => item.cohortId === cohortId)
      .sort((a, b) => a.classNumber - b.classNumber || a.date.localeCompare(b.date)));
  }, () => callback([]));
}

export async function saveFormationPlanClass(input: {
  id?: string;
  formationId: string;
  cohortId: string;
  cohortTitle: string;
  classNumber: number;
  title: string;
  teachingItems: string[];
  date?: string;
  mentorNotes?: string;
  faq?: string;
  status?: 'pending' | 'done';
}): Promise<string> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('AUTH_REQUIRED');
  const workspace = await workspaceId();
  const classNumber = Math.max(1, Math.round(input.classNumber));
  const id = input.id || `formation-plan-${input.cohortId}-${classNumber}`;
  const ref = doc(firestoreDb, 'expert_workspaces', workspace, 'work_tasks', id);
  const previous = await getDoc(ref);
  const previousTask = previous.exists() && previous.data().task && typeof previous.data().task === 'object'
    ? previous.data().task as Record<string, unknown>
    : {};
  const now = new Date().toISOString();
  const planTitle = input.title.trim() || `Clase ${classNumber}`;
  await setDoc(ref, {
    schemaVersion: 1,
    task: {
      ...previousTask,
      id,
      clientId: '',
      clientName: input.cohortTitle,
      personId: '',
      title: `Clase ${classNumber} · ${planTitle}`,
      type: 'task',
      note: input.teachingItems.join('\n'),
      dueDate: input.date || '',
      dueTime: '',
      assignee: 'Formación',
      assignedToUid: user.uid,
      assignedToName: user.displayName || user.email || 'Mentor',
      createdByUid: typeof previousTask.createdByUid === 'string' ? previousTask.createdByUid : user.uid,
      // Operational task stays done so class planning never inflates Priority Work/Dashboard metrics.
      status: 'done',
      planStatus: input.status || 'pending',
      completedAt: typeof previousTask.completedAt === 'string' ? previousTask.completedAt : now,
      createdAt: typeof previousTask.createdAt === 'string' ? previousTask.createdAt : now,
      source: 'formation',
      sourceId: input.cohortId,
      sourceActionKind: 'formation-plan',
      workstream: 'formation-plan',
      formationId: input.formationId,
      cohortId: input.cohortId,
      classNumber,
      dayNumber: classNumber,
      planTitle,
      teachingItems: input.teachingItems.map((value) => value.trim()).filter(Boolean),
      mentorNotes: (input.mentorNotes || '').trim(),
      faq: (input.faq || '').trim(),
      updatedAt: now,
      confirmationEmail: 'not-required'
    },
    updatedAt: serverTimestamp()
  }, { merge: true });
  return id;
}

export async function saveFormationPlanDay(input: {
  id?: string;
  formationId: string;
  cohortId: string;
  cohortTitle: string;
  dayNumber: number;
  title: string;
  teachingItems: string[];
  date?: string;
  mentorNotes?: string;
  faq?: string;
  status?: 'pending' | 'done';
}): Promise<string> {
  return saveFormationPlanClass({ ...input, classNumber: input.dayNumber });
}

export async function ensureFormationClassPlan(input: {
  formationId: string;
  cohortId: string;
  cohortTitle: string;
  dates: string[];
}): Promise<void> {
  const workspace = await workspaceId();
  await Promise.all(input.dates.map(async (date, index) => {
    const id = `formation-plan-${input.cohortId}-${index + 1}`;
    const ref = doc(firestoreDb, 'expert_workspaces', workspace, 'work_tasks', id);
    const existing = await getDoc(ref);
    if (existing.exists()) {
      const existingTask = existing.data().task && typeof existing.data().task === 'object'
        ? existing.data().task as Record<string, unknown>
        : {};
      await setDoc(ref, {
        schemaVersion: 1,
        task: {
          ...existingTask,
          dueDate: date,
          classNumber: index + 1,
          dayNumber: index + 1,
          clientName: input.cohortTitle,
          formationId: input.formationId,
          cohortId: input.cohortId,
          status: 'done',
          planStatus: existingTask.planStatus === 'done' ? 'done' : 'pending',
          completedAt: typeof existingTask.completedAt === 'string' ? existingTask.completedAt : new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        updatedAt: serverTimestamp()
      }, { merge: true });
      return;
    }
    await saveFormationPlanClass({
      id,
      formationId: input.formationId,
      cohortId: input.cohortId,
      cohortTitle: input.cohortTitle,
      classNumber: index + 1,
      title: `Clase ${index + 1}`,
      teachingItems: [],
      date,
      mentorNotes: '',
      faq: '',
      status: 'pending'
    });
  }));
}

export async function deleteFormationPlanDay(id: string) {
  const workspace = await workspaceId();
  await deleteDoc(doc(firestoreDb, 'expert_workspaces', workspace, 'work_tasks', id));
}

export async function deleteEnrollmentRecord(enrollmentId: string) {
  const workspace = await workspaceId();
  await deleteDoc(doc(firestoreDb, 'expert_workspaces', workspace, 'enrollments', enrollmentId));
  await appendExpertAuditLog({
    entityType: 'enrollment',
    entityId: enrollmentId,
    action: 'formation.enrollment_deleted',
    changes: {}
  }).catch(() => {});
}
