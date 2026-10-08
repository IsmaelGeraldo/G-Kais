import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Copy, Pencil, Plus, Save, ShieldCheck, UserMinus, UserPlus, UsersRound, X, XCircle } from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';
import { buildPublicAppUrl, isPrivateOrPreviewAppOrigin } from '../../config/publicAppUrl';
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

function normalizePermissionList(value: unknown): WorkspacePermission[] {
  if (!Array.isArray(value)) return [];
  const selected = new Set(value.filter((item): item is string => typeof item === 'string'));
  return PERMISSIONS.filter((permission) => selected.has(permission));
}

type PermissionGroup = 'people' | 'programs' | 'work' | 'team' | 'system';

const PERMISSION_META: Record<WorkspacePermission, {
  group: PermissionGroup;
  label: { es: string; en: string };
  description: { es: string; en: string };
}> = {
  'people.read': { group: 'people', label: { es: 'Ver personas', en: 'View people' }, description: { es: 'Consultar contactos, alumnos, clientes y relaciones.', en: 'View contacts, students, clients and relationships.' } },
  'people.manage': { group: 'people', label: { es: 'Gestionar personas', en: 'Manage people' }, description: { es: 'Crear, editar y actualizar información de personas.', en: 'Create, edit and update people records.' } },
  'webinars.read': { group: 'programs', label: { es: 'Ver webinars', en: 'View webinars' }, description: { es: 'Consultar webinars, participantes y actividad relacionada.', en: 'View webinars, attendees and related activity.' } },
  'webinars.manage': { group: 'programs', label: { es: 'Gestionar webinars', en: 'Manage webinars' }, description: { es: 'Crear, editar y administrar webinars.', en: 'Create, edit and manage webinars.' } },
  'formations.read': { group: 'programs', label: { es: 'Ver formaciones', en: 'View formations' }, description: { es: 'Consultar cursos, alumnos y cohortes.', en: 'View courses, students and cohorts.' } },
  'formations.manage': { group: 'programs', label: { es: 'Gestionar formaciones', en: 'Manage formations' }, description: { es: 'Modificar formaciones, alumnos y seguimiento.', en: 'Manage formations, students and follow-up.' } },
  'mentoring.read': { group: 'programs', label: { es: 'Ver mentorías', en: 'View mentoring' }, description: { es: 'Consultar clientes, sesiones y procesos de mentoría.', en: 'View mentoring clients, sessions and processes.' } },
  'mentoring.manage': { group: 'programs', label: { es: 'Gestionar mentorías', en: 'Manage mentoring' }, description: { es: 'Administrar clientes, sesiones y estados de mentoría.', en: 'Manage mentoring clients, sessions and statuses.' } },
  'tasks.read.own': { group: 'work', label: { es: 'Ver mis tareas', en: 'View my tasks' }, description: { es: 'Consultar únicamente el trabajo asignado a esta persona.', en: 'View work assigned to this person.' } },
  'tasks.manage.own': { group: 'work', label: { es: 'Gestionar mis tareas', en: 'Manage my tasks' }, description: { es: 'Actualizar, completar o reprogramar sus propias tareas.', en: 'Update, complete or reschedule own tasks.' } },
  'tasks.read.team': { group: 'work', label: { es: 'Ver tareas del equipo', en: 'View team tasks' }, description: { es: 'Consultar trabajo asignado a otros miembros.', en: 'View work assigned to other members.' } },
  'tasks.manage': { group: 'work', label: { es: 'Gestionar tareas del equipo', en: 'Manage team tasks' }, description: { es: 'Crear, asignar y modificar tareas de otras personas.', en: 'Create, assign and update other people\'s tasks.' } },
  'events.read': { group: 'work', label: { es: 'Ver actividad y eventos', en: 'View activity and events' }, description: { es: 'Consultar actividad operativa y eventos registrados.', en: 'View operational activity and recorded events.' } },
  'events.create': { group: 'work', label: { es: 'Registrar eventos', en: 'Create events' }, description: { es: 'Registrar nueva actividad o eventos operativos.', en: 'Record new operational activity or events.' } },
  'members.read': { group: 'team', label: { es: 'Ver equipo', en: 'View team' }, description: { es: 'Consultar miembros y su información de trabajo.', en: 'View members and their work information.' } },
  'members.manage': { group: 'team', label: { es: 'Gestionar miembros', en: 'Manage members' }, description: { es: 'Invitar, editar roles, permisos o eliminar miembros.', en: 'Invite, edit roles, permissions or remove members.' } },
  'roles.read': { group: 'team', label: { es: 'Ver roles', en: 'View roles' }, description: { es: 'Consultar los roles y permisos definidos.', en: 'View defined roles and permissions.' } },
  'roles.manage': { group: 'team', label: { es: 'Gestionar roles', en: 'Manage roles' }, description: { es: 'Crear y modificar roles y sus permisos.', en: 'Create and modify roles and permissions.' } },
  'audit.read': { group: 'system', label: { es: 'Ver auditoría', en: 'View audit log' }, description: { es: 'Consultar historial de cambios y acciones administrativas.', en: 'View history of changes and administrative actions.' } },
  'settings.manage': { group: 'system', label: { es: 'Gestionar configuración', en: 'Manage settings' }, description: { es: 'Modificar configuración organizacional del Workspace.', en: 'Change organizational Workspace settings.' } },
  'billing.manage': { group: 'system', label: { es: 'Gestionar facturación', en: 'Manage billing' }, description: { es: 'Acceder y modificar información de planes y pagos.', en: 'Access and modify plan and billing information.' } }
};

const PERMISSION_GROUPS: PermissionGroup[] = ['people', 'programs', 'work', 'team', 'system'];
const PERMISSION_GROUP_LABELS: Record<PermissionGroup, { es: string; en: string }> = {
  people: { es: 'Personas', en: 'People' },
  programs: { es: 'Programas', en: 'Programs' },
  work: { es: 'Trabajo y actividad', en: 'Work & activity' },
  team: { es: 'Equipo y permisos', en: 'Team & permissions' },
  system: { es: 'Sistema', en: 'System' }
};

function PermissionChecklist({
  available,
  selected,
  setSelected,
  language
}: {
  available: WorkspacePermission[];
  selected: WorkspacePermission[];
  setSelected: React.Dispatch<React.SetStateAction<WorkspacePermission[]>>;
  language: Language;
}) {
  return <div className="space-y-4">
    {PERMISSION_GROUPS.map((group) => {
      const groupPermissions = available.filter((permission) => PERMISSION_META[permission]?.group === group);
      if (!groupPermissions.length) return null;
      return <div key={group}>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-black/35">{PERMISSION_GROUP_LABELS[group][language]}</p>
        <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
          {groupPermissions.map((permission) => {
            const meta = PERMISSION_META[permission];
            if (!meta) return null;
            return <label key={permission} className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-black/8 bg-white p-3 transition hover:border-black/15">
              <input
                type="checkbox"
                checked={Array.isArray(selected) && selected.includes(permission)}
                onChange={(event) => setSelected((current) => event.target.checked
                  ? Array.from(new Set([...current, permission]))
                  : current.filter((item) => item !== permission))}
                className="mt-0.5"
              />
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-black/75">{meta.label[language]}</span>
                <span className="mt-1 block text-[10px] leading-4 text-black/40">{meta.description[language]}</span>
              </span>
            </label>;
          })}
        </div>
      </div>;
    })}
  </div>;
}

class TeamEditorBoundary extends React.Component<{
  children: React.ReactNode;
  resetKey: string;
  language: Language;
  onClose: () => void;
}, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(previous: Readonly<{ resetKey: string }>) {
    if (previous.resetKey !== this.props.resetKey && this.state.failed) {
      this.setState({ failed: false });
    }
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <section className="rounded-2xl border border-[#A23A32]/15 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8D332C]">G-KAIS · EQUIPO</p>
      <p className="mt-2 text-sm font-semibold">{this.props.language === 'es' ? 'No pudimos abrir este editor.' : 'We could not open this editor.'}</p>
      <p className="mt-1 text-xs leading-5 text-black/45">{this.props.language === 'es'
        ? 'El resto del Workspace sigue disponible. Cierra el editor y vuelve a intentarlo después de recargar Equipo.'
        : 'The rest of the Workspace remains available. Close the editor and retry after reloading Team.'}</p>
      <button type="button" onClick={this.props.onClose} className="mt-4 rounded-full bg-[#111413] px-4 py-2 text-xs font-semibold text-white">
        {this.props.language === 'es' ? 'Cerrar editor' : 'Close editor'}
      </button>
    </section>;
  }
}

function roleName(roles: WorkspaceRole[], id: string) {
  return roles.find((role) => role.id === id)?.name || id;
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
  const [inviteNotice, setInviteNotice] = useState('');
  const [editingMemberUid, setEditingMemberUid] = useState('');
  const [editingRoleId, setEditingRoleId] = useState('');
  const [editingPermissions, setEditingPermissions] = useState<WorkspacePermission[]>([]);
  const [editingSupervisorUid, setEditingSupervisorUid] = useState('');
  const [editingDirectReportUids, setEditingDirectReportUids] = useState<string[]>([]);
  const [editingIsSupervisor, setEditingIsSupervisor] = useState(false);
  const [reportRoleFilter, setReportRoleFilter] = useState('all');
  const [editingPermissionsOpen, setEditingPermissionsOpen] = useState(false);
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
  const previewLink = isPrivateOrPreviewAppOrigin();
  const pendingInvites = useMemo(() => team?.invites.filter((invite) => invite.status === 'pending') || [], [team]);
  const memberLabel = (uid?: string) => {
    if (!uid || !team) return language === 'es' ? 'Sin supervisor' : 'No supervisor';
    const member = team.members.find((item) => item.uid === uid);
    return member?.displayName || member?.email || uid;
  };

  const editingMember = useMemo(
    () => team?.members.find((member) => member.uid === editingMemberUid) || null,
    [team, editingMemberUid]
  );
  const editableRoles = useMemo(
    () => (team?.roles || []).filter((item) => item && typeof item.id === 'string' && item.id !== 'owner'),
    [team]
  );
  const supervisorOptions = useMemo(
    () => (team?.members || []).filter((item) =>
      item &&
      item.status === 'active' &&
      typeof item.uid === 'string' &&
      item.uid &&
      item.uid !== editingMemberUid
    ),
    [team, editingMemberUid]
  );

  const directReportOptions = useMemo(
    () => (team?.members || []).filter((item) =>
      item &&
      item.status === 'active' &&
      typeof item.uid === 'string' &&
      item.uid &&
      item.uid !== editingMemberUid &&
      item.uid !== team?.workspaceId
    ),
    [team, editingMemberUid]
  );

  const directReportCount = (uid: string) =>
    (team?.members || []).filter((item) => item.supervisorUid === uid && item.status === 'active').length;

  const invite = async () => {
    if (!name.trim() || !email.trim() || !role) return;
    setSaving(true);
    setError('');
    try {
      const result = await createExpertWorkspaceInvite({ displayName: name, email, roleId: role });
      setInviteLink(buildPublicAppUrl('/workspace/experts', new URLSearchParams({ invite: result.token })));
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
    setInviteNotice('');
    try {
      await revokeExpertWorkspaceInvite(inviteId);
      setInviteLink('');
      setConfirmingInviteId('');
      setInviteNotice(language === 'es' ? 'Invitación cancelada correctamente.' : 'Invitation cancelled successfully.');
      await refresh();
    } catch (cause) {
      setInviteNotice('');
      setError(cause instanceof Error ? cause.message : 'INVITE_REVOKE_FAILED');
    } finally {
      setRevokingInvite('');
    }
  };

  const beginEditMember = (member: WorkspaceMember) => {
    const editableRoles = (team?.roles || []).filter((item) => item.id !== 'owner');
    const selectedRole = editableRoles.some((item) => item.id === member.roleId)
      ? member.roleId
      : editableRoles[0]?.id || '';
    const memberPermissions = normalizePermissionList(member.permissions);
    const rolePermissions = normalizePermissionList(editableRoles.find((item) => item.id === selectedRole)?.permissions);
    const nextPermissions = memberPermissions.length ? memberPermissions : rolePermissions;

    setEditingMemberUid(member.uid);
    setEditingRoleId(selectedRole);
    setEditingPermissions(nextPermissions);
    setEditingSupervisorUid(member.supervisorUid || '');
    const reports = (team?.members || [])
      .filter((item) => item.status === 'active' && item.supervisorUid === member.uid)
      .map((item) => item.uid);
    setEditingDirectReportUids(reports);
    setEditingIsSupervisor(member.isSupervisor === true || reports.length > 0);
    setReportRoleFilter('all');
    setEditingPermissionsOpen(false);
    setConfirmingRemovalUid('');
    setError('');
  };

  const changeEditingRole = (roleId: string) => {
    setEditingRoleId(roleId);
    const selectedRole = team?.roles.find((item) => item.id === roleId);
    setEditingPermissions(normalizePermissionList(selectedRole?.permissions));
  };

  const copyInviteLink = async () => {
    if (!inviteLink) return;
    setError('');
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteLink);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = inviteLink;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const copiedWithFallback = document.execCommand('copy');
        textarea.remove();
        if (!copiedWithFallback) throw new Error('COPY_NOT_AVAILABLE');
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
      setError(language === 'es'
        ? 'No se pudo copiar automáticamente. Selecciona el enlace y cópialo manualmente.'
        : 'The link could not be copied automatically. Select it and copy it manually.');
    }
  };

  const saveMember = async () => {
    if (!editingMemberUid || !editingRoleId) return;
    setSavingMember(true);
    setError('');
    try {
      await updateExpertWorkspaceMember({
        memberUid: editingMemberUid,
        roleId: editingRoleId,
        permissions: editingPermissions,
        supervisorUid: editingSupervisorUid,
        directReportUids: editingIsSupervisor ? editingDirectReportUids : [],
        isSupervisor: editingIsSupervisor
      });
      setEditingMemberUid('');
      setEditingSupervisorUid('');
      setEditingDirectReportUids([]);
      setEditingIsSupervisor(false);
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
      {inviteNotice && <p className="mt-3 rounded-xl bg-[#17603D]/8 p-3 text-xs font-medium text-[#17603D]">{inviteNotice}</p>}
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
          <button type="button" onClick={() => void copyInviteLink()} className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-3 py-2 text-xs">
            <Copy className="h-3 w-3" />{copied ? (language === 'es' ? 'Copiado' : 'Copied') : (language === 'es' ? 'Copiar' : 'Copy')}
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
      <div className="mt-5">
        <PermissionChecklist available={available} selected={rolePermissions} setSelected={setRolePermissions} language={language} />
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



    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <section className="min-w-0 rounded-2xl border border-black/10 bg-white p-5">
        <div className="flex items-center gap-2">
          <UsersRound className="h-4 w-4 text-[#0A3F4D]" />
          <p className="font-semibold">{language === 'es' ? 'Miembros' : 'Members'}</p>
        </div>
        {canManageMembers && <p className="mt-2 text-[11px] leading-5 text-black/45">
          {language === 'es'
            ? 'Editar aparece en miembros que ya aceptaron la invitación. La cuenta Owner y tu propia cuenta están protegidas para evitar perder acceso accidentalmente.'
            : 'Edit appears for members who have accepted their invitation. The Owner account and your own account are protected to prevent accidental loss of access.'}
        </p>}
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
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-black/50">{roleName(team.roles, member.roleId)}</span>
                    {(member.isSupervisor || directReportCount(member.uid) > 0) && <span className="rounded-full bg-[#0A3F4D]/8 px-2 py-0.5 text-[9px] font-semibold text-[#0A3F4D]">
                      {language === 'es' ? 'Supervisor' : 'Supervisor'} · {directReportCount(member.uid)}
                    </span>}
                  </div>
                  {member.supervisorUid && <p className="mt-1 truncate text-[10px] text-black/35">{language === 'es' ? 'Reporta a' : 'Reports to'}: {memberLabel(member.supervisorUid)}</p>}
                </div>
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

              {isEditing && editingMember && canManageMembers && <TeamEditorBoundary
      resetKey={editingMember.uid}
      language={language}
      onClose={() => { setEditingMemberUid(''); setEditingSupervisorUid(''); setEditingDirectReportUids([]); setEditingIsSupervisor(false); setConfirmingRemovalUid(''); }}
    ><section className="mt-3 w-full min-w-0 rounded-2xl border border-black/10 bg-[#FBFBFA] p-3 shadow-sm sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'EDITAR MIEMBRO' : 'EDIT MEMBER'}</p>
          <h3 className="mt-2 text-xl font-semibold">{editingMember.displayName || editingMember.email || (language === 'es' ? 'Miembro' : 'Member')}</h3>
          <p className="mt-1 text-xs text-black/40">{editingMember.email || '—'}</p>
        </div>
        <button
          type="button"
          onClick={() => { setEditingMemberUid(''); setEditingSupervisorUid(''); setEditingDirectReportUids([]); setEditingIsSupervisor(false); setConfirmingRemovalUid(''); }}
          className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-2 text-xs font-semibold text-black/55"
        >
          <X className="h-3.5 w-3.5" />{language === 'es' ? 'Cerrar' : 'Close'}
        </button>
      </div>

      <div className="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))]">
        <div className="rounded-xl border border-black/8 bg-[#F7F7F5] p-4">
          <label className="text-[10px] font-semibold uppercase tracking-[.12em] text-black/40">{language === 'es' ? 'Rol' : 'Role'}</label>
          <select
            value={editingRoleId}
            onChange={(event) => changeEditingRole(event.target.value)}
            className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm"
          >
            {editableRoles.map((item) => <option key={item.id} value={item.id}>{typeof item.name === 'string' ? item.name : item.id}</option>)}
          </select>
          <p className="mt-2 text-[10px] leading-4 text-black/40">{language === 'es'
            ? 'Al cambiar el rol cargamos sus permisos base; luego puedes ajustarlos individualmente.'
            : 'Changing the role loads its default permissions; you can then adjust them individually.'}</p>
        </div>

        <div className="rounded-xl border border-black/8 bg-[#F7F7F5] p-4">
          <label className="text-[10px] font-semibold uppercase tracking-[.12em] text-black/40">{language === 'es' ? 'A quién reporta' : 'Reports to'}</label>
          <select
            value={editingSupervisorUid}
            onChange={(event) => {
              const nextSupervisorUid = event.target.value;
              setEditingSupervisorUid(nextSupervisorUid);
              if (nextSupervisorUid) {
                setEditingDirectReportUids((current) => current.filter((uid) => uid !== nextSupervisorUid));
              }
            }}
            className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm"
          >
            <option value="">{language === 'es' ? 'Sin superior asignado' : 'No manager assigned'}</option>
            {supervisorOptions.map((item) => <option key={item.uid} value={item.uid}>{item.displayName || item.email || item.uid}</option>)}
          </select>
          <p className="mt-2 text-[10px] leading-4 text-black/40">{language === 'es'
            ? 'La carga del supervisor mostrará únicamente sus reportes directos.'
            : 'The supervisor workload will show only direct reports.'}</p>
        </div>
      </div>

      <section className="mt-4 rounded-xl border border-black/10 bg-[#F7F7F5] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold">{language === 'es' ? 'Responsabilidad de equipo' : 'Team responsibility'}</p>
            <p className="mt-1 text-[11px] text-black/45">{language === 'es' ? 'Nombra un supervisor y selecciona sus miembros o un grupo.' : 'Appoint a supervisor and select their people or a group.'}</p>
          </div>
          <button type="button" aria-pressed={editingIsSupervisor} onClick={() => setEditingIsSupervisor((value) => !value)}
            className={`rounded-full px-4 py-2.5 text-xs font-semibold ${editingIsSupervisor ? 'bg-[#0A3F4D] text-white' : 'border border-black/15 bg-white text-black/70'}`}>
            {editingIsSupervisor
              ? (language === 'es' ? '✓ Supervisor designado · Desactivar' : '✓ Supervisor appointed · Disable')
              : (language === 'es' ? '+ Nombrar encargado / supervisor' : '+ Appoint lead / supervisor')}
          </button>
        </div>
        {editingIsSupervisor && <div className="mt-4 border-t border-black/10 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-semibold">{language === 'es' ? 'Personas a cargo' : 'Direct reports'}</p>
            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold">{editingDirectReportUids.length} {language === 'es' ? 'asignados' : 'assigned'}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <select value={reportRoleFilter} onChange={(event) => setReportRoleFilter(event.target.value)}
              aria-label={language === 'es' ? 'Grupo por rol' : 'Group by role'}
              className="min-w-[165px] flex-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs">
              <option value="all">{language === 'es' ? 'Todos los miembros' : 'All members'}</option>
              {editableRoles.filter((r) => directReportOptions.some((m) => m.roleId === r.id))
                .map((r) => <option key={r.id} value={r.id}>{language === 'es' ? 'Grupo: ' : 'Group: '}{r.name}</option>)}
            </select>
            <button type="button" onClick={() => setEditingDirectReportUids((prev) => Array.from(new Set([
              ...prev,...directReportOptions.filter((m) => (reportRoleFilter === 'all' || m.roleId === reportRoleFilter) &&
                m.uid !== editingSupervisorUid).map((m) => m.uid)
            ])))} className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-semibold">
              {language === 'es' ? 'Asignar grupo visible' : 'Assign visible group'}
            </button>
            <button type="button" onClick={() => setEditingDirectReportUids([])}
              className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs">{language === 'es' ? 'Limpiar' : 'Clear'}</button>
          </div>
          <p className="mt-2 text-[10px] text-black/45">{language === 'es'
            ? 'El grupo reúne miembros con el mismo rol. Puedes ajustar cada persona individualmente.'
            : 'The group consists of members with the same role. Adjust individuals below.'}</p>
          <div className="gkais-light-scrollbar mt-3 grid max-h-[235px] gap-2 overflow-y-auto [grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr))]">
            {directReportOptions.filter((m) => reportRoleFilter === 'all' || m.roleId === reportRoleFilter).map((m) => {
              const forbidden = m.uid === editingSupervisorUid;
              const priorManager = m.supervisorUid && m.supervisorUid !== editingMemberUid ? memberLabel(m.supervisorUid) : '';
              return <label key={m.uid} className={`flex items-start gap-2 rounded-xl border border-black/10 bg-white p-3 ${forbidden ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}>
                <input className="mt-0.5" type="checkbox" disabled={forbidden} checked={editingDirectReportUids.includes(m.uid)}
                  onChange={(event) => setEditingDirectReportUids((prev) => event.target.checked
                    ? Array.from(new Set([...prev, m.uid])) : prev.filter((uid) => uid !== m.uid))}/>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold">{m.displayName || m.email || m.uid}</span>
                  <span className="mt-1 block text-[10px] text-black/40">{roleName(team.roles, m.roleId)}</span>
                  {priorManager && <span className="mt-1 block text-[10px] text-[#82570F]">{language === 'es' ? 'Actualmente con: ' : 'Currently with: '}{priorManager}</span>}
                </span>
              </label>;
            })}
            {directReportOptions.length === 0 && <p className="text-xs text-black/45">{language === 'es' ? 'No hay miembros disponibles.' : 'No eligible members.'}</p>}
          </div>
        </div>}
        {!editingIsSupervisor && <p className="mt-2 text-[10px] leading-5 text-black/40">{language === 'es'
          ? 'Al desactivar y guardar, sus reportes actuales quedarán sin supervisor.'
          : 'Disabling and saving will unassign current direct reports.'}</p>}
      </section>

      <div className="mt-4 border-t border-black/8 pt-3">
        <button type="button" aria-expanded={editingPermissionsOpen} onClick={() => setEditingPermissionsOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-2 text-left hover:bg-black/[0.025]">
          <span><span className="block text-xs font-semibold">{language === 'es' ? 'Permisos individuales' : 'Individual permissions'}</span>
            <span className="mt-1 block text-[10px] text-black/40">{language === 'es' ? 'Configuración avanzada opcional' : 'Optional advanced settings'}</span></span>
          <span className="text-xs text-black/50">{normalizePermissionList(editingPermissions).length} · {editingPermissionsOpen
            ? (language === 'es' ? 'Ocultar' : 'Hide') : (language === 'es' ? 'Editar' : 'Edit')}</span>
        </button>
        {editingPermissionsOpen && <div className="mt-3">
          <PermissionChecklist available={normalizePermissionList(available)} selected={normalizePermissionList(editingPermissions)}
            setSelected={setEditingPermissions} language={language}/>
        </div>}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-black/8 pt-4">
        {confirmingRemovalUid === editingMember.uid ? <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium text-[#8D332C]">{language === 'es' ? '¿Eliminar este miembro?' : 'Remove this member?'}</span>
          <button type="button" disabled={removingMember === editingMember.uid || savingMember} onClick={() => setConfirmingRemovalUid('')} className="rounded-full border border-black/10 px-3 py-2 text-xs font-semibold text-black/55 disabled:opacity-40">{language === 'es' ? 'No' : 'No'}</button>
          <button type="button" disabled={removingMember === editingMember.uid || savingMember} onClick={() => void removeMember(editingMember.uid)} className="inline-flex items-center gap-1.5 rounded-full bg-[#8D332C] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">
            <UserMinus className="h-3.5 w-3.5" />{removingMember === editingMember.uid ? (language === 'es' ? 'Eliminando…' : 'Removing…') : (language === 'es' ? 'Sí, eliminar' : 'Yes, remove')}
          </button>
        </div> : <button type="button" disabled={Boolean(removingMember) || savingMember} onClick={() => setConfirmingRemovalUid(editingMember.uid)} className="inline-flex items-center gap-1.5 rounded-full border border-[#A23A32]/15 px-3 py-2 text-xs font-semibold text-[#8D332C] transition hover:bg-[#A23A32]/6 disabled:opacity-40">
          <UserMinus className="h-3.5 w-3.5" />{language === 'es' ? 'Eliminar miembro' : 'Remove member'}
        </button>}

        <button
          type="button"
          disabled={savingMember || removingMember === editingMember.uid || !editingRoleId}
          onClick={() => void saveMember()}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#111413] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
        >
          <Save className="h-3.5 w-3.5" />
          {savingMember ? (language === 'es' ? 'Guardando…' : 'Saving…') : (language === 'es' ? 'Guardar cambios' : 'Save changes')}
        </button>
      </div>
    </section></TeamEditorBoundary>}

            </div>;
          })}
        </div> : <p className="mt-4 text-sm text-black/45">{language === 'es' ? 'Tu rol no permite ver el equipo completo.' : 'Your role cannot view the full team.'}</p>}
      </section>

      <section className="min-w-0 rounded-2xl border border-black/10 bg-white p-5">
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
