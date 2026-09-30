import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../lib/firebase';

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
      'tasks.manage.own', 'tasks.manage', 'events.read', 'events.create'
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

export async function ensureExpertWorkspaceCore(user: User): Promise<string> {
  const userRef = userDocument(user.uid);
  const userSnapshot = await getDoc(userRef);
  const existingUser = userSnapshot.exists() ? userSnapshot.data() as { activeWorkspaceId?: string } : null;
  const workspaceId = existingUser?.activeWorkspaceId?.trim() || user.uid;

  if (existingUser?.activeWorkspaceId) return workspaceId;

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
  return workspaceId;
}

export async function resolveActiveExpertWorkspaceId(user: User | null = firebaseAuth.currentUser): Promise<string | null> {
  if (!user) return null;
  const userSnapshot = await getDoc(userDocument(user.uid));
  if (userSnapshot.exists()) {
    const activeWorkspaceId = (userSnapshot.data() as { activeWorkspaceId?: string }).activeWorkspaceId?.trim();
    if (activeWorkspaceId) return activeWorkspaceId;
  }
  return ensureExpertWorkspaceCore(user);
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
  email: string;
  roleId: string;
  permissions: WorkspacePermission[];
  expiresAt?: Date;
}): Promise<string> {
  const user = firebaseAuth.currentUser;
  const workspaceId = await resolveActiveExpertWorkspaceId(user);
  if (!user || !workspaceId) throw new Error('AUTH_REQUIRED');

  const email = input.email.trim();
  const normalizedEmail = email.toLowerCase();
  if (!normalizedEmail) throw new Error('EMAIL_REQUIRED');

  const inviteId = randomId('invite');
  await setDoc(workspaceSubDocument(workspaceId, 'invites', inviteId), {
    schemaVersion: SCHEMA_VERSION,
    email,
    normalizedEmail,
    roleId: input.roleId,
    permissions: Array.from(new Set(input.permissions)),
    status: 'pending',
    invitedByUid: user.uid,
    expiresAt: input.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return inviteId;
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

let initializedUid = '';
if (typeof window !== 'undefined') {
  onAuthStateChanged(firebaseAuth, (user) => {
    if (!user) {
      initializedUid = '';
      return;
    }
    if (initializedUid === user.uid) return;
    initializedUid = user.uid;
    void ensureExpertWorkspaceCore(user).catch(() => {});
  });
}
