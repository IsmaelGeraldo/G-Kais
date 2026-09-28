import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpenCheck,
  CalendarDays,
  CircleGauge,
  ImagePlus,
  LayoutDashboard,
  ListTodo,
  MessageSquareText,
  Settings,
  Sparkles,
  UserCheck,
  Users
} from 'lucide-react';
import { useLanguage, type Language } from '../../i18n/LanguageContext';
import { WorkspaceDashboardV2, PriorityRadarV2 } from './WorkspaceDashboardV2';
import { ClientsWorkspaceV2 } from './ClientsWorkspaceV2';

type Props = { onExit: () => void };
type Profile = { name: string; workspaceName: string; role: string; image: string };
type Appearance = { workspaceColor: string; workspaceIntensity: number; sidebarColor: string; sidebarIntensity: number; syncSidebar: boolean };

const PROFILE_KEY = 'gkais-experts-profile-v1';
const APPEARANCE_KEY = 'gkais-experts-appearance-v2';

const defaultProfile: Profile = { name: 'Carlos Espinoza', workspaceName: 'Método Escala', role: 'Mentor', image: '' };
const defaultAppearance: Appearance = { workspaceColor: '#0A3F4D', workspaceIntensity: 3, sidebarColor: '#0A3F4D', sidebarIntensity: 7, syncSidebar: false };

function loadStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try { const value = window.localStorage.getItem(key); return value ? { ...fallback, ...JSON.parse(value) } : fallback; } catch { return fallback; }
}
function rgb(hex: string) { const clean = hex.replace('#', ''); const value = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16); return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 }; }
function rgba(hex: string, alpha: number) { const c = rgb(hex); return `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`; }
function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'GK'; }

const NAV = [
  { id: 'overview', section: 'overview', icon: LayoutDashboard, es: 'Dashboard', en: 'Dashboard' },
  { id: 'priority', section: 'attention', icon: CircleGauge, es: 'Trabajo prioritario', en: 'Priority Work', count: 7 },
  { id: 'leads', section: 'people', icon: UserCheck, es: 'Leads', en: 'Leads', count: 18 },
  { id: 'clients', section: 'people', icon: Users, es: 'Clientes', en: 'Clients', count: 46 },
  { id: 'sessions', section: 'work', icon: MessageSquareText, es: 'Sesiones', en: 'Sessions' },
  { id: 'tasks', section: 'work', icon: ListTodo, es: 'Tareas', en: 'Tasks' },
  { id: 'calendar', section: 'work', icon: CalendarDays, es: 'Calendario', en: 'Calendar' },
  { id: 'copilot', section: 'intelligence', icon: Sparkles, es: 'G-KAIS Copilot', en: 'G-KAIS Copilot' },
  { id: 'knowledge', section: 'intelligence', icon: BookOpenCheck, es: 'Conocimiento', en: 'Knowledge' }
] as const;

const SECTIONS = [
  { id: 'overview', es: '', en: '' },
  { id: 'attention', es: 'ATENCIÓN', en: 'ATTENTION' },
  { id: 'people', es: 'PERSONAS', en: 'PEOPLE' },
  { id: 'work', es: 'TRABAJO', en: 'WORK' },
  { id: 'intelligence', es: 'INTELIGENCIA', en: 'INTELLIGENCE' }
] as const;

function ProfileAvatar({ profile, className = 'h-9 w-9' }: { profile: Profile; className?: string }) {
  return profile.image ? <img src={profile.image} alt={profile.name} className={`${className} rounded-full object-cover`} /> : <div className={`grid ${className} place-items-center rounded-full bg-[#111413] text-xs font-semibold text-white`}>{initials(profile.name)}</div>;
}

function SettingsPanel({ language, profile, setProfile, appearance, setAppearance }: { language: Language; profile: Profile; setProfile: React.Dispatch<React.SetStateAction<Profile>>; appearance: Appearance; setAppearance: React.Dispatch<React.SetStateAction<Appearance>> }) {
  const onImage = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setProfile((current) => ({ ...current, image: typeof reader.result === 'string' ? reader.result : current.image }));
    reader.readAsDataURL(file);
  };
  return <div className="grid gap-6 xl:grid-cols-2">
    <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-[0_12px_35px_rgba(10,10,10,.04)]"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#0A3F4D]">{language === 'es' ? 'PERFIL' : 'PROFILE'}</p><h3 className="mt-2 text-xl font-semibold">{language === 'es' ? 'Identidad del Workspace' : 'Workspace identity'}</h3><p className="mt-2 text-sm text-black/50">{language === 'es' ? 'Tu foto o logo, nombre y negocio aparecen en el sidebar.' : 'Your photo or logo, name and business appear in the sidebar.'}</p></div><ProfileAvatar profile={profile} className="h-12 w-12"/></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2"><span className="text-[10px] font-semibold uppercase tracking-[.14em] text-black/40">{language === 'es' ? 'Foto / logo' : 'Photo / logo'}</span><div className="mt-2 flex items-center gap-3"><label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-xs font-semibold"><ImagePlus className="h-4 w-4"/>{language === 'es' ? 'Subir imagen' : 'Upload image'}<input type="file" accept="image/*" className="hidden" onChange={(e) => onImage(e.target.files?.[0])}/></label>{profile.image && <button onClick={() => setProfile((c) => ({ ...c, image: '' }))} className="text-xs text-black/45">{language === 'es' ? 'Quitar' : 'Remove'}</button>}</div></label><label><span className="text-[10px] font-semibold uppercase tracking-[.14em] text-black/40">{language === 'es' ? 'Nombre' : 'Name'}</span><input value={profile.name} onChange={(e) => setProfile((c) => ({ ...c, name: e.target.value }))} className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm"/></label><label><span className="text-[10px] font-semibold uppercase tracking-[.14em] text-black/40">{language === 'es' ? 'Empresa / Workspace' : 'Company / Workspace'}</span><input value={profile.workspaceName} onChange={(e) => setProfile((c) => ({ ...c, workspaceName: e.target.value }))} className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm"/></label><label><span className="text-[10px] font-semibold uppercase tracking-[.14em] text-black/40">{language === 'es' ? 'Rol' : 'Role'}</span><input value={profile.role} onChange={(e) => setProfile((c) => ({ ...c, role: e.target.value }))} className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm"/></label></div></section>
    <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-[0_12px_35px_rgba(10,10,10,.04)]"><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#0A3F4D]">{language === 'es' ? 'APARIENCIA' : 'APPEARANCE'}</p><h3 className="mt-2 text-xl font-semibold">{language === 'es' ? 'Color del Workspace' : 'Workspace color'}</h3><p className="mt-2 text-sm text-black/50">{language === 'es' ? 'Elige cualquier color y controla su intensidad de 1 a 10.' : 'Choose any color and control intensity from 1 to 10.'}</p><div className="mt-5 flex items-center gap-4"><input type="color" value={appearance.workspaceColor} onChange={(e) => setAppearance((c) => ({ ...c, workspaceColor: e.target.value }))} className="h-12 w-16 cursor-pointer rounded-xl border border-black/10 bg-white p-1"/><div className="flex-1"><div className="flex justify-between text-xs"><span>{language === 'es' ? 'Intensidad' : 'Intensity'}</span><strong>{appearance.workspaceIntensity}/10</strong></div><input type="range" min="1" max="10" value={appearance.workspaceIntensity} onChange={(e) => setAppearance((c) => ({ ...c, workspaceIntensity: Number(e.target.value) }))} className="mt-2 w-full"/></div></div><div className="mt-4 h-20 rounded-2xl border border-black/8" style={{ background: `linear-gradient(135deg, ${rgba(appearance.workspaceColor, .04 + appearance.workspaceIntensity * .035)}, #F4F4F1 74%)` }}/></section>
    <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-[0_12px_35px_rgba(10,10,10,.04)] xl:col-span-2"><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#0A3F4D]">SIDEBAR</p><h3 className="mt-2 text-xl font-semibold">{language === 'es' ? 'Color de selección' : 'Selection color'}</h3><label className="mt-4 flex items-center gap-2 text-sm text-black/60"><input type="checkbox" checked={appearance.syncSidebar} onChange={(e) => setAppearance((c) => ({ ...c, syncSidebar: e.target.checked }))}/>{language === 'es' ? 'Usar el mismo color del Workspace' : 'Use the same Workspace color'}</label><div className="mt-5 flex max-w-2xl items-center gap-4"><input type="color" disabled={appearance.syncSidebar} value={appearance.syncSidebar ? appearance.workspaceColor : appearance.sidebarColor} onChange={(e) => setAppearance((c) => ({ ...c, sidebarColor: e.target.value }))} className="h-12 w-16 cursor-pointer rounded-xl border border-black/10 bg-white p-1 disabled:opacity-40"/><div className="flex-1"><div className="flex justify-between text-xs"><span>{language === 'es' ? 'Intensidad' : 'Intensity'}</span><strong>{appearance.sidebarIntensity}/10</strong></div><input type="range" min="1" max="10" value={appearance.sidebarIntensity} onChange={(e) => setAppearance((c) => ({ ...c, sidebarIntensity: Number(e.target.value) }))} className="mt-2 w-full"/></div></div></section>
  </div>;
}

function Placeholder({ id, language, onClients }: { id: string; language: Language; onClients: () => void }) {
  const session = id === 'sessions';
  const copilot = id === 'copilot';
  return <section className="rounded-2xl border border-black/10 bg-white p-8 shadow-[0_12px_35px_rgba(10,10,10,.04)]"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#0A3F4D]/8">{copilot ? <Sparkles className="h-5 w-5 text-[#0A3F4D]"/> : <CircleGauge className="h-5 w-5 text-[#0A3F4D]"/>}</div><p className="mt-5 text-xs font-semibold uppercase tracking-[.16em] text-[#0A3F4D]">G-KAIS WORKSPACE</p><h2 className="mt-2 text-2xl font-semibold">{session ? (language === 'es' ? 'Sesiones' : 'Sessions') : copilot ? 'G-KAIS Copilot' : (language === 'es' ? 'Área en preparación' : 'Area in progress')}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-black/55">{session ? (language === 'es' ? 'El Modo Sesión vive dentro de cada cliente para que el Copilot trabaje con su Outcome Memory, compromisos, bloqueadores y bitácora.' : 'Session Mode lives inside each client so Copilot can use Outcome Memory, commitments, blockers and history.') : copilot ? (language === 'es' ? 'El Copilot es un solo cerebro contextual. En cliente activo entra a trabajar dentro de Modo Sesión.' : 'Copilot is one contextual brain. For active clients it works inside Session Mode.') : (language === 'es' ? 'Esta sección se conectará cuando aporte valor directo al piloto.' : 'This section will connect when it directly adds value to the pilot.')}</p>{(session || copilot) && <button onClick={onClients} className="mt-5 rounded-full bg-[#111413] px-4 py-2.5 text-xs font-semibold text-white">{language === 'es' ? 'Abrir clientes' : 'Open clients'}</button>}</section>;
}

export function ExpertsWorkspaceV2({ onExit }: Props) {
  const { language, setLanguage } = useLanguage();
  const [active, setActive] = useState('overview');
  const [profile, setProfile] = useState<Profile>(() => loadStored(PROFILE_KEY, defaultProfile));
  const [appearance, setAppearance] = useState<Appearance>(() => loadStored(APPEARANCE_KEY, defaultAppearance));
  useEffect(() => { try { window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch {} }, [profile]);
  useEffect(() => { try { window.localStorage.setItem(APPEARANCE_KEY, JSON.stringify(appearance)); } catch {} }, [appearance]);

  const workspaceColor = appearance.workspaceColor;
  const sidebarColor = appearance.syncSidebar ? workspaceColor : appearance.sidebarColor;
  const sidebarAlpha = .12 + appearance.sidebarIntensity * .065;
  const selectedBg = rgba(sidebarColor, Math.min(.9, sidebarAlpha));
  const selectedText = appearance.sidebarIntensity >= 5 ? '#FFFFFF' : '#101312';
  const background = `linear-gradient(135deg, ${rgba(workspaceColor, .04 + appearance.workspaceIntensity * .035)}, #F4F4F1 70%)`;
  const activeLabel = useMemo(() => active === 'settings' ? (language === 'es' ? 'Configuración' : 'Settings') : (NAV.find((item) => item.id === active)?.[language] || 'Dashboard'), [active, language]);
  const content = active === 'overview' ? <WorkspaceDashboardV2 language={language} onNavigate={setActive}/> : active === 'priority' ? <PriorityRadarV2 language={language} onOpenClient={() => setActive('clients')}/> : active === 'clients' ? <ClientsWorkspaceV2 language={language}/> : active === 'settings' ? <SettingsPanel language={language} profile={profile} setProfile={setProfile} appearance={appearance} setAppearance={setAppearance}/> : <Placeholder id={active} language={language} onClients={() => setActive('clients')}/>;

  return <div className="min-h-screen text-[#0A0A0A]" style={{ background }}><aside className="fixed inset-y-0 left-0 z-30 hidden w-[245px] border-r border-black/10 bg-[#111413] text-white lg:flex lg:flex-col"><div className="border-b border-white/10 px-5 py-5"><p className="text-[11px] font-semibold uppercase tracking-[.2em] text-white/45">G-KAIS</p><p className="mt-1 text-sm font-semibold">for Experts</p></div><nav className="flex-1 overflow-y-auto px-3 py-4">{SECTIONS.map((section) => { const items = NAV.filter((item) => item.section === section.id); return <div key={section.id} className={section.id === 'overview' ? '' : 'mt-6'}>{section[language] && <p className="mb-2 px-3 text-[9px] font-semibold tracking-[.18em] text-white/30">{section[language]}</p>}<div className="space-y-1">{items.map((item) => { const Icon = item.icon; const selected = active === item.id; return <button key={item.id} onClick={() => setActive(item.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${selected ? '' : 'text-white/65 hover:bg-white/[.06] hover:text-white'}`} style={selected ? { backgroundColor: selectedBg, color: selectedText } : undefined}><Icon className="h-4 w-4"/><span className="flex-1">{item[language]}</span>{'count' in item && <span className={`text-[10px] font-semibold ${selected ? '' : 'text-white/35'}`}>{item.count}</span>}</button>})}</div></div>})}</nav><div className="border-t border-white/10 p-3"><button onClick={() => setActive('settings')} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${active === 'settings' ? '' : 'text-white/55 hover:bg-white/[.06] hover:text-white'}`} style={active === 'settings' ? { backgroundColor: selectedBg, color: selectedText } : undefined}><Settings className="h-4 w-4"/>{language === 'es' ? 'Configuración' : 'Settings'}</button><div className="mt-2 flex items-center gap-3 rounded-xl bg-white/[.05] p-3"><ProfileAvatar profile={profile}/><div className="min-w-0"><p className="truncate text-xs font-semibold">{profile.name}</p><p className="mt-0.5 truncate text-[10px] text-white/38">{profile.workspaceName}</p><p className="truncate text-[9px] text-white/25">{profile.role}</p></div></div></div></aside>
    <div className="lg:pl-[245px]"><header className="sticky top-0 z-20 border-b border-black/8 px-4 py-3 backdrop-blur md:px-8 lg:px-10" style={{ background: 'rgba(244,244,241,.9)' }}><div className="flex items-center justify-between gap-4"><div className="flex items-center gap-3"><button onClick={onExit} className="grid h-9 w-9 place-items-center rounded-full border border-black/10 bg-white text-black/60"><ArrowLeft className="h-4 w-4"/></button><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-black/35">{profile.workspaceName}</p><h1 className="text-sm font-semibold">{activeLabel}</h1></div></div><div className="flex items-center gap-2"><div className="inline-flex rounded-full border border-black/10 bg-white p-0.5">{(['es','en'] as Language[]).map((option) => <button key={option} onClick={() => setLanguage(option)} className={`rounded-full px-2.5 py-1.5 text-[10px] font-semibold uppercase ${language === option ? 'bg-[#111413] text-white' : 'text-black/40'}`}>{option}</button>)}</div><button onClick={() => setActive('settings')} aria-label={language === 'es' ? 'Abrir perfil' : 'Open profile'}><ProfileAvatar profile={profile}/></button></div></div></header><main className="px-4 py-6 md:px-8 md:py-8 lg:px-10 lg:py-10"><div className="mx-auto max-w-[1500px]"><div className="mb-6 flex gap-2 overflow-x-auto pb-2 lg:hidden">{NAV.slice(0,5).map((item) => <button key={item.id} onClick={() => setActive(item.id)} className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold ${active === item.id ? 'bg-[#111413] text-white' : 'border border-black/10 bg-white text-black/55'}`}>{item[language]}</button>)}</div><div className="mb-7"><p className="text-xs font-semibold uppercase tracking-[.18em] text-[#0A3F4D]">{active === 'overview' ? (language === 'es' ? 'VISTA OPERATIVA DIARIA' : 'DAILY OPERATING VIEW') : 'G-KAIS WORKSPACE'}</p><h2 className="mt-2 text-3xl font-semibold tracking-[-.035em] md:text-4xl">{active === 'overview' ? (language === 'es' ? '¿Qué necesita tu atención?' : 'What needs your attention?') : activeLabel}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-black/50">{active === 'overview' ? (language === 'es' ? 'Una vista diaria para entender el negocio, priorizar personas y entrar a cada conversación con contexto.' : 'A daily view to understand the business, prioritize people and enter every conversation with context.') : active === 'clients' ? (language === 'es' ? 'Relación, resultados, sesiones y memoria longitudinal de cada cliente.' : 'Relationship, outcomes, sessions and longitudinal memory for every client.') : active === 'priority' ? (language === 'es' ? 'Quién requiere atención, por qué y qué debería ocurrir después.' : 'Who needs attention, why and what should happen next.') : ''}</p></div>{content}</div></main></div>
  </div>;
}
