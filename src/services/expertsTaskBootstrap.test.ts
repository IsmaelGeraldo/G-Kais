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

import {
  canSyncHydratedRelationshipCache,
  findUnmigratedLocalRecords,
  mayAutoImportLegacyBrowserMemory
} from './expertsPersistenceRecovery';

test('QA memory never auto-imports stale browser-only records into Firestore', () => {
  assert.equal(mayAutoImportLegacyBrowserMemory('qa'), false);
  assert.equal(mayAutoImportLegacyBrowserMemory('production'), true);
  const local = [{ id: 'removed-entry', text: 'local-stale' }, { id: 'same', text: 'older' }];
  const remote = [{ id: 'same', text: 'newer' }];
  assert.deepEqual(findUnmigratedLocalRecords('qa', local, remote), local);
  assert.deepEqual(findUnmigratedLocalRecords('production', local, remote), []);
  assert.deepEqual(findUnmigratedLocalRecords('qa', remote, remote), []);
});

test('QA cannot sync local journal/session cache until own Firestore identity hydrated', () => {
  assert.equal(canSyncHydratedRelationshipCache('qa', '', 'owner-qa', 'owner-qa'), false);
  assert.equal(canSyncHydratedRelationshipCache('qa', 'other:owner-qa', 'owner-qa', 'owner-qa'), false);
  assert.equal(canSyncHydratedRelationshipCache('qa', 'owner-qa:owner-qa', 'owner-qa', 'owner-qa'), true);
  assert.equal(canSyncHydratedRelationshipCache('production', '', 'owner', 'owner'), true);
});
