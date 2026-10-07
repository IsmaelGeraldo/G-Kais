import { collection, onSnapshot, query, where, type Unsubscribe } from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../lib/firebase';
import {
  getCurrentExpertWorkspaceMember,
  hasWorkspacePermission,
  resolveActiveExpertWorkspaceId,
  type WorkspaceInvite,
  type WorkspaceMember,
  type WorkspaceRole
} from './expertsWorkspaceCore';

export type DashboardTeamState = {
  currentUid: string;
  members: WorkspaceMember[];
  roles: WorkspaceRole[];
  invites: WorkspaceInvite[];
};

export async function subscribeDashboardTeam(
  callback: (state: DashboardTeamState) => void
): Promise<Unsubscribe> {
  const user = firebaseAuth.currentUser;
  const workspaceId = await resolveActiveExpertWorkspaceId(user);
  const context = await getCurrentExpertWorkspaceMember();
  if (!user || !workspaceId || !context) throw new Error('MEMBERSHIP_REQUIRED');

  const permissions = context.member.permissions || [];
  const canReadMembers = hasWorkspacePermission(permissions, 'members.read') || hasWorkspacePermission(permissions, 'members.manage');
  const canReadRoles = hasWorkspacePermission(permissions, 'roles.read') || hasWorkspacePermission(permissions, 'roles.manage');
  const canReadInvites = hasWorkspacePermission(permissions, 'members.manage');

  let members: WorkspaceMember[] = [context.member];
  let roles: WorkspaceRole[] = [];
  let invites: WorkspaceInvite[] = [];
  const unsubscribers: Unsubscribe[] = [];
  const emit = () => callback({ currentUid: user.uid, members, roles, invites });

  const membersCollection = collection(firestoreDb, 'expert_workspaces', workspaceId, 'members');
  if (canReadMembers) {
    unsubscribers.push(onSnapshot(
      membersCollection,
      (snapshot) => {
        members = snapshot.docs
          .map((item) => ({ ...(item.data() as WorkspaceMember), uid: (item.data() as WorkspaceMember).uid || item.id }))
          .sort((a, b) => (a.displayName || a.email || a.uid).localeCompare(b.displayName || b.email || b.uid));
        emit();
      },
      () => { members = [context.member]; emit(); }
    ));
  } else {
    unsubscribers.push(onSnapshot(
      query(membersCollection, where('supervisorUid', '==', user.uid)),
      (snapshot) => {
        const directReports = snapshot.docs
          .map((item) => ({ ...(item.data() as WorkspaceMember), uid: (item.data() as WorkspaceMember).uid || item.id }))
          .filter((member) => member.status === 'active');
        members = [context.member, ...directReports]
          .filter((member, index, list) => list.findIndex((candidate) => candidate.uid === member.uid) === index)
          .sort((a, b) => (a.displayName || a.email || a.uid).localeCompare(b.displayName || b.email || b.uid));
        emit();
      },
      () => { members = [context.member]; emit(); }
    ));
  }

  if (canReadRoles) {
    unsubscribers.push(onSnapshot(
      collection(firestoreDb, 'expert_workspaces', workspaceId, 'roles'),
      (snapshot) => {
        roles = snapshot.docs
          .map((item) => ({ id: item.id, ...(item.data() as Omit<WorkspaceRole, 'id'>) }))
          .sort((a, b) => a.name.localeCompare(b.name));
        emit();
      },
      () => { roles = []; emit(); }
    ));
  }

  if (canReadInvites) {
    unsubscribers.push(onSnapshot(
      collection(firestoreDb, 'expert_workspaces', workspaceId, 'invites'),
      (snapshot) => {
        invites = snapshot.docs
          .map((item) => ({ id: item.id, ...(item.data() as Omit<WorkspaceInvite, 'id'>) }))
          .filter((item) => item.status === 'pending')
          .sort((a, b) => a.displayName.localeCompare(b.displayName));
        emit();
      },
      () => { invites = []; emit(); }
    ));
  }

  emit();
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}
