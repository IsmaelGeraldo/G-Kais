import React, { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import {
  ArrowLeft,
  BookOpenCheck,
  GraduationCap,
  LayoutDashboard,
  ListTodo,
  Presentation,
  Settings,
  Sparkles,
  Users,
  UsersRound,
  HeartHandshake,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  UserRound
} from 'lucide-react';
import { useLanguage, type Language } from '../../i18n/LanguageContext';
import { firebaseAuth, firestoreDb } from '../../lib/firebase';
import { hasWorkspacePermission, loadExpertWorkspaceTeam, type WorkspaceMember, type WorkspacePermission } from '../../services/expertsWorkspaceCore';
import { updateExpertWorkspaceUserPhoto } from '../../services/expertsWorkspaceMembers';
import { DashboardHistory } from './DashboardHistory';
import { PriorityRadarWorkspace } from './PriorityRadarWorkspace';
import { ClientOnboardingWorkspace } from './ClientOnboardingWorkspace';
import { FormationsWorkspace } from './FormationsWorkspace';
import { RelationshipsWorkspace } from './RelationshipsWorkspace';
import { TeamWorkspace } from './TeamWorkspace';
import { WebinarsWorkspace } from './WebinarsWorkspace';
import { WorkspaceInviteGate } from './WorkspaceInviteGate';
import {
  INTERNAL_NAV_ACCENT_EVENT,
  WorkspaceSettingsProfile,
  readInternalNavAccent,
  type WorkspaceProfile,
  type WorkspaceAppearance,
  themeColor,
  workspaceBackground
} from './WorkspaceSettingsProfile';

type Props = { onExit: () => void };
type LocalText = { es: string; en: string };
type Section = 'overview' | 'programs' | 'operations' | 'intelligence';
type NavItem = {
  id: string;
  label: LocalText;
  icon: React.ComponentType<{ className?: string }>;
  section: Section;
};
type WorkspaceAccess = {
  ready: boolean;
  workspaceId: string;
  currentUid: string;
  workspaceName: string;
  currentMember: WorkspaceMember | null;
  photoURL: string;
  isOwner: boolean;
};
type RelationshipTab = 'people' | 'follow-up';

const NAV: NavItem[] = [
  { id: 'overview', label: { es: 'Dashboard', en: 'Dashboard' }, icon: LayoutDashboard, section: 'overview' },
  { id: 'webinars', label: { es: 'Webinars', en: 'Webinars' }, icon: Presentation, section: 'programs' },
  { id: 'formations', label: { es: 'Formaciones', en: 'Formations' }, icon: GraduationCap, section: 'programs' },
  { id: 'clients', label: { es: 'Mentorías', en: 'Mentoring' }, icon: Users, section: 'programs' },
  { id: 'priority', label: { es: 'Trabajo prioritario', en: 'Priority Work' }, icon: ListTodo, section: 'operations' },
  { id: 'relationships', label: { es: 'Relaciones', en: 'Relationships' }, icon: HeartHandshake, section: 'operations' },
  { id: 'team', label: { es: 'Equipo', en: 'Team' }, icon: UsersRound, section: 'operations' },
  { id: 'copilot', label: { es: 'G-KAIS Copilot', en: 'G-KAIS Copilot' }, icon: Sparkles, section: 'intelligence' },
  { id: 'knowledge', label: { es: 'Conocimiento', en: 'Knowledge' }, icon: BookOpenCheck, section: 'intelligence' }
];

const NAV_PERMISSIONS: Partial<Record<string, WorkspacePermission[]>> = {
  webinars: ['webinars.read', 'webinars.manage'],
  formations: ['formations.read', 'formations.manage'],
  clients: ['mentoring.read', 'mentoring.manage'],
  priority: ['tasks.read.own', 'tasks.read.team', 'tasks.manage.own', 'tasks.manage'],
  relationships: ['people.read', 'people.manage'],
  team: ['members.read', 'members.manage', 'roles.read', 'roles.manage'],
  copilot: ['events.read', 'events.create'],
  knowledge: ['events.read']
};

function canAccessWorkspaceView(id: string, permissions: Array<WorkspacePermission | '*'>): boolean {
  if (id === 'overview') return true;
  const required = NAV_PERMISSIONS[id];
  return Boolean(required?.some((permission) => hasWorkspacePermission(permissions, permission)));
}

const PROFILE_KEY = 'gkais-experts-profile-v1';
const APPEARANCE_KEY = 'gkais-experts-appearance-v2';
const SIDEBAR_COLLAPSED_KEY = 'gkais-experts-sidebar-collapsed-v1';

function readLocation() {
  const params = new URLSearchParams(window.location.search);
  const requestedView = params.get('view') || 'overview';
  const legacyRelationshipView = requestedView === 'people' || requestedView === 'continuity';
  const view = legacyRelationshipView ? 'relationships' : requestedView;
  const validView = NAV.some((item) => item.id === view) || view === 'settings';
  const relationshipTab: RelationshipTab = requestedView === 'continuity' || params.get('tab') === 'follow-up'
    ? 'follow-up'
    : 'people';
  return {
    active: validView ? view : 'overview',
    clientId: params.get('client') || 'sofia',
    relationshipTab
  };
}

function loadProfile(): WorkspaceProfile {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || '') as WorkspaceProfile; }
  catch { return { name: 'Carlos Espinoza', business: 'Método Escala', role: 'Mentor', avatar: '' }; }
}

function loadAppearance(): WorkspaceAppearance {
  try { return JSON.parse(localStorage.getItem(APPEARANCE_KEY) || '') as WorkspaceAppearance; }
  catch { return { theme: 'white', intensity: 3, sidebar: 'same', sidebarIntensity: 7 }; }
}

function readSidebarCollapsed(): boolean {
  try {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored === '1') return true;
    if (stored === '0') return false;
  } catch {}
  return typeof window !== 'undefined' && window.innerWidth < 1200;
}

function contrastTextForAccent(hex: string): string {
  if (!/^#[0-9A-F]{6}$/i.test(hex)) return '#FFFFFF';
  const value = hex.slice(1);
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  const linear = (channel: number) => channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  const luminance = 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  return luminance > 0.55 ? '#111413' : '#FFFFFF';
}

function Placeholder({ active, language }: { active: string; language: Language }) {
  const item = NAV.find((entry) => entry.id === active);
  return <section className="rounded-2xl border border-black/10 bg-white p-8">
    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">G-KAIS WORKSPACE</p>
    <h3 className="mt-2 text-2xl font-semibold">{item?.label[language] ?? 'Workspace'}</h3>
    <p className="mt-3 text-sm text-black/50">{language === 'es'
      ? 'Esta sección se conectará según lo que aprendamos del piloto real.'
      : 'This section will be connected as we learn from the real pilot.'}</p>
  </section>;
}

export function ExpertsWorkspace({ onExit }: Props) {
  const inviteToken = new URLSearchParams(window.location.search).get('invite');
  if (inviteToken) return <WorkspaceInviteGate token={inviteToken} />;
  return <ExpertsWorkspaceShell onExit={onExit} />;
}

function ExpertsWorkspaceShell({ onExit }: Props) {
  const { language, setLanguage } = useLanguage();
  const initial = readLocation();
  const [active, setActive] = useState(initial.active);
  const [selectedClientId, setSelectedClientId] = useState(initial.clientId);
  const [relationshipTab, setRelationshipTab] = useState<RelationshipTab>(initial.relationshipTab);
  const [profile, setProfile] = useState<WorkspaceProfile>(loadProfile);
  const [appearance, setAppearance] = useState<WorkspaceAppearance>(loadAppearance);
  const [internalNavAccent, setInternalNavAccent] = useState<'black' | 'sidebar'>(readInternalNavAccent);
  const [access, setAccess] = useState<WorkspaceAccess>({
    ready: false,
    workspaceId: '',
    currentUid: '',
    workspaceName: '',
    currentMember: null,
    isOwner: false
  });

  useEffect(() => { try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch {} }, [profile]);
  useEffect(() => { try { localStorage.setItem(APPEARANCE_KEY, JSON.stringify(appearance)); } catch {} }, [appearance]);
  useEffect(() => {
    const syncInternalAccent = (event: Event) => {
      const detail = (event as CustomEvent<'black' | 'sidebar'>).detail;
      setInternalNavAccent(detail === 'sidebar' ? 'sidebar' : detail === 'black' ? 'black' : readInternalNavAccent());
    };
    window.addEventListener(INTERNAL_NAV_ACCENT_EVENT, syncInternalAccent);
    return () => window.removeEventListener(INTERNAL_NAV_ACCENT_EVENT, syncInternalAccent);
  }, []);

  useEffect(() => {
    const onPop = () => {
      const location = readLocation();
      setActive(location.active);
      setSelectedClientId(location.clientId);
      setRelationshipTab(location.relationshipTab);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: number | undefined;

    const loadAccess = async (attempt = 0) => {
      try {
        const team = await loadExpertWorkspaceTeam();
        const workspaceSnapshot = await getDoc(doc(firestoreDb, 'expert_workspaces', team.workspaceId));
        const workspaceName = workspaceSnapshot.exists() && typeof workspaceSnapshot.data().name === 'string'
          ? workspaceSnapshot.data().name as string
          : '';
        if (cancelled) return;
        setAccess({
          ready: true,
          workspaceId: team.workspaceId,
          currentUid: team.currentUid,
          workspaceName,
          currentMember: team.currentMember,
          isOwner: team.workspaceId === team.currentUid
        });
      } catch {
        if (cancelled) return;
        if (attempt < 4) {
          retryTimer = window.setTimeout(() => void loadAccess(attempt + 1), 250);
          return;
        }
        setAccess((current) => ({ ...current, ready: true }));
      }
    };

    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      if (!user) {
        setAccess({ ready: true, workspaceId: '', currentUid: '', workspaceName: '', currentMember: null, isOwner: false });
        return;
      }
      void loadAccess();
    });
    const onMembershipChanged = () => void loadAccess();
    window.addEventListener('gkais:workspace-membership-changed', onMembershipChanged);
    return () => {
      cancelled = true;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      unsubscribe();
      window.removeEventListener('gkais:workspace-membership-changed', onMembershipChanged);
    };
  }, []);

  const currentPermissions = access.currentMember?.permissions || [];
  const visibleNav = useMemo(
    () => access.isOwner ? NAV : NAV.filter((item) => canAccessWorkspaceView(item.id, currentPermissions)),
    [access.isOwner, currentPermissions]
  );
  const allowedIds = useMemo(() => new Set(visibleNav.map((item) => item.id)), [visibleNav]);
  const landingView = visibleNav.some((item) => item.id === 'overview') ? 'overview' : (visibleNav[0]?.id || 'settings');

  useEffect(() => {
    if (!access.ready) return;
    if (active === 'settings') return;
    if (!allowedIds.has(active)) {
      const params = new URLSearchParams();
      params.set('view', landingView);
      window.history.replaceState({}, '', `/workspace/experts?${params.toString()}`);
      setActive(landingView);
    }
  }, [access.ready, active, allowedIds, landingView]);

  const navigate = (id: string, options?: { clientId?: string; tab?: RelationshipTab; personId?: string }) => {
    if (access.ready && id !== 'settings' && !allowedIds.has(id)) return;
    const params = new URLSearchParams();
    params.set('view', id);
    const nextClient = options?.clientId ?? selectedClientId;
    if (id === 'clients') params.set('client', nextClient);
    if (id === 'relationships' && options?.tab) params.set('tab', options.tab);
    if (options?.personId) params.set('person', options.personId);
    window.history.pushState({}, '', `/workspace/experts?${params.toString()}`);
    setActive(id);
    if (options?.clientId) setSelectedClientId(options.clientId);
    if (id === 'relationships') setRelationshipTab(options?.tab || 'people');
  };

  const startSession = (clientId: string) => {
    if (!access.isOwner && !hasWorkspacePermission(currentPermissions, 'mentoring.read') && !hasWorkspacePermission(currentPermissions, 'mentoring.manage')) return;
    window.history.pushState({}, '', `/workspace/experts/sessions?client=${encodeURIComponent(clientId)}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const openPerson = (id: string) => {
    if (!allowedIds.has('relationships')) return;
    navigate('relationships', { personId: id, tab: 'people' });
  };

  const openMentoringClient = (id: string) => {
    if (!allowedIds.has('clients')) return;
    navigate('clients', { clientId: id });
  };

  const goBack = () => active === landingView ? onExit() : window.history.back();

  if (!access.ready) {
    return <div className="grid min-h-screen place-items-center bg-[#F6F6F3] text-sm text-black/45">{language === 'es' ? 'Abriendo Workspace…' : 'Opening Workspace…'}</div>;
  }

  const accent = themeColor(appearance.sidebar === 'same' ? appearance.theme : appearance.sidebar);
  const selectedBackground = `color-mix(in srgb, ${accent} ${Math.min(94, 40 + appearance.sidebarIntensity * 5)}%, white)`;
  const selectedText = accent !== '#FFFFFF' && appearance.sidebarIntensity >= 6 ? '#FFFFFF' : '#111413';
  const internalAccent = internalNavAccent === 'sidebar' ? selectedBackground : '#111413';
  const internalAccentText = internalNavAccent === 'sidebar' ? selectedText : '#FFFFFF';
  const workspaceAccent = themeColor(appearance.theme);
  const darkWorkspace = appearance.theme === 'black' && appearance.intensity > 7;
  const blackSurfaceMix = appearance.theme === 'black' ? Math.max(0, (appearance.intensity - 4) * 2) : 0;
  const cardSurface = `color-mix(in srgb, #000000 ${blackSurfaceMix}%, #FAFAF8)`;
  const activeLabel = active === 'settings'
    ? (language === 'es' ? 'Configuración' : 'Settings')
    : NAV.find((item) => item.id === active)?.label[language] ?? 'Workspace';

  const memberName = access.currentMember?.displayName || firebaseAuth.currentUser?.displayName || firebaseAuth.currentUser?.email || profile.name;
  const memberRole = access.currentMember?.roleId || profile.role;
  const workspaceName = access.workspaceName || (access.isOwner ? profile.business : 'G-KAIS Workspace');
  const memberAvatar = access.isOwner ? profile.avatar : (firebaseAuth.currentUser?.photoURL || '');

  let content: React.ReactNode;
  if (active === 'overview' && allowedIds.has('overview')) {
    content = <DashboardHistory language={language} onNavigate={(id) => navigate(id)} onOpenClient={openMentoringClient} onStartSession={startSession} />;
  } else if (active === 'webinars' && allowedIds.has('webinars')) {
    content = <WebinarsWorkspace language={language} />;
  } else if (active === 'formations' && allowedIds.has('formations')) {
    content = <FormationsWorkspace language={language} />;
  } else if (active === 'priority' && allowedIds.has('priority')) {
    content = <PriorityRadarWorkspace language={language} onOpenClient={openPerson} />;
  } else if (active === 'relationships' && allowedIds.has('relationships')) {
    content = <RelationshipsWorkspace key={relationshipTab} language={language} initialTab={relationshipTab} />;
  } else if (active === 'clients' && allowedIds.has('clients')) {
    content = <ClientOnboardingWorkspace
      language={language}
      selectedId={selectedClientId}
      onSelectedId={(id) => navigate('clients', { clientId: id })}
      onStartSession={startSession}
      onOpenPriority={() => navigate('priority')}
    />;
  } else if (active === 'team' && allowedIds.has('team')) {
    content = <TeamWorkspace language={language} />;
  } else if (active === 'settings') {
    content = <WorkspaceSettingsProfile
      language={language}
      profile={profile}
      setProfile={setProfile}
      appearance={appearance}
      setAppearance={setAppearance}
      showIdentity={access.isOwner}
    />;
  } else {
    content = <Placeholder active={active} language={language} />;
  }

  const sectionLabels: Record<Section, LocalText | null> = {
    overview: null,
    programs: { es: 'PROGRAMAS', en: 'PROGRAMS' },
    operations: { es: 'OPERACIÓN', en: 'OPERATIONS' },
    intelligence: { es: 'INTELIGENCIA', en: 'INTELLIGENCE' }
  };

  return <div
    className={`min-h-screen text-[#0A0A0A] ${appearance.theme === 'black' ? 'gkais-black-surface' : ''}`}
    style={{
      background: workspaceBackground(workspaceAccent, appearance.intensity),
      '--gkais-card-surface': cardSurface,
      '--gkais-internal-accent': internalAccent,
      '--gkais-internal-accent-text': internalAccentText
    } as React.CSSProperties}
  >
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[245px] border-r border-black/10 bg-[#111413] text-white lg:flex lg:flex-col">
      <div className="border-b border-white/10 px-5 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">G-KAIS</p>
        <p className="mt-1 text-sm font-semibold">for Experts</p>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {(['overview', 'programs', 'operations', 'intelligence'] as Section[]).map((section) => {
          const items = visibleNav.filter((item) => item.section === section);
          if (!items.length) return null;
          return <div key={section} className={section === 'overview' ? '' : 'mt-5'}>
            {sectionLabels[section] && <p className="mb-2 px-3 text-[9px] font-semibold tracking-[0.18em] text-white/30">{sectionLabels[section]![language]}</p>}
            <div className="space-y-1">{items.map((item) => {
              const Icon = item.icon;
              const selected = active === item.id;
              return <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${selected ? '' : 'text-white/65 hover:bg-white/[0.06] hover:text-white'}`}
                style={selected ? { background: selectedBackground, color: selectedText } : undefined}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left">{item.label[language]}</span>
              </button>;
            })}</div>
          </div>;
        })}
      </nav>
      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          onClick={() => navigate('settings')}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${active === 'settings' ? '' : 'text-white/55 hover:bg-white/[0.06]'}`}
          style={active === 'settings' ? { background: selectedBackground, color: selectedText } : undefined}
        ><Settings className="h-4 w-4" />{language === 'es' ? 'Configuración' : 'Settings'}</button>
        <div className="mt-2 flex items-center gap-3 rounded-xl bg-white/[0.05] p-3">
          {memberAvatar
            ? <img src={memberAvatar} alt="" className="h-9 w-9 rounded-full object-cover" />
            : <div className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-xs font-semibold">{memberName.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div>}
          <div className="min-w-0"><p className="truncate text-xs font-semibold">{memberName}</p><p className="truncate text-[10px] text-white/35">{memberRole}</p></div>
        </div>
      </div>
    </aside>

    <div className="lg:pl-[245px]">
      <header className="sticky top-0 z-20 border-b border-black/8 bg-white/75 px-4 py-3 backdrop-blur md:px-8 lg:px-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={goBack} className="grid h-9 w-9 place-items-center rounded-full border border-black/10 bg-white text-black/60"><ArrowLeft className="h-4 w-4" /></button>
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/35">{workspaceName}</p><h1 className="text-sm font-semibold">{activeLabel}</h1></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-full border border-black/10 bg-white p-0.5">{(['es', 'en'] as Language[]).map((option) => <button key={option} type="button" onClick={() => setLanguage(option)} className={`rounded-full px-2.5 py-1.5 text-[10px] font-semibold uppercase ${language === option ? 'bg-[#111413] text-white' : 'text-black/40'}`}>{option}</button>)}</div>
            {memberAvatar
              ? <img src={memberAvatar} alt="" className="h-9 w-9 rounded-full object-cover" />
              : <div className="grid h-9 w-9 place-items-center rounded-full bg-[#111413] text-xs font-semibold text-white">{memberName.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div>}
          </div>
        </div>
      </header>

      <main className="px-4 py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-[1500px]">
          <div className="mb-5 lg:hidden"><div className="flex gap-2 overflow-x-auto pb-2">{visibleNav.map((item) => <button key={item.id} onClick={() => navigate(item.id)} className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold ${active === item.id ? 'bg-[#111413] text-white' : 'border border-black/10 bg-white text-black/55'}`}>{item.label[language]}</button>)}<button type="button" onClick={() => navigate('settings')} className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold ${active === 'settings' ? 'bg-[#111413] text-white' : 'border border-black/10 bg-white text-black/55'}`}>{language === 'es' ? 'Configuración' : 'Settings'}</button></div></div>
          <div className="mb-7">
            <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${darkWorkspace ? 'text-white/70' : 'text-[#0A3F4D]'}`}>{
              active === 'overview' ? (language === 'es' ? 'VISTA OPERATIVA DIARIA' : 'DAILY OPERATING VIEW')
                : active === 'settings' ? (language === 'es' ? 'PREFERENCIAS DEL WORKSPACE' : 'WORKSPACE PREFERENCES')
                : active === 'team' ? (language === 'es' ? 'OPERACIÓN DEL EQUIPO' : 'TEAM OPERATIONS')
                : active === 'priority' ? (language === 'es' ? 'TRABAJO ASIGNADO' : 'ASSIGNED WORK')
                : active === 'relationships' ? (language === 'es' ? 'PERSONAS Y CONTINUIDAD' : 'PEOPLE AND CONTINUITY')
                : active === 'webinars' ? (language === 'es' ? 'RECORRIDO COMERCIAL' : 'COMMERCIAL JOURNEY')
                : active === 'formations' ? (language === 'es' ? 'ALUMNOS Y COHORTES' : 'STUDENTS AND COHORTS')
                : active === 'clients' ? (language === 'es' ? 'MENTORÍAS' : 'MENTORING')
                : 'G-KAIS WORKSPACE'
            }</p>
            <h2 className={`mt-2 text-3xl font-semibold tracking-[-0.035em] md:text-4xl ${darkWorkspace ? 'text-white' : 'text-[#0A0A0A]'}`}>{active === 'overview' ? (language === 'es' ? '¿Qué necesita tu atención?' : 'What needs your attention?') : activeLabel}</h2>
            {active === 'overview' && <p className={`mt-2 max-w-2xl text-sm leading-6 ${darkWorkspace ? 'text-white/65' : 'text-black/50'}`}>{language === 'es'
              ? 'Entiende el negocio, detecta señales y ejecuta el trabajo sin perder el contexto de cada relación.'
              : 'Understand the business, detect signals and execute work without losing relationship context.'}</p>}
          </div>
          {content}
        </div>
      </main>
    </div>
  </div>;
}
