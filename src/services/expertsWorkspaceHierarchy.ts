/**
 * Pure hierarchy planner used before committing member updates to Firestore.
 * Keeping the plan separate makes cycle, reassign, and batch-limit checks testable.
 */
export type HierarchyMember = {
  uid: string;
  status: string;
  supervisorUid?: string;
};

export type HierarchyChangeInput = {
  workspaceId: string;
  memberUid: string;
  supervisorUid?: string;
  isSupervisor: boolean;
  directReportUids?: string[];
};

export type HierarchyChangePlan = {
  supervisorUid: string;
  requestedDirectReportUids: string[];
  previousDirectReportUids: string[];
  assignDirectReportUids: string[];
  unassignDirectReportUids: string[];
};

export function planHierarchyChange(
  members: readonly HierarchyMember[],
  input: HierarchyChangeInput
): HierarchyChangePlan {
  const memberByUid = new Map(members.map((member) => [member.uid, member]));
  if (!memberByUid.has(input.memberUid)) throw new Error('MEMBER_NOT_FOUND');

  const supervisorUid = (input.supervisorUid || '').trim();
  if (supervisorUid) {
    if (supervisorUid === input.memberUid) throw new Error('SUPERVISOR_CANNOT_BE_SELF');
    const supervisor = memberByUid.get(supervisorUid);
    if (!supervisor) throw new Error('SUPERVISOR_NOT_FOUND');
    if (supervisor.status !== 'active') throw new Error('SUPERVISOR_NOT_ACTIVE');
  }

  const requestedDirectReportUids = Array.from(new Set(
    (input.isSupervisor ? input.directReportUids || [] : [])
      .map((uid) => uid.trim())
      .filter(Boolean)
  ));
  if (requestedDirectReportUids.length > 350) throw new Error('TOO_MANY_DIRECT_REPORTS');
  if (requestedDirectReportUids.includes(input.memberUid)) throw new Error('SUPERVISOR_CANNOT_BE_SELF');
  if (requestedDirectReportUids.includes(input.workspaceId)) throw new Error('OWNER_CANNOT_BE_DIRECT_REPORT');

  for (const uid of requestedDirectReportUids) {
    const report = memberByUid.get(uid);
    if (!report) throw new Error('DIRECT_REPORT_NOT_FOUND');
    if (report.status !== 'active') throw new Error('DIRECT_REPORT_NOT_ACTIVE');
  }

  const previousDirectReportUids = members
    .filter((member) => member.supervisorUid === input.memberUid)
    .map((member) => member.uid);

  const requestedSet = new Set(requestedDirectReportUids);
  const unassignDirectReportUids = previousDirectReportUids
    .filter((uid) => !requestedSet.has(uid));
  const assignDirectReportUids = requestedDirectReportUids
    .filter((uid) => memberByUid.get(uid)?.supervisorUid !== input.memberUid);

  // A Firestore write batch has a maximum of 500 writes. Count only changed
  // report assignments plus the edited member itself.
  if (1 + assignDirectReportUids.length + unassignDirectReportUids.length > 500) {
    throw new Error('TOO_MANY_SUPERVISION_CHANGES');
  }

  const supervisors = new Map(
    members.map((member) => [member.uid, member.supervisorUid || ''])
  );
  supervisors.set(input.memberUid, supervisorUid);
  for (const uid of unassignDirectReportUids) supervisors.set(uid, '');
  for (const uid of assignDirectReportUids) supervisors.set(uid, input.memberUid);

  for (const uid of supervisors.keys()) {
    let cursor = uid;
    const visited = new Set<string>();
    while (cursor) {
      if (visited.has(cursor)) throw new Error('SUPERVISOR_CYCLE');
      visited.add(cursor);
      cursor = supervisors.get(cursor) || '';
    }
  }

  return {
    supervisorUid,
    requestedDirectReportUids,
    previousDirectReportUids,
    assignDirectReportUids,
    unassignDirectReportUids
  };
}
