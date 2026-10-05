import type { User } from 'firebase/auth';
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../lib/firebase';
import {
  DEFAULT_WORKSPACE_ROLES,
  appendExpertAuditLog,
  resolveActiveExpertWorkspaceId,
  type WorkspaceMember
} from './expertsWorkspaceCore';

const SCHEMA_VERSION = 1;
const PROFILE_KEY = 'gkais-experts-profile-v1';

function userDocument(uid: string) {
  return doc(firestoreDb, 'users', uid);
}

function workspaceDocument(workspaceId: string) {
  return doc(firestoreDb, 'expert_workspaces', workspaceId);
}

function workspaceSubDocument(workspaceId: string, subcollection: string, id: string) {
  return doc(firestoreDb, 'expert_workspaces', workspaceId, subcollection, id);
}

function localWorkspaceName(user: User): string {
  if (typeof window !== 'undefined') {
    try {
      const profile = JSON.parse(window.localStorage.getItem(PROFILE_KEY) || '{}') as { business?: string };
      if (profile.business?.trim()) return profile.business.trim();
    } catch {}
  }
  return user.displayName?.trim() || user.email?.split('@')[0] || 'G-KAIS Workspace';
}

async function bootstrapOwnedWorkspace(user: User): Promise<string> {
  const workspaceId = user.uid;
  const userRef = userDocument(user.uid);
  const workspaceRef = workspaceDocument(workspaceId);
  const [userSnapshot, workspaceSnapshot] = await Promise.all([
    getDoc(userRef),
    getDoc(workspaceRef)
  ]);
  const now = serverTimestamp();
  const batch = writeBatch(firestoreDb);

  batch.set(userRef, {
    schemaVersion: SCHEMA_VERSION,
    email: user.email || '',
    displayName: user.displayName || '',
    photoURL: user.photoURL || '',
    activeWorkspaceId: workspaceId,
    ...(!userSnapshot.exists() ? { createdAt: now } : {}),
    updatedAt: now
  }, { merge: true });

  if (!workspaceSnapshot.exists()) {
    batch.set(workspaceRef, {
      schemaVersion: SCHEMA_VERSION,
      name: localWorkspaceName(user),
      ownerUid: user.uid,
      status: 'active',
      createdAt: now,
      updatedAt: now
    });
  }

  DEFAULT_WORKSPACE_ROLES.forEach((role) => {
    batch.set(workspaceSubDocument(workspaceId, 'roles', role.id), {
      schemaVersion: SCHEMA_VERSION,
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      isSystem: true,
      createdByUid: user.uid,
      createdAt: now,
      updatedAt: now
    }, { merge: true });
  });

  batch.set(workspaceSubDocument(workspaceId, 'members', user.uid), {
    schemaVersion: SCHEMA_VERSION,
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || '',
    roleId: 'owner',
    permissions: ['*'],
    status: 'active',
    joinedAt: now,
    updatedAt: now
  }, { merge: true });

  await batch.commit();
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('gkais:workspace-membership-changed'));
  return workspaceId;
}

export async function resolveValidExpertWorkspaceId(user: User | null = firebaseAuth.currentUser): Promise<string | null> {
  if (!user) return null;
  const userSnapshot = await getDoc(userDocument(user.uid));
  if (!userSnapshot.exists()) return resolveActiveExpertWorkspaceId(user);

  const activeWorkspaceId = String(userSnapshot.data().activeWorkspaceId || '').trim();
  if (!activeWorkspaceId || activeWorkspaceId === user.uid) return resolveActiveExpertWorkspaceId(user);

  const membershipSnapshot = await getDoc(workspaceSubDocument(activeWorkspaceId, 'members', user.uid));
  if (membershipSnapshot.exists()) {
    const membership = membershipSnapshot.data() as WorkspaceMember;
    if (membership.status === 'active') return activeWorkspaceId;
  }

  return bootstrapOwnedWorkspace(user);
}

export async function removeExpertWorkspaceMember(memberUid: string): Promise<void> {
  const user = firebaseAuth.currentUser;
  const workspaceId = await resolveValidExpertWorkspaceId(user);
  if (!user || !workspaceId) throw new Error('AUTH_REQUIRED');
  if (!memberUid.trim()) throw new Error('MEMBER_REQUIRED');
  if (memberUid === workspaceId) throw new Error('OWNER_CANNOT_BE_REMOVED');
  if (memberUid === user.uid) throw new Error('SELF_REMOVAL_NOT_ALLOWED');

  const memberRef = workspaceSubDocument(workspaceId, 'members', memberUid);
  const snapshot = await getDoc(memberRef);
  if (!snapshot.exists()) throw new Error('MEMBER_NOT_FOUND');
  const member = snapshot.data() as WorkspaceMember;

  await deleteDoc(memberRef);

  void appendExpertAuditLog({
    entityType: 'workspace_member',
    entityId: memberUid,
    action: 'member.removed',
    changes: {
      displayName: member.displayName,
      email: member.email,
      roleId: member.roleId,
      previousStatus: member.status
    }
  }).catch(() => {});

  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('gkais:workspace-membership-changed'));
}
