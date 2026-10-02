import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../lib/firebase';
import type { WebinarAttendanceStatus, WebinarInterest } from './expertsAcquisition';
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

export async function updateWebinarParticipantIdentity(
  personId: string,
  input: { name: string; email: string; phone: string }
) {
  const workspace = await workspaceId();
  const normalizedEmail = email(input.email);
  const normalizedPhone = phone(input.phone);
  if (!input.name.trim() || (!normalizedEmail && !normalizedPhone)) throw new Error('IDENTITY_REQUIRED');

  if (normalizedEmail) {
    const hit = await getDocs(query(
      collection(firestoreDb, 'expert_workspaces', workspace, 'people'),
      where('normalizedEmail', '==', normalizedEmail)
    ));
    if (hit.docs.some((item) => item.id !== personId)) throw new Error('IDENTITY_CONFLICT');
  }
  if (normalizedPhone) {
    const hit = await getDocs(query(
      collection(firestoreDb, 'expert_workspaces', workspace, 'people'),
      where('normalizedPhone', '==', normalizedPhone)
    ));
    if (hit.docs.some((item) => item.id !== personId)) throw new Error('IDENTITY_CONFLICT');
  }

  await updateDoc(doc(firestoreDb, 'expert_workspaces', workspace, 'people', personId), {
    name: input.name.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    normalizedEmail,
    normalizedPhone,
    updatedAt: serverTimestamp()
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
  const registrationSnapshot = await getDoc(registrationRef);
  if (!registrationSnapshot.exists()) throw new Error('REGISTRATION_NOT_FOUND');
  const previous = registrationSnapshot.data() as { purchased?: boolean; followUpStatus?: string };
  const followUpStatus = input.purchased
    ? 'not-needed'
    : previous.followUpStatus === 'created' || previous.followUpStatus === 'completed'
      ? previous.followUpStatus
      : input.status === 'attended' || input.status === 'no-show' ? 'needed' : undefined;

  const registrationPatch: Record<string, unknown> = {
    status: input.status,
    attendanceMinutes: Math.max(0, Math.min(10000, Math.round(input.attendanceMinutes || 0))),
    interest: input.interest,
    purchased: input.purchased,
    updatedAt: serverTimestamp()
  };
  if (followUpStatus) registrationPatch.followUpStatus = followUpStatus;

  await updateDoc(registrationRef, registrationPatch);
  await updateDoc(personRef, {
    'outcomeMemory.lastWebinarStatus': input.status,
    'outcomeMemory.lastWebinarAttendanceMinutes': registrationPatch.attendanceMinutes,
    'outcomeMemory.lastWebinarPurchased': input.purchased,
    'outcomeMemory.lastWebinarInterest': input.interest,
    'outcomeMemory.webinarFollowUpStatus': followUpStatus || 'not-needed',
    updatedAt: serverTimestamp()
  });

  await appendExpertAuditLog({
    entityType: 'webinar_registration',
    entityId: input.registrationId,
    action: 'webinar.registration_edited',
    changes: {
      personId: input.personId,
      status: input.status,
      attendanceMinutes: registrationPatch.attendanceMinutes,
      interest: input.interest,
      purchased: input.purchased,
      purchaseChanged: Boolean(previous.purchased) !== input.purchased
    }
  }).catch(() => {});
}

export async function deleteWebinarRegistration(registrationId: string) {
  const workspace = await workspaceId();
  await deleteDoc(doc(firestoreDb, 'expert_workspaces', workspace, 'webinar_registrations', registrationId));
  await appendExpertAuditLog({
    entityType: 'webinar_registration',
    entityId: registrationId,
    action: 'webinar.registration_deleted',
    changes: {}
  }).catch(() => {});
}

export async function deleteWebinarCascade(webinarId: string) {
  const workspace = await workspaceId();
  const registrations = await getDocs(query(
    collection(firestoreDb, 'expert_workspaces', workspace, 'webinar_registrations'),
    where('webinarId', '==', webinarId)
  ));
  await Promise.all(registrations.docs.map((item) => deleteDoc(item.ref)));
  await deleteDoc(doc(firestoreDb, 'expert_workspaces', workspace, 'webinars', webinarId));
  await appendExpertAuditLog({
    entityType: 'webinar',
    entityId: webinarId,
    action: 'webinar.deleted',
    changes: { registrationCount: registrations.size }
  }).catch(() => {});
}
