import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Plus, ShieldCheck, UserPlus, UsersRound } from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';
import {
  buildExpertWorkspaceInviteLink,
  createExpertWorkspaceInvite,
  createExpertWorkspaceRole,
  hasWorkspacePermission,
  loadExpertWorkspaceTeam,
  type WorkspacePermission,
  type WorkspaceRole,
  type WorkspaceTeamState
} from '../../services/expertsWorkspaceCore';

const PERMISSIONS: Array<{ id: WorkspacePermission; es: string; en: string; group: string }> = [
  { id: 'people.read', es: 'Ver personas', en: 'View people', group: 'Personas' },
  { id: 'people.manage', es: 'Editar personas', en: 'Manage people', group: 'Personas' },
  { id: 'webinars.read', es: 'Ver webinars', en: 'View webinars', group: 'Webinars' },
  { id: 'webinars.manage', es: 'Gestionar webinars', en: 'Manage webinars', group: 'Webinars' },
  { id: 'formations.read', es: 'Ver formaciones', en: 'View formations', group: 'Formaciones' },
  { id: 'formations.manage', es: 'Gestionar formaciones', en: 'Manage formations', group: 'Formaciones' },
  { id: 'mentoring.read', es: 'Ver mentorías', en: 'View mentoring', group: 'Mentorías' },
  { id: 'mentoring.manage', es: 'Gestionar mentorías', en: 'Manage mentoring', group: 'Mentorías' },
  { id: 'tasks.read.own', es: 'Ver su trabajo', en: 'View own work', group: 'Trabajo' },
  { id: 'tasks.manage.own', es: 'Completar su trabajo', en: 'Manage own work', group: 'Trabajo' },
  { id: 'tasks.read.team', es: 'Ver trabajo del equipo', en: 'View team work', group: 'Trabajo' },
  { id: 'tasks.manage', es: 'Asignar y gestionar trabajo', en: 'Assign and manage work', group: 'Trabajo' },
  { id: 'members.read', es: 'Ver equipo', en: 'View team', group: 'Equipo' },
  { id: 'members.manage', es: 'Gestionar miembros', en: 'Manage members', group: 'Equipo' },
  { id: 'roles.read', es: 'Ver roles', en: 'View roles', group: 'Equipo' },
  { id: 'roles.manage', es: 'Crear y editar roles', en: 'Manage roles', group: 'Equipo' },
  { id: 'events.read', es: 'Ver historial de relación', en: 'View relationship history', group: 'Memoria' },
  { id: 'events.create', es: 'Registrar interacciones', en: 'Create interactions', group: 'Memoria' },
  { id: 'audit.read', es: 'Ver auditoría', en: 'View audit log', group: 'Control' },
  { id: 'settings.manage', es: 'Gestionar Workspace', en: 'Manage workspace', group: 'Control' },
  { id: 'billing.manage', es: 'Gestionar facturación', en: 'Manage billing', group: 'Control' }
];

function roleName(roles: WorkspaceRole[], roleId: string) {
  return roles.find((role) => role.id === roleId)?.name || roleId;
}

export function TeamWorkspace({ language }: { language: Language }) {
  const [team, setTeam] = useState<WorkspaceTeamState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [showRole, setShowRole] = useState(false);
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('');
  const [roleNameDraft, setRoleNameDraft] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [rolePermissions, setRolePermissions] = useState<WorkspacePermission[]>([]);
  const [lastInviteLink, setLastInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    try {
      setLoading(true);
      setError('');
      const next = await loadExpertWorkspaceTeam();
      setTeam(next);
      if (!memberRole) {
        const firstRole = next.roles.find((role) => role.id !== 'owner');
        if (firstRole) setMemberRole(firstRole.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'TEAM_LOAD_FAILED');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);

  const canManageMembers = Boolean(team && hasWorkspacePermission(team.currentMember.permissions, 'members.manage'));
  const canManageRoles = Boolean(team && hasWorkspacePermission(team.currentMember.permissions, 'roles.manage'));
  const canReadTeam = Boolean(team && (hasWorkspacePermission(team.currentMember.permissions, 'members.read') || canManageMembers));
  const availablePermissions = useMemo(() => {
    if (!team) return [];
    if (team.currentMember.permissions.includes('*')) return PERMISSIONS;
    return PERMISSIONS.filter((permission) => team.currentMember.permissions.includes(permission.id));
  }, [team]);

  const createInvite = async () => {
    if (!memberName.trim() || !memberEmail.trim() || !memberRole) return;
    setSaving(true);
    setError('');
    try {
      const result = await createExpertWorkspaceInvite({
        displayName: memberName,
        email: memberEmail,
        roleId: memberRole
      });
      const link = buildExpertWorkspaceInviteLink(result.token);
      setLastInviteLink(link);
      setMemberName('');
      setMemberEmail('');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'INVITE_FAILED');
    } finally {
      setSaving(false);
    }
  };

  const createRole = async () => {
    if (!roleNameDraft.trim() || rolePermissions.length === 0) return;
    setSaving(true);
    setError('');
    try {
      await createExpertWorkspaceRole({
        name: roleNameDraft,
        description: roleDescription,
        permissions: rolePermissions
      });
      setRoleNameDraft('');
      setRoleDescription('');
      setRolePermissions([]);
      setShowRole(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ROLE_CREATE_FAILED');
    } finally {
      setSaving(false);
    }
  };

  const copyInvite = async () => {
    if (!lastInviteLink) return;
    try {
      await navigator.clipboard.writeText(lastInviteLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  if (loading && !team) return <div className="rounded-2xl border border-black/10 bg-white p-8 text-sm text-black/45">{language === 'es' ? 'Cargando equipo…' : 'Loading team…'}</div>;
  if (error && !team) return <div className="rounded-2xl border border-[#A23A32]/15 bg-white p-8 text-sm text-[#8D332C]">{error}</div>;
  if (!team) return null;

  return <div className="space-y-5">
    <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'EQUIPO DEL WORKSPACE' : 'WORKSPACE TEAM'}</p>
          <h3 className="mt-2 text-xl font-semibold">{language === 'es' ? 'Personas, roles y permisos' : 'People, roles and permissions'}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/50">{language === 'es' ? 'Cada integrante entra con su propia cuenta y ve únicamente las áreas y el trabajo permitidos por su rol.' : 'Each member signs in with their own account and only sees the areas and work allowed by their role.'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManageMembers && <button type="button" onClick={() => setShowInvite((value) => !value)} className="inline-flex items-center gap-2 rounded-full bg-[#111413] px-4 py-2.5 text-xs font-semibold text-white"><UserPlus className="h-4 w-4" />{language === 'es' ? 'Añadir miembro' : 'Add member'}</button>}
          {canManageRoles && <button type="button" onClick={() => setShowRole((value) => !value)} className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-xs font-semibold text-black/65"><Plus className="h-4 w-4" />{language === 'es' ? 'Crear rol' : 'Create role'}</button>}
        </div>
      </div>
      {error && <p className="mt-4 rounded-xl bg-[#A23A32]/8 px-3 py-2 text-xs text-[#8D332C]">{error}</p>}
    </section>

    {showInvite && canManageMembers && <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
      <div className="flex items-center gap-2"><UserPlus className="h-4 w-4 text-[#0A3F4D]" /><h3 className="font-semibold">{language === 'es' ? 'Invitar al equipo' : 'Invite team member'}</h3></div>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_220px_auto] md:items-end">
        <label><span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-black/35">{language === 'es' ? 'Nombre' : 'Name'}</span><input value={memberName} onChange={(event) => setMemberName(event.target.value)} className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm" placeholder="María López" /></label>
        <label><span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-black/35">Email</span><input type="email" value={memberEmail} onChange={(event) => setMemberEmail(event.target.value)} className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm" placeholder="maria@email.com" /></label>
        <label><span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-black/35">{language === 'es' ? 'Rol' : 'Role'}</span><select value={memberRole} onChange={(event) => setMemberRole(event.target.value)} className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm">{team.roles.filter((role) => role.id !== 'owner').map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
        <button type="button" disabled={saving || !memberName.trim() || !memberEmail.trim() || !memberRole} onClick={() => void createInvite()} className="rounded-xl bg-[#0A3F4D] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40">{language === 'es' ? 'Crear invitación' : 'Create invite'}</button>
      </div>
      {lastInviteLink && <div className="mt-4 flex flex-col gap-2 rounded-xl bg-[#F7F7F5] p-3 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/35">{language === 'es' ? 'ENLACE DE INVITACIÓN' : 'INVITE LINK'}</p><p className="mt-1 truncate text-xs text-black/55">{lastInviteLink}</p></div><button type="button" onClick={() => void copyInvite()} className="inline-flex items-center justify-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-semibold">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? (language === 'es' ? 'Copiado' : 'Copied') : (language === 'es' ? 'Copiar' : 'Copy')}</button></div>}
    </section>}

    {showRole && canManageRoles && <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
      <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#0A3F4D]" /><h3 className="font-semibold">{language === 'es' ? 'Nuevo rol personalizado' : 'New custom role'}</h3></div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label><span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-black/35">{language === 'es' ? 'Nombre del rol' : 'Role name'}</span><input value={roleNameDraft} onChange={(event) => setRoleNameDraft(event.target.value)} className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm" placeholder={language === 'es' ? 'Ej. Setter' : 'e.g. Setter'} /></label>
        <label><span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-black/35">{language === 'es' ? 'Descripción' : 'Description'}</span><input value={roleDescription} onChange={(event) => setRoleDescription(event.target.value)} className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm" placeholder={language === 'es' ? 'Qué función cumple este rol' : 'What this role is responsible for'} /></label>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{Array.from(new Set(availablePermissions.map((item) => item.group))).map((group) => <div key={group} className="rounded-xl border border-black/8 p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-black/35">{group}</p><div className="mt-2 space-y-2">{availablePermissions.filter((item) => item.group === group).map((permission) => <label key={permission.id} className="flex items-center gap-2 text-xs text-black/60"><input type="checkbox" checked={rolePermissions.includes(permission.id)} onChange={(event) => setRolePermissions((current) => event.target.checked ? [...current, permission.id] : current.filter((item) => item !== permission.id))} />{permission[language]}</label>)}</div></div>)}</div>
      <div className="mt-4 flex justify-end"><button type="button" disabled={saving || !roleNameDraft.trim() || rolePermissions.length === 0} onClick={() => void createRole()} className="rounded-full bg-[#111413] px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-40">{language === 'es' ? 'Guardar rol' : 'Save role'}</button></div>
    </section>}

    <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
        <div className="flex items-center justify-between"><div className="flex items-center gap-2"><UsersRound className="h-4 w-4 text-[#0A3F4D]" /><h3 className="font-semibold">{language === 'es' ? 'Miembros' : 'Members'}</h3></div><span className="rounded-full bg-[#0A3F4D]/8 px-3 py-1 text-xs font-semibold text-[#0A3F4D]">{team.members.length}</span></div>
        {!canReadTeam ? <p className="mt-4 text-sm text-black/45">{language === 'es' ? 'Tu rol no permite ver la lista completa del equipo.' : 'Your role cannot view the full team list.'}</p> : <div className="mt-4 divide-y divide-black/5">{team.members.map((member) => <div key={member.uid} className="flex items-center gap-3 py-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#111413] text-xs font-semibold text-white">{member.displayName.split(' ').map((part) => part[0]).slice(0,2).join('').toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{member.displayName || member.email}</p><p className="truncate text-xs text-black/40">{member.email}</p></div><div className="text-right"><p className="text-xs font-semibold text-black/60">{roleName(team.roles, member.roleId)}</p><p className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-black/30">{member.status}</p></div></div>)}</div>}
        {canManageMembers && team.invites.some((invite) => invite.status === 'pending') && <div className="mt-5 border-t border-black/5 pt-4"><p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-black/35">{language === 'es' ? 'INVITACIONES PENDIENTES' : 'PENDING INVITES'}</p><div className="mt-2 space-y-2">{team.invites.filter((invite) => invite.status === 'pending').map((invite) => <div key={invite.id} className="flex items-center justify-between rounded-xl bg-[#F7F7F5] px-3 py-2.5"><div><p className="text-xs font-semibold">{invite.displayName}</p><p className="text-[11px] text-black/40">{invite.email}</p></div><span className="text-[10px] font-semibold text-[#A46F16]">{roleName(team.roles, invite.roleId)}</span></div>)}</div></div>}
      </section>

      <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
        <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#0A3F4D]" /><h3 className="font-semibold">{language === 'es' ? 'Roles disponibles' : 'Available roles'}</h3></div>
        <div className="mt-4 space-y-2">{team.roles.map((role) => <div key={role.id} className="rounded-xl border border-black/7 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{role.name}</p><p className="mt-1 text-xs leading-5 text-black/45">{role.description}</p></div>{role.isSystem && <span className="rounded-full bg-[#F7F7F5] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-black/35">G-KAIS</span>}</div><p className="mt-2 text-[10px] text-black/35">{role.permissions.includes('*') ? (language === 'es' ? 'Acceso total' : 'Full access') : `${role.permissions.length} ${language === 'es' ? 'permisos' : 'permissions'}`}</p></div>)}</div>
      </section>
    </div>
  </div>;
}
