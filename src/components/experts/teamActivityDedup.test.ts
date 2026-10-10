import assert from 'node:assert/strict';
import { test } from 'node:test';
import { activityMatchesActorSelection, coalesceTaskCompletionActivity, type TaskCompletionActivity } from './teamActivityDedup';

const at = (second = 0) => new Date(Date.UTC(2026, 9, 9, 18, 0, second));
const item = (
  id: string,
  taskId: string | undefined,
  source: TaskCompletionActivity['source'],
  action = 'task.completed',
  date: Date | null = at()
): TaskCompletionActivity => ({ id, taskId, action, source, actorUid: 'pablo', date });

test('completion stored as task and repeated as two relationship events appears once', () => {
  const activities = [
    item('task-done-diego', 'diego-1', 'task'),
    item('event-diego-1', 'diego-1', 'event'),
    item('event-diego-2', 'diego-1', 'event'),
    item('task-create-diego', 'diego-1', 'task', 'task.created'),
    item('event-waiting', 'diego-1', 'event', 'interaction.waiting_reply')
  ];
  assert.deepEqual(coalesceTaskCompletionActivity(activities).map(x => x.id),
    ['task-done-diego', 'task-create-diego', 'event-waiting']);
});

test('different tasks for the same person and same channel keep separate completions', () => {
  const activities = [
    item('task-done-sofia-1', 'sofia-whatsapp-1', 'task'),
    item('task-done-sofia-2', 'sofia-whatsapp-2', 'task'),
    item('event-sofia-1', 'sofia-whatsapp-1', 'event')
  ];
  assert.deepEqual(coalesceTaskCompletionActivity(activities).map(x => x.id),
    ['task-done-sofia-1', 'task-done-sofia-2']);
});

test('legacy event-only duplicates within ten seconds appear once', () => {
  const activities = [
    item('event-1', 'sofia-1', 'event', 'task.completed', at(0)),
    item('event-2', 'sofia-1', 'event', 'task.completed', at(2)),
    item('audit-1', 'sofia-1', 'audit', 'task.completed', at(3))
  ];
  assert.deepEqual(coalesceTaskCompletionActivity(activities).map(x => x.id), ['event-1']);
});

test('separate completion attempts at distant times are kept when snapshot missing', () => {
  const activities = [
    item('event-first', 'task-1', 'event', 'task.completed', at(0)),
    item('event-second', 'task-1', 'event', 'task.completed', at(21))
  ];
  assert.equal(coalesceTaskCompletionActivity(activities).length, 2);
});

test('distinct actors and unrelated activity without task source identity are not hidden', () => {
  const activities = [
    item('event-pablo', 'task-1', 'event'),
    { ...item('event-giovanni', 'task-1', 'event'), actorUid: 'giovanni' },
    item('event-without-task', undefined, 'event'),
    item('audit-other-entity', undefined, 'audit'),
    item('member-updated', 'task-1', 'audit', 'member.updated')
  ];
  assert.equal(coalesceTaskCompletionActivity(activities).length, 5);
});

test('an earlier completion cycle remains visible alongside the latest task snapshot', () => {
  const current = item('task-done-current', 'task-history-1', 'task', 'task.completed', at(45));
  const earlier = item('event-earlier', 'task-history-1', 'event', 'task.completed', at(0));
  const matching = item('event-current', 'task-history-1', 'event', 'task.completed', at(45));
  assert.deepEqual(coalesceTaskCompletionActivity([current, earlier, matching]).map(x => x.id),
    ['task-done-current', 'event-earlier']);
});

test('the same task completed by another actor is not silently hidden', () => {
  const canonical = item('task-done-pablo', 'task-shared', 'task');
  const event = { ...item('event-giovanni', 'task-shared', 'event'), actorUid: 'giovanni' };
  assert.deepEqual(coalesceTaskCompletionActivity([canonical, event]).map(x=>x.id),
    ['task-done-pablo', 'event-giovanni']);
});


test('selected member shows actions performed by member, not creations by task assigner', () => {
  const selectedActors = new Set(['pablo']);
  const completedByPablo = { ...item('task-done-1', 'task-1', 'task'), actorUid: 'pablo', assignedUid: 'pablo' };
  const createdByOwner = { ...item('task-create-1', 'task-1', 'task', 'task.created'), actorUid: 'owner', assignedUid: 'pablo' };
  assert.equal(activityMatchesActorSelection(completedByPablo, selectedActors, true), true);
  assert.equal(activityMatchesActorSelection(createdByOwner, selectedActors, true), false);
  assert.equal(activityMatchesActorSelection(createdByOwner, selectedActors, false), true);
});

test('selected role includes only actions performed by members of that role', () => {
  const roleActors = new Set(['manager-a', 'manager-b']);
  assert.equal(activityMatchesActorSelection({ actorUid: 'manager-b' }, roleActors, true), true);
  assert.equal(activityMatchesActorSelection({ actorUid: 'owner' }, roleActors, true), false);
  assert.equal(activityMatchesActorSelection({ actorUid: '' }, roleActors, true), false);
});
