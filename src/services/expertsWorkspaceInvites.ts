import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../lib/firebase';
import { hasWorkspacePermission, loadExpertWorkspaceTeam } from './expertsWorkspaceCore';

export async function revokeExpertWorkspaceInvite(inviteId: string): Promise<void> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('AUTH_REQUIRED');
  if (!inviteId.trim()) throw new Error('INVITE_REQUIRED');

  const team = await loadExpertWorkspaceTeam();
  if (!hasWorkspacePermission(team.currentMember.permissions, 'members.manage')) {
    throw new Error('INVITE_REVOKE_FORBIDDEN');
  }

  const invite = team.invites.find((item) => item.id === inviteId);
  if (!invite) throw new Error('INVITE_NOT_FOUND');
  if (invite.status === 'revoked') return;
  if (invite.status !== 'pending') throw new Error('INVITE_NOT_PENDING');

  await setDoc(
    doc(firestoreDb, 'expert_workspaces', team.workspaceId, 'invites', inviteId),
    {
      status: 'revoked',
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}
