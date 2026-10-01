import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import firebaseAppletConfig from '../../../firebase-applet-config.json';

export type WorkspaceAiIdentity = {
  uid: string;
  email?: string;
  name?: string;
  workspaceId: string;
  permissions: string[];
};

type FirestoreRestValue = {
  stringValue?: string;
  arrayValue?: { values?: FirestoreRestValue[] };
};

type FirestoreRestDocument = {
  fields?: Record<string, FirestoreRestValue>;
};

function getAdminApp() {
  const apps = getApps();
  const configuredProjectId = process.env.FIREBASE_PROJECT_ID?.trim() || firebaseAppletConfig.projectId?.trim();
  return apps.length > 0
    ? apps[0]
    : initializeApp({
        ...(configuredProjectId ? { projectId: configuredProjectId } : {})
      });
}

function configuredProjectId(): string {
  return process.env.FIREBASE_PROJECT_ID?.trim() || firebaseAppletConfig.projectId?.trim() || '';
}

function configuredDatabaseId(): string {
  return process.env.FIRESTORE_DATABASE_ID?.trim() || firebaseAppletConfig.firestoreDatabaseId?.trim() || '(default)';
}

function hasPermission(permissions: unknown, requiredPermission: string): permissions is string[] {
  return Array.isArray(permissions) && permissions.every((item) => typeof item === 'string') &&
    (permissions.includes('*') || permissions.includes(requiredPermission));
}

function restString(fields: Record<string, FirestoreRestValue> | undefined, key: string): string {
  const value = fields?.[key]?.stringValue;
  return typeof value === 'string' ? value.trim() : '';
}

function restStringList(fields: Record<string, FirestoreRestValue> | undefined, key: string): string[] {
  const values = fields?.[key]?.arrayValue?.values;
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => typeof value?.stringValue === 'string' ? value.stringValue : '')
    .filter(Boolean);
}

async function fetchUserScopedDocument(path: string, idToken: string): Promise<FirestoreRestDocument | null> {
  const projectId = configuredProjectId();
  if (!projectId) throw new Error('FIREBASE_PROJECT_ID_REQUIRED');
  const databaseId = configuredDatabaseId();
  const encodedPath = path.split('/').map((segment) => encodeURIComponent(segment)).join('/');
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/${encodeURIComponent(databaseId)}/documents/${encodedPath}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${idToken}`,
      Accept: 'application/json'
    }
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    const detail = (await response.text().catch(() => '')).slice(0, 600);
    throw new Error(`WORKSPACE_FIRESTORE_LOOKUP_${response.status}${detail ? `: ${detail}` : ''}`);
  }

  return await response.json() as FirestoreRestDocument;
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

  // Use the caller's Firebase ID token for Firestore authorization. This keeps
  // Workspace checks aligned with the published Firestore rules and avoids
  // depending on AI Studio's server runtime having Datastore IAM access to the
  // app's named Firestore database.
  const userDocument = await fetchUserScopedDocument(`users/${decoded.uid}`, idToken);
  const workspaceId = restString(userDocument?.fields, 'activeWorkspaceId');
  if (!workspaceId) return null;

  const workspaceDocument = await fetchUserScopedDocument(`expert_workspaces/${workspaceId}`, idToken);
  if (!workspaceDocument) return null;
  const workspaceStatus = restString(workspaceDocument.fields, 'status');
  if (workspaceStatus && workspaceStatus !== 'active') return null;

  let permissions: string[] = [];
  const ownerUid = restString(workspaceDocument.fields, 'ownerUid');
  if (decoded.uid === workspaceId && (!ownerUid || ownerUid === decoded.uid)) {
    permissions = ['*'];
  } else {
    const memberDocument = await fetchUserScopedDocument(
      `expert_workspaces/${workspaceId}/members/${decoded.uid}`,
      idToken
    );
    if (!memberDocument) return null;
    if (restString(memberDocument.fields, 'status') !== 'active') return null;
    permissions = restStringList(memberDocument.fields, 'permissions');
  }

  if (!hasPermission(permissions, requiredPermission)) return null;

  return {
    uid: decoded.uid,
    workspaceId,
    permissions,
    ...(typeof decoded.email === 'string' ? { email: decoded.email } : {}),
    ...(typeof decoded.name === 'string' ? { name: decoded.name } : {})
  };
}
