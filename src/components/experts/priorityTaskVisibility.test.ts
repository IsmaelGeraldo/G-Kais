import { test } from 'node:test';
import assert from 'node:assert/strict';
import { historyBelongsToMember } from './priorityTaskVisibility';

const owner = 'owner';
const pablo = 'pablo';

test('Owner only sees their own completed actions, not Pablo completions', () => {
  assert.equal(historyBelongsToMember({ completedByUid: owner, assignedToUid: owner }, owner, true), true);
  assert.equal(historyBelongsToMember({ completedByUid: pablo, assignedToUid: pablo }, owner, true), false);
});

test('history follows completion actor even after reassignment', () => {
  const formerOwnerAction = { completedByUid: owner, assignedToUid: pablo };
  assert.equal(historyBelongsToMember(formerOwnerAction, owner, true), true);
  assert.equal(historyBelongsToMember(formerOwnerAction, pablo, false), false);
});

test('Pablo sees his own completions even if reassigned to Owner', () => {
  const formerPabloAction = { completedByUid: pablo, assignedToUid: owner };
  assert.equal(historyBelongsToMember(formerPabloAction, pablo, false), true);
  assert.equal(historyBelongsToMember(formerPabloAction, owner, true), false);
});

test('legacy completion without an actor is scoped to current assignee', () => {
  assert.equal(historyBelongsToMember({ assignedToUid: owner }, owner, true), true);
  assert.equal(historyBelongsToMember({ assignedToUid: pablo }, owner, true), false);
  assert.equal(historyBelongsToMember({ assignedToUid: pablo }, pablo, false), true);
  assert.equal(historyBelongsToMember({}, owner, true), true);
  assert.equal(historyBelongsToMember({}, pablo, false), false);
});
