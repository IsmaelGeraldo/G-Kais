/**
 * A browser cache and the bundled pilot task list belong to the old demo
 * experience. Never use them to initialize an empty Firebase QA Workspace.
 * This does not delete or hide tasks already stored in Firebase.
 */
export function mayImportLegacyTasksToNewWorkspace(target: 'production' | 'qa'): boolean {
  return target === 'production';
}

/**
 * Owners still persist work through legacy local state changes in QA, but
 * only after the canonical Firestore hydration completed for this identity.
 */
export function canSyncOwnerLocalTaskCache(
  target: 'production' | 'qa',
  hydratedKey: string,
  uid: string,
  workspaceId: string
): boolean {
  if (target === 'production') return true;
  return Boolean(uid && workspaceId && hydratedKey === `${uid}:${workspaceId}`);
}
