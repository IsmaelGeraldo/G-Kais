import type { User } from 'firebase/auth';
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../lib/firebase';
import {
  appendExpertAuditLog,
  type WorkspaceMember,
  type WorkspacePermission
} from './expertsWorkspaceCore';

const SCHEMA_VERSION = 1;
export async function resolveValidExpertWorkspaceId(user: User | null = firebaseAuth.currentUser): Promise<string | null> {
  if (!user) return null;

  const userSnapshot = await getDoc(userDocument(user.uid));
  if (!userSnapshot.exists()) return null;

  const activeWorkspaceId = String(userSnapshot.data().activeWorkspaceId || '').trim();
  if (!activeWorkspaceId) return null;

  const membershipSnapshot = await getDoc(workspaceSubDocument(activeWorkspaceId, 'members', user.uid));
  if (!membershipSnapshot.exists()) return null;

  const membership = membershipSnapshot.data() as WorkspaceMember;
  return membership.status === 'active' ? activeWorkspaceId : null;
}

export async function updateExpertWorkspaceUserPhoto(photoURL: string): Promise<void> {
  const user = firebaseAuth.currentUser;
  const workspaceId = await resolveValidExpertWorkspaceId(user);
  if (!user || !workspaceId) throw new Error('AUTH_REQUIRED');

  const normalized = photoURL.trim();
  if (!normalized || normalized.length > 1000) throw new Error('PHOTO_TOO_LARGE');

  const userRef = userDocument(user.uid);
  const snapshot = await getDoc(userRef);
  if (!snapshot.exists()) throw new Error('USER_PROFILE_NOT_FOUND');

  await setDoc(userRef, {
    photoURL: normalized,
    updatedAt: serverTimestamp()
  }, { merge: true });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gkais:user-profile-changed', { detail: { photoURL: normalized } }));
  }
}


export async function updateExpertWorkspaceMember(input: {
  memberUid: string;
  roleId: string;
  permissions: Array<WorkspacePermission | '*'>;
}): Promise<void> {
  const user = firebaseAuth.currentUser;
  const workspaceId = await resolveValidExpertWorkspaceId(user);
  if (!user || !workspaceId) throw new Error('AUTH_REQUIRED');
  if (!input.memberUid.trim()) throw new Error('MEMBER_REQUIRED');
  if (input.memberUid === workspaceId) throw new Error('OWNER_CANNOT_BE_EDITED');
  if (input.memberUid === user.uid) throw new Error('SELF_EDIT_NOT_ALLOWED');
  if (!input.roleId.trim()) throw new Error('ROLE_REQUIRED');
  if (input.roleId === 'owner') throw new Error('OWNER_ROLE_RESERVED');

  const memberRef = workspaceSubDocument(workspaceId, 'members', input.memberUid);
  const [memberSnapshot, roleSnapshot] = await Promise.all([
    getDoc(memberRef),
    getDoc(workspaceSubDocument(workspaceId, 'roles', input.roleId))
  ]);
  if (!memberSnapshot.exists()) throw new Error('MEMBER_NOT_FOUND');
  if (!roleSnapshot.exists()) throw new Error('ROLE_NOT_FOUND');

  const member = memberSnapshot.data() as WorkspaceMember;
  const nextPermissions = Array.from(new Set(input.permissions.filter((permission) => permission !== '*')));

  await setDoc(memberRef, {
    roleId: input.roleId,
    permissions: nextPermissions,
    updatedAt: serverTimestamp()
  }, { merge: true });

  void appendExpertAuditLog({
    entityType: 'workspace_member',
    entityId: input.memberUid,
    action: 'member.updated',
    changes: {
      previousRoleId: member.roleId,
      nextRoleId: input.roleId,
      previousPermissions: member.permissions,
      nextPermissions
    }
  }).catch(() => {});

  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('gkais:workspace-membership-changed'));
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
