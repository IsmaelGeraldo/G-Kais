import { firebaseAuth } from '../lib/firebase';

const ACTIVE_SCOPE_KEY = 'gkais-experts-active-workspace-scope-v1';
const OPERATIONAL_STORAGE_KEYS = new Set([
  'gkais-experts-client-records-v2',
  'gkais-experts-session-clients-v2',
  'gkais-experts-client-journal-v1',
  'gkais-experts-work-tasks-v1',
  'gkais-experts-session-summaries-v1'
]);

type StoredScope = {
  uid: string;
  workspaceId: string;
};

type IsolationWindow = Window & {
  __gkaisWorkspaceStorageIsolationInstalled?: boolean;
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

export function installExpertWorkspaceStorageIsolation(): void {
  if (typeof window === 'undefined') return;
  const isolatedWindow = window as IsolationWindow;
  if (isolatedWindow.__gkaisWorkspaceStorageIsolationInstalled) return;

  const storagePrototype = Object.getPrototypeOf(window.localStorage) as Storage;
  const nativeGetItem = storagePrototype.getItem;
  const nativeSetItem = storagePrototype.setItem;
  const nativeRemoveItem = storagePrototype.removeItem;

  storagePrototype.getItem = function getItem(key: string): string | null {
    const mappedKey = this === window.localStorage && OPERATIONAL_STORAGE_KEYS.has(key)
      ? scopedWorkspaceStorageKey(key)
      : key;
    return nativeGetItem.call(this, mappedKey);
  };

  storagePrototype.setItem = function setItem(key: string, value: string): void {
    const mappedKey = this === window.localStorage && OPERATIONAL_STORAGE_KEYS.has(key)
      ? scopedWorkspaceStorageKey(key)
      : key;
    nativeSetItem.call(this, mappedKey, value);
  };

  storagePrototype.removeItem = function removeItem(key: string): void {
    const mappedKey = this === window.localStorage && OPERATIONAL_STORAGE_KEYS.has(key)
      ? scopedWorkspaceStorageKey(key)
      : key;
    nativeRemoveItem.call(this, mappedKey);
  };

  isolatedWindow.__gkaisWorkspaceStorageIsolationInstalled = true;
}
