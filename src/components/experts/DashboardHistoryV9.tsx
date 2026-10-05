import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, UsersRound } from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';
import { subscribeDashboardWorkItems, type DashboardWorkItem } from '../../services/expertsDashboardLive';
import { subscribeDashboardTeam, type DashboardTeamState } from '../../services/expertsDashboardTeam';
import { DashboardHistoryV8 } from './DashboardHistoryV8';

type Props = {
  language: Language;
  onNavigate: (id: string) => void;
  onOpenClient: (id: string) => void;
  onStartSession: (id: string) => void;
};

type WorkloadRow = {
  id: string;
  name: string;
  role: string;
  count: number;
  meta: string;
  kind: 'member' | 'invite' | 'unassigned';
};

type PopoverPosition = { left: number; top: number; width: number };

function isHiddenWork(item: DashboardWorkItem): boolean {
  const value = `${item.title} ${item.note}`.toLowerCase();
  return item.sourceActionKind === 'formation-plan'
    || item.sourceActionKind === 'formation-meta'
    || item.sourceActionKind === 'cohort-meta'
    || item.workstream === 'formation-plan'
    || item.workstream === 'formation-meta'
    || value.includes('confirmar acceso y onboarding')
    || value.includes('confirm access and onboarding');
}

function isFollowUpWork(item: DashboardWorkItem): boolean {
  const value = `${item.workstream} ${item.sourceActionKind} ${item.source}`.toLowerCase();
  return value.includes('follow') || value.includes('nurture') || value.includes('webinar');
}

function normalizeIdentity(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function initials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '—';
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('');
}

export function DashboardHistoryV9(props: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [tasks, setTasks] = useState<DashboardWorkItem[]>([]);
  const [team, setTeam] = useState<DashboardTeamState | null>(null);
  const [footerHost, setFooterHost] = useState<HTMLElement | null>(null);
  const [priorityCard, setPriorityCard] = useState<HTMLElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [position, setPosition] = useState<PopoverPosition>({ left: 12, top: 12, width: 320 });

  useEffect(() => {
    let active = true;
    let unsubscribeTasks: (() => void) | undefined;
    let unsubscribeTeam: (() => void) | undefined;

    void subscribeDashboardWorkItems((items) => { if (active) setTasks(items); })
      .then((unsubscribe) => { if (active) unsubscribeTasks = unsubscribe; else unsubscribe(); })
      .catch(() => { if (active) setTasks([]); });
    void subscribeDashboardTeam((next) => { if (active) setTeam(next); })
      .then((unsubscribe) => { if (active) unsubscribeTeam = unsubscribe; else unsubscribe(); })
      .catch(() => { if (active) setTeam(null); });

    return () => {
      active = false;
      unsubscribeTasks?.();
      unsubscribeTeam?.();
    };
  }, []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const dashboard = root.querySelector<HTMLElement>('.gkais-dashboard-v7 > div');
    const grid = dashboard?.firstElementChild as HTMLElement | null;
    if (!grid) return;
    const cards = Array.from(grid.children).filter((element): element is HTMLElement => element instanceof HTMLElement && element.tagName === 'ARTICLE');
    const card = cards[0];
    if (!card) return;
    const footer = Array.from(card.children).find((element): element is HTMLElement => {
      if (!(element instanceof HTMLElement)) return false;
      return typeof element.className === 'string' && element.className.includes('border-t');
    }) || null;
    setPriorityCard(card);
    setFooterHost(footer);
  }, []);

  const mainWork = useMemo(() => tasks.filter((task) =>
    task.status !== 'done'
    && !task.deletedAt
    && !isHiddenWork(task)
    && !isFollowUpWork(task)
  ), [tasks]);

  const teamModeEnabled = useMemo(() => {
    if (!team) return false;
    const hasCustomRole = team.roles.some((role) => !role.isSystem);
    const hasAnotherMember = team.members.some((member) => member.uid !== team.currentUid);
    const hasPendingInvite = team.invites.some((invite) => invite.status === 'pending');
    return hasCustomRole || hasAnotherMember || hasPendingInvite;
  }, [team]);

  const workloadRows = useMemo<WorkloadRow[]>(() => {
    if (!team) return [];
    const roleById = new Map(team.roles.map((role) => [role.id, role.name]));
    const counts = new Map<string, number>();
    const memberIdentity = new Map<string, string>();
    const inviteIdentity = new Map<string, string>();

    team.members.forEach((member) => {
      counts.set(`member:${member.uid}`, 0);
      [member.displayName, member.email].filter(Boolean).forEach((value) => memberIdentity.set(normalizeIdentity(value), member.uid));
    });
    team.invites.filter((invite) => invite.status === 'pending').forEach((invite) => {
      counts.set(`invite:${invite.id}`, 0);
      [invite.displayName, invite.email].filter(Boolean).forEach((value) => inviteIdentity.set(normalizeIdentity(value), invite.id));
    });

    let unassigned = 0;
    mainWork.forEach((task) => {
      if (task.assignedToUid && counts.has(`member:${task.assignedToUid}`)) {
        const key = `member:${task.assignedToUid}`;
        counts.set(key, (counts.get(key) || 0) + 1);
        return;
      }

      const assignee = normalizeIdentity(task.assignee || '');
      const memberUid = assignee ? memberIdentity.get(assignee) : undefined;
      if (memberUid) {
        const key = `member:${memberUid}`;
        counts.set(key, (counts.get(key) || 0) + 1);
        return;
      }
      const inviteId = assignee ? inviteIdentity.get(assignee) : undefined;
      if (inviteId) {
        const key = `invite:${inviteId}`;
        counts.set(key, (counts.get(key) || 0) + 1);
        return;
      }
      unassigned += 1;
    });

    const members: WorkloadRow[] = team.members.map((member) => ({
      id: `member:${member.uid}`,
      name: member.displayName || member.email || (props.language === 'es' ? 'Miembro' : 'Member'),
      role: roleById.get(member.roleId) || member.roleId || '—',
      count: counts.get(`member:${member.uid}`) || 0,
      meta: member.uid === team.currentUid
        ? (props.language === 'es' ? 'Tú' : 'You')
        : member.status === 'active'
          ? (props.language === 'es' ? 'Activo' : 'Active')
          : member.status === 'suspended'
            ? (props.language === 'es' ? 'Suspendido' : 'Suspended')
            : (props.language === 'es' ? 'Invitado' : 'Invited'),
      kind: 'member' as const
    })).sort((a, b) => {
      const aOwner = a.role.toLowerCase() === 'owner' ? 1 : 0;
      const bOwner = b.role.toLowerCase() === 'owner' ? 1 : 0;
      return bOwner - aOwner || b.count - a.count || a.name.localeCompare(b.name);
    });

    const invitations: WorkloadRow[] = team.invites
      .filter((invite) => invite.status === 'pending')
      .filter((invite) => !team.members.some((member) => normalizeIdentity(member.email) === normalizeIdentity(invite.email)))
      .map((invite) => ({
        id: `invite:${invite.id}`,
        name: invite.displayName || invite.email,
        role: roleById.get(invite.roleId) || invite.roleId || '—',
        count: counts.get(`invite:${invite.id}`) || 0,
        meta: props.language === 'es' ? 'Invitación pendiente' : 'Pending invitation',
        kind: 'invite' as const
      }));

    return [
      ...members,
      ...invitations,
      ...(unassigned > 0 ? [{
        id: 'unassigned',
        name: props.language === 'es' ? 'Sin asignar' : 'Unassigned',
        role: props.language === 'es' ? 'Requiere responsable' : 'Needs owner',
        count: unassigned,
        meta: props.language === 'es' ? 'Trabajo abierto' : 'Open work',
        kind: 'unassigned' as const
      }] : [])
    ];
  }, [team, mainWork, props.language]);

  useEffect(() => {
    if (!teamModeEnabled && expanded) setExpanded(false);
  }, [teamModeEnabled, expanded]);

  useLayoutEffect(() => {
    if (!expanded || !priorityCard) return;
    const updatePosition = () => {
      const rect = priorityCard.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const width = Math.min(Math.max(300, rect.width), Math.max(280, viewportWidth - 24));
      const left = Math.max(12, Math.min(rect.left, viewportWidth - width - 12));
      const estimatedHeight = Math.min(440, 116 + workloadRows.length * 58);
      const below = rect.bottom + 8;
      const top = below + estimatedHeight <= window.innerHeight - 12
        ? below
        : Math.max(12, rect.top - estimatedHeight - 8);
      setPosition({ left, top, width });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [expanded, priorityCard, workloadRows.length]);

  useEffect(() => {
    if (!expanded) return;
    const closeOnOutside = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setExpanded(false);
    };
    document.addEventListener('pointerdown', closeOnOutside);
    return () => document.removeEventListener('pointerdown', closeOnOutside);
  }, [expanded]);

  const totalAssigned = workloadRows.reduce((sum, row) => sum + row.count, 0);

  return <div ref={rootRef} className={teamModeEnabled ? 'gkais-dashboard-v9 gkais-dashboard-v9-team' : 'gkais-dashboard-v9'}>
    <style>{`
      .gkais-dashboard-v9-team .gkais-dashboard-v8 .gkais-dashboard-v7 > div > div:first-child > article:first-child > div[class*="border-t"] {
        font-size:0 !important;
        line-height:0 !important;
      }
      .gkais-dashboard-v9-team .gkais-dashboard-v8 .gkais-dashboard-v7 > div > div:first-child > article:first-child > div[class*="border-t"] > button {
        font-size:12px !important;
        line-height:16px !important;
      }
    `}</style>
    <DashboardHistoryV8 {...props} />
    {footerHost && teamModeEnabled && createPortal(
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between text-left text-xs text-black/55 transition hover:text-black/75"
      >
        <span>{props.language === 'es' ? (expanded ? 'Ocultar carga del equipo' : 'Ver carga del equipo') : (expanded ? 'Hide team workload' : 'View team workload')}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition ${expanded ? 'rotate-180' : ''}`} />
      </button>,
      footerHost
    )}
    {expanded && teamModeEnabled && createPortal(
      <div
        ref={popoverRef}
        className="fixed z-[180] max-h-[440px] overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_22px_70px_rgba(10,10,10,.20)]"
        style={{ left: position.left, top: position.top, width: position.width }}
      >
        <div className="flex items-start justify-between gap-3 border-b border-black/7 px-4 py-3.5">
          <div>
            <div className="flex items-center gap-2"><UsersRound className="h-4 w-4 text-[#0A3F4D]" /><p className="text-sm font-semibold">{props.language === 'es' ? 'Carga del equipo' : 'Team workload'}</p></div>
            <p className="mt-1 text-[11px] text-black/42">{mainWork.length} {props.language === 'es' ? 'tareas prioritarias abiertas' : 'open priority tasks'}</p>
          </div>
          <span className="rounded-full bg-[#F7F7F5] px-2.5 py-1 text-[10px] font-semibold text-black/55">{totalAssigned}/{mainWork.length}</span>
        </div>
        <div className="max-h-[310px] overflow-y-auto px-2 py-2">
          {workloadRows.map((row) => <div key={row.id} className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 hover:bg-[#F7F7F5]">
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-semibold ${row.kind === 'unassigned' ? 'bg-[#A23A32]/8 text-[#8D332C]' : row.kind === 'invite' ? 'bg-[#A46F16]/9 text-[#82570F]' : 'bg-[#0A3F4D]/8 text-[#0A3F4D]'}`}>{initials(row.name)}</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{row.name}</span><span className="mt-0.5 block truncate text-[10px] text-black/40">{row.role} · {row.meta}</span></span>
            <span className="min-w-[32px] text-right text-lg font-semibold tracking-[-0.03em]">{row.count}</span>
          </div>)}
          {workloadRows.length === 0 && <p className="px-3 py-6 text-center text-xs text-black/40">{props.language === 'es' ? 'Todavía no hay miembros visibles para este rol.' : 'No team members are visible for this role yet.'}</p>}
        </div>
        <p className="border-t border-black/6 px-4 py-3 text-[10px] leading-4 text-black/38">{props.language === 'es' ? 'Cuenta el mismo trabajo abierto de la tarjeta. Seguimientos y tareas automáticas quedan fuera.' : 'Uses the same open-work scope as the card. Follow-ups and automated tasks are excluded.'}</p>
      </div>,
      document.body
    )}
  </div>;
}
