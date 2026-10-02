import {
  collection,
  onSnapshot,
  query,
  where,
  type Timestamp,
  type Unsubscribe
} from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../lib/firebase';
import type {
  WebinarAttendanceStatus,
  WebinarInterest,
  WebinarRegistration
} from './expertsAcquisition';
import { resolveActiveExpertWorkspaceId } from './expertsWorkspaceCore';

function asMillis(value: unknown): number {
  if (value && typeof value === 'object') {
    if ('toMillis' in value && typeof (value as Timestamp).toMillis === 'function') {
      try { return (value as Timestamp).toMillis(); } catch { return 0; }
    }
    if ('toDate' in value && typeof (value as Timestamp).toDate === 'function') {
      try { return (value as Timestamp).toDate().getTime(); } catch { return 0; }
    }
  }
  return 0;
}

function mapRegistration(id: string, data: Record<string, unknown>): WebinarRegistration {
  return {
    id,
    personId: typeof data.personId === 'string' ? data.personId : '',
    webinarId: typeof data.webinarId === 'string' ? data.webinarId : '',
    status: (typeof data.status === 'string' ? data.status : 'registered') as WebinarAttendanceStatus,
    attendanceMinutes: typeof data.attendanceMinutes === 'number' ? data.attendanceMinutes : 0,
    purchased: Boolean(data.purchased),
    interest: (typeof data.interest === 'string' ? data.interest : 'unknown') as WebinarInterest,
    followUpTaskId: typeof data.followUpTaskId === 'string' ? data.followUpTaskId : undefined,
    followUpStatus: typeof data.followUpStatus === 'string' ? data.followUpStatus as WebinarRegistration['followUpStatus'] : undefined,
    followUpResult: typeof data.followUpResult === 'string' ? data.followUpResult : undefined
  };
}

async function registrationCollection() {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('AUTH_REQUIRED');
  const workspaceId = await resolveActiveExpertWorkspaceId(user);
  if (!workspaceId) throw new Error('WORKSPACE_REQUIRED');
  return collection(firestoreDb, 'expert_workspaces', workspaceId, 'webinar_registrations');
}

function sorted(snapshot: { docs: Array<{ id: string; data: () => unknown }> }): WebinarRegistration[] {
  return snapshot.docs.map((item) => {
    const data = item.data() as Record<string, unknown>;
    return {
      registration: mapRegistration(item.id, data),
      registeredAt: asMillis(data.registeredAt),
      updatedAt: asMillis(data.updatedAt)
    };
  }).sort((a, b) =>
    (b.registeredAt || b.updatedAt) - (a.registeredAt || a.updatedAt) ||
    b.updatedAt - a.updatedAt ||
    b.registration.id.localeCompare(a.registration.id)
  ).map((item) => item.registration);
}

export async function subscribeWebinarRegistrationsNewest(
  webinarId: string,
  callback: (registrations: WebinarRegistration[]) => void
): Promise<Unsubscribe> {
  const base = await registrationCollection();
  const registrationsQuery = query(base, where('webinarId', '==', webinarId));
  return onSnapshot(registrationsQuery, (snapshot) => callback(sorted(snapshot)), () => callback([]));
}

export async function subscribeAllWebinarRegistrationsNewest(
  callback: (registrations: WebinarRegistration[]) => void
): Promise<Unsubscribe> {
  const base = await registrationCollection();
  return onSnapshot(base, (snapshot) => callback(sorted(snapshot)), () => callback([]));
}
