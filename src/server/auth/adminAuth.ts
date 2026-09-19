import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export interface AdminIdentity {
  uid: string;
  email?: string;
  name?: string;
}

function getAdminAuth() {
  const apps = getApps();
  const app = apps.length > 0
    ? apps[0]
    : initializeApp({
        ...(process.env.FIREBASE_PROJECT_ID
          ? { projectId: process.env.FIREBASE_PROJECT_ID }
          : {})
      });

  return getAuth(app);
}

export async function verifyAdminBearerToken(
  authorizationHeader: string | undefined
): Promise<AdminIdentity | null> {
  const expectedUid = process.env.ADMIN_FIREBASE_UID?.trim();

  if (!expectedUid) {
    throw new Error('ADMIN_FIREBASE_UID is not configured.');
  }

  if (!authorizationHeader?.startsWith('Bearer ')) {
    return null;
  }

  const idToken = authorizationHeader.slice('Bearer '.length).trim();
  if (!idToken) return null;

  const decoded = await getAdminAuth().verifyIdToken(idToken);

  if (decoded.uid !== expectedUid) {
    return null;
  }

  return {
    uid: decoded.uid,
    ...(typeof decoded.email === 'string' ? { email: decoded.email } : {}),
    ...(typeof decoded.name === 'string' ? { name: decoded.name } : {})
  };
}
