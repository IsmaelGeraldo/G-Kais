import type { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../lib/firebase';
import { buildPublicAppUrl } from '../config/publicAppUrl';

const SCHEMA_VERSION = 1;
const PROFILE_KEY = 'gkais-experts-profile-v1';

export type WorkspacePermission =
  | 'people.read'
  | 'people.manage'
  | 'webinars.read'
  | 'webinars.manage'
  | 'formations.read'
  | 'formations.manage'
  | 'mentoring.read'
  | 'mentoring.manage'
  | 'tasks.read.own'
  | 'tasks.read.team'
  | 'tasks.manage.own'
  | 'tasks.manage'
  | 'members.read'
  | 'members.manage'
  | 'roles.read'
  | 'roles.manage'
  | 'settings.manage'
  | 'audit.read'
  | 'events.read'
  | 'events.create'
  | 'billing.manage';

export type WorkspaceRoleTemplate = {
  id: string;
  name: string;
  description: string;
  permissions: Array<WorkspacePermission | '*'>;
};

export type WorkspaceRole = WorkspaceRoleTemplate & {
  isSystem: boolean;
  createdByUid: string;
};

export type WorkspaceMember = {
  uid: string;
  email: string;
  displayName: string;
  roleId: string;
  permissions: Array<WorkspacePermission | '*'>;
  status: 'active' | 'invited' | 'suspended';
  inviteId?: string;
  supervisorUid?: string;
  isSupervisor?: boolean;
};

export type WorkspaceInvite = {
  id: string;
  displayName: string;
  email: string;
  normalizedEmail: string;
  roleId: string;
  permissions: Array<WorkspacePermission | '*'>;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  invitedByUid: string;
  expiresAt?: { toDate?: () => Date } | Date;
};

export type WorkspaceTeamState = {
  workspaceId: string;
  currentUid: string;
  currentMember: WorkspaceMember;
  members: WorkspaceMember[];
  roles: WorkspaceRole[];
  invites: WorkspaceInvite[];
};

export const DEFAULT_WORKSPACE_ROLES: WorkspaceRoleTemplate[] = [
  {
    id: 'owner',
    name: 'Owner',
    description: 'Control total del Workspace.',
    permissions: ['*']
  },
  {
    id: 'mentor',
    name: 'Mentor',
    description: 'Gestiona personas, mentorías, sesiones y trabajo relacionado.',
    permissions: [
      'people.read', 'people.manage', 'webinars.read', 'formations.read',
      'mentoring.read', 'mentoring.manage', 'tasks.read.own', 'tasks.read.team',
      'tasks.manage.own', 'tasks.manage', 'members.read', 'roles.read',
      'events.read', 'events.create'
    ]
  },
  {
    id: 'manager',
    name: 'Manager',
    description: 'Coordina operación, equipo, alumnos y trabajo delegado.',
    permissions: [
      'people.read', 'people.manage', 'webinars.read', 'webinars.manage',
      'formations.read', 'formations.manage', 'mentoring.read', 'tasks.read.own',
      'tasks.read.team', 'tasks.manage.own', 'tasks.manage', 'members.read',
      'members.manage', 'roles.read', 'roles.manage', 'audit.read',
      'events.read', 'events.create'
    ]
  },
  {
    id: 'closer',
    name: 'Closer',
    description: 'Trabaja oportunidades comerciales y seguimientos asignados.',
    permissions: [
      'people.read', 'people.manage', 'webinars.read', 'tasks.read.own',
      'tasks.manage.own', 'events.read', 'events.create'
    ]
  },
  {
    id: 'assistant',
    name: 'Assistant',
    description: 'Ejecuta tareas operativas y administrativas asignadas.',
    permissions: [
      'people.read', 'webinars.read', 'formations.read', 'tasks.read.own',
      'tasks.manage.own', 'events.read', 'events.create'
    ]
  },
  {
    id: 'customer-success',
    name: 'Customer Success',
    description: 'Acompaña alumnos, continuidad y seguimiento postventa.',
    permissions: [
      'people.read', 'people.manage', 'formations.read', 'formations.manage',
      'mentoring.read', 'tasks.read.own', 'tasks.manage.own',
      'events.read', 'events.create'
    ]
  }
];

export type RelationshipEventInput = {
  personId: string;
  type: string;
  sourceType?: string;
  sourceId?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
  occurredAt?: Date;
};

export type AuditLogInput = {
  entityType: string;
  entityId: string;
  action: string;
  changes?: Record<string, unknown>;
  occurredAt?: Date;
};

let systemRolesEnsuredFor = '';

function sanitize<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => sanitize(item)) as T;
  if (value && typeof value === 'object') {
    if (value instanceof Date) return value;
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, sanitize(item)])
    ) as T;
  }
  return value;
}

function randomId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function safeId(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 180);
}

function localWorkspaceName(user: User): string {
  if (typeof window !== 'undefined') {
    try {
      const profile = JSON.parse(window.localStorage.getItem(PROFILE_KEY) || '{}') as { business?: string };
      if (profile.business?.trim()) return profile.business.trim();
    } catch {}
  }
  return user.displayName?.trim() || user.email?.split('@')[0] || 'G-KAIS Workspace';
}

function userDocument(uid: string) {
  return doc(firestoreDb, 'users', uid);
}

function workspaceDocument(workspaceId: string) {
  return doc(firestoreDb, 'expert_workspaces', workspaceId);
}

function workspaceSubDocument(workspaceId: string, subcollection: string, id: string) {
  return doc(firestoreDb, 'expert_workspaces', workspaceId, subcollection, id);
}

function workspaceSubCollection(workspaceId: string, subcollection: string) {
  return collection(firestoreDb, 'expert_workspaces', workspaceId, subcollection);
}

function inviteExpiryDate(invite: WorkspaceInvite | Omit<WorkspaceInvite, 'id'>): Date | null {
  if (invite.expiresAt instanceof Date) return invite.expiresAt;
  if (invite.expiresAt && typeof invite.expiresAt.toDate === 'function') return invite.expiresAt.toDate();
  return null;
}

export function hasWorkspacePermission(permissions: Array<WorkspacePermission | '*'> | undefined, permission: WorkspacePermission): boolean {
  return Boolean(permissions?.includes('*') || permissions?.includes(permission));
}

async function ensureSystemRolesForOwner(user: User, workspaceId: string): Promise<void> {
  if (workspaceId !== user.uid || systemRolesEnsuredFor === workspaceId) return;
  const snapshot = await getDocs(workspaceSubCollection(workspaceId, 'roles'));
  const existing = new Set(snapshot.docs.map((item) => item.id));
  const batch = writeBatch(firestoreDb);
  const now = serverTimestamp();
  DEFAULT_WORKSPACE_ROLES.forEach((role) => {
    batch.set(workspaceSubDocument(workspaceId, 'roles', role.id), {
      schemaVersion: SCHEMA_VERSION,
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      isSystem: true,
      createdByUid: user.uid,
      ...(!existing.has(role.id) ? { createdAt: now } : {}),
      updatedAt: now
    }, { merge: true });
  });
  await batch.commit();
  systemRolesEnsuredFor = workspaceId;
}

export async function ensureExpertWorkspaceCore(user: User): Promise<string> {
  const userRef = userDocument(user.uid);
  const userSnapshot = await getDoc(userRef);
  const existingUser = userSnapshot.exists() ? userSnapshot.data() as { activeWorkspaceId?: string } : null;
  const workspaceId = existingUser?.activeWorkspaceId?.trim() || user.uid;

  if (existingUser?.activeWorkspaceId) {
    if (workspaceId === user.uid) await ensureSystemRolesForOwner(user, workspaceId).catch(() => {});
    return workspaceId;
  }

  const now = serverTimestamp();
  const batch = writeBatch(firestoreDb);
  const workspaceRef = workspaceDocument(workspaceId);
  const workspaceSnapshot = await getDoc(workspaceRef);

  batch.set(userRef, {
    schemaVersion: SCHEMA_VERSION,
    email: user.email || '',
    displayName: user.displayName || '',
    photoURL: user.photoURL || '',
    activeWorkspaceId: workspaceId,
    createdAt: now,
    updatedAt: now
  }, { merge: true });

  if (!workspaceSnapshot.exists()) {
    batch.set(workspaceRef, {
      schemaVersion: SCHEMA_VERSION,
      name: localWorkspaceName(user),
      ownerUid: user.uid,
      status: 'active',
      createdAt: now,
      updatedAt: now
    });
  }

  DEFAULT_WORKSPACE_ROLES.forEach((role) => {
    batch.set(workspaceSubDocument(workspaceId, 'roles', role.id), {
      schemaVersion: SCHEMA_VERSION,
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      isSystem: true,
      createdByUid: user.uid,
      createdAt: now,
      updatedAt: now
    }, { merge: true });
  });

  batch.set(workspaceSubDocument(workspaceId, 'members', user.uid), {
    schemaVersion: SCHEMA_VERSION,
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || '',
    roleId: 'owner',
    permissions: ['*'],
    status: 'active',
    joinedAt: now,
    updatedAt: now
  }, { merge: true });

  await batch.commit();
  systemRolesEnsuredFor = workspaceId;
  return workspaceId;
}

export async function resolveActiveExpertWorkspaceId(user: User | null = firebaseAuth.currentUser): Promise<string | null> {
  if (!user) return null;
  const userSnapshot = await getDoc(userDocument(user.uid));
  if (!userSnapshot.exists()) return null;

  const activeWorkspaceId = (userSnapshot.data() as { activeWorkspaceId?: string }).activeWorkspaceId?.trim();
  if (!activeWorkspaceId) return null;

  const membershipSnapshot = await getDoc(workspaceSubDocument(activeWorkspaceId, 'members', user.uid));
  if (!membershipSnapshot.exists()) return null;
  const membership = membershipSnapshot.data() as WorkspaceMember;
  if (membership.status !== 'active') return null;

  if (activeWorkspaceId === user.uid) {
    await ensureSystemRolesForOwner(user, activeWorkspaceId).catch(() => {});
  }
  return activeWorkspaceId;
}

export async function getCurrentExpertWorkspaceMember(): Promise<{ workspaceId: string; member: WorkspaceMember } | null> {
  const user = firebaseAuth.currentUser;
  const workspaceId = await resolveActiveExpertWorkspaceId(user);
  if (!user || !workspaceId) return null;
  const snapshot = await getDoc(workspaceSubDocument(workspaceId, 'members', user.uid));
  if (!snapshot.exists()) return null;
  return { workspaceId, member: snapshot.data() as WorkspaceMember };
}

export async function loadExpertWorkspaceTeam(): Promise<WorkspaceTeamState> {
  const user = firebaseAuth.currentUser;
  const workspaceId = await resolveActiveExpertWorkspaceId(user);
  if (!user || !workspaceId) throw new Error('AUTH_REQUIRED');

  const currentMemberSnapshot = await getDoc(workspaceSubDocument(workspaceId, 'members', user.uid));
  if (!currentMemberSnapshot.exists()) throw new Error('MEMBERSHIP_REQUIRED');
  const currentMember = currentMemberSnapshot.data() as WorkspaceMember;

  const canReadMembers = hasWorkspacePermission(currentMember.permissions, 'members.read') || hasWorkspacePermission(currentMember.permissions, 'members.manage');
  const canReadRoles = hasWorkspacePermission(currentMember.permissions, 'roles.read') || hasWorkspacePermission(currentMember.permissions, 'roles.manage');
  const canReadInvites = hasWorkspacePermission(currentMember.permissions, 'members.manage');

  const [membersSnapshot, rolesSnapshot, invitesSnapshot] = await Promise.all([
    canReadMembers ? getDocs(workspaceSubCollection(workspaceId, 'members')) : Promise.resolve(null),
    canReadRoles ? getDocs(workspaceSubCollection(workspaceId, 'roles')) : Promise.resolve(null),
    canReadInvites ? getDocs(workspaceSubCollection(workspaceId, 'invites')) : Promise.resolve(null)
  ]);

  const normalizeMember = (value: unknown, fallbackUid = ''): WorkspaceMember => {
    const data = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    const permissions = Array.isArray(data.permissions)
      ? data.permissions.filter((permission): permission is WorkspacePermission | '*' => typeof permission === 'string')
      : [];
    const status = data.status === 'invited' || data.status === 'suspended' ? data.status : 'active';
    return {
      uid: typeof data.uid === 'string' && data.uid.trim() ? data.uid : fallbackUid,
      email: typeof data.email === 'string' ? data.email : '',
      displayName: typeof data.displayName === 'string' ? data.displayName : '',
      roleId: typeof data.roleId === 'string' ? data.roleId : '',
      permissions,
      status,
      ...(typeof data.inviteId === 'string' && data.inviteId ? { inviteId: data.inviteId } : {}),
      ...(typeof data.supervisorUid === 'string' && data.supervisorUid ? { supervisorUid: data.supervisorUid } : {}),
      ...(typeof data.isSupervisor === 'boolean' ? { isSupervisor: data.isSupervisor } : {})
    };
  };

  const members = membersSnapshot
    ? membersSnapshot.docs.map((item) => normalizeMember(item.data(), item.id))
    : [normalizeMember(currentMember, user.uid)];
  const roles = rolesSnapshot
    ? rolesSnapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<WorkspaceRole, 'id'>) }))
    : [];
  const invites = invitesSnapshot
    ? invitesSnapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<WorkspaceInvite, 'id'>) }))
    : [];

  return {
    workspaceId,
    currentUid: user.uid,
    currentMember,
    members: members.sort((a, b) => (a.displayName || a.email || a.uid).localeCompare(b.displayName || b.email || b.uid)),
    roles: roles.sort((a, b) => a.name.localeCompare(b.name)),
    invites: invites.sort((a, b) => a.displayName.localeCompare(b.displayName))
  };
}

export async function createExpertWorkspaceRole(input: {
  name: string;
  description?: string;
  permissions: WorkspacePermission[];
}): Promise<string> {
  const user = firebaseAuth.currentUser;
  const workspaceId = await resolveActiveExpertWorkspaceId(user);
  if (!user || !workspaceId) throw new Error('AUTH_REQUIRED');

  const roleId = `${safeId(input.name) || 'role'}-${Math.random().toString(36).slice(2, 8)}`;
  await setDoc(workspaceSubDocument(workspaceId, 'roles', roleId), {
    schemaVersion: SCHEMA_VERSION,
    name: input.name.trim(),
    description: (input.description || '').trim(),
    permissions: Array.from(new Set(input.permissions)),
    isSystem: false,
    createdByUid: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return roleId;
}

export async function createExpertWorkspaceInvite(input: {
  displayName: string;
  email: string;
  roleId: string;
  permissions?: WorkspacePermission[];
  expiresAt?: Date;
}): Promise<{ workspaceId: string; inviteId: string; token: string }> {
  const user = firebaseAuth.currentUser;
  const workspaceId = await resolveActiveExpertWorkspaceId(user);
  if (!user || !workspaceId) throw new Error('AUTH_REQUIRED');

  const normalizedEmail = input.email.trim().toLowerCase();
  const email = normalizedEmail;
  const displayName = input.displayName.trim();
  if (!normalizedEmail) throw new Error('EMAIL_REQUIRED');
  if (!displayName) throw new Error('NAME_REQUIRED');

  const roleSnapshot = await getDoc(workspaceSubDocument(workspaceId, 'roles', input.roleId));
  if (!roleSnapshot.exists()) throw new Error('ROLE_NOT_FOUND');
  const role = roleSnapshot.data() as { permissions?: WorkspacePermission[] };
  const permissions = input.permissions?.length ? input.permissions : (role.permissions || []);

  const inviteId = randomId('invite');
  await setDoc(workspaceSubDocument(workspaceId, 'invites', inviteId), {
    schemaVersion: SCHEMA_VERSION,
    displayName,
    email,
    normalizedEmail,
    roleId: input.roleId,
    permissions: Array.from(new Set(permissions)),
    status: 'pending',
    invitedByUid: user.uid,
    expiresAt: input.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return { workspaceId, inviteId, token: `${workspaceId}:${inviteId}` };
}

export function parseExpertWorkspaceInviteToken(token: string): { workspaceId: string; inviteId: string } | null {
  const decoded = token.trim();
  const separator = decoded.indexOf(':');
  if (separator <= 0) return null;
  const workspaceId = decoded.slice(0, separator);
  const inviteId = decoded.slice(separator + 1);
  return workspaceId && inviteId ? { workspaceId, inviteId } : null;
}

export function buildExpertWorkspaceInviteLink(token: string): string {
  return buildPublicAppUrl('/workspace/experts', new URLSearchParams({ invite: token }));
}

export async function getExpertWorkspaceInvite(token: string): Promise<WorkspaceInvite> {
  const parsed = parseExpertWorkspaceInviteToken(token);
  const user = firebaseAuth.currentUser;
  if (!parsed || !user) throw new Error('AUTH_REQUIRED');
  const snapshot = await getDoc(workspaceSubDocument(parsed.workspaceId, 'invites', parsed.inviteId));
  if (!snapshot.exists()) throw new Error('INVITE_NOT_FOUND');
  const invite = { id: snapshot.id, ...(snapshot.data() as Omit<WorkspaceInvite, 'id'>) };
  const expiry = inviteExpiryDate(invite);
  if (invite.status === 'pending' && expiry && expiry.getTime() <= Date.now()) throw new Error('INVITE_EXPIRED');
  return invite;
}

export async function acceptExpertWorkspaceInvite(token: string): Promise<string> {
  const parsed = parseExpertWorkspaceInviteToken(token);
  const user = firebaseAuth.currentUser;
  if (!parsed || !user) throw new Error('AUTH_REQUIRED');

  const inviteRef = workspaceSubDocument(parsed.workspaceId, 'invites', parsed.inviteId);
  const memberRef = workspaceSubDocument(parsed.workspaceId, 'members', user.uid);
  const [inviteSnapshot, memberSnapshot] = await Promise.all([
    getDoc(inviteRef),
    getDoc(memberRef)
  ]);
  if (!inviteSnapshot.exists()) throw new Error('INVITE_NOT_FOUND');

  const invite = inviteSnapshot.data() as Omit<WorkspaceInvite, 'id'>;
  const authEmail = (user.email || '').trim().toLowerCase();
  if (!authEmail || authEmail !== invite.normalizedEmail) throw new Error('INVITE_EMAIL_MISMATCH');
  if (invite.status !== 'pending' && invite.status !== 'accepted') throw new Error('INVITE_NOT_ACTIVE');
  const expiry = inviteExpiryDate(invite);
  if (invite.status === 'pending' && expiry && expiry.getTime() <= Date.now()) throw new Error('INVITE_EXPIRED');

  const userRef = userDocument(user.uid);
  const userSnapshot = await getDoc(userRef);
  const now = serverTimestamp();

  if (invite.status === 'accepted') throw new Error('INVITE_ALREADY_ACCEPTED');
  if (invite.status !== 'pending') throw new Error('INVITE_NOT_ACTIVE');

  const batch = writeBatch(firestoreDb);
  batch.set(memberRef, {
    schemaVersion: SCHEMA_VERSION,
    uid: user.uid,
    email: user.email || invite.email,
    displayName: invite.displayName || user.displayName || user.email || 'Miembro',
    roleId: invite.roleId,
    permissions: invite.permissions,
    status: 'active',
    inviteId: parsed.inviteId,
    joinedAt: now,
    updatedAt: now
  });

  batch.set(userRef, {
    schemaVersion: SCHEMA_VERSION,
    email: user.email || '',
    displayName: user.displayName || invite.displayName || '',
    photoURL: user.photoURL || '',
    activeWorkspaceId: parsed.workspaceId,
    ...(!userSnapshot.exists() ? { createdAt: now } : {}),
    updatedAt: now
  }, { merge: true });

  batch.update(inviteRef, { status: 'accepted', updatedAt: now });
  await batch.commit();
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('gkais:workspace-membership-changed'));
  return parsed.workspaceId;
}

export async function appendExpertRelationshipEvent(input: RelationshipEventInput): Promise<string> {
  const user = firebaseAuth.currentUser;
  const workspaceId = await resolveActiveExpertWorkspaceId(user);
  if (!user || !workspaceId) throw new Error('AUTH_REQUIRED');
  if (!input.personId.trim() || !input.type.trim()) throw new Error('INVALID_EVENT');

  const deterministic = input.idempotencyKey?.trim();
  const eventId = deterministic ? `evt-${safeId(deterministic)}` : randomId('evt');
  const eventRef = workspaceSubDocument(workspaceId, 'relationship_events', eventId);
  if (deterministic && (await getDoc(eventRef)).exists()) return eventId;

  await setDoc(eventRef, {
    schemaVersion: SCHEMA_VERSION,
    personId: input.personId.trim(),
    type: input.type.trim(),
    sourceType: (input.sourceType || '').trim(),
    sourceId: (input.sourceId || '').trim(),
    actorUid: user.uid,
    idempotencyKey: deterministic || '',
    metadata: sanitize(input.metadata || {}),
    occurredAt: input.occurredAt || new Date(),
    createdAt: serverTimestamp()
  });
  return eventId;
}

export async function appendExpertAuditLog(input: AuditLogInput): Promise<string> {
  const user = firebaseAuth.currentUser;
  const workspaceId = await resolveActiveExpertWorkspaceId(user);
  if (!user || !workspaceId) throw new Error('AUTH_REQUIRED');

  const logId = randomId('audit');
  await setDoc(workspaceSubDocument(workspaceId, 'audit_logs', logId), {
    schemaVersion: SCHEMA_VERSION,
    entityType: input.entityType.trim(),
    entityId: input.entityId.trim(),
    action: input.action.trim(),
    actorUid: user.uid,
    changes: sanitize(input.changes || {}),
    occurredAt: input.occurredAt || new Date(),
    createdAt: serverTimestamp()
  });
  return logId;
}
