import { scopedWorkspaceStorageKey } from './expertsWorkspaceStorage';

const CLIENT_RECORD_STORAGE_KEY = 'gkais-experts-client-records-v2';

type IdentifiedRecord = { id: string };

export function loadMentoringClientCache<T extends IdentifiedRecord>(): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(scopedWorkspaceStorageKey(CLIENT_RECORD_STORAGE_KEY));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
}

export function writeMentoringClientCache<T extends IdentifiedRecord>(records: T[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(scopedWorkspaceStorageKey(CLIENT_RECORD_STORAGE_KEY), JSON.stringify(records));
}
