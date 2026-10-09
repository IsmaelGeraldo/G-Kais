/**
 * Collapse duplicate representations of the same task completion in Team
 * activity. A persisted work_tasks snapshot is the canonical representation;
 * relationship/audit events referencing that same task are secondary.
 *
 * Never deduplicate on clientName, title, or displayed text. Different task IDs
 * can produce the same visible label and must remain separate activities.
 */
export type TaskCompletionActivity = {
  id: string;
  action: string;
  source: 'task' | 'event' | 'audit';
  taskId?: string;
  actorUid: string;
  date: Date | null;
};

const LEGACY_REPEAT_WINDOW_MS = 10_000;

export function coalesceTaskCompletionActivity<T extends TaskCompletionActivity>(items: T[]): T[] {
  const snapshotCompletions = new Set(items
    .filter((item) => item.source === 'task' && item.action === 'task.completed' && item.taskId)
    .map((item) => item.taskId));

  // Fallback for older event-only records, where the task snapshot may no
  // longer be among the limited results. Preserve genuinely separate actions
  // when their timestamps are substantially apart.
  const recentEventCompletions = new Map<string, number[]>();

  return items.filter((item) => {
    if (item.action !== 'task.completed' || !item.taskId) return true;
    if (item.source === 'task') return true;
    if (snapshotCompletions.has(item.taskId)) return false;

    const timestamp = item.date?.getTime();
    if (timestamp === undefined || !Number.isFinite(timestamp)) return true;

    const identity = `${item.taskId}:${item.actorUid}`;
    const seen = recentEventCompletions.get(identity) || [];
    if (seen.some((previous) => Math.abs(previous - timestamp) <= LEGACY_REPEAT_WINDOW_MS)) {
      return false;
    }
    seen.push(timestamp);
    recentEventCompletions.set(identity, seen);
    return true;
  });
}
