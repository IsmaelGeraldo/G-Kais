import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BookOpenCheck,
  CalendarDays,
  CircleGauge,
  LayoutDashboard,
  ListTodo,
  MessageSquareText,
  Settings,
  Sparkles,
  UserCheck,
  Users
} from 'lucide-react';
import { useLanguage, type Language } from '../../i18n/LanguageContext';
import { DashboardHistory } from './DashboardHistory';
import { PriorityRadarWorkspace } from './PriorityRadarWorkspace';
import { ClientWorkspaceEnhanced } from './ClientWorkspaceEnhanced';
import {
  WorkspaceSettingsProfile,
  type WorkspaceProfile,
  type WorkspaceAppearance,
  themeColor,
  workspaceBackground
} from './WorkspaceSettingsProfile';

type ExpertsWorkspaceProps = { onExit: () => void };
type LocalText = { es: string; en: string };

type NavItem = {
  id: string;
  label: LocalText;
  icon: React.ComponentType<{ className?: string }>;
  section: 'overview' | 'attention' | 'people' | 'work' | 'intelligence';
};

const NAV: NavItem[] = [
  { id: 'overview', label: { es: 'Dashboard', en: 'Dashboard' }, icon: LayoutDashboard, section: 'overview' },
  { id: 'priority', label: { es: 'Trabajo prioritario', en: 'Priority Work' }, icon: CircleGauge, section: 'attention' },
  { id: 'leads', label: { es: 'Leads', en: 'Leads' }, icon: UserCheck, section: 'people' },
  { id: 'clients', label: { es: 'Clientes', en: 'Clients' }, icon: Users, section: 'people' },
  { id: 'sessions', label: { es: 'Sesiones', en: 'Sessions' }, icon: MessageSquareText, section: 'work' },
  { id: 'tasks', label: { es: 'Tareas', en: 'Tasks' }, icon: ListTodo, section: 'work' },
  { id: 'calendar', label: { es: 'Calendario', en: 'Calendar' }, icon: CalendarDays, section: 'work' },
  { id: 'copilot', label: { es: 'G-KAIS Copilot', en: 'G-KAIS Copilot' }, icon: Sparkles, section: 'intelligence' },
  { id: 'knowledge', label: { es: 'Conocimiento', en: 'Knowledge' }, icon: BookOpenCheck, section: 'intelligence' }
];

const PROFILE_KEY = 'gkais-experts-profile-v1';
const APPEARANCE_KEY = 'gkais-experts-appearance-v2';

function loadProfile(): WorkspaceProfile {
  try {
    const saved = localStorage.getItem(PROFILE_KEY);
    return saved ? JSON.parse(saved) : { name: 'Carlos Espinoza', business: 'Método Escala', role: 'Mentor', avatar: '' };
  } catch {
    return { name: 'Carlos Espinoza', business: 'Método Escala', role: 'Mentor', avatar: '' };
  }
}

function loadAppearance(): WorkspaceAppearance {
  try {
    const saved = localStorage.getItem(APPEARANCE_KEY);
    return saved ? JSON.parse(saved) : { theme: 'stone', intensity: 3, sidebar: 'same', sidebarIntensity: 7 };
  } catch {
    return { theme: 'stone', intensity: 3, sidebar: 'same', sidebarIntensity: 7 };
  }
}

function Placeholder({ active, language }: { active: string; language: Language }) {
  const item = NAV.find((nav) => nav.id === active);
  return (
    <section className="rounded-2xl border border-black/10 bg-white p-8 shadow-[0_12px_35px_rgba(10,10,10,0.04)]">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">G-KAIS WORKSPACE</p>
      <h3 className="mt-2 text-2xl font-semibold">{item?.label[language] ?? (language === 'es' ? 'Área de trabajo' : 'Workspace')}</h3>
      <p className="mt-3 max-w-xl text-sm leading-6 text-black/50">{language === 'es' ? 'Esta sección se conectará progresivamente según lo que aprendamos del piloto real.' : 'This section will be connected progressively based on what we learn from the real pilot.'}</p>
    </section>
  );
}

export function ExpertsWorkspace({ onExit }: ExpertsWorkspaceProps) {
  const { language, setLanguage } = useLanguage();
  const [active, setActive] = useState('overview');
  const [selectedClientId, setSelectedClientId] = useState('sofia');
  const [profile, setProfile] = useState<WorkspaceProfile>(loadProfile);
  const [appearance, setAppearance] = useState<WorkspaceAppearance>(loadAppearance);

  useEffect(() => {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch {}
  }, [profile]);

  useEffect(() => {
    try { localStorage.setItem(APPEARANCE_KEY, JSON.stringify(appearance)); } catch {}
  }, [appearance]);

  const navigate = (id: string) => {
    if (id === 'sessions') {
      window.history.pushState({}, '', '/workspace/experts/sessions');
      window.dispatchEvent(new PopStateEvent('popstate'));
      return;
    }
    setActive(id);
  };

  const openRadarPerson = (id: string) => {
    if (id === 'valentina') {
      setActive('leads');
      return;
    }
    setSelectedClientId(id);
    setActive('clients');
  };

  const accentBase = themeColor(appearance.sidebar === 'same' ? appearance.theme : appearance.sidebar);
  const accentAmount = Math.min(94, 40 + appearance.sidebarIntensity * 5);
  const selectedBackground = `color-mix(in srgb, ${accentBase} ${accentAmount}%, white)`;
  const selectedText = appearance.sidebarIntensity >= 6 ? '#FFFFFF' : '#111413';
  const theme = themeColor(appearance.theme);

  const activeLabel = active === 'settings'
    ? (language === 'es' ? 'Configuración' : 'Settings')
    : NAV.find((item) => item.id === active)?.label[language] ?? 'Dashboard';

  let content: React.ReactNode;
  if (active === 'overview') {
    content = <DashboardHistory language={language} onNavigate={navigate} />;
  } else if (active === 'priority') {
    content = <PriorityRadarWorkspace language={language} onOpenClient={openRadarPerson} />;
  } else if (active === 'clients') {
    content = <ClientWorkspaceEnhanced language={language} selectedId={selectedClientId} onSelectedId={setSelectedClientId} onStartSession={() => navigate('sessions')} />;
  } else if (active === 'settings') {
    content = <WorkspaceSettingsProfile language={language} profile={profile} setProfile={setProfile} appearance={appearance} setAppearance={setAppearance} />;
  } else {
    content = <Placeholder active={active} language={language} />;
  }

  const sectionLabel: Record<NavItem['section'], LocalText | null> = {
    overview: null,
    attention: { es: 'ATENCIÓN', en: 'ATTENTION' },
    people: { es: 'PERSONAS', en: 'PEOPLE' },
    work: { es: 'TRABAJO', en: 'WORK' },
    intelligence: { es: 'INTELIGENCIA', en: 'INTELLIGENCE' }
  };

  return (
    <div className="min-h-screen text-[#0A0A0A]" style={{ background: workspaceBackground(theme, appearance.intensity) }}>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[245px] border-r border-black/10 bg-[#111413] text-white lg:flex lg:flex-col">
        <div className="border-b border-white/10 px-5 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">G-KAIS</p>
          <p className="mt-1 text-sm font-semibold">for Experts</p>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {(['overview', 'attention', 'people', 'work', 'intelligence'] as NavItem['section'][]).map((section) => {
            const items = NAV.filter((item) => item.section === section);
            const label = sectionLabel[section];
            return (
              <div key={section} className={section === 'overview' ? '' : 'mt-5'}>
                {label && <p className="mb-2 px-3 text-[9px] font-semibold tracking-[0.18em] text-white/30">{label[language]}</p>}
                <div className="space-y-1">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const selected = active === item.id;
                    return (
                      <button key={item.id} type="button" onClick={() => navigate(item.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${selected ? '' : 'text-white/65 hover:bg-white/[0.06] hover:text-white'}`} style={selected ? { background: selectedBackground, color: selectedText } : undefined}>
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1 text-left">{item.label[language]}</span>
                        {item.id === 'priority' && <span className={`text-[10px] font-semibold ${selected ? '' : 'text-white/30'}`}>7</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <button type="button" onClick={() => setActive('settings')} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active === 'settings' ? '' : 'text-white/55 hover:bg-white/[0.06] hover:text-white'}`} style={active === 'settings' ? { background: selectedBackground, color: selectedText } : undefined}>
            <Settings className="h-4 w-4" />{language === 'es' ? 'Configuración' : 'Settings'}
          </button>
          <div className="mt-2 flex items-center gap-3 rounded-xl bg-white/[0.05] p-3">
            {profile.avatar ? <img src={profile.avatar} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" /> : <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-semibold">{profile.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div>}
            <div className="min-w-0"><p className="truncate text-xs font-semibold">{profile.name}</p><p className="mt-0.5 truncate text-[10px] text-white/35">{profile.business}</p></div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[245px]">
        <header className="sticky top-0 z-20 border-b border-black/8 bg-white/75 px-4 py-3 backdrop-blur md:px-8 lg:px-10">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button type="button" onClick={onExit} className="grid h-9 w-9 place-items-center rounded-full border border-black/10 bg-white text-black/60" aria-label={language === 'es' ? 'Salir del Workspace' : 'Exit Workspace'}><ArrowLeft className="h-4 w-4" /></button>
              <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/35">{profile.business}</p><h1 className="text-sm font-semibold">{activeLabel}</h1></div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="inline-flex rounded-full border border-black/10 bg-white p-0.5">
                {(['es', 'en'] as Language[]).map((option) => <button key={option} type="button" onClick={() => setLanguage(option)} className={`rounded-full px-2.5 py-1.5 text-[10px] font-semibold uppercase transition ${language === option ? 'bg-[#111413] text-white' : 'text-black/40 hover:text-black'}`}>{option}</button>)}
              </div>
              {profile.avatar ? <img src={profile.avatar} alt="" className="h-9 w-9 rounded-full object-cover" /> : <div className="grid h-9 w-9 place-items-center rounded-full bg-[#111413] text-xs font-semibold text-white">{profile.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div>}
            </div>
          </div>
        </header>

        <main className="px-4 py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-[1500px]">
            <div className="mb-5 lg:hidden">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {NAV.slice(0, 6).map((item) => <button key={item.id} type="button" onClick={() => navigate(item.id)} className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold ${active === item.id ? 'bg-[#111413] text-white' : 'border border-black/10 bg-white text-black/55'}`}>{item.label[language]}</button>)}
                <button type="button" onClick={() => setActive('settings')} className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold ${active === 'settings' ? 'bg-[#111413] text-white' : 'border border-black/10 bg-white text-black/55'}`}>{language === 'es' ? 'Configuración' : 'Settings'}</button>
              </div>
            </div>

            <div className="mb-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0A3F4D]">{active === 'overview' ? (language === 'es' ? 'VISTA OPERATIVA DIARIA' : 'DAILY OPERATING VIEW') : active === 'settings' ? (language === 'es' ? 'PREFERENCIAS DEL WORKSPACE' : 'WORKSPACE PREFERENCES') : 'G-KAIS WORKSPACE'}</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.035em] md:text-4xl">{active === 'overview' ? (language === 'es' ? '¿Qué necesita tu atención?' : 'What needs your attention?') : activeLabel}</h2>
              {active === 'overview' && <p className="mt-2 max-w-2xl text-sm leading-6 text-black/50">{language === 'es' ? 'Entiende el negocio, revisa el histórico y entra a cada conversación sabiendo qué requiere atención.' : 'Understand the business, review history and enter every conversation knowing what needs attention.'}</p>}
            </div>

            {content}
          </div>
        </main>
      </div>
    </div>
  );
}
