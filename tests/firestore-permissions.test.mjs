import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  Timestamp,
  where
} from 'firebase/firestore';

/**
 * Runs exclusively against a local Firestore emulator with synthetic identities.
 * NEVER run these tests against production or with real customer records.
 *
 * Run through:
 *   firebase emulators:exec --only firestore --project demo-gkais-rules 'node --test tests/firestore-permissions.test.mjs'
 */
const PROJECT_ID = 'demo-gkais-rules';
let env;

const workspace = (uid, section, id) => `expert_workspaces/${uid}/${section}/${id}`;
const tasks = (db, owner) => collection(db, 'expert_workspaces', owner, 'work_tasks');
const people = (db, owner) => collection(db, 'expert_workspaces', owner, 'people');
const asUser = (uid) => env.authenticatedContext(uid).firestore();
const OWNER_A = 'owner-a';
const OWNER_B = 'owner-b';
const MANAGER_A = 'manager-a';
const ASSISTANT_A = 'assistant-a';
const LIMITED_A = 'limited-a';
const REVOKED_A = 'revoked-a';

async function seed() {
  const now = Timestamp.now();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const owner of [OWNER_A, OWNER_B]) {
      await setDoc(doc(db, 'expert_workspaces', owner), {
        schemaVersion: 1, name: `Workspace ${owner}`, ownerUid: owner,
        status: 'active', createdAt: now, updatedAt: now
      });
      await setDoc(doc(db, workspace(owner, 'members', owner)), {
        uid: owner, roleId: 'owner', status: 'active', permissions: ['*']
      });
    }
    const members = [
      [MANAGER_A, ['people.read', 'tasks.read.team', 'tasks.manage']],
      [ASSISTANT_A, ['people.read', 'tasks.read.own', 'tasks.manage.own']],
      [LIMITED_A, ['tasks.read.own']],
      [REVOKED_A, ['people.read', 'tasks.read.team']]
    ];
    for (const [uid, permissions] of members) {
      await setDoc(doc(db, workspace(OWNER_A, 'members', uid)), {
        uid, roleId: 'assistant', status: uid === REVOKED_A ? 'revoked' : 'active',
        permissions
      });
    }
    for (const owner of [OWNER_A, OWNER_B]) {
      await setDoc(doc(db, workspace(owner, 'people', 'person-1')), {
        schemaVersion: 1, name: `Person ${owner}`,
        email: 'person@example.test', phone: '', normalizedEmail: 'person@example.test',
        normalizedPhone: '', firstSource: 'test', latestSource: 'test',
        currentStage: 'lead', outcomeMemory: {}, sourceRefs: {},
        createdAt: now, updatedAt: now
      });
    }
    for (const [taskId, assignee] of [
      ['owned-by-owner', OWNER_A],
      ['assigned-assistant', ASSISTANT_A]
    ]) {
      await setDoc(doc(db, workspace(OWNER_A, 'work_tasks', taskId)), {
        schemaVersion: 1, updatedAt: now,
        task: {
          id: taskId, clientId: 'client-1', createdAt: '2026-10-09T00:00:00Z',
          type: 'task', status: 'pending', assignedToUid: assignee, createdByUid: OWNER_A
        }
      });
    }
    await setDoc(doc(db, workspace(OWNER_B, 'work_tasks', 'foreign-task')), {
      schemaVersion: 1, updatedAt: now,
      task: {
        id: 'foreign-task', clientId: 'client-b', createdAt: '2026-10-09T00:00:00Z',
        type: 'task', status: 'pending', assignedToUid: OWNER_B, createdByUid: OWNER_B
      }
    });
  });
}

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'FIRESTORE_EMULATOR_HOST is required: run via firebase emulators:exec');
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync('firestore.rules', 'utf8') }
  });
  await seed();
});

after(async () => { await env?.cleanup(); });

test('owner sees people and tasks in own Workspace', async () => {
  const db = asUser(OWNER_A);
  await assertSucceeds(getDoc(doc(db, workspace(OWNER_A, 'people', 'person-1'))));
  await assertSucceeds(getDoc(doc(db, workspace(OWNER_A, 'work_tasks', 'owned-by-owner'))));
});

test('owner A cannot read owner B people, tasks or Workspace', async () => {
  const db = asUser(OWNER_A);
  await assertFails(getDoc(doc(db, workspace(OWNER_B, 'people', 'person-1'))));
  await assertFails(getDoc(doc(db, workspace(OWNER_B, 'work_tasks', 'foreign-task'))));
  await assertFails(getDoc(doc(db, 'expert_workspaces', OWNER_B)));
});

test('unauthenticated client cannot read people or tasks', async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, workspace(OWNER_A, 'people', 'person-1'))));
  await assertFails(getDoc(doc(db, workspace(OWNER_A, 'work_tasks', 'owned-by-owner'))));
});

test('revoked employee cannot read their old Workspace data', async () => {
  const db = asUser(REVOKED_A);
  await assertFails(getDoc(doc(db, workspace(OWNER_A, 'people', 'person-1'))));
  await assertFails(getDoc(doc(db, workspace(OWNER_A, 'work_tasks', 'owned-by-owner'))));
});

test('manager with tasks.read.team can read and list all Workspace tasks', async () => {
  const db = asUser(MANAGER_A);
  await assertSucceeds(getDocs(tasks(db, OWNER_A)));
  await assertSucceeds(getDoc(doc(db, workspace(OWNER_A, 'work_tasks', 'owned-by-owner'))));
});

test('assistant can only list tasks constrained to their own assignment', async () => {
  const db = asUser(ASSISTANT_A);
  const assigned = await assertSucceeds(getDocs(query(tasks(db, OWNER_A), where('task.assignedToUid', '==', ASSISTANT_A))));
  assert.equal(assigned.size, 1);
  assert.equal(assigned.docs[0].id, 'assigned-assistant');
  await assertSucceeds(getDoc(doc(db, workspace(OWNER_A, 'work_tasks', 'assigned-assistant'))));
  await assertFails(getDocs(tasks(db, OWNER_A)));
  await assertFails(getDoc(doc(db, workspace(OWNER_A, 'work_tasks', 'owned-by-owner'))));
});

test('read-own permission alone never grants team-wide task access', async () => {
  const db = asUser(LIMITED_A);
  await assertFails(getDocs(tasks(db, OWNER_A)));
  await assertFails(getDoc(doc(db, workspace(OWNER_A, 'work_tasks', 'owned-by-owner'))));
});

test('people.read grants access to people in own Workspace', async () => {
  await assertSucceeds(getDocs(people(asUser(ASSISTANT_A), OWNER_A)));
});

test('employee with no people.read nor people.manage cannot read people', async () => {
  const db = asUser(LIMITED_A);
  await assertFails(getDocs(people(db, OWNER_A)));
  await assertFails(getDoc(doc(db, workspace(OWNER_A, 'people', 'person-1'))));
});

test('assistant cannot modify a Person or fabricate verified payments', async () => {
  const db = asUser(ASSISTANT_A);
  await assertFails(setDoc(doc(db, workspace(OWNER_A, 'people', 'new-person')), {
    schemaVersion: 1
  }));
  await assertFails(setDoc(doc(db, workspace(OWNER_A, 'payment_events', 'fake-event')), {
    fake: true
  }));
});
