import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canSyncOwnerLocalTaskCache, mayImportLegacyTasksToNewWorkspace } from './expertsTaskBootstrap';

test('a new Firebase QA workspace never imports browser or bundled pilot tasks', () => {
  assert.equal(mayImportLegacyTasksToNewWorkspace('qa'), false);
  assert.equal(mayImportLegacyTasksToNewWorkspace('production'), true);
});

test('QA refuses stale local writes before Firestore has hydrated its owner', () => {
  assert.equal(canSyncOwnerLocalTaskCache('qa', '', 'owner-qa', 'owner-qa'), false);
  assert.equal(canSyncOwnerLocalTaskCache('qa', 'other:workspace', 'owner-qa', 'owner-qa'), false);
  assert.equal(canSyncOwnerLocalTaskCache('qa', 'owner-qa:owner-qa', 'owner-qa', 'owner-qa'), true);
  assert.equal(canSyncOwnerLocalTaskCache('qa', 'owner-qa:owner-qa', 'member-qa', 'owner-qa'), false);
});

test('existing production legacy migration remains unchanged', () => {
  assert.equal(canSyncOwnerLocalTaskCache('production', '', 'owner-prod', 'owner-prod'), true);
});
