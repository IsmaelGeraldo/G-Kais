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
  writeBatch,
  updateDoc,
  deleteDoc,
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
const MENTOR_A = 'mentor-a';
const CLOSER_A = 'closer-a';
const CUSTOMER_SUCCESS_A = 'customer-success-a';
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
        schemaVersion: 1, uid: owner, email: owner+'@example.test',
        displayName: 'Owner', roleId: 'owner', status: 'active',
        permissions: ['*'], joinedAt: now, updatedAt: now
      });
    }
    const members = [
      // Match the shipped default role templates. Synthetic accounts are
      // created only in the Firestore Emulator, never in the real Workspace.
      [MANAGER_A, ['people.read', 'people.manage', 'webinars.read', 'webinars.manage',
        'formations.read', 'formations.manage', 'mentoring.read', 'tasks.read.own',
        'tasks.read.team', 'tasks.manage.own', 'tasks.manage', 'members.read',
        'members.manage', 'roles.read', 'roles.manage', 'audit.read',
        'events.read', 'events.create']],
      [MENTOR_A, ['people.read', 'people.manage', 'webinars.read', 'formations.read',
        'mentoring.read', 'mentoring.manage', 'tasks.read.own', 'tasks.read.team',
        'tasks.manage.own', 'tasks.manage', 'members.read', 'roles.read',
        'events.read', 'events.create']],
      [CLOSER_A, ['people.read', 'people.manage', 'webinars.read', 'tasks.read.own',
        'tasks.manage.own', 'events.read', 'events.create']],
      [ASSISTANT_A, ['people.read', 'webinars.read', 'formations.read',
        'tasks.read.own', 'tasks.manage.own', 'events.read', 'events.create']],
      [CUSTOMER_SUCCESS_A, ['people.read', 'people.manage', 'formations.read',
        'formations.manage', 'mentoring.read', 'tasks.read.own', 'tasks.manage.own',
        'events.read', 'events.create']],
      [LIMITED_A, ['tasks.read.own']],
      [REVOKED_A, ['people.read', 'tasks.read.team']]
    ];
    for (const [uid, permissions] of members) {
      await setDoc(doc(db, workspace(OWNER_A, 'members', uid)), {
        schemaVersion: 1, uid, email: uid+'@example.test', displayName: uid,
        roleId: uid === MANAGER_A ? 'manager'
          : uid === MENTOR_A ? 'mentor'
          : uid === CLOSER_A ? 'closer'
          : uid === CUSTOMER_SUCCESS_A ? 'customer-success' : 'assistant',
        status: uid === REVOKED_A ? 'revoked' : 'active',
        permissions, joinedAt: now, updatedAt: now
      });
    }
    for (const owner of [OWNER_A, OWNER_B]) {
      await setDoc(doc(db, workspace(owner, 'roles', 'owner')), {
        schemaVersion: 1, name: 'Owner', description: '', permissions: ['*'],
        isSystem: true, createdByUid: owner, createdAt: now, updatedAt: now
      });
      await setDoc(doc(db, workspace(owner, 'invites', 'invite-test')), {
        normalizedEmail: 'test@example.test', status: 'pending'
      });
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
      ['assigned-assistant', ASSISTANT_A],
      ['assigned-mentor', MENTOR_A],
      ['assigned-closer', CLOSER_A],
      ['assigned-success', CUSTOMER_SUCCESS_A]
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

test('new QA owner can bootstrap Workspace, role, member and user atomically', async () => {
  const uid = 'fresh-qa-owner';
  const db = asUser(uid);
  const now = Timestamp.now();
  const batch = writeBatch(db);
  batch.set(doc(db, 'users', uid), {
    schemaVersion: 1, email: 'fresh@example.test', displayName: 'QA Owner',
    photoURL: '', activeWorkspaceId: uid, createdAt: now, updatedAt: now
  });
  batch.set(doc(db, 'expert_workspaces', uid), {
    schemaVersion: 1, name: 'QA Workspace', ownerUid: uid,
    status: 'active', createdAt: now, updatedAt: now
  });
  batch.set(doc(db, workspace(uid, 'roles', 'owner')), {
    schemaVersion: 1, name: 'Owner', description: 'Full access',
    permissions: ['*'], isSystem: true, createdByUid: uid,
    createdAt: now, updatedAt: now
  });
  batch.set(doc(db, workspace(uid, 'members', uid)), {
    schemaVersion: 1, uid, email: 'fresh@example.test', displayName: 'QA Owner',
    roleId: 'owner', permissions: ['*'], status: 'active',
    joinedAt: now, updatedAt: now
  });
  await assertSucceeds(batch.commit());
  await assertSucceeds(getDoc(doc(db, 'users', uid)));
  await assertSucceeds(getDoc(doc(db, workspace(uid, 'members', uid))));
  await assertSucceeds(getDocs(collection(db, 'expert_workspaces', uid, 'roles')));
});

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

test('owner can open Team: members, roles, and invitations in the same Workspace', async () => {
  const db = asUser(OWNER_A);
  await assertSucceeds(getDocs(collection(db, 'expert_workspaces', OWNER_A, 'members')));
  await assertSucceeds(getDocs(collection(db, 'expert_workspaces', OWNER_A, 'roles')));
  await assertSucceeds(getDocs(collection(db, 'expert_workspaces', OWNER_A, 'invites')));
});

test('active non-manager can list active members and roles, not private invitations', async () => {
  const db = asUser(ASSISTANT_A);
  await assertSucceeds(getDocs(query(
    collection(db, 'expert_workspaces', OWNER_A, 'members'),
    where('status', '==', 'active')
  )));
  await assertSucceeds(getDocs(collection(db, 'expert_workspaces', OWNER_A, 'roles')));
  await assertFails(getDocs(collection(db, 'expert_workspaces', OWNER_A, 'invites')));
});

test('foreign Workspace Team collections remain inaccessible', async () => {
  const db = asUser(OWNER_B);
  await assertFails(getDocs(collection(db, 'expert_workspaces', OWNER_A, 'members')));
  await assertFails(getDocs(collection(db, 'expert_workspaces', OWNER_A, 'roles')));
  await assertFails(getDocs(collection(db, 'expert_workspaces', OWNER_A, 'invites')));
});

test('manager cannot suspend the owner even through direct Firestore update', async () => {
  const db = asUser(MANAGER_A);
  await assertFails(updateDoc(doc(db, workspace(OWNER_A, 'members', OWNER_A)), {
    status: 'suspended', roleId: 'assistant',
    permissions: ['people.read'], updatedAt: Timestamp.now()
  }));
});

test('manager cannot change their own membership, even with members.manage', async () => {
  const db = asUser(MANAGER_A);
  await assertFails(updateDoc(doc(db, workspace(OWNER_A, 'members', MANAGER_A)), {
    status: 'suspended', updatedAt: Timestamp.now()
  }));
  await assertFails(deleteDoc(doc(db, workspace(OWNER_A, 'members', MANAGER_A))));
});

test('manager cannot create another owner or assign owner role to a member', async () => {
  const db = asUser(MANAGER_A);
  const now = Timestamp.now();
  await assertFails(setDoc(doc(db, workspace(OWNER_A, 'members', 'fake-owner')), {
    schemaVersion: 1, uid: 'fake-owner', email: 'fake-owner@example.test',
    displayName: 'Fake Owner', roleId: 'owner', permissions: ['people.read'],
    status: 'active', joinedAt: now, updatedAt: now
  }));
  await assertFails(updateDoc(doc(db, workspace(OWNER_A, 'members', ASSISTANT_A)), {
    roleId: 'owner', permissions: ['people.read'], updatedAt: now
  }));
});

test('owner can still manage a different, non-owner member', async () => {
  const db = asUser(OWNER_A);
  await assertSucceeds(updateDoc(doc(db, workspace(OWNER_A, 'members', LIMITED_A)), {
    displayName: 'Limited member updated', updatedAt: Timestamp.now()
  }));
  const updated = await assertSucceeds(getDoc(doc(db, workspace(OWNER_A, 'members', LIMITED_A))));
  assert.equal(updated.data()?.displayName, 'Limited member updated');
});

test('manager can still manage another member within their own permissions', async () => {
  const db = asUser(MANAGER_A);
  // Do not mutate the Assistant fixture: later tests exercise its real default
  // permissions. Tests must not depend on fixture state left by earlier tests.
  await assertSucceeds(updateDoc(doc(db, workspace(OWNER_A, 'members', LIMITED_A)), {
    permissions: ['people.read'], displayName: 'Limited member managed by manager',
    updatedAt: Timestamp.now()
  }));
});

test('Mentor can read team tasks, but cannot administer Workspace invitations', async () => {
  const db = asUser(MENTOR_A);
  await assertSucceeds(getDocs(tasks(db, OWNER_A)));
  await assertSucceeds(getDocs(people(db, OWNER_A)));
  await assertFails(getDocs(collection(db, 'expert_workspaces', OWNER_A, 'invites')));
});

test('Closer, Assistant and Customer Success can read only their assigned tasks', async () => {
  for (const [uid, taskId] of [
    [CLOSER_A, 'assigned-closer'],
    [ASSISTANT_A, 'assigned-assistant'],
    [CUSTOMER_SUCCESS_A, 'assigned-success']
  ]) {
    const db = asUser(uid);
    const snapshot = await assertSucceeds(getDocs(query(tasks(db, OWNER_A),
      where('task.assignedToUid', '==', uid))));
    assert.equal(snapshot.size, 1, `Expected one assigned task for ${uid}`);
    assert.equal(snapshot.docs[0].id, taskId);
    await assertFails(getDocs(tasks(db, OWNER_A)));
    await assertFails(getDoc(doc(db, workspace(OWNER_A, 'work_tasks', 'owned-by-owner'))));
    await assertSucceeds(getDocs(people(db, OWNER_A)));
    await assertFails(getDocs(collection(db, 'expert_workspaces', OWNER_A, 'invites')));
  }
});

test('every non-owner default role is isolated from a second organization', async () => {
  for (const uid of [MANAGER_A, MENTOR_A, CLOSER_A, ASSISTANT_A, CUSTOMER_SUCCESS_A]) {
    const db = asUser(uid);
    await assertFails(getDoc(doc(db, 'expert_workspaces', OWNER_B)));
    await assertFails(getDoc(doc(db, workspace(OWNER_B, 'work_tasks', 'foreign-task'))));
    await assertFails(getDoc(doc(db, workspace(OWNER_B, 'people', 'person-1'))));
  }
});

test('non-manager default roles cannot edit memberships or verified payments', async () => {
  for (const uid of [MENTOR_A, CLOSER_A, ASSISTANT_A, CUSTOMER_SUCCESS_A]) {
    const db = asUser(uid);
    await assertFails(updateDoc(doc(db, workspace(OWNER_A, 'members', LIMITED_A)), {
      displayName: 'UNAUTHORIZED', updatedAt: Timestamp.now()
    }));
    await assertFails(setDoc(doc(db, workspace(OWNER_A, 'payment_events', 'fake-' + uid)), {
      fake: true
    }));
  }
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
