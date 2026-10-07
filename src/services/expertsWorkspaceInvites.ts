import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
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

  const inviteRef = doc(firestoreDb, 'expert_workspaces', team.workspaceId, 'invites', inviteId);
  let cancellationMode: 'deleted' | 'revoked' = 'deleted';

  try {
    await deleteDoc(inviteRef);
  } catch (deleteError) {
    cancellationMode = 'revoked';
    try {
      await setDoc(inviteRef, {
        status: 'revoked',
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (revokeError) {
      const deleteMessage = deleteError instanceof Error ? deleteError.message : String(deleteError);
      const revokeMessage = revokeError instanceof Error ? revokeError.message : String(revokeError);
      throw new Error(`INVITE_CANCEL_FAILED: delete=${deleteMessage}; revoke=${revokeMessage}`);
    }
  }

  void appendExpertAuditLog({
    entityType: 'workspace_invite',
    entityId: inviteId,
    action: 'invite.cancelled',
    changes: {
      displayName: invite.displayName,
      email: invite.email,
      roleId: invite.roleId,
      previousStatus: invite.status,
      cancellationMode
    }
  }).catch(() => {});
}
