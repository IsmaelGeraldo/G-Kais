import React, { useRef } from 'react';
import { ImagePlus, Palette, UserRound } from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';

export type WorkspaceProfile = {
  name: string;
  business: string;
  role: string;
  avatar: string;
};

export type WorkspaceAppearance = {
  theme: string;
  intensity: number;
  sidebar: string;
  sidebarIntensity: number;
};

export const THEME_COLORS = [
  { id: 'stone', label: 'Piedra', hex: '#77807A' },
  { id: 'teal', label: 'Teal', hex: '#0A6B66' },
  { id: 'green', label: 'Verde', hex: '#3D7A57' },
  { id: 'blue', label: 'Azul', hex: '#37699A' },
  { id: 'sky', label: 'Celeste', hex: '#5B8EAD' },
  { id: 'indigo', label: 'Índigo', hex: '#5357A6' },
  { id: 'violet', label: 'Violeta', hex: '#76589B' },
  { id: 'rose', label: 'Rosa', hex: '#A15E78' },
  { id: 'terracotta', label: 'Terracota', hex: '#9A5449' },
  { id: 'orange', label: 'Naranja', hex: '#B46A32' },
  { id: 'amber', label: 'Ámbar', hex: '#9A7629' },
  { id: 'sand', label: 'Arena', hex: '#A58A65' }
];

export function themeColor(id: string): string {
  return THEME_COLORS.find((item) => item.id === id)?.hex ?? THEME_COLORS[0].hex;
}

export function workspaceBackground(color: string, intensity: number): string {
  const amount = 4 + intensity * 4;
  return `linear-gradient(135deg, color-mix(in srgb, ${color} ${Math.max(3, amount - 8)}%, #FAFAF7) 0%, color-mix(in srgb, ${color} ${amount}%, #F2F2ED) 100%)`;
}

export function WorkspaceSettingsProfile({
  language,
  profile,
  setProfile,
  appearance,
  setAppearance
}: {
  language: Language;
  profile: WorkspaceProfile;
  setProfile: React.Dispatch<React.SetStateAction<WorkspaceProfile>>;
  appearance: WorkspaceAppearance;
  setAppearance: React.Dispatch<React.SetStateAction<WorkspaceAppearance>>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setProfile((current) => ({ ...current, avatar: String(reader.result ?? '') }));
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-[0_12px_35px_rgba(10,10,10,0.04)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'PERFIL' : 'PROFILE'}</p>
            <h3 className="mt-2 text-xl font-semibold">{language === 'es' ? 'Identidad del Workspace' : 'Workspace identity'}</h3>
            <p className="mt-2 text-sm leading-6 text-black/50">{language === 'es' ? 'Tu nombre, negocio y foto aparecen en el sidebar y encabezado del Workspace.' : 'Your name, business and photo appear in the Workspace sidebar and header.'}</p>
          </div>
          <UserRound className="h-5 w-5 text-[#0A3F4D]" />
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-[160px_1fr]">
          <div>
            <button type="button" onClick={() => fileRef.current?.click()} className="grid h-28 w-28 place-items-center overflow-hidden rounded-2xl border border-dashed border-black/20 bg-[#F7F7F5]">
              {profile.avatar ? <img src={profile.avatar} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-6 w-6 text-black/30" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleFile(event.target.files?.[0])} />
            <p className="mt-2 text-[10px] text-black/35">{language === 'es' ? 'Foto personal o logo de empresa' : 'Personal photo or company logo'}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40">{language === 'es' ? 'Nombre' : 'Name'}</span><input value={profile.name} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm outline-none focus:border-[#0A3F4D]/40" /></label>
            <label><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40">{language === 'es' ? 'Empresa / Workspace' : 'Company / Workspace'}</span><input value={profile.business} onChange={(event) => setProfile((current) => ({ ...current, business: event.target.value }))} className="w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm outline-none focus:border-[#0A3F4D]/40" /></label>
            <label><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40">{language === 'es' ? 'Rol' : 'Role'}</span><input value={profile.role} onChange={(event) => setProfile((current) => ({ ...current, role: event.target.value }))} className="w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm outline-none focus:border-[#0A3F4D]/40" /></label>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-[0_12px_35px_rgba(10,10,10,0.04)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'APARIENCIA' : 'APPEARANCE'}</p>
            <h3 className="mt-2 text-xl font-semibold">{language === 'es' ? 'Color del Workspace' : 'Workspace color'}</h3>
            <p className="mt-2 text-sm leading-6 text-black/50">{language === 'es' ? 'Una paleta más amplia con intensidad regulable de 1 a 10.' : 'A broader palette with adjustable intensity from 1 to 10.'}</p>
          </div>
          <Palette className="h-5 w-5 text-[#0A3F4D]" />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {THEME_COLORS.map((item) => (
            <button key={item.id} type="button" onClick={() => setAppearance((current) => ({ ...current, theme: item.id }))} className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${appearance.theme === item.id ? 'border-black/35 ring-2 ring-black/8' : 'border-black/8 hover:border-black/20'}`}>
              <span className="h-5 w-5 rounded-full" style={{ background: item.hex }} />{item.label}
            </button>
          ))}
        </div>

        <div className="mt-6 max-w-xl">
          <div className="flex justify-between text-xs font-semibold"><span>{language === 'es' ? 'Intensidad' : 'Intensity'}</span><span>{appearance.intensity}/10</span></div>
          <input type="range" min="1" max="10" value={appearance.intensity} onChange={(event) => setAppearance((current) => ({ ...current, intensity: Number(event.target.value) }))} className="mt-2 w-full" />
        </div>
      </section>

      <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-[0_12px_35px_rgba(10,10,10,0.04)]">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">SIDEBAR</p>
        <h3 className="mt-2 text-xl font-semibold">{language === 'es' ? 'Color de selección' : 'Selection color'}</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-black/50">{language === 'es' ? 'El sidebar sigue siendo negro; solo personalizamos el elemento seleccionado.' : 'The sidebar stays black; only the selected item is personalized.'}</p>

        <label className="mt-5 flex items-center gap-2 text-sm"><input type="checkbox" checked={appearance.sidebar === 'same'} onChange={(event) => setAppearance((current) => ({ ...current, sidebar: event.target.checked ? 'same' : 'blue' }))} />{language === 'es' ? 'Usar el mismo color del Workspace' : 'Use the same Workspace color'}</label>

        {appearance.sidebar !== 'same' && (
          <div className="mt-4 flex flex-wrap gap-2">
            {THEME_COLORS.map((item) => <button key={item.id} type="button" onClick={() => setAppearance((current) => ({ ...current, sidebar: item.id }))} className={`h-8 w-8 rounded-lg border transition ${appearance.sidebar === item.id ? 'ring-2 ring-black/20' : ''}`} style={{ background: item.hex }} aria-label={item.label} />)}
          </div>
        )}

        <div className="mt-6 max-w-xl">
          <div className="flex justify-between text-xs font-semibold"><span>{language === 'es' ? 'Intensidad de selección' : 'Selection intensity'}</span><span>{appearance.sidebarIntensity}/10</span></div>
          <input type="range" min="1" max="10" value={appearance.sidebarIntensity} onChange={(event) => setAppearance((current) => ({ ...current, sidebarIntensity: Number(event.target.value) }))} className="mt-2 w-full" />
        </div>
      </section>
    </div>
  );
}
