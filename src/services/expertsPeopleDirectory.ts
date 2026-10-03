import { collection, doc, onSnapshot, runTransaction, serverTimestamp, type Unsubscribe } from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../lib/firebase';
import { appendExpertAuditLog, resolveActiveExpertWorkspaceId } from './expertsWorkspaceCore';
import type { ExpertPerson } from './expertsAcquisition';

export type ExpertPersonProfile = ExpertPerson & {
  createdAt?: Date;
  updatedAt?: Date;
  country: string;
};

async function workspaceId(): Promise<string> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('AUTH_REQUIRED');
  const id = await resolveActiveExpertWorkspaceId(user);
  if (!id) throw new Error('WORKSPACE_REQUIRED');
  return id;
}

function toDate(value: unknown): Date | undefined {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return undefined;
}

function mapPerson(id: string, data: Record<string, unknown>): ExpertPersonProfile {
  const outcomeMemory = data.outcomeMemory && typeof data.outcomeMemory === 'object'
    ? data.outcomeMemory as Record<string, unknown>
    : {};
  return {
    id,
    name: typeof data.name === 'string' ? data.name : '',
    email: typeof data.email === 'string' ? data.email : '',
    phone: typeof data.phone === 'string' ? data.phone : '',
    firstSource: typeof data.firstSource === 'string' ? data.firstSource : '',
    latestSource: typeof data.latestSource === 'string' ? data.latestSource : '',
    currentStage: (typeof data.currentStage === 'string' ? data.currentStage : 'lead') as ExpertPerson['currentStage'],
    outcomeMemory,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    country: typeof outcomeMemory.country === 'string' ? outcomeMemory.country.trim() : ''
  };
}

export async function subscribeExpertPeopleDirectory(callback: (items: ExpertPersonProfile[]) => void): Promise<Unsubscribe> {
  const workspace = await workspaceId();
  return onSnapshot(collection(firestoreDb, 'expert_workspaces', workspace, 'people'), (snapshot) => {
    callback(snapshot.docs
      .map((item) => mapPerson(item.id, item.data() as Record<string, unknown>))
      .sort((a, b) => a.name.localeCompare(b.name)));
  }, (error) => {
    console.error('[G-KAIS PEOPLE DIRECTORY]', error);
    callback([]);
  });
}

export async function updateExpertPersonCountry(personId: string, country: string): Promise<void> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('AUTH_REQUIRED');
  const workspace = await workspaceId();
  const ref = doc(firestoreDb, 'expert_workspaces', workspace, 'people', personId);
  const cleanCountry = country.trim().slice(0, 100);
  await runTransaction(firestoreDb, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error('PERSON_NOT_FOUND');
    const currentMemory = snapshot.data().outcomeMemory && typeof snapshot.data().outcomeMemory === 'object'
      ? snapshot.data().outcomeMemory as Record<string, unknown>
      : {};
    transaction.update(ref, {
      outcomeMemory: { ...currentMemory, country: cleanCountry },
      updatedAt: serverTimestamp()
    });
  });
  await appendExpertAuditLog({
    entityType: 'person',
    entityId: personId,
    action: 'person.country_updated',
    changes: { country: cleanCountry }
  }).catch(() => {});
}
