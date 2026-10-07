import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Copy, Pencil, Plus, Save, ShieldCheck, UserMinus, UserPlus, UsersRound, X, XCircle } from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';
import {
  createExpertWorkspaceInvite,
  createExpertWorkspaceRole,
  hasWorkspacePermission,
  loadExpertWorkspaceTeam,
  type WorkspaceMember,
  type WorkspacePermission,
  type WorkspaceRole,
  type WorkspaceTeamState
} from '../../services/expertsWorkspaceCore';
import { revokeExpertWorkspaceInvite } from '../../services/expertsWorkspaceInvites';
import { removeExpertWorkspaceMember, updateExpertWorkspaceMember } from '../../services/expertsWorkspaceMembers';

const PERMISSIONS: WorkspacePermission[] = ['people.read','people.manage','webinars.read','webinars.manage','formations.read','formations.manage','mentoring.read','mentoring.manage','tasks.read.own','tasks.manage.own','tasks.read.team','tasks.manage','members.read','members.manage','roles.read','roles.manage','events.read','events.create','audit.read','settings.manage','billing.manage'];

function roleName(roles: WorkspaceRole[], id: string) {
  return roles.find((role) => role.id === id)?.name || id;
}

function inviteBaseOrigin() {
  const configured = String(import.meta.env.VITE_PUBLIC_APP_URL || '').trim().replace(/\/+$/, '');
  if (configured) return configured;
  return typeof window !== 'undefined' ? window.location.origin : '';
}

function buildInviteLink(token: string) {
  const origin = inviteBaseOrigin();
  return `${origin}/workspace/experts?invite=${encodeURIComponent(token)}`;
}

function looksPrivatePreview(origin: string) {
  try {
    const host = new URL(origin).hostname.toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || /aistudio|ais-dev|googleusercontent|usercontent/.test(host);
  } catch {
    return true;
  }
}

export function TeamWorkspace({ language }: { language: Language }) {
  const [team, setTeam] = useState<WorkspaceTeamState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [showRole, setShowRole] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [roleNameDraft, setRoleNameDraft] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [rolePermissions, setRolePermissions] = useState<WorkspacePermission[]>([]);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [revokingInvite, setRevokingInvite] = useState('');
  const [confirmingInviteId, setConfirmingInviteId] = useState('');
  const [editingMemberUid, setEditingMemberUid] = useState('');
  const [editingRoleId, setEditingRoleId] = useState('');
  const [editingPermissions, setEditingPermissions] = useState<WorkspacePermission[]>([]);
  const [savingMember, setSavingMember] = useState(false);
  const [removingMember, setRemovingMember] = useState('');
  const [confirmingRemovalUid, setConfirmingRemovalUid] = useState('');

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const next = await loadExpertWorkspaceTeam();
      setTeam(next);
      setRole((current) => current || next.roles.find((item) => item.id !== 'owner')?.id || '');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'TEAM_LOAD_FAILED');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const permissions = team?.currentMember?.permissions || [];
  const canManageMembers = hasWorkspacePermission(permissions, 'members.manage');
  const canManageRoles = hasWorkspacePermission(permissions, 'roles.manage');
  const canRead = hasWorkspacePermission(permissions, 'members.read') || canManageMembers || permissions.includes('*');
  const available = useMemo(
    () => permissions.includes('*') ? PERMISSIONS : PERMISSIONS.filter((permission) => permissions.includes(permission)),
    [permissions]
  );
  const previewLink = looksPrivatePreview(inviteBaseOrigin());
  const pendingInvites = useMemo(() => team?.invites.filter((invite) => invite.status === 'pending') || [], [team]);

  const invite = async () => {
    if (!name.trim() || !email.trim() || !role) return;
    setSaving(true);
    setError('');
    try {
      const result = await createExpertWorkspaceInvite({ displayName: name, email, roleId: role });
      setInviteLink(buildInviteLink(result.token));
      setName('');
      setEmail('');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'INVITE_FAILED');
    } finally {
      setSaving(false);
    }
  };

  const createRole = async () => {
    if (!roleNameDraft.trim() || !rolePermissions.length) return;
    setSaving(true);
    try {
      await createExpertWorkspaceRole({ name: roleNameDraft, description: roleDescription, permissions: rolePermissions });
      setRoleNameDraft('');
      setRoleDescription('');
      setRolePermissions([]);
      setShowRole(false);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ROLE_CREATE_FAILED');
    } finally {
      setSaving(false);
    }
  };

  const cancelInvite = async (inviteId: string) => {
    setRevokingInvite(inviteId);
    setError('');
    try {
      await revokeExpertWorkspaceInvite(inviteId);
      setInviteLink('');
      setConfirmingInviteId('');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'INVITE_REVOKE_FAILED');
    } finally {
      setRevokingInvite('');
    }
  };

  const beginEditMember = (member: WorkspaceMember) => {
    setEditingMemberUid(member.uid);
    setEditingRoleId(member.roleId);
    setEditingPermissions(member.permissions.filter((permission): permission is WorkspacePermission => permission !== '*'));
    setError('');
  };

  const changeEditingRole = (roleId: string) => {
    setEditingRoleId(roleId);
    const selectedRole = team?.roles.find((item) => item.id === roleId);
    setEditingPermissions((selectedRole?.permissions || []).filter((permission): permission is WorkspacePermission => permission !== '*'));
  };

  const saveMember = async () => {
    if (!editingMemberUid || !editingRoleId) return;
    setSavingMember(true);
    setError('');
    try {
      await updateExpertWorkspaceMember({
        memberUid: editingMemberUid,
        roleId: editingRoleId,
        permissions: editingPermissions
      });
      setEditingMemberUid('');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'MEMBER_UPDATE_FAILED');
    } finally {
      setSavingMember(false);
    }
  };

  const removeMember = async (memberUid: string) => {
    setRemovingMember(memberUid);
    setError('');
    try {
      await removeExpertWorkspaceMember(memberUid);
      setEditingMemberUid('');
      setConfirmingRemovalUid('');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'MEMBER_REMOVE_FAILED');
    } finally {
      setRemovingMember('');
    }
  };

  if (loading && !team) {
    return <div className="rounded-2xl border border-black/10 bg-white p-8 text-sm text-black/45">
      {language === 'es' ? 'Cargando equipo…' : 'Loading team…'}
    </div>;
  }

  if (!team) {
    return <div className="rounded-2xl border border-[#A23A32]/15 bg-white p-8">
      <p className="text-sm font-semibold text-[#8D332C]">{language === 'es' ? 'No se pudo cargar Equipo.' : 'Could not load Team.'}</p>
      <p className="mt-1 text-xs text-black/45">{error || 'TEAM_UNAVAILABLE'}</p>
      <button onClick={() => void refresh()} className="mt-3 rounded-full bg-[#111413] px-4 py-2 text-xs font-semibold text-white">
        {language === 'es' ? 'Reintentar' : 'Retry'}
      </button>
    </div>;
  }

  return <div className="space-y-5">
    <section className="rounded-2xl border border-black/10 bg-white p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'EQUIPO' : 'TEAM'}</p>
          <h3 className="mt-2 text-xl font-semibold">{language === 'es' ? 'Personas, roles y permisos' : 'People, roles and permissions'}</h3>
          <p className="mt-2 text-sm text-black/50">{language === 'es' ? 'Cada integrante ve y ejecuta solo lo permitido por su rol.' : 'Each member only sees and executes what their role allows.'}</p>
        </div>
        <div className="flex gap-2">
          {canManageMembers && <button onClick={() => setShowInvite((value) => !value)} className="inline-flex items-center gap-2 rounded-full bg-[#111413] px-4 py-2.5 text-xs font-semibold text-white">
            <UserPlus className="h-4 w-4" />{language === 'es' ? 'Añadir miembro' : 'Add member'}
          </button>}
          {canManageRoles && <button onClick={() => setShowRole((value) => !value)} className="inline-flex items-center gap-2 rounded-full border border-black/10 px-4 py-2.5 text-xs font-semibold">
            <Plus className="h-4 w-4" />{language === 'es' ? 'Crear rol' : 'Create role'}
          </button>}
        </div>
      </div>
      {error && <p className="mt-3 rounded-xl bg-[#A23A32]/8 p-3 text-xs text-[#8D332C]">{error}</p>}
    </section>

    {showInvite && canManageMembers && <section className="rounded-2xl border border-black/10 bg-white p-5">
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_220px_auto]">
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder={language === 'es' ? 'Nombre' : 'Name'} className="rounded-xl border border-black/10 px-3 py-2.5 text-sm" />
        <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" className="rounded-xl border border-black/10 px-3 py-2.5 text-sm" />
        <select value={role} onChange={(event) => setRole(event.target.value)} className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm">
          {team.roles.filter((item) => item.id !== 'owner').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <button disabled={saving} onClick={() => void invite()} className="rounded-xl bg-[#0A3F4D] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40">
          {language === 'es' ? 'Crear invitación' : 'Create invite'}
        </button>
      </div>
      {inviteLink && <div className="mt-3">
        <div className="flex items-center gap-2 rounded-xl bg-[#F7F7F5] p-3">
          <p className="min-w-0 flex-1 truncate text-xs">{inviteLink}</p>
          <button onClick={async () => {
            await navigator.clipboard.writeText(inviteLink);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1200);
          }} className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-3 py-2 text-xs">
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}{language === 'es' ? 'Copiar' : 'Copy'}
          </button>
        </div>
        {previewLink && <div className="mt-2 flex items-start gap-2 rounded-xl bg-[#A46F16]/8 p-3 text-xs leading-5 text-[#82570F]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{language === 'es'
            ? 'Este enlace usa un dominio de vista previa. Puede funcionar en tus dispositivos, pero otra persona puede recibir error. Para invitaciones externas configura VITE_PUBLIC_APP_URL con el dominio público desplegado de G-Kais.'
            : 'This link uses a preview domain. It may work on your devices while failing for someone else. Configure VITE_PUBLIC_APP_URL with the deployed public G-Kais domain for external invites.'}</span>
        </div>}
      </div>}
    </section>}

    {showRole && canManageRoles && <section className="rounded-2xl border border-black/10 bg-white p-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-[#0A3F4D]" />
        <p className="font-semibold">{language === 'es' ? 'Nuevo rol' : 'New role'}</p>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <input value={roleNameDraft} onChange={(event) => setRoleNameDraft(event.target.value)} placeholder={language === 'es' ? 'Nombre del rol' : 'Role name'} className="rounded-xl border border-black/10 px-3 py-2.5 text-sm" />
        <input value={roleDescription} onChange={(event) => setRoleDescription(event.target.value)} placeholder={language === 'es' ? 'Descripción' : 'Description'} className="rounded-xl border border-black/10 px-3 py-2.5 text-sm" />
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {available.map((permission) => <label key={permission} className="flex items-center gap-2 rounded-lg border border-black/8 p-2 text-xs">
          <input type="checkbox" checked={rolePermissions.includes(permission)} onChange={(event) => setRolePermissions((current) => event.target.checked ? [...current, permission] : current.filter((item) => item !== permission))} />
          {permission}
        </label>)}
      </div>
      <button disabled={saving || !rolePermissions.length} onClick={() => void createRole()} className="mt-3 rounded-full bg-[#111413] px-4 py-2.5 text-xs font-semibold text-white">
        {language === 'es' ? 'Guardar rol' : 'Save role'}
      </button>
    </section>}

    {canManageMembers && pendingInvites.length > 0 && <section className="rounded-2xl border border-black/10 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{language === 'es' ? 'Invitaciones pendientes' : 'Pending invitations'}</p>
          <p className="mt-1 text-xs text-black/45">{language === 'es' ? 'Puedes cancelar invitaciones que todavía no fueron aceptadas.' : 'You can cancel invitations that have not been accepted yet.'}</p>
        </div>
        <span className="rounded-full bg-[#F7F7F5] px-2.5 py-1 text-[10px] font-semibold text-black/50">{pendingInvites.length}</span>
      </div>
      <div className="mt-3 divide-y divide-black/5">
        {pendingInvites.map((invite) => <div key={invite.id} className="grid gap-3 py-3 md:grid-cols-[1fr_180px_auto] md:items-center">
          <div>
            <p className="text-sm font-semibold">{invite.displayName || invite.email}</p>
            <p className="mt-1 text-xs text-black/40">{invite.email}</p>
          </div>
          <div>
            <p className="text-xs text-black/50">{roleName(team.roles, invite.roleId)}</p>
            <p className="mt-1 text-[10px] font-semibold text-[#A46F16]">{language === 'es' ? 'Invitación pendiente' : 'Pending invitation'}</p>
          </div>
          {confirmingInviteId === invite.id ? <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="text-[11px] font-medium text-[#8D332C]">{language === 'es' ? '¿Cancelar esta invitación?' : 'Cancel this invitation?'}</span>
            <button
              type="button"
              disabled={revokingInvite === invite.id}
              onClick={() => setConfirmingInviteId('')}
              className="rounded-full border border-black/10 px-3 py-2 text-xs font-semibold text-black/55 disabled:opacity-40"
            >
              {language === 'es' ? 'No' : 'No'}
            </button>
            <button
              type="button"
              disabled={revokingInvite === invite.id}
              onClick={() => void cancelInvite(invite.id)}
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#8D332C] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
            >
              <XCircle className="h-3.5 w-3.5" />
              {revokingInvite === invite.id ? (language === 'es' ? 'Cancelando…' : 'Canceling…') : (language === 'es' ? 'Sí, cancelar' : 'Yes, cancel')}
            </button>
          </div> : <button
            type="button"
            disabled={Boolean(revokingInvite)}
            onClick={() => setConfirmingInviteId(invite.id)}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#A23A32]/15 px-3 py-2 text-xs font-semibold text-[#8D332C] transition hover:bg-[#A23A32]/6 disabled:opacity-40"
          >
            <XCircle className="h-3.5 w-3.5" />
            {language === 'es' ? 'Cancelar invitación' : 'Cancel invitation'}
          </button>}
        </div>)}
      </div>
    </section>}

    <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-2xl border border-black/10 bg-white p-5">
        <div className="flex items-center gap-2">
          <UsersRound className="h-4 w-4 text-[#0A3F4D]" />
          <p className="font-semibold">{language === 'es' ? 'Miembros' : 'Members'}</p>
        </div>
        {canRead ? <div className="mt-3 divide-y divide-black/5">
          {team.members.map((member) => {
            const isOwner = member.uid === team.workspaceId || member.roleId === 'owner';
            const isCurrentMember = member.uid === team.currentUid;
            const canEdit = canManageMembers && !isOwner && !isCurrentMember;
            const isEditing = editingMemberUid === member.uid;

            return <div key={member.uid} className="py-3">
              <div className={`grid gap-2 ${canManageMembers ? 'md:grid-cols-[1fr_160px_90px_auto]' : 'md:grid-cols-[1fr_180px_100px]'} md:items-center`}>
                <div>
                  <p className="text-sm font-semibold">{member.displayName || member.email}</p>
                  <p className="mt-1 text-xs text-black/40">{member.email}</p>
                </div>
                <span className="text-xs text-black/50">{roleName(team.roles, member.roleId)}</span>
                <span className={`text-xs font-semibold ${member.status === 'active' ? 'text-[#17603D]' : 'text-black/45'}`}>{member.status}</span>
                {canManageMembers && (canEdit ? <button
                  type="button"
                  onClick={() => isEditing ? setEditingMemberUid('') : beginEditMember(member)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full border border-black/10 px-3 py-2 text-xs font-semibold text-black/60 transition hover:bg-black/[0.03]"
                >
                  {isEditing ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                  {isEditing ? (language === 'es' ? 'Cerrar' : 'Close') : (language === 'es' ? 'Editar' : 'Edit')}
                </button> : <span
                  className="inline-flex items-center justify-center rounded-full border border-black/8 bg-[#F7F7F5] px-3 py-2 text-[10px] font-semibold text-black/40"
                  title={isOwner
                    ? (language === 'es' ? 'El propietario no se puede eliminar ni cambiar de rol.' : 'The owner cannot be removed or have their role changed.')
                    : (language === 'es' ? 'Tu propia cuenta se protege para evitar perder acceso accidentalmente.' : 'Your own account is protected to prevent accidental loss of access.')}
                >
                  {isOwner
                    ? (language === 'es' ? 'Propietario protegido' : 'Protected owner')
                    : (language === 'es' ? 'Tu cuenta' : 'Your account')}
                </span>)}
              </div>

              {isEditing && <div className="mt-3 rounded-xl border border-black/8 bg-[#F7F7F5] p-4">
                <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-[.12em] text-black/40">{language === 'es' ? 'Rol' : 'Role'}</label>
                    <select
                      value={editingRoleId}
                      onChange={(event) => changeEditingRole(event.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm"
                    >
                      {team.roles.filter((item) => item.id !== 'owner').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                    <p className="mt-2 text-[10px] leading-4 text-black/40">{language === 'es' ? 'Al cambiar el rol cargamos sus permisos base; luego puedes ajustarlos individualmente.' : 'Changing the role loads its default permissions; you can then adjust them individually.'}</p>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-black/40">{language === 'es' ? 'Permisos' : 'Permissions'}</p>
                    <div className="mt-1.5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {available.map((permission) => <label key={permission} className="flex items-center gap-2 rounded-lg border border-black/8 bg-white p-2 text-[11px]">
                        <input
                          type="checkbox"
                          checked={editingPermissions.includes(permission)}
                          onChange={(event) => setEditingPermissions((current) => event.target.checked
                            ? Array.from(new Set([...current, permission]))
                            : current.filter((item) => item !== permission))}
                        />
                        <span className="truncate">{permission}</span>
                      </label>)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-black/7 pt-4">
                  {confirmingRemovalUid === member.uid ? <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-medium text-[#8D332C]">{language === 'es' ? '¿Eliminar este miembro?' : 'Remove this member?'}</span>
                    <button
                      type="button"
                      disabled={removingMember === member.uid || savingMember}
                      onClick={() => setConfirmingRemovalUid('')}
                      className="rounded-full border border-black/10 px-3 py-2 text-xs font-semibold text-black/55 disabled:opacity-40"
                    >
                      {language === 'es' ? 'No' : 'No'}
                    </button>
                    <button
                      type="button"
                      disabled={removingMember === member.uid || savingMember}
                      onClick={() => void removeMember(member.uid)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#8D332C] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                      {removingMember === member.uid
                        ? (language === 'es' ? 'Eliminando…' : 'Removing…')
                        : (language === 'es' ? 'Sí, eliminar' : 'Yes, remove')}
                    </button>
                  </div> : <button
                    type="button"
                    disabled={Boolean(removingMember) || savingMember}
                    onClick={() => setConfirmingRemovalUid(member.uid)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#A23A32]/15 px-3 py-2 text-xs font-semibold text-[#8D332C] transition hover:bg-[#A23A32]/6 disabled:opacity-40"
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                    {language === 'es' ? 'Eliminar miembro' : 'Remove member'}
                  </button>}

                  <button
                    type="button"
                    disabled={savingMember || removingMember === member.uid || !editingRoleId}
                    onClick={() => void saveMember()}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#111413] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {savingMember ? (language === 'es' ? 'Guardando…' : 'Saving…') : (language === 'es' ? 'Guardar cambios' : 'Save changes')}
                  </button>
                </div>
              </div>}
            </div>;
          })}
        </div> : <p className="mt-4 text-sm text-black/45">{language === 'es' ? 'Tu rol no permite ver el equipo completo.' : 'Your role cannot view the full team.'}</p>}
      </section>

      <section className="rounded-2xl border border-black/10 bg-white p-5">
        <p className="font-semibold">{language === 'es' ? 'Roles' : 'Roles'}</p>
        <div className="mt-3 space-y-2">
          {team.roles.map((item) => <div key={item.id} className="rounded-xl bg-[#F7F7F5] p-3">
            <p className="text-sm font-semibold">{item.name}</p>
            <p className="mt-1 text-xs text-black/45">{item.description || '—'}</p>
            <p className="mt-2 text-[10px] text-black/35">{(item.permissions || []).length} {language === 'es' ? 'permisos' : 'permissions'}</p>
          </div>)}
        </div>
      </section>
    </div>
  </div>;
}
