import { collection, doc, onSnapshot, runTransaction, serverTimestamp, type Unsubscribe } from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../lib/firebase';
import { resolveActiveExpertWorkspaceId } from './expertsWorkspaceCore';

export type ExpertPersonProfileMeta = {
  id: string;
  createdAt: Date | null;
  country: string;
};

async function workspaceId(): Promise<string> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('AUTH_REQUIRED');
  const id = await resolveActiveExpertWorkspaceId(user);
  if (!id) throw new Error('WORKSPACE_REQUIRED');
  return id;
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

export async function subscribeExpertPeopleProfileMeta(
  callback: (items: ExpertPersonProfileMeta[]) => void
): Promise<Unsubscribe> {
  const workspace = await workspaceId();
  return onSnapshot(collection(firestoreDb, 'expert_workspaces', workspace, 'people'), (snapshot) => {
    callback(snapshot.docs.map((item) => {
      const data = item.data() as Record<string, unknown>;
      const memory = data.outcomeMemory && typeof data.outcomeMemory === 'object'
        ? data.outcomeMemory as Record<string, unknown>
        : {};
      return {
        id: item.id,
        createdAt: toDate(data.createdAt),
        country: typeof memory.country === 'string' ? memory.country.trim() : ''
      };
    }));
  }, () => callback([]));
}

export async function updateExpertPersonCountry(personId: string, country: string): Promise<void> {
  const workspace = await workspaceId();
  const ref = doc(firestoreDb, 'expert_workspaces', workspace, 'people', personId);
  await runTransaction(firestoreDb, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error('PERSON_NOT_FOUND');
    const data = snapshot.data();
    const memory = data.outcomeMemory && typeof data.outcomeMemory === 'object'
      ? data.outcomeMemory as Record<string, unknown>
      : {};
    transaction.update(ref, {
      outcomeMemory: { ...memory, country: country.trim() },
      updatedAt: serverTimestamp()
    });
  });
}
