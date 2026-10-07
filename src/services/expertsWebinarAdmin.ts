import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
  writeBatch
} from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../lib/firebase';
import type { WebinarAttendanceStatus, WebinarInterest } from './expertsAcquisition';
import { recordOperationalBuyerEvent } from './expertsBuyerEvents';
import { appendExpertAuditLog, resolveActiveExpertWorkspaceId } from './expertsWorkspaceCore';

async function workspaceId() {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('AUTH_REQUIRED');
  const id = await resolveActiveExpertWorkspaceId(user);
  if (!id) throw new Error('WORKSPACE_REQUIRED');
  return id;
}

function email(value: string) {
  return value.trim().toLowerCase();
}

function phone(value: string) {
  return value.replace(/\D/g, '');
}

async function assertIdentityAvailable(workspace: string, personId: string, normalizedEmail: string, normalizedPhone: string) {
  const checks: Array<ReturnType<typeof getDocs>> = [];
  if (normalizedEmail) checks.push(getDocs(query(
    collection(firestoreDb, 'expert_workspaces', workspace, 'people'),
    where('normalizedEmail', '==', normalizedEmail)
  )));
  if (normalizedPhone) checks.push(getDocs(query(
    collection(firestoreDb, 'expert_workspaces', workspace, 'people'),
    where('normalizedPhone', '==', normalizedPhone)
  )));
  const results = await Promise.all(checks);
  if (results.some((snapshot) => snapshot.docs.some((item) => item.id !== personId))) throw new Error('IDENTITY_CONFLICT');
}

export async function updateWebinarParticipant(input: {
  registrationId: string;
  personId: string;
  name: string;
  email: string;
  phone: string;
  status: WebinarAttendanceStatus;
  attendanceMinutes: number;
  interest: WebinarInterest;
  purchased: boolean;
}) {
  const workspace = await workspaceId();
  const normalizedEmail = email(input.email);
  const normalizedPhone = phone(input.phone);
  if (!input.name.trim() || (!normalizedEmail && !normalizedPhone)) throw new Error('IDENTITY_REQUIRED');
  await assertIdentityAvailable(workspace, input.personId, normalizedEmail, normalizedPhone);

  const registrationRef = doc(firestoreDb, 'expert_workspaces', workspace, 'webinar_registrations', input.registrationId);
  const personRef = doc(firestoreDb, 'expert_workspaces', workspace, 'people', input.personId);
  const attendanceMinutes = Math.max(0, Math.min(10000, Math.round(input.attendanceMinutes || 0)));

  const previous = await runTransaction(firestoreDb, async (transaction) => {
    const [registrationSnapshot, personSnapshot] = await Promise.all([
      transaction.get(registrationRef),
      transaction.get(personRef)
    ]);
    if (!registrationSnapshot.exists()) throw new Error('REGISTRATION_NOT_FOUND');
    if (!personSnapshot.exists()) throw new Error('PERSON_NOT_FOUND');
    const registration = registrationSnapshot.data() as { purchased?: boolean; followUpStatus?: string };
    const followUpStatus = input.purchased
      ? 'not-needed'
      : registration.followUpStatus === 'created' || registration.followUpStatus === 'completed'
        ? registration.followUpStatus
        : input.status === 'attended' || input.status === 'no-show' ? 'needed' : 'not-needed';
    const currentMemory = personSnapshot.data().outcomeMemory && typeof personSnapshot.data().outcomeMemory === 'object'
      ? personSnapshot.data().outcomeMemory as Record<string, unknown>
      : {};

    transaction.update(personRef, {
      name: input.name.trim(),
      email: input.email.trim(),
      phone: input.phone.trim(),
      normalizedEmail,
      normalizedPhone,
      outcomeMemory: {
        ...currentMemory,
        lastWebinarStatus: input.status,
        lastWebinarAttendanceMinutes: attendanceMinutes,
        lastWebinarPurchased: input.purchased,
        lastWebinarInterest: input.interest,
        webinarFollowUpStatus: followUpStatus
      },
      updatedAt: serverTimestamp()
    });
    transaction.update(registrationRef, {
      status: input.status,
      attendanceMinutes,
      interest: input.interest,
      purchased: input.purchased,
      followUpStatus,
      updatedAt: serverTimestamp()
    });
    return { purchased: Boolean(registration.purchased) };
  });

  await appendExpertAuditLog({
    entityType: 'webinar_registration',
    entityId: input.registrationId,
    action: 'webinar.registration_edited',
    changes: {
      personId: input.personId,
      status: input.status,
      attendanceMinutes,
      interest: input.interest,
      purchased: input.purchased,
      purchaseChanged: previous.purchased !== input.purchased
    }
  }).catch(() => {});
  if (input.purchased && !previous.purchased) {
    await recordOperationalBuyerEvent({
      personId: input.personId,
      kind: 'webinar',
      sourceType: 'webinar_registration',
      sourceId: input.registrationId
    }).catch((error) => console.error('[G-KAIS WEBINAR BUYER EVENT]', error));
  }
  return previous;
}

/** Compatibility wrappers retained for older callers. */
export async function updateWebinarParticipantIdentity(personId: string, input: { name: string; email: string; phone: string }) {
  const workspace = await workspaceId();
  const normalizedEmail = email(input.email);
  const normalizedPhone = phone(input.phone);
  if (!input.name.trim() || (!normalizedEmail && !normalizedPhone)) throw new Error('IDENTITY_REQUIRED');
  await assertIdentityAvailable(workspace, personId, normalizedEmail, normalizedPhone);
  await runTransaction(firestoreDb, async (transaction) => {
    const personRef = doc(firestoreDb, 'expert_workspaces', workspace, 'people', personId);
    const snapshot = await transaction.get(personRef);
    if (!snapshot.exists()) throw new Error('PERSON_NOT_FOUND');
    transaction.update(personRef, {
      name: input.name.trim(),
      email: input.email.trim(),
      phone: input.phone.trim(),
      normalizedEmail,
      normalizedPhone,
      updatedAt: serverTimestamp()
    });
  });
}

export async function updateWebinarRegistration(input: {
  registrationId: string;
  personId: string;
  status: WebinarAttendanceStatus;
  attendanceMinutes: number;
  interest: WebinarInterest;
  purchased: boolean;
}) {
  const workspace = await workspaceId();
  const registrationRef = doc(firestoreDb, 'expert_workspaces', workspace, 'webinar_registrations', input.registrationId);
  const personRef = doc(firestoreDb, 'expert_workspaces', workspace, 'people', input.personId);
  const attendanceMinutes = Math.max(0, Math.min(10000, Math.round(input.attendanceMinutes || 0)));
  const previousPurchased = await runTransaction(firestoreDb, async (transaction) => {
    const [registrationSnapshot, personSnapshot] = await Promise.all([
      transaction.get(registrationRef),
      transaction.get(personRef)
    ]);
    if (!registrationSnapshot.exists()) throw new Error('REGISTRATION_NOT_FOUND');
    if (!personSnapshot.exists()) throw new Error('PERSON_NOT_FOUND');
    const previous = registrationSnapshot.data() as { followUpStatus?: string; purchased?: boolean };
    const followUpStatus = input.purchased
      ? 'not-needed'
      : previous.followUpStatus === 'created' || previous.followUpStatus === 'completed'
        ? previous.followUpStatus
        : input.status === 'attended' || input.status === 'no-show' ? 'needed' : 'not-needed';
    const currentMemory = personSnapshot.data().outcomeMemory && typeof personSnapshot.data().outcomeMemory === 'object'
      ? personSnapshot.data().outcomeMemory as Record<string, unknown>
      : {};
    transaction.update(registrationRef, {
      status: input.status,
      attendanceMinutes,
      interest: input.interest,
      purchased: input.purchased,
      followUpStatus,
      updatedAt: serverTimestamp()
    });
    transaction.update(personRef, {
      outcomeMemory: {
        ...currentMemory,
        lastWebinarStatus: input.status,
        lastWebinarAttendanceMinutes: attendanceMinutes,
        lastWebinarPurchased: input.purchased,
        lastWebinarInterest: input.interest,
        webinarFollowUpStatus: followUpStatus
      },
      updatedAt: serverTimestamp()
    });
    return Boolean(previous.purchased);
  });
  if (input.purchased && !previousPurchased) {
    await recordOperationalBuyerEvent({
      personId: input.personId,
      kind: 'webinar',
      sourceType: 'webinar_registration',
      sourceId: input.registrationId
    }).catch((error) => console.error('[G-KAIS WEBINAR BUYER EVENT]', error));
  }
}

export async function deleteWebinarRegistration(registrationId: string) {
  const workspace = await workspaceId();
  const registrationRef = doc(firestoreDb, 'expert_workspaces', workspace, 'webinar_registrations', registrationId);
  const registrationSnapshot = await runTransaction(firestoreDb, async (transaction) => transaction.get(registrationRef));
  if (!registrationSnapshot.exists()) return;
  const followUpTaskId = typeof registrationSnapshot.data().followUpTaskId === 'string' ? registrationSnapshot.data().followUpTaskId : '';

  // The registration itself is the source of truth. A stale follow-up task must not block removal.
  const coreBatch = writeBatch(firestoreDb);
  coreBatch.delete(registrationRef);
  await coreBatch.commit();

  if (followUpTaskId) {
    const taskBatch = writeBatch(firestoreDb);
    taskBatch.delete(doc(firestoreDb, 'expert_workspaces', workspace, 'work_tasks', followUpTaskId));
    await taskBatch.commit().catch((error) => console.error('[G-KAIS WEBINAR PARTICIPANT TASK CLEANUP]', error));
  }

  await appendExpertAuditLog({
    entityType: 'webinar_registration',
    entityId: registrationId,
    action: 'webinar.registration_deleted',
    changes: { followUpTaskId }
  }).catch(() => {});
}

export async function deleteWebinarCascade(webinarId: string) {
  const workspace = await workspaceId();
  const [registrations, tasks] = await Promise.all([
    getDocs(query(
      collection(firestoreDb, 'expert_workspaces', workspace, 'webinar_registrations'),
      where('webinarId', '==', webinarId)
    )),
    getDocs(query(
      collection(firestoreDb, 'expert_workspaces', workspace, 'work_tasks'),
      where('task.sourceId', '==', webinarId)
    )).catch(() => null)
  ]);

  // Core deletion first. Related operational tasks are auxiliary and cleaned separately.
  const coreRefs = [
    ...registrations.docs.map((item) => item.ref),
    doc(firestoreDb, 'expert_workspaces', workspace, 'webinars', webinarId)
  ];
  for (let index = 0; index < coreRefs.length; index += 400) {
    const batch = writeBatch(firestoreDb);
    coreRefs.slice(index, index + 400).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }

  if (tasks) {
    for (let index = 0; index < tasks.docs.length; index += 400) {
      const batch = writeBatch(firestoreDb);
      tasks.docs.slice(index, index + 400).forEach((item) => batch.delete(item.ref));
      await batch.commit().catch((error) => console.error('[G-KAIS WEBINAR TASK CLEANUP]', error));
    }
  }

  await appendExpertAuditLog({
    entityType: 'webinar',
    entityId: webinarId,
    action: 'webinar.deleted',
    changes: { registrationCount: registrations.size, taskCount: tasks?.size || 0 }
  }).catch(() => {});
}
