import React, { useRef } from 'react';
import { ImagePlus, Layers3, Palette, UserRound } from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';

export type WorkspaceProfile = { name: string; business: string; role: string; avatar: string };
export type WorkspaceAppearance = { theme: string; intensity: number; sidebar: string; sidebarIntensity: number; surfaceIntensity?: number; surfaceColorIntensity?: number };

export const THEME_COLORS = [
  { id: 'stone', label: 'Piedra', hex: '#77807A' }, { id: 'teal', label: 'Teal', hex: '#0A6B66' },
  { id: 'green', label: 'Verde', hex: '#3D7A57' }, { id: 'blue', label: 'Azul', hex: '#37699A' },
  { id: 'sky', label: 'Celeste', hex: '#5B8EAD' }, { id: 'indigo', label: 'Índigo', hex: '#5357A6' },
  { id: 'violet', label: 'Violeta', hex: '#76589B' }, { id: 'rose', label: 'Rosa', hex: '#A15E78' },
  { id: 'terracotta', label: 'Terracota', hex: '#9A5449' }, { id: 'orange', label: 'Naranja', hex: '#B46A32' },
  { id: 'amber', label: 'Ámbar', hex: '#9A7629' }, { id: 'sand', label: 'Arena', hex: '#A58A65' },
  { id: 'graphite', label: 'Grafito', hex: '#3B3E3D' }, { id: 'charcoal', label: 'Carbón', hex: '#292C2B' },
  { id: 'smoke-black', label: 'Negro humo', hex: '#181A19' }, { id: 'black', label: 'Negro', hex: '#000000' }
];

const WORKSPACE_COLORS = [{ id: 'white', label: 'Blanco', hex: '#FFFFFF' }, ...THEME_COLORS];
const WINDOW_COLORS = WORKSPACE_COLORS;

export function themeColor(id: string): string {
  if (id === 'white') return '#FFFFFF';
  return THEME_COLORS.find((item) => item.id === id)?.hex ?? THEME_COLORS[0].hex;
}

export function workspaceBackground(color: string, intensity: number): string {
  if (color.toUpperCase() === '#FFFFFF') return '#FFFFFF';
  if (color.toUpperCase() === '#000000') {
    const amount = Math.max(10, Math.min(100, intensity * 10));
    return `linear-gradient(135deg, color-mix(in srgb, #000000 ${Math.max(8, amount - 8)}%, #FAFAF7) 0%, color-mix(in srgb, #000000 ${amount}%, #F2F2ED) 100%)`;
  }
  const amount = 4 + intensity * 4;
  return `linear-gradient(135deg, color-mix(in srgb, ${color} ${Math.max(3, amount - 8)}%, #FAFAF7) 0%, color-mix(in srgb, ${color} ${amount}%, #F2F2ED) 100%)`;
}

export function WorkspaceSettingsProfile({ language, profile, setProfile, appearance, setAppearance }: {
  language: Language;
  profile: WorkspaceProfile;
  setProfile: React.Dispatch<React.SetStateAction<WorkspaceProfile>>;
  appearance: WorkspaceAppearance;
  setAppearance: React.Dispatch<React.SetStateAction<WorkspaceAppearance>>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const surfaceIndex = Math.max(0, Math.min(WINDOW_COLORS.length - 1, Math.round(appearance.surfaceIntensity ?? 0)));
  const surfaceColorIntensity = appearance.surfaceColorIntensity ?? 3;
  const handleFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setProfile((current) => ({ ...current, avatar: String(reader.result ?? '') }));
    reader.readAsDataURL(file);
  };

  return <div className="space-y-6">
    <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-[0_10px_30px_rgba(10,10,10,0.035)]">
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'PERFIL' : 'PROFILE'}</p><h3 className="mt-2 text-xl font-semibold">{language === 'es' ? 'Identidad del Workspace' : 'Workspace identity'}</h3><p className="mt-2 text-sm leading-6 text-black/50">{language === 'es' ? 'Tu nombre, negocio y foto aparecen en el sidebar y encabezado.' : 'Your name, business and photo appear in the sidebar and header.'}</p></div><UserRound className="h-5 w-5 text-[#0A3F4D]" /></div>
      <div className="mt-6 grid gap-6 md:grid-cols-[140px_1fr]">
        <div><button type="button" onClick={() => fileRef.current?.click()} className="grid h-24 w-24 place-items-center overflow-hidden rounded-2xl border border-dashed border-black/20 bg-[#F7F7F5]">{profile.avatar ? <img src={profile.avatar} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-6 w-6 text-black/30" />}</button><input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleFile(event.target.files?.[0])} /><p className="mt-2 text-[10px] text-black/35">{language === 'es' ? 'Foto o logo' : 'Photo or logo'}</p></div>
        <div className="grid gap-4 sm:grid-cols-3"><label><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40">{language === 'es' ? 'Nombre' : 'Name'}</span><input value={profile.name} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm outline-none" /></label><label><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40">{language === 'es' ? 'Empresa / Workspace' : 'Company / Workspace'}</span><input value={profile.business} onChange={(event) => setProfile((current) => ({ ...current, business: event.target.value }))} className="w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm outline-none" /></label><label><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40">{language === 'es' ? 'Rol' : 'Role'}</span><input value={profile.role} onChange={(event) => setProfile((current) => ({ ...current, role: event.target.value }))} className="w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm outline-none" /></label></div>
      </div>
    </section>

    <div className="grid gap-5 xl:grid-cols-3">
      <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_10px_30px_rgba(10,10,10,0.035)]">
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'APARIENCIA' : 'APPEARANCE'}</p><h3 className="mt-2 text-lg font-semibold">{language === 'es' ? 'Color del Workspace' : 'Workspace color'}</h3><p className="mt-2 text-xs leading-5 text-black/50">{language === 'es' ? 'Paleta general e intensidad del fondo.' : 'General palette and background intensity.'}</p></div><Palette className="h-5 w-5 shrink-0 text-[#0A3F4D]" /></div>
        <div className="mt-4 grid grid-cols-3 gap-2">{WORKSPACE_COLORS.map((item) => <button key={item.id} type="button" onClick={() => setAppearance((current) => ({ ...current, theme: item.id }))} className={`flex min-w-0 items-center gap-1.5 rounded-lg border px-2 py-2 text-[9px] font-semibold transition ${appearance.theme === item.id ? 'border-black/35 ring-2 ring-black/8' : 'border-black/8'}`}><span className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/10" style={{ background: item.hex }} /><span className="truncate">{item.label}</span></button>)}</div>
        <div className="mt-5"><div className="flex justify-between text-xs font-semibold"><span>{language === 'es' ? 'Intensidad' : 'Intensity'}</span><span>{appearance.intensity}/10</span></div><input type="range" min="1" max="10" value={appearance.intensity} onChange={(event) => setAppearance((current) => ({ ...current, intensity: Number(event.target.value) }))} className="mt-2 w-full" /></div>
      </section>

      <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_10px_30px_rgba(10,10,10,0.035)]">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">SIDEBAR</p><h3 className="mt-2 text-lg font-semibold">{language === 'es' ? 'Color de selección' : 'Selection color'}</h3><p className="mt-2 text-xs leading-5 text-black/50">{language === 'es' ? 'El sidebar permanece negro; personaliza el elemento activo.' : 'The sidebar stays black; customize the active item.'}</p>
        <label className="mt-4 flex items-center gap-2 text-xs"><input type="checkbox" checked={appearance.sidebar === 'same'} onChange={(event) => setAppearance((current) => ({ ...current, sidebar: event.target.checked ? 'same' : 'blue' }))} />{language === 'es' ? 'Usar el mismo color del Workspace' : 'Use the same Workspace color'}</label>
        {appearance.sidebar !== 'same' && <div className="mt-4 grid grid-cols-8 gap-2">{THEME_COLORS.map((item) => <button key={item.id} type="button" onClick={() => setAppearance((current) => ({ ...current, sidebar: item.id }))} className={`h-7 w-7 rounded-lg border ${appearance.sidebar === item.id ? 'ring-2 ring-black/20' : ''}`} style={{ background: item.hex }} aria-label={item.label} />)}</div>}
        <div className="mt-5"><div className="flex justify-between text-xs font-semibold"><span>{language === 'es' ? 'Intensidad de selección' : 'Selection intensity'}</span><span>{appearance.sidebarIntensity}/10</span></div><input type="range" min="1" max="10" value={appearance.sidebarIntensity} onChange={(event) => setAppearance((current) => ({ ...current, sidebarIntensity: Number(event.target.value) }))} className="mt-2 w-full" /></div>
      </section>

      <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_10px_30px_rgba(10,10,10,0.035)]">
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'VENTANAS' : 'SURFACES'}</p><h3 className="mt-2 text-lg font-semibold">{language === 'es' ? 'Color de ventanas' : 'Window color'}</h3><p className="mt-2 text-xs leading-5 text-black/50">{language === 'es' ? 'Elige una paleta independiente para las tarjetas. Blanco conserva la apariencia original.' : 'Choose an independent palette for cards. White keeps the original appearance.'}</p></div><Layers3 className="h-5 w-5 shrink-0 text-[#0A3F4D]" /></div>
        <div className="mt-4 grid grid-cols-3 gap-2">{WINDOW_COLORS.map((item, index) => <button key={item.id} type="button" onClick={() => setAppearance((current) => ({ ...current, surfaceIntensity: index }))} className={`flex min-w-0 items-center gap-1.5 rounded-lg border px-2 py-2 text-[9px] font-semibold transition ${surfaceIndex === index ? 'border-black/35 ring-2 ring-black/8' : 'border-black/8'}`}><span className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/10" style={{ background: item.hex }} /><span className="truncate">{item.label}</span></button>)}</div>
        <div className="mt-5"><div className="flex justify-between text-xs font-semibold"><label htmlFor="window-color-intensity">{language === 'es' ? 'Intensidad' : 'Intensity'}</label><span>{surfaceColorIntensity}/10</span></div><input id="window-color-intensity" type="range" min="1" max="10" step="1" value={surfaceColorIntensity} onChange={(event) => setAppearance((current) => ({ ...current, surfaceColorIntensity: Number(event.target.value) }))} className="mt-2 w-full" /></div>
      </section>
    </div>
  </div>;
}
