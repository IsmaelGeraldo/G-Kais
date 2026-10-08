import assert from 'node:assert/strict';
import test from 'node:test';
import { planHierarchyChange, type HierarchyMember } from './expertsWorkspaceHierarchy';

const base: HierarchyMember[] = [
  { uid: 'owner', status: 'active' },
  { uid: 'lead', status: 'active' },
  { uid: 'otherLead', status: 'active' },
  { uid: 'a', status: 'active', supervisorUid: 'lead' },
  { uid: 'b', status: 'active', supervisorUid: 'lead' },
  { uid: 'c', status: 'active', supervisorUid: 'otherLead' }
];

const plan = (input: Partial<Parameters<typeof planHierarchyChange>[1]>, members = base) =>
  planHierarchyChange(members, {
    workspaceId: 'owner',
    memberUid: 'lead',
    supervisorUid: '',
    isSupervisor: true,
    directReportUids: ['a', 'b'],
    ...input
  });

test('keeps existing report assignments without unnecessary writes', () => {
  const result = plan({});
  assert.deepEqual(result.assignDirectReportUids, []);
  assert.deepEqual(result.unassignDirectReportUids, []);
  assert.deepEqual(result.requestedDirectReportUids, ['a', 'b']);
});

test('appoints a supervisor with no direct reports', () => {
  const result = plan({ memberUid: 'otherLead', isSupervisor: true, directReportUids: [] });
  assert.deepEqual(result.requestedDirectReportUids, []);
  assert.deepEqual(result.unassignDirectReportUids, ['c']);
});

test('reassigns direct reports from another supervisor', () => {
  const result = plan({ directReportUids: ['a', 'c'] });
  assert.deepEqual(result.assignDirectReportUids, ['c']);
  assert.deepEqual(result.unassignDirectReportUids, ['b']);
});

test('disabling supervisor unassigns all previous direct reports', () => {
  const result = plan({ isSupervisor: false });
  assert.deepEqual(result.requestedDirectReportUids, []);
  assert.deepEqual(result.unassignDirectReportUids.sort(), ['a', 'b']);
});

test('rejects self supervision and assigning the owner', () => {
  assert.throws(() => plan({ supervisorUid: 'lead' }), /SUPERVISOR_CANNOT_BE_SELF/);
  assert.throws(() => plan({ directReportUids: ['lead'] }), /SUPERVISOR_CANNOT_BE_SELF/);
  assert.throws(() => plan({ directReportUids: ['owner'] }), /OWNER_CANNOT_BE_DIRECT_REPORT/);
});

test('rejects missing or inactive supervisors and direct reports', () => {
  assert.throws(() => plan({ supervisorUid: 'missing' }), /SUPERVISOR_NOT_FOUND/);
  assert.throws(() => plan({ directReportUids: ['missing'] }), /DIRECT_REPORT_NOT_FOUND/);
  const suspended = [...base, { uid: 'suspended', status: 'suspended' }];
  assert.throws(() => plan({ supervisorUid: 'suspended' }, suspended), /SUPERVISOR_NOT_ACTIVE/);
  assert.throws(() => plan({ directReportUids: ['suspended'] }, suspended), /DIRECT_REPORT_NOT_ACTIVE/);
});

test('rejects cycles created by reversing reporting lines', () => {
  assert.throws(() => plan({ supervisorUid: 'a' }), /SUPERVISOR_CYCLE/);
  assert.throws(() => plan({ directReportUids: ['a', 'b', 'owner'] }), /OWNER_CANNOT_BE_DIRECT_REPORT/);
});

test('deduplicates and trims report IDs', () => {
  const result = plan({ directReportUids: ['a', 'a', ' b ', ''] });
  assert.deepEqual(result.requestedDirectReportUids, ['a', 'b']);
});

test('enforces the Firestore 500-write batch limit after planning changes', () => {
  const members = [
    { uid: 'owner', status: 'active' },
    { uid: 'lead', status: 'active' },
    ...Array.from({ length: 350 }, (_, i) => ({ uid: `old-${i}`, status: 'active', supervisorUid: 'lead' })),
    ...Array.from({ length: 350 }, (_, i) => ({ uid: `new-${i}`, status: 'active' }))
  ];
  const input = Array.from({ length: 350 }, (_, i) => `new-${i}`);
  assert.throws(() => plan({ directReportUids: input }, members), /TOO_MANY_SUPERVISION_CHANGES/);
});

test('allows the largest valid assignment batch', () => {
  const members = [
    { uid: 'owner', status: 'active' },
    { uid: 'lead', status: 'active' },
    ...Array.from({ length: 350 }, (_, i) => ({ uid: `old-${i}`, status: 'active', supervisorUid: 'lead' })),
    ...Array.from({ length: 149 }, (_, i) => ({ uid: `new-${i}`, status: 'active' }))
  ];
  const result = plan({ directReportUids: Array.from({ length: 149 }, (_, i) => `new-${i}`) }, members);
  assert.equal(result.unassignDirectReportUids.length + result.assignDirectReportUids.length + 1, 500);
});
