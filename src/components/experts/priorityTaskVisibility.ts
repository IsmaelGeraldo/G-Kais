/**
 * The personal history reflects actions the signed-in member completed.
 * The current assignee may change later; it must not rewrite history.
 * Legacy records without a completion actor fall back to their original
 * task assignment, avoiding arbitrary assignment to the Workspace Owner.
 */
export function historyBelongsToMember(
  task: { completedByUid?: string; assignedToUid?: string },
  uid: string,
  isOwner: boolean
): boolean {
  if (!uid) return false;
  if (task.completedByUid) return task.completedByUid === uid;
  return task.assignedToUid === uid || (isOwner && !task.assignedToUid);
}
