import React, { useRef, useState } from 'react';
import { ImagePlus, Layers3, Mail, Palette, ShieldCheck, UserRound } from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';

export type WorkspaceProfile = { name: string; business: string; role: string; avatar: string };
export type WorkspaceAppearance = { theme: string; intensity: number; sidebar: string; sidebarIntensity: number; surfaceIntensity?: number; surfaceColorIntensity?: number };
export type PersonalWorkspaceProfile = {
  displayName: string;
  email: string;
  role: string;
  workspaceName: string;
  photoURL: string;
};

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
const INTERNAL_NAV_ACCENT_KEY = 'gkais-internal-nav-accent-v1';
export const INTERNAL_NAV_ACCENT_EVENT = 'gkais:internal-nav-accent-changed';

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

export function readInternalNavAccent(): 'black' | 'sidebar' {
  if (typeof window === 'undefined') return 'black';
  return window.localStorage.getItem(INTERNAL_NAV_ACCENT_KEY) === 'sidebar' ? 'sidebar' : 'black';
}

async function compressAvatar(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const next = new Image();
      next.onload = () => resolve(next);
      next.onerror = () => reject(new Error('PHOTO_READ_FAILED'));
      next.src = objectUrl;
    });

    const attempts = [
      { size: 64, quality: 0.55 },
      { size: 56, quality: 0.5 },
      { size: 48, quality: 0.45 },
      { size: 40, quality: 0.4 },
      { size: 32, quality: 0.35 }
    ];

    for (const attempt of attempts) {
      const canvas = document.createElement('canvas');
      canvas.width = attempt.size;
      canvas.height = attempt.size;
      const context = canvas.getContext('2d');
      if (!context) continue;

      const side = Math.min(image.naturalWidth, image.naturalHeight);
      const sx = Math.max(0, (image.naturalWidth - side) / 2);
      const sy = Math.max(0, (image.naturalHeight - side) / 2);
      context.drawImage(image, sx, sy, side, side, 0, 0, attempt.size, attempt.size);

      const result = canvas.toDataURL('image/webp', attempt.quality);
      if (result.length <= 950) return result;
    }
    throw new Error('PHOTO_TOO_LARGE');
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function WorkspaceSettingsProfile({
  language,
  profile,
  setProfile,
  appearance,
  setAppearance,
  showIdentity = true,
  personalProfile,
  onPersonalPhotoChange
}: {
  language: Language;
  profile: WorkspaceProfile;
  setProfile: React.Dispatch<React.SetStateAction<WorkspaceProfile>>;
  appearance: WorkspaceAppearance;
  setAppearance: React.Dispatch<React.SetStateAction<WorkspaceAppearance>>;
  showIdentity?: boolean;
  personalProfile?: PersonalWorkspaceProfile;
  onPersonalPhotoChange?: (photoURL: string) => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [internalNavAccent, setInternalNavAccent] = useState<'black' | 'sidebar'>(readInternalNavAccent);
  const [personalPhotoSaving, setPersonalPhotoSaving] = useState(false);
  const [personalPhotoError, setPersonalPhotoError] = useState('');
  const surfaceIndex = Math.max(0, Math.min(WINDOW_COLORS.length - 1, Math.round(appearance.surfaceIntensity ?? 0)));
  const surfaceColorIntensity = appearance.surfaceColorIntensity ?? 3;

  const handleFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setProfile((current) => ({ ...current, avatar: String(reader.result ?? '') }));
    reader.readAsDataURL(file);
  };

  const handlePersonalFile = async (file?: File) => {
    if (!file || !onPersonalPhotoChange) return;
    setPersonalPhotoSaving(true);
    setPersonalPhotoError('');
    try {
      const compressed = await compressAvatar(file);
      await onPersonalPhotoChange(compressed);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'PHOTO_UPDATE_FAILED';
      setPersonalPhotoError(message === 'PHOTO_TOO_LARGE'
        ? (language === 'es' ? 'No pudimos reducir esta imagen lo suficiente. Prueba con otra foto.' : 'We could not reduce this image enough. Try another photo.')
        : (language === 'es' ? 'No se pudo actualizar la foto.' : 'The photo could not be updated.'));
    } finally {
      setPersonalPhotoSaving(false);
    }
  };

  const updateInternalNavAccent = (value: 'black' | 'sidebar') => {
    setInternalNavAccent(value);
    try { window.localStorage.setItem(INTERNAL_NAV_ACCENT_KEY, value); } catch {}
    window.dispatchEvent(new CustomEvent(INTERNAL_NAV_ACCENT_EVENT, { detail: value }));
  };

  return <div className="space-y-6">
    {showIdentity && <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-[0_10px_30px_rgba(10,10,10,0.035)]">
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'PERFIL' : 'PROFILE'}</p><h3 className="mt-2 text-xl font-semibold">{language === 'es' ? 'Identidad del Workspace' : 'Workspace identity'}</h3><p className="mt-2 text-sm leading-6 text-black/50">{language === 'es' ? 'Tu nombre, negocio y foto aparecen en el sidebar y encabezado.' : 'Your name, business and photo appear in the sidebar and header.'}</p></div><UserRound className="h-5 w-5 text-[#0A3F4D]" /></div>
      <div className="mt-6 grid gap-6 md:grid-cols-[140px_1fr]">
        <div><button type="button" onClick={() => fileRef.current?.click()} className="grid h-24 w-24 place-items-center overflow-hidden rounded-2xl border border-dashed border-black/20 bg-[#F7F7F5]">{profile.avatar ? <img src={profile.avatar} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-6 w-6 text-black/30" />}</button><input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleFile(event.target.files?.[0])} /><p className="mt-2 text-[10px] text-black/35">{language === 'es' ? 'Foto o logo' : 'Photo or logo'}</p></div>
        <div className="grid gap-4 sm:grid-cols-3"><label><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40">{language === 'es' ? 'Nombre' : 'Name'}</span><input value={profile.name} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm outline-none" /></label><label><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40">{language === 'es' ? 'Empresa / Workspace' : 'Company / Workspace'}</span><input value={profile.business} onChange={(event) => setProfile((current) => ({ ...current, business: event.target.value }))} className="w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm outline-none" /></label><label><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40">{language === 'es' ? 'Rol' : 'Role'}</span><input value={profile.role} onChange={(event) => setProfile((current) => ({ ...current, role: event.target.value }))} className="w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm outline-none" /></label></div>
      </div>
    </section>}

    {!showIdentity && personalProfile && <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-[0_10px_30px_rgba(10,10,10,0.035)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'MI PERFIL' : 'MY PROFILE'}</p>
          <h3 className="mt-2 text-xl font-semibold">{personalProfile.displayName}</h3>
          <p className="mt-2 text-sm leading-6 text-black/50">{language === 'es'
            ? 'La foto es personal. Nombre, correo y rol pertenecen a tu relación con la empresa y requieren autorización para cambiarse.'
            : 'Your photo is personal. Name, email and role belong to your company relationship and require approval to change.'}</p>
        </div>
        <UserRound className="h-5 w-5 text-[#0A3F4D]" />
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[150px_minmax(0,1fr)]">
        <div>
          <button
            type="button"
            disabled={!onPersonalPhotoChange || personalPhotoSaving}
            onClick={() => fileRef.current?.click()}
            className="grid h-24 w-24 place-items-center overflow-hidden rounded-2xl border border-dashed border-black/20 bg-[#F7F7F5] disabled:opacity-50"
          >
            {personalProfile.photoURL
              ? <img src={personalProfile.photoURL} alt="" className="h-full w-full object-cover" />
              : <ImagePlus className="h-6 w-6 text-black/30" />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(event) => void handlePersonalFile(event.target.files?.[0])} />
          <p className="mt-2 text-[10px] text-black/35">{personalPhotoSaving ? (language === 'es' ? 'Guardando…' : 'Saving…') : (language === 'es' ? 'Cambiar foto' : 'Change photo')}</p>
          {personalPhotoError && <p className="mt-2 text-[10px] leading-4 text-[#8D332C]">{personalPhotoError}</p>}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-black/8 bg-[#F7F7F5] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/35">{language === 'es' ? 'Nombre' : 'Name'}</p>
            <p className="mt-1 text-sm font-semibold">{personalProfile.displayName}</p>
          </div>
          <div className="rounded-xl border border-black/8 bg-[#F7F7F5] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/35">Email</p>
            <p className="mt-1 truncate text-sm font-semibold">{personalProfile.email}</p>
          </div>
          <div className="rounded-xl border border-black/8 bg-[#F7F7F5] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/35">{language === 'es' ? 'Rol' : 'Role'}</p>
            <p className="mt-1 text-sm font-semibold">{personalProfile.role}</p>
          </div>
          <div className="rounded-xl border border-black/8 bg-[#F7F7F5] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/35">Workspace</p>
            <p className="mt-1 text-sm font-semibold">{personalProfile.workspaceName}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#0A3F4D]/10 bg-[#0A3F4D]/5 p-3 text-xs leading-5 text-[#0A3F4D]">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{language === 'es'
          ? 'Los cambios de nombre o correo se gestionarán mediante solicitud y aprobación de un superior. Tu rol solo puede modificarlo alguien con permisos de administración del equipo.'
          : 'Name or email changes will be handled through an approval request. Your role can only be changed by someone with team administration permissions.'}</span>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-black/40"><Mail className="h-3.5 w-3.5" />{personalProfile.email}</div>
    </section>}

    {!showIdentity && !personalProfile && <section className="rounded-2xl border border-black/10 bg-white p-5 text-sm text-black/55 shadow-[0_10px_30px_rgba(10,10,10,0.035)]">
      {language === 'es' ? 'No pudimos cargar tu perfil personal.' : 'We could not load your personal profile.'}
    </section>}

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
        <div className="mt-5 border-t border-black/7 pt-4"><p className="text-xs font-semibold">{language === 'es' ? 'Color de selección interna' : 'Internal selection color'}</p><p className="mt-1 text-[10px] leading-4 text-black/45">{language === 'es' ? 'Aplica solo a selectores de navegación como Alumnos/Plan, Trabajo activo/Compradores y Personas/Seguimiento.' : 'Only applies to navigation selectors such as Students/Plan, Active Work/Buyers and People/Follow-up.'}</p><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => updateInternalNavAccent('black')} className={`rounded-xl border px-3 py-2.5 text-xs font-semibold ${internalNavAccent === 'black' ? 'border-[#111413] bg-[#111413] text-white' : 'border-black/10 text-black/50'}`}>{language === 'es' ? 'Negro' : 'Black'}</button><button type="button" onClick={() => updateInternalNavAccent('sidebar')} className={`rounded-xl border px-3 py-2.5 text-xs font-semibold ${internalNavAccent === 'sidebar' ? 'border-black/25 bg-[#F7F7F5]' : 'border-black/10 text-black/50'}`}>{language === 'es' ? 'Usar color del sidebar' : 'Use sidebar color'}</button></div></div>
      </section>

      <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_10px_30px_rgba(10,10,10,0.035)]">
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'VENTANAS' : 'SURFACES'}</p><h3 className="mt-2 text-lg font-semibold">{language === 'es' ? 'Color de ventanas' : 'Window color'}</h3><p className="mt-2 text-xs leading-5 text-black/50">{language === 'es' ? 'Elige una paleta independiente para las tarjetas. Blanco conserva la apariencia original.' : 'Choose an independent palette for cards. White keeps the original appearance.'}</p></div><Layers3 className="h-5 w-5 shrink-0 text-[#0A3F4D]" /></div>
        <div className="mt-4 grid grid-cols-3 gap-2">{WINDOW_COLORS.map((item, index) => <button key={item.id} type="button" onClick={() => setAppearance((current) => ({ ...current, surfaceIntensity: index }))} className={`flex min-w-0 items-center gap-1.5 rounded-lg border px-2 py-2 text-[9px] font-semibold transition ${surfaceIndex === index ? 'border-black/35 ring-2 ring-black/8' : 'border-black/8'}`}><span className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/10" style={{ background: item.hex }} /><span className="truncate">{item.label}</span></button>)}</div>
        <div className="mt-5"><div className="flex justify-between text-xs font-semibold"><label htmlFor="window-color-intensity">{language === 'es' ? 'Intensidad' : 'Intensity'}</label><span>{surfaceColorIntensity}/10</span></div><input id="window-color-intensity" type="range" min="1" max="10" step="1" value={surfaceColorIntensity} onChange={(event) => setAppearance((current) => ({ ...current, surfaceColorIntensity: Number(event.target.value) }))} className="mt-2 w-full" /></div>
      </section>
    </div>
  </div>;
}
