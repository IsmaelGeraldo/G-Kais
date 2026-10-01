import { firebaseAuth } from '../lib/firebase';

const ACTIVE_SCOPE_KEY = 'gkais-experts-active-workspace-scope-v1';

type StoredScope = {
  uid: string;
  workspaceId: string;
};

function currentUid(): string {
  return firebaseAuth.currentUser?.uid || '';
}

export function setActiveExpertWorkspaceStorageScope(workspaceId: string): void {
  if (typeof window === 'undefined' || !workspaceId) return;
  const uid = currentUid();
  if (!uid) return;
  try {
    const scope: StoredScope = { uid, workspaceId };
    window.sessionStorage.setItem(ACTIVE_SCOPE_KEY, JSON.stringify(scope));
  } catch {}
}

export function getActiveExpertWorkspaceStorageScope(): string {
  const uid = currentUid();
  if (typeof window !== 'undefined') {
    try {
      const parsed = JSON.parse(window.sessionStorage.getItem(ACTIVE_SCOPE_KEY) || '{}') as Partial<StoredScope>;
      if (uid && parsed.uid === uid && typeof parsed.workspaceId === 'string' && parsed.workspaceId.trim()) {
        return parsed.workspaceId.trim();
      }
    } catch {}
  }
  return uid || 'anonymous';
}

export function scopedWorkspaceStorageKey(baseKey: string, workspaceId?: string): string {
  const scope = (workspaceId || getActiveExpertWorkspaceStorageScope()).trim() || 'anonymous';
  return `${baseKey}::workspace:${scope}`;
}
