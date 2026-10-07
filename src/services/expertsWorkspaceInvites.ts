import { deleteDoc, doc } from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../lib/firebase';
import { appendExpertAuditLog, hasWorkspacePermission, loadExpertWorkspaceTeam } from './expertsWorkspaceCore';

export async function revokeExpertWorkspaceInvite(inviteId: string): Promise<void> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('AUTH_REQUIRED');
  if (!inviteId.trim()) throw new Error('INVITE_REQUIRED');

  const team = await loadExpertWorkspaceTeam();
  if (!hasWorkspacePermission(team.currentMember.permissions, 'members.manage')) {
    throw new Error('INVITE_REVOKE_FORBIDDEN');
  }

  const invite = team.invites.find((item) => item.id === inviteId);
  if (!invite) return;
  if (invite.status !== 'pending') throw new Error('INVITE_NOT_PENDING');

  await deleteDoc(doc(firestoreDb, 'expert_workspaces', team.workspaceId, 'invites', inviteId));

  void appendExpertAuditLog({
    entityType: 'workspace_invite',
    entityId: inviteId,
    action: 'invite.cancelled',
    changes: {
      displayName: invite.displayName,
      email: invite.email,
      roleId: invite.roleId,
      previousStatus: invite.status
    }
  }).catch(() => {});
}
