import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export type WorkspaceAiIdentity = {
  uid: string;
  email?: string;
  name?: string;
  workspaceId: string;
  permissions: string[];
};

function getAdminApp() {
  const apps = getApps();
  return apps.length > 0
    ? apps[0]
    : initializeApp({
        ...(process.env.FIREBASE_PROJECT_ID
          ? { projectId: process.env.FIREBASE_PROJECT_ID }
          : {})
      });
}

function hasPermission(permissions: unknown, requiredPermission: string): permissions is string[] {
  return Array.isArray(permissions) && permissions.every((item) => typeof item === 'string') &&
    (permissions.includes('*') || permissions.includes(requiredPermission));
}

export async function verifyWorkspaceBearerToken(
  authorizationHeader: string | undefined,
  requiredPermission: string
): Promise<WorkspaceAiIdentity | null> {
  if (!authorizationHeader?.startsWith('Bearer ')) return null;
  const idToken = authorizationHeader.slice('Bearer '.length).trim();
  if (!idToken) return null;

  const app = getAdminApp();
  const decoded = await getAuth(app).verifyIdToken(idToken);
  const dbId = process.env.FIRESTORE_DATABASE_ID?.trim();
  const db = dbId ? getFirestore(app, dbId) : getFirestore(app);

  const userSnapshot = await db.collection('users').doc(decoded.uid).get();
  const userData = userSnapshot.exists ? userSnapshot.data() : undefined;
  const workspaceId = typeof userData?.activeWorkspaceId === 'string'
    ? userData.activeWorkspaceId.trim()
    : '';
  if (!workspaceId) return null;

  const [workspaceSnapshot, memberSnapshot] = await Promise.all([
    db.collection('expert_workspaces').doc(workspaceId).get(),
    db.collection('expert_workspaces').doc(workspaceId).collection('members').doc(decoded.uid).get()
  ]);

  if (!workspaceSnapshot.exists || !memberSnapshot.exists) return null;
  const workspace = workspaceSnapshot.data();
  const member = memberSnapshot.data();
  if (workspace?.status && workspace.status !== 'active') return null;
  if (member?.status !== 'active') return null;
  if (!hasPermission(member?.permissions, requiredPermission)) return null;

  return {
    uid: decoded.uid,
    workspaceId,
    permissions: member.permissions,
    ...(typeof decoded.email === 'string' ? { email: decoded.email } : {}),
    ...(typeof decoded.name === 'string' ? { name: decoded.name } : {})
  };
}
