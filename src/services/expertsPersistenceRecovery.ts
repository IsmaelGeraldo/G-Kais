/**
 * Browser caches are compatibility state, never a migration authority in QA.
 * Preserve divergence for explicit recovery instead of resurrecting records.
 * This module has no Firebase dependencies so CI can test it in isolation.
 */
export type BrowserMemoryTarget = 'qa' | 'production';
export type RecoverableRecord = { id: string };

export function mayAutoImportLegacyBrowserMemory(target: BrowserMemoryTarget): boolean {
  return target === 'production';
}

export function canSyncHydratedRelationshipCache(
  target: BrowserMemoryTarget,
  hydratedKey: string,
  uid: string,
  workspaceId: string
): boolean {
  return target === 'production' ||
    Boolean(uid && workspaceId && hydratedKey === `${uid}:${workspaceId}`);
}

export function findUnmigratedLocalRecords<T extends RecoverableRecord>(
  target: BrowserMemoryTarget,
  local: readonly T[],
  remote: readonly T[]
): T[] {
  if (target !== 'qa') return [];
  const canonical = new Map(remote.filter(item => item?.id).map(item => [item.id, JSON.stringify(item)]));
  return local.filter(item => item?.id &&
    (!canonical.has(item.id) || canonical.get(item.id) !== JSON.stringify(item)));
}

/**
 * Stores an explicit QA-only recovery copy before replacing divergent browser
 * data with Firestore state. Never imports the copy automatically.
 * An unavailable/full localStorage throws so caller leaves the old cache intact.
 */
export function preserveQaRecoveryCopy<T extends RecoverableRecord>(
  workspaceId: string,
  kind: string,
  records: readonly T[],
  scopedKey: (base: string, workspace: string) => string
): void {
  if (!records.length || typeof window === 'undefined') return;
  const key = scopedKey(`gkais-experts-qa-recovery-${kind}-v1`, workspaceId);
  const raw = window.localStorage.getItem(key);
  const previous = raw ? JSON.parse(raw) as { records?: T[] } : {};
  const previousRecords = Array.isArray(previous.records) ? previous.records : [];
  const merged = new Map<string, T>();
  previousRecords.filter(item => item?.id).forEach(item => merged.set(item.id, item));
  records.filter(item => item?.id).forEach(item => merged.set(item.id, item));
  window.localStorage.setItem(key, JSON.stringify({
    version: 1,
    savedAt: new Date().toISOString(),
    records: Array.from(merged.values())
  }));
}
