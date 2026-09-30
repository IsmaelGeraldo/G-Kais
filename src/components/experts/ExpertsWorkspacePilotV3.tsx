import React, { useEffect, useState } from 'react';
import { ArrowLeft, BookOpenCheck, CalendarDays, LayoutDashboard, ListTodo, Settings, Sparkles, UserCheck, Users } from 'lucide-react';
import { useLanguage, type Language } from '../../i18n/LanguageContext';
import { DashboardHistory } from './DashboardHistory';
import { PriorityRadarWorkspace } from './PriorityRadarWorkspace';
import { ClientOnboardingWorkspace } from './ClientOnboardingWorkspace';
import { WorkspaceSettingsProfile, type WorkspaceProfile, type WorkspaceAppearance, themeColor, workspaceBackground } from './WorkspaceSettingsProfile';

type Props = { onExit: () => void };
type LocalText = { es: string; en: string };
type Section = 'overview' | 'people' | 'work' | 'intelligence';
type NavItem = { id: string; label: LocalText; icon: React.ComponentType<{ className?: string }>; section: Section };

const NAV: NavItem[] = [
  { id: 'overview', label: { es: 'Dashboard', en: 'Dashboard' }, icon: LayoutDashboard, section: 'overview' },
  { id: 'leads', label: { es: 'Leads', en: 'Leads' }, icon: UserCheck, section: 'people' },
  { id: 'clients', label: { es: 'Clientes', en: 'Clients' }, icon: Users, section: 'people' },
  { id: 'tasks', label: { es: 'Tareas', en: 'Tasks' }, icon: ListTodo, section: 'work' },
  { id: 'calendar', label: { es: 'Calendario', en: 'Calendar' }, icon: CalendarDays, section: 'work' },
  { id: 'copilot', label: { es: 'G-KAIS Copilot', en: 'G-KAIS Copilot' }, icon: Sparkles, section: 'intelligence' },
  { id: 'knowledge', label: { es: 'Conocimiento', en: 'Knowledge' }, icon: BookOpenCheck, section: 'intelligence' }
];

const PROFILE_KEY = 'gkais-experts-profile-v1';
const APPEARANCE_KEY = 'gkais-experts-appearance-v2';

function readLocation() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view') || 'overview';
  const validView = NAV.some((item) => item.id === view) || view === 'settings' || view === 'priority';
  return { active: validView ? view : 'overview', clientId: params.get('client') || 'sofia' };
}

function loadProfile(): WorkspaceProfile {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || '') as WorkspaceProfile; }
  catch { return { name: 'Carlos Espinoza', business: 'Método Escala', role: 'Mentor', avatar: '' }; }
}

function loadAppearance(): WorkspaceAppearance {
  try { return JSON.parse(localStorage.getItem(APPEARANCE_KEY) || '') as WorkspaceAppearance; }
  catch { return { theme: 'stone', intensity: 3, sidebar: 'same', sidebarIntensity: 7 }; }
}

function Placeholder({ active, language }: { active: string; language: Language }) {
  const item = NAV.find((entry) => entry.id === active);
  return <section className="rounded-2xl border border-black/10 bg-white p-8"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">G-KAIS WORKSPACE</p><h3 className="mt-2 text-2xl font-semibold">{item?.label[language] ?? 'Workspace'}</h3><p className="mt-3 text-sm text-black/50">{language === 'es' ? 'Esta sección se conectará según lo que aprendamos del piloto real.' : 'This section will be connected as we learn from the real pilot.'}</p></section>;
}

export function ExpertsWorkspace({ onExit }: Props) {
  const { language, setLanguage } = useLanguage();
  const initial = readLocation();
  const [active, setActive] = useState(initial.active);
  const [selectedClientId, setSelectedClientId] = useState(initial.clientId);
  const [profile, setProfile] = useState<WorkspaceProfile>(loadProfile);
  const [appearance, setAppearance] = useState<WorkspaceAppearance>(loadAppearance);

  useEffect(() => { try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch {} }, [profile]);
  useEffect(() => { try { localStorage.setItem(APPEARANCE_KEY, JSON.stringify(appearance)); } catch {} }, [appearance]);

  useEffect(() => {
    const onPop = () => {
      const location = readLocation();
      setActive(location.active);
      setSelectedClientId(location.clientId);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = (id: string, clientId?: string) => {
    const params = new URLSearchParams();
    params.set('view', id);
    const nextClient = clientId ?? selectedClientId;
    if (id === 'clients') params.set('client', nextClient);
    window.history.pushState({}, '', `/workspace/experts?${params.toString()}`);
    setActive(id);
    if (clientId) setSelectedClientId(clientId);
  };

  const startSession = (clientId: string) => {
    window.history.pushState({}, '', `/workspace/experts/sessions?client=${encodeURIComponent(clientId)}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const openPerson = (id: string) => id === 'valentina' ? navigate('leads') : navigate('clients', id);
  const goBack = () => active === 'overview' ? onExit() : window.history.back();

  const accent = themeColor(appearance.sidebar === 'same' ? appearance.theme : appearance.sidebar);
  const selectedBackground = `color-mix(in srgb, ${accent} ${Math.min(94, 40 + appearance.sidebarIntensity * 5)}%, white)`;
  const selectedText = appearance.sidebarIntensity >= 6 ? '#FFFFFF' : '#111413';
  const workspaceAccent = themeColor(appearance.theme);
  const darkWorkspace = appearance.theme === 'black' && appearance.intensity > 7;
  const blackSurfaceMix = appearance.theme === 'black' ? Math.max(0, (appearance.intensity - 4) * 2) : 0;
  const cardSurface = `color-mix(in srgb, #000000 ${blackSurfaceMix}%, #FAFAF8)`;
  const activeLabel = active === 'settings'
    ? (language === 'es' ? 'Configuración' : 'Settings')
    : active === 'priority'
      ? (language === 'es' ? 'Trabajo prioritario' : 'Priority Work')
      : NAV.find((item) => item.id === active)?.label[language] ?? 'Dashboard';

  let content: React.ReactNode;
  if (active === 'overview') content = <DashboardHistory language={language} onNavigate={navigate} onOpenClient={openPerson} onStartSession={startSession} />;
  else if (active === 'priority') content = <PriorityRadarWorkspace language={language} onOpenClient={openPerson} />;
  else if (active === 'clients') content = <ClientOnboardingWorkspace language={language} selectedId={selectedClientId} onSelectedId={(id) => navigate('clients', id)} onStartSession={startSession} onOpenPriority={() => navigate('priority')} />;
  else if (active === 'settings') content = <WorkspaceSettingsProfile language={language} profile={profile} setProfile={setProfile} appearance={appearance} setAppearance={setAppearance} />;
  else content = <Placeholder active={active} language={language} />;

  const sectionLabels: Record<Section, LocalText | null> = {
    overview: null,
    people: { es: 'PERSONAS', en: 'PEOPLE' },
    work: { es: 'TRABAJO', en: 'WORK' },
    intelligence: { es: 'INTELIGENCIA', en: 'INTELLIGENCE' }
  };

  return <div className={`min-h-screen text-[#0A0A0A] ${appearance.theme === 'black' ? 'gkais-black-surface' : ''}`} style={{ background: workspaceBackground(workspaceAccent, appearance.intensity), '--gkais-card-surface': cardSurface } as React.CSSProperties}>
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[245px] border-r border-black/10 bg-[#111413] text-white lg:flex lg:flex-col">
      <div className="border-b border-white/10 px-5 py-5"><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">G-KAIS</p><p className="mt-1 text-sm font-semibold">for Experts</p></div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {(['overview','people','work','intelligence'] as Section[]).map((section) => <div key={section} className={section === 'overview' ? '' : 'mt-5'}>
          {sectionLabels[section] && <p className="mb-2 px-3 text-[9px] font-semibold tracking-[0.18em] text-white/30">{sectionLabels[section]![language]}</p>}
          <div className="space-y-1">{NAV.filter((item) => item.section === section).map((item) => { const Icon = item.icon; const selected = active === item.id; return <button key={item.id} type="button" onClick={() => navigate(item.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${selected ? '' : 'text-white/65 hover:bg-white/[0.06] hover:text-white'}`} style={selected ? { background: selectedBackground, color: selectedText } : undefined}><Icon className="h-4 w-4" /><span className="flex-1 text-left">{item.label[language]}</span></button>; })}</div>
        </div>)}
      </nav>
      <div className="border-t border-white/10 p-3">
        <button type="button" onClick={() => navigate('settings')} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${active === 'settings' ? '' : 'text-white/55 hover:bg-white/[0.06]'}`} style={active === 'settings' ? { background: selectedBackground, color: selectedText } : undefined}><Settings className="h-4 w-4" />{language === 'es' ? 'Configuración' : 'Settings'}</button>
        <div className="mt-2 flex items-center gap-3 rounded-xl bg-white/[0.05] p-3">{profile.avatar ? <img src={profile.avatar} alt="" className="h-9 w-9 rounded-full object-cover" /> : <div className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-xs font-semibold">{profile.name.split(' ').map((part) => part[0]).slice(0,2).join('')}</div>}<div className="min-w-0"><p className="truncate text-xs font-semibold">{profile.name}</p><p className="truncate text-[10px] text-white/35">{profile.business}</p></div></div>
      </div>
    </aside>

    <div className="lg:pl-[245px]">
      <header className="sticky top-0 z-20 border-b border-black/8 bg-white/75 px-4 py-3 backdrop-blur md:px-8 lg:px-10"><div className="flex items-center justify-between gap-4"><div className="flex items-center gap-3"><button type="button" onClick={goBack} className="grid h-9 w-9 place-items-center rounded-full border border-black/10 bg-white text-black/60"><ArrowLeft className="h-4 w-4" /></button><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/35">{profile.business}</p><h1 className="text-sm font-semibold">{activeLabel}</h1></div></div><div className="flex items-center gap-3"><div className="inline-flex rounded-full border border-black/10 bg-white p-0.5">{(['es','en'] as Language[]).map((option) => <button key={option} type="button" onClick={() => setLanguage(option)} className={`rounded-full px-2.5 py-1.5 text-[10px] font-semibold uppercase ${language === option ? 'bg-[#111413] text-white' : 'text-black/40'}`}>{option}</button>)}</div>{profile.avatar ? <img src={profile.avatar} alt="" className="h-9 w-9 rounded-full object-cover" /> : <div className="grid h-9 w-9 place-items-center rounded-full bg-[#111413] text-xs font-semibold text-white">{profile.name.split(' ').map((part) => part[0]).slice(0,2).join('')}</div>}</div></div></header>
      <main className="px-4 py-6 md:px-8 md:py-8 lg:px-10 lg:py-10"><div className="mx-auto max-w-[1500px]">
        <div className="mb-5 lg:hidden"><div className="flex gap-2 overflow-x-auto pb-2">{NAV.slice(0,6).map((item) => <button key={item.id} onClick={() => navigate(item.id)} className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold ${active === item.id ? 'bg-[#111413] text-white' : 'border border-black/10 bg-white text-black/55'}`}>{item.label[language]}</button>)}</div></div>
        <div className="mb-7"><p className={`text-xs font-semibold uppercase tracking-[0.18em] ${darkWorkspace ? 'text-white/70' : 'text-[#0A3F4D]'}`}>{active === 'overview' ? (language === 'es' ? 'VISTA OPERATIVA DIARIA' : 'DAILY OPERATING VIEW') : active === 'settings' ? (language === 'es' ? 'PREFERENCIAS DEL WORKSPACE' : 'WORKSPACE PREFERENCES') : 'G-KAIS WORKSPACE'}</p><h2 className={`mt-2 text-3xl font-semibold tracking-[-0.035em] md:text-4xl ${darkWorkspace ? 'text-white' : 'text-[#0A0A0A]'}`}>{active === 'overview' ? (language === 'es' ? '¿Qué necesita tu atención?' : 'What needs your attention?') : activeLabel}</h2>{active === 'overview' && <p className={`mt-2 max-w-2xl text-sm leading-6 ${darkWorkspace ? 'text-white/65' : 'text-black/50'}`}>{language === 'es' ? 'Entiende el negocio, detecta señales y ejecuta el trabajo sin perder el contexto de cada relación.' : 'Understand the business, detect signals and execute work without losing relationship context.'}</p>}</div>
        {content}
      </div></main>
    </div>
  </div>;
}
