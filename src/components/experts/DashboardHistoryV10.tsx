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
  canInteract?: (id: string) => boolean;
};

type WorkloadRow = {
  id: string;
  name: string;
  role: string;
  count: number;
  meta: string;
  kind: 'member';
};

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

export function DashboardHistoryV10(props: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [tasks, setTasks] = useState<DashboardWorkItem[]>([]);
  const [team, setTeam] = useState<DashboardTeamState | null>(null);
  const [footerHost, setFooterHost] = useState<HTMLElement | null>(null);
  const [metricGrid, setMetricGrid] = useState<HTMLElement | null>(null);
  const [expanded, setExpanded] = useState(false);

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
    const priorityCard = cards[0];
    if (!priorityCard) return;
    const footer = Array.from(priorityCard.children).find((element): element is HTMLElement => {
      if (!(element instanceof HTMLElement)) return false;
      return typeof element.className === 'string' && element.className.includes('border-t');
    }) || null;
    setMetricGrid(grid);
    setFooterHost(footer?.querySelector<HTMLElement>('[data-gkais-team-workload-host="true"]') || null);
  }, []);

  const mainWork = useMemo(() => tasks.filter((task) =>
    task.status !== 'done'
    && !task.deletedAt
    && !isHiddenWork(task)
    && !isFollowUpWork(task)
  ), [tasks]);

  const scopedMembers = useMemo(() => {
    if (!team) return [];
    return team.members
      .filter((member) => member.status === 'active' && (member.uid === team.currentUid || member.supervisorUid === team.currentUid))
      .filter((member, index, list) => list.findIndex((candidate) => candidate.uid === member.uid) === index);
  }, [team]);

  const directReportCount = scopedMembers.filter((member) => member.uid !== team?.currentUid).length;
  const teamModeEnabled = Boolean(team && directReportCount > 0);

  const workloadRows = useMemo<WorkloadRow[]>(() => {
    if (!team || !scopedMembers.length) return [];
    const roleById = new Map(team.roles.map((role) => [role.id, role.name]));
    const counts = new Map(scopedMembers.map((member) => [member.uid, 0]));
    const memberIdentity = new Map<string, string>();

    scopedMembers.forEach((member) => {
      [member.displayName, member.email].filter(Boolean).forEach((value) => memberIdentity.set(normalizeIdentity(value), member.uid));
    });

    mainWork.forEach((task) => {
      if (task.assignedToUid && counts.has(task.assignedToUid)) {
        counts.set(task.assignedToUid, (counts.get(task.assignedToUid) || 0) + 1);
        return;
      }
      const assignee = normalizeIdentity(task.assignee || '');
      const memberUid = assignee ? memberIdentity.get(assignee) : undefined;
      if (memberUid) counts.set(memberUid, (counts.get(memberUid) || 0) + 1);
    });

    return scopedMembers.map((member) => ({
      id: `member:${member.uid}`,
      name: member.displayName || member.email || (props.language === 'es' ? 'Miembro' : 'Member'),
      role: roleById.get(member.roleId) || member.roleId || '—',
      count: counts.get(member.uid) || 0,
      meta: member.uid === team.currentUid
        ? (props.language === 'es' ? 'Tú' : 'You')
        : (props.language === 'es' ? 'Reporte directo' : 'Direct report'),
      kind: 'member' as const
    })).sort((a, b) => {
      const aSelf = a.meta === (props.language === 'es' ? 'Tú' : 'You') ? 0 : 1;
      const bSelf = b.meta === (props.language === 'es' ? 'Tú' : 'You') ? 0 : 1;
      return aSelf - bSelf || b.count - a.count || a.name.localeCompare(b.name);
    });
  }, [team, scopedMembers, mainWork, props.language]);

  const scopedWorkCount = workloadRows.reduce((sum, row) => sum + row.count, 0);

  useEffect(() => {
    if (!teamModeEnabled && expanded) setExpanded(false);
  }, [teamModeEnabled, expanded]);

  useEffect(() => {
    if (!metricGrid) return;
    const closeWhenOtherMetricOpens = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest('button');
      if (!button || button === triggerRef.current) return;
      const card = button.closest('article');
      if (!card) return;
      const cards = Array.from(metricGrid.children).filter((element) => element instanceof HTMLElement && element.tagName === 'ARTICLE');
      if (cards.indexOf(card) > 0) setExpanded(false);
    };
    metricGrid.addEventListener('click', closeWhenOtherMetricOpens);
    return () => metricGrid.removeEventListener('click', closeWhenOtherMetricOpens);
  }, [metricGrid]);

  const toggleTeam = () => {
    if (!expanded && metricGrid) {
      const cards = Array.from(metricGrid.children).filter((element): element is HTMLElement => element instanceof HTMLElement && element.tagName === 'ARTICLE');
      cards.slice(1).forEach((card) => {
        const button = card.querySelector<HTMLButtonElement>('button');
        const text = button?.textContent?.trim().toLowerCase() || '';
        if (text.includes('ocultar histórico') || text.includes('hide history')) button?.click();
      });
    }
    setExpanded((value) => !value);
  };

  const totalAssigned = scopedWorkCount;
  const peopleCount = directReportCount;

  return <div ref={rootRef} className={teamModeEnabled ? 'gkais-dashboard-v10 gkais-dashboard-v10-team' : 'gkais-dashboard-v10'}>
    <style>{`
      .gkais-dashboard-v10-team .gkais-dashboard-v8 .gkais-dashboard-v7 > div > div:first-child > article:first-child > div[class*="border-t"] {
        font-size:0 !important;
        line-height:0 !important;
      }
      .gkais-dashboard-v10-team .gkais-dashboard-v8 .gkais-dashboard-v7 > div > div:first-child > article:first-child > div[class*="border-t"] [data-gkais-team-workload-host="true"] > button {
        font-size:12px !important;
        line-height:16px !important;
        color:rgba(0,0,0,.55) !important;
      }
    `}</style>
    <DashboardHistoryV8 {...props} />
    {footerHost && teamModeEnabled && createPortal(
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={expanded}
        onClick={toggleTeam}
        className="flex w-full items-center justify-between text-left text-xs transition hover:text-black/75 focus:text-black/55 active:text-black/55"
        style={{ color: 'rgba(0,0,0,.55)' }}
      >
        <span>{props.language === 'es' ? (expanded ? 'Ocultar carga de tu equipo' : 'Ver carga de tu equipo') : (expanded ? 'Hide your team workload' : 'View your team workload')}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition ${expanded ? 'rotate-180' : ''}`} />
      </button>,
      footerHost
    )}
    {metricGrid && expanded && teamModeEnabled && createPortal(
      <section className="col-span-full rounded-2xl border border-black/8 bg-white p-3 shadow-[0_8px_24px_rgba(10,10,10,.025)] md:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><UsersRound className="h-4 w-4 text-[#0A3F4D]" /><p className="text-sm font-semibold">{props.language === 'es' ? 'Carga de tu equipo' : 'Your team workload'}</p></div>
            <p className="mt-0.5 text-[10px] text-black/40">{props.language === 'es' ? 'Muestra solo tu carga y la de las personas que reportan directamente a ti.' : 'Shows only your workload and the people who report directly to you.'}</p>
          </div>
          <span className="rounded-full border border-black/8 bg-[#F7F7F5] px-3 py-1.5 text-[10px] font-semibold text-black/55">{totalAssigned}</span>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-[160px_minmax(0,1fr)]">
          <aside className="rounded-xl bg-[#F7F7F5] p-3">
            <p className="text-[9px] font-semibold uppercase tracking-[.12em] text-black/35">{props.language === 'es' ? 'Trabajo abierto' : 'Open work'}</p>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 lg:grid-cols-1">
              <div><p className="text-[9px] text-black/40">{props.language === 'es' ? 'Total' : 'Total'}</p><p className="text-base font-semibold leading-5">{totalAssigned}</p></div>
              <div><p className="text-[9px] text-black/40">{props.language === 'es' ? 'Reportes directos' : 'Direct reports'}</p><p className="text-xs font-semibold">{peopleCount}</p></div>
              <div><p className="text-[9px] text-black/40">{props.language === 'es' ? 'Miembros visibles' : 'Visible members'}</p><p className="text-xs font-semibold">{workloadRows.length}</p></div>
            </div>
          </aside>
          <div className="min-w-0 max-h-[176px] overflow-y-auto pr-1">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {workloadRows.map((row) => <div key={row.id} className="flex items-center gap-3 rounded-xl border border-black/6 px-3 py-2.5">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-semibold bg-[#0A3F4D]/8 text-[#0A3F4D]`}>{initials(row.name)}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{row.name}</span><span className="mt-0.5 block truncate text-[10px] text-black/40">{row.role} · {row.meta}</span></span>
                <span className="min-w-[28px] text-right text-base font-semibold tracking-[-0.03em]">{row.count}</span>
              </div>)}
              {workloadRows.length === 0 && <p className="col-span-full py-8 text-center text-xs text-black/40">{props.language === 'es' ? 'Todavía no hay miembros visibles para este rol.' : 'No team members are visible for this role yet.'}</p>}
            </div>
          </div>
        </div>
      </section>,
      metricGrid
    )}
  </div>;
}
