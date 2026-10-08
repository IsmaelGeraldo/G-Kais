import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../lib/firebase';
import {
  appendExpertAuditLog,
  type WorkspaceMember,
  type WorkspacePermission
} from './expertsWorkspaceCore';

const SCHEMA_VERSION = 1;

function userDocument(uid: string) {
  return doc(firestoreDb, 'users', uid);
}

function workspaceSubDocument(workspaceId: string, subcollection: string, id: string) {
  return doc(firestoreDb, 'expert_workspaces', workspaceId, subcollection, id);
}

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
  supervisorUid?: string;
  directReportUids?: string[];
  isSupervisor?: boolean;
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
  const supervisorUid = (input.supervisorUid || '').trim();

  const membersSnapshot = await getDocs(collection(firestoreDb, 'expert_workspaces', workspaceId, 'members'));
  const memberByUid = new Map<string, WorkspaceMember>();
  const supervisorByMember = new Map<string, string>();

  membersSnapshot.docs.forEach((item) => {
    const data = item.data() as WorkspaceMember;
    memberByUid.set(item.id, { ...data, uid: data.uid || item.id });
    if (typeof data.supervisorUid === 'string' && data.supervisorUid) supervisorByMember.set(item.id, data.supervisorUid);
  });

  if (supervisorUid) {
    if (supervisorUid === input.memberUid) throw new Error('SUPERVISOR_CANNOT_BE_SELF');
    const supervisor = memberByUid.get(supervisorUid);
    if (!supervisor) throw new Error('SUPERVISOR_NOT_FOUND');
    if (supervisor.status !== 'active') throw new Error('SUPERVISOR_NOT_ACTIVE');
  }

  const supervisorEnabled = input.isSupervisor ?? Boolean(input.directReportUids?.length);
  const requestedDirectReports = Array.from(new Set(
    (supervisorEnabled ? input.directReportUids || [] : [])
      .map((uid) => uid.trim())
      .filter(Boolean)
  ));

  if (requestedDirectReports.length > 350) throw new Error('TOO_MANY_DIRECT_REPORTS');
  if (requestedDirectReports.includes(input.memberUid)) throw new Error('SUPERVISOR_CANNOT_BE_SELF');
  if (requestedDirectReports.includes(workspaceId)) throw new Error('OWNER_CANNOT_BE_DIRECT_REPORT');

  requestedDirectReports.forEach((uid) => {
    const report = memberByUid.get(uid);
    if (!report) throw new Error('DIRECT_REPORT_NOT_FOUND');
    if (report.status !== 'active') throw new Error('DIRECT_REPORT_NOT_ACTIVE');
  });

  supervisorByMember.set(input.memberUid, supervisorUid);

  const previousDirectReports = Array.from(memberByUid.entries())
    .filter(([, value]) => value.supervisorUid === input.memberUid)
    .map(([uid]) => uid);

  previousDirectReports
    .filter((uid) => !requestedDirectReports.includes(uid))
    .forEach((uid) => supervisorByMember.set(uid, ''));

  requestedDirectReports.forEach((uid) => supervisorByMember.set(uid, input.memberUid));

  const validateNoCycle = (memberUid: string) => {
    let cursor = supervisorByMember.get(memberUid) || '';
    const visited = new Set<string>([memberUid]);
    while (cursor) {
      if (visited.has(cursor)) throw new Error('SUPERVISOR_CYCLE');
      visited.add(cursor);
      cursor = supervisorByMember.get(cursor) || '';
    }
  };

  supervisorByMember.forEach((_, uid) => validateNoCycle(uid));

  const batch = writeBatch(firestoreDb);
  batch.set(memberRef, {
    roleId: input.roleId,
    permissions: nextPermissions,
    supervisorUid,
    isSupervisor: supervisorEnabled,
    updatedAt: serverTimestamp()
  }, { merge: true });

  previousDirectReports
    .filter((uid) => !requestedDirectReports.includes(uid))
    .forEach((uid) => {
      batch.set(workspaceSubDocument(workspaceId, 'members', uid), {
        supervisorUid: '',
        updatedAt: serverTimestamp()
      }, { merge: true });
    });

  requestedDirectReports.forEach((uid) => {
    batch.set(workspaceSubDocument(workspaceId, 'members', uid), {
      supervisorUid: input.memberUid,
      updatedAt: serverTimestamp()
    }, { merge: true });
  });

  await batch.commit();

  void appendExpertAuditLog({
    entityType: 'workspace_member',
    entityId: input.memberUid,
    action: 'member.updated',
    changes: {
      previousRoleId: member.roleId,
      nextRoleId: input.roleId,
      previousPermissions: member.permissions,
      nextPermissions,
      previousSupervisorUid: member.supervisorUid || '',
      nextSupervisorUid: supervisorUid,
      previousSupervisorEnabled: Boolean(member.isSupervisor || previousDirectReports.length),
      nextSupervisorEnabled: supervisorEnabled,
      previousDirectReportUids: previousDirectReports,
      nextDirectReportUids: requestedDirectReports
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
