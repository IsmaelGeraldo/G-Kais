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
  PanelLeftOpen
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [access, setAccess] = useState<WorkspaceAccess>({
    ready: false,
    workspaceId: '',
    currentUid: '',
    workspaceName: '',
    currentMember: null,
    photoURL: '',
    isOwner: false
  });

  useEffect(() => { try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch {} }, [profile]);
  useEffect(() => { try { localStorage.setItem(APPEARANCE_KEY, JSON.stringify(appearance)); } catch {} }, [appearance]);
  useEffect(() => { try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed ? '1' : '0'); } catch {} }, [sidebarCollapsed]);
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
        const [workspaceSnapshot, userSnapshot] = await Promise.all([
          getDoc(doc(firestoreDb, 'expert_workspaces', team.workspaceId)),
          getDoc(doc(firestoreDb, 'users', team.currentUid))
        ]);
        const workspaceName = workspaceSnapshot.exists() && typeof workspaceSnapshot.data().name === 'string'
          ? workspaceSnapshot.data().name as string
          : '';
        const photoURL = userSnapshot.exists() && typeof userSnapshot.data().photoURL === 'string'
          ? userSnapshot.data().photoURL as string
          : '';
        if (cancelled) return;
        setAccess({
          ready: true,
          workspaceId: team.workspaceId,
          currentUid: team.currentUid,
          workspaceName,
          currentMember: team.currentMember,
          photoURL,
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
        setAccess({ ready: true, workspaceId: '', currentUid: '', workspaceName: '', currentMember: null, photoURL: '', isOwner: false });
        return;
      }
      void loadAccess();
    });
    const onMembershipChanged = () => void loadAccess();
    const onProfileChanged = () => void loadAccess();
    window.addEventListener('gkais:workspace-membership-changed', onMembershipChanged);
    window.addEventListener('gkais:user-profile-changed', onProfileChanged);
    return () => {
      cancelled = true;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      unsubscribe();
      window.removeEventListener('gkais:workspace-membership-changed', onMembershipChanged);
      window.removeEventListener('gkais:user-profile-changed', onProfileChanged);
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

  if (!access.currentMember) {
    return <div className="grid min-h-screen place-items-center bg-[#F6F6F3] px-5">
      <div className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-7 text-center shadow-[0_20px_60px_rgba(0,0,0,0.07)]">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">G-KAIS WORKSPACE</p>
        <h1 className="mt-2 text-xl font-semibold">{language === 'es' ? 'Necesitas iniciar sesión' : 'Sign in required'}</h1>
        <p className="mt-2 text-sm leading-6 text-black/50">{language === 'es'
          ? 'No encontramos una membresía activa para esta sesión. Inicia sesión con la cuenta asociada a tu empresa.'
          : 'We could not find an active membership for this session. Sign in with the account linked to your company.'}</p>
        <button type="button" onClick={() => window.location.assign('/login')} className="mt-5 rounded-full bg-[#111413] px-5 py-3 text-sm font-semibold text-white">
          {language === 'es' ? 'Ir a iniciar sesión' : 'Go to sign in'}
        </button>
      </div>
    </div>;
  }

  const accent = themeColor(appearance.sidebar === 'same' ? appearance.theme : appearance.sidebar);
  const selectedBackground = `color-mix(in srgb, ${accent} ${Math.min(94, 40 + appearance.sidebarIntensity * 5)}%, white)`;
  const selectedText = contrastTextForAccent(accent);
  const internalAccent = internalNavAccent === 'sidebar' ? selectedBackground : '#111413';
  const internalAccentText = internalNavAccent === 'sidebar' ? selectedText : '#FFFFFF';
  const workspaceAccent = themeColor(appearance.theme);
  const darkWorkspace = appearance.theme === 'black' && appearance.intensity > 7;
  const blackSurfaceMix = appearance.theme === 'black' ? Math.max(0, (appearance.intensity - 4) * 2) : 0;
  const cardSurface = `color-mix(in srgb, #000000 ${blackSurfaceMix}%, #FAFAF8)`;
  const activeLabel = active === 'settings'
    ? (language === 'es' ? 'Configuración' : 'Settings')
    : NAV.find((item) => item.id === active)?.label[language] ?? 'Workspace';

  const memberName = access.currentMember.displayName || firebaseAuth.currentUser?.displayName || firebaseAuth.currentUser?.email || profile.name;
  const memberRole = access.currentMember.roleId || profile.role;
  const memberRoleLabel = memberRole.split('-').map((part) => part ? part[0].toUpperCase() + part.slice(1) : part).join(' ');
  const memberEmail = access.currentMember.email || firebaseAuth.currentUser?.email || '';
  const workspaceName = access.workspaceName || (access.isOwner ? profile.business : 'G-KAIS Workspace');
  const memberAvatar = access.isOwner
    ? (profile.avatar || access.photoURL || firebaseAuth.currentUser?.photoURL || '')
    : (access.photoURL || firebaseAuth.currentUser?.photoURL || '');

  const updatePersonalPhoto = async (photoURL: string) => {
    await updateExpertWorkspaceUserPhoto(photoURL);
    setAccess((current) => ({ ...current, photoURL }));
  };

  const logout = async () => {
    setAccountMenuOpen(false);
    await signOut(firebaseAuth);
    window.location.assign('/login');
  };

  let content: React.ReactNode;
  if (active === 'overview' && allowedIds.has('overview')) {
    content = <DashboardHistory
      language={language}
      onNavigate={(id) => navigate(id)}
      onOpenClient={openMentoringClient}
      onStartSession={startSession}
      canInteract={(id) => access.isOwner || allowedIds.has(id)}
    />;
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
      personalProfile={access.isOwner ? undefined : {
        displayName: memberName,
        email: memberEmail,
        role: memberRoleLabel,
        workspaceName,
        photoURL: memberAvatar
      }}
      onPersonalPhotoChange={access.isOwner ? undefined : updatePersonalPhoto}
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
    className={`min-h-screen text-[#0A0A0A] ${sidebarCollapsed ? 'gkais-sidebar-collapsed' : '' } ${appearance.theme === 'black' ? 'gkais-black-surface' : ''}`}
    style={{
      background: workspaceBackground(workspaceAccent, appearance.intensity),
      '--gkais-card-surface': cardSurface,
      '--gkais-internal-accent': internalAccent,
      '--gkais-internal-accent-text': internalAccentText
    } as React.CSSProperties}
  >
    <aside className={`fixed inset-y-0 left-0 z-30 hidden border-r border-black/10 bg-[#111413] text-white transition-[width] duration-200 lg:flex lg:flex-col ${sidebarCollapsed ? 'w-[76px]' : 'w-[245px]'}`}>
      <div className={`border-b border-white/10 py-5 ${sidebarCollapsed ? 'px-3 text-center' : 'px-5'}`}>
        <p className={`font-semibold uppercase text-white/45 ${sidebarCollapsed ? 'text-[10px] tracking-[0.1em]' : 'text-[11px] tracking-[0.2em]'}`}>{sidebarCollapsed ? 'G-K' : 'G-KAIS'}</p>
        {!sidebarCollapsed && <p className="mt-1 text-sm font-semibold">for Experts</p>}
      </div>
      <nav className={`flex-1 overflow-y-auto py-4 ${sidebarCollapsed ? 'px-2' : 'px-3'}`}>
        {(['overview', 'programs', 'operations', 'intelligence'] as Section[]).map((section) => {
          const items = visibleNav.filter((item) => item.section === section);
          if (!items.length) return null;
          return <div key={section} className={section === 'overview' ? '' : 'mt-5'}>
            {!sidebarCollapsed && sectionLabels[section] && <p className="mb-2 px-3 text-[9px] font-semibold tracking-[0.18em] text-white/30">{sectionLabels[section]![language]}</p>}
            <div className="space-y-1">{items.map((item) => {
              const Icon = item.icon;
              const selected = active === item.id;
              return <button
                key={item.id}
                type="button"
                title={sidebarCollapsed ? item.label[language] : undefined}
                onClick={() => navigate(item.id)}
                className={`flex w-full items-center rounded-xl py-2.5 text-sm transition ${sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-3'} ${selected ? '' : 'text-white/65 hover:bg-white/[0.06] hover:text-white'}`}
                style={selected ? { background: selectedBackground, color: selectedText } : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && <span className="flex-1 text-left">{item.label[language]}</span>}
              </button>;
            })}</div>
          </div>;
        })}
      </nav>
      <div className={`border-t border-white/10 ${sidebarCollapsed ? 'p-2' : 'p-3'}`}>
        <div className={`mb-2 flex ${sidebarCollapsed ? 'justify-center' : 'justify-end'}`}>
          <button
            type="button"
            onClick={() => setSidebarCollapsed((value) => !value)}
            title={sidebarCollapsed ? (language === 'es' ? 'Desplegar sidebar' : 'Expand sidebar') : (language === 'es' ? 'Ocultar sidebar' : 'Collapse sidebar')}
            className="grid h-7 w-7 place-items-center rounded-lg text-white/40 transition hover:bg-white/[0.06] hover:text-white/80"
          >
            {sidebarCollapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
          </button>
        </div>
        <button
          type="button"
          title={sidebarCollapsed ? (language === 'es' ? 'Configuración' : 'Settings') : undefined}
          onClick={() => navigate('settings')}
          className={`flex w-full items-center rounded-xl py-2.5 text-sm ${sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-3'} ${active === 'settings' ? '' : 'text-white/55 hover:bg-white/[0.06]'}`}
          style={active === 'settings' ? { background: selectedBackground, color: selectedText } : undefined}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!sidebarCollapsed && (language === 'es' ? 'Configuración' : 'Settings')}
        </button>
        <div className={`mt-2 flex items-center rounded-xl bg-white/[0.05] ${sidebarCollapsed ? 'justify-center p-2' : 'gap-3 p-3'}`}>
          {memberAvatar
            ? <img src={memberAvatar} alt="" className="h-9 w-9 rounded-full object-cover" />
            : <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-semibold">{memberName.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div>}
          {!sidebarCollapsed && <div className="min-w-0"><p className="truncate text-xs font-semibold">{memberName}</p><p className="truncate text-[10px] text-white/35">{memberRoleLabel}</p></div>}
        </div>
      </div>
    </aside>

    <div className={`transition-[padding] duration-200 ${sidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-[245px]'}`}>
      <header className="sticky top-0 z-20 border-b border-black/8 bg-white/75 px-4 py-3 backdrop-blur md:px-8 lg:px-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={goBack} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-black/10 bg-white text-black/60"><ArrowLeft className="h-4 w-4" /></button>
            <div className="min-w-0"><p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-black/35">{workspaceName}</p><h1 className="truncate text-sm font-semibold">{activeLabel}</h1></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden rounded-full border border-black/10 bg-white p-0.5 sm:inline-flex">{(['es', 'en'] as Language[]).map((option) => <button key={option} type="button" onClick={() => setLanguage(option)} className={`rounded-full px-2.5 py-1.5 text-[10px] font-semibold uppercase ${language === option ? 'bg-[#111413] text-white' : 'text-black/40'}`}>{option}</button>)}</div>
            <div className="relative">
              <button
                type="button"
                aria-expanded={accountMenuOpen}
                onClick={() => setAccountMenuOpen((value) => !value)}
                className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-black/10 bg-white shadow-sm"
                title={language === 'es' ? 'Cuenta' : 'Account'}
              >
                {memberAvatar
                  ? <img src={memberAvatar} alt="" className="h-full w-full object-cover" />
                  : <span className="grid h-full w-full place-items-center bg-[#111413] text-xs font-semibold text-white">{memberName.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>}
              </button>
              {accountMenuOpen && <div className="absolute right-0 top-12 z-50 w-[270px] rounded-2xl border border-black/10 bg-white p-2 shadow-[0_18px_55px_rgba(0,0,0,0.16)]">
                <div className="border-b border-black/7 px-3 py-3">
                  <p className="truncate text-sm font-semibold">{memberName}</p>
                  <p className="mt-1 truncate text-xs text-black/45">{memberEmail}</p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#0A3F4D]">{memberRoleLabel}</p>
                </div>
                <button type="button" onClick={() => window.location.assign('/')} className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-black/65 hover:bg-black/[0.035]"><ArrowLeft className="h-4 w-4" />{language === 'es' ? 'Ir al sitio de G-KAIS' : 'Go to G-KAIS site'}</button>
                <button type="button" onClick={() => void logout()} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#8D332C] hover:bg-[#A23A32]/6"><LogOut className="h-4 w-4" />{language === 'es' ? 'Cerrar sesión' : 'Sign out'}</button>
              </div>}
            </div>
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
