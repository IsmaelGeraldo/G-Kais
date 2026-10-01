import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../lib/firebase';
import { resolveActiveExpertWorkspaceId } from './expertsWorkspaceCore';

const PROFILE_KEY = 'gkais-experts-profile-v1';
const APPEARANCE_KEY = 'gkais-experts-appearance-v2';
const LANGUAGE_KEY = 'gkais-language';
const RELOAD_GUARD_KEY = 'gkais-experts-settings-reload-v1';
const SURFACE_PALETTE_MIGRATION_KEY = 'gkais-window-surface-palette-v1';
const SCHEMA_VERSION = 1;

export const WORKSPACE_SETTINGS_EVENT = 'gkais:workspace-settings-hydrated';

export type ExpertsWorkspaceProfile = {
  name: string;
  business: string;
  role: string;
  avatar: string;
};

export type ExpertsWorkspaceAppearance = {
  theme: string;
  intensity: number;
  sidebar: string;
  sidebarIntensity: number;
  surfaceIntensity: number;
  surfaceColorIntensity: number;
};

type PersistedAppearance = {
  theme: string;
  intensity: number;
  sidebar: string;
  sidebarIntensity: number;
};

export type ExpertsWorkspaceSettings = {
  profile: ExpertsWorkspaceProfile;
  appearance: ExpertsWorkspaceAppearance;
  language: 'es' | 'en';
};

type PersistedSettings = {
  schemaVersion: number;
  profile: Omit<ExpertsWorkspaceProfile, 'avatar'>;
  appearance: PersistedAppearance;
  language: 'es' | 'en';
};

const DEFAULT_PROFILE: ExpertsWorkspaceProfile = {
  name: 'Carlos Espinoza',
  business: 'Método Escala',
  role: 'Mentor',
  avatar: ''
};

const DEFAULT_APPEARANCE: ExpertsWorkspaceAppearance = {
  theme: 'white',
  intensity: 3,
  sidebar: 'same',
  sidebarIntensity: 7,
  surfaceIntensity: 0,
  surfaceColorIntensity: 3
};

const THEME_HEX: Record<string, string> = {
  white: '#FFFFFF',
  stone: '#77807A', teal: '#0A6B66', green: '#3D7A57', blue: '#37699A', sky: '#5B8EAD',
  indigo: '#5357A6', violet: '#76589B', rose: '#A15E78', terracotta: '#9A5449', orange: '#B46A32',
  amber: '#9A7629', sand: '#A58A65', graphite: '#3B3E3D', charcoal: '#292C2B', 'smoke-black': '#181A19', black: '#000000'
};

const SURFACE_PALETTE = [
  { id: 'white', hex: '#FFFFFF' },
  { id: 'stone', hex: '#77807A' },
  { id: 'teal', hex: '#0A6B66' },
  { id: 'green', hex: '#3D7A57' },
  { id: 'blue', hex: '#37699A' },
  { id: 'sky', hex: '#5B8EAD' },
  { id: 'indigo', hex: '#5357A6' },
  { id: 'violet', hex: '#76589B' },
  { id: 'rose', hex: '#A15E78' },
  { id: 'terracotta', hex: '#9A5449' },
  { id: 'orange', hex: '#B46A32' },
  { id: 'amber', hex: '#9A7629' },
  { id: 'sand', hex: '#A58A65' },
  { id: 'graphite', hex: '#3B3E3D' },
  { id: 'charcoal', hex: '#292C2B' },
  { id: 'smoke-black', hex: '#181A19' },
  { id: 'black', hex: '#000000' }
];

let lastPersistedFingerprint = '';

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed as T : fallback;
  } catch {
    return fallback;
  }
}

function clampIntensity(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(1, Math.min(10, Math.round(number))) : fallback;
}

function clampSurfaceIndex(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(SURFACE_PALETTE.length - 1, Math.round(number))) : fallback;
}

function decodeSidebar(rawValue: unknown, fallback: ExpertsWorkspaceAppearance): { sidebar: string; surfaceIntensity: number; surfaceColorIntensity: number } {
  const raw = typeof rawValue === 'string' ? rawValue : fallback.sidebar;
  const currentMatch = raw.match(/^(.*)\|surface3:(\d{1,2})(?::(\d{1,2}))?$/);
  if (currentMatch) {
    return {
      sidebar: currentMatch[1] || fallback.sidebar,
      surfaceIntensity: clampSurfaceIndex(currentMatch[2], fallback.surfaceIntensity),
      surfaceColorIntensity: clampIntensity(currentMatch[3], DEFAULT_APPEARANCE.surfaceColorIntensity)
    };
  }

  // Older surface sliders are intentionally reset to white because the product
  // now uses a discrete color palette rather than a progressive darkening scale.
  const legacyMatch = raw.match(/^(.*)\|surface(?:2)?:\d{1,2}$/);
  if (legacyMatch) {
    return { sidebar: legacyMatch[1] || fallback.sidebar, surfaceIntensity: 0, surfaceColorIntensity: DEFAULT_APPEARANCE.surfaceColorIntensity };
  }

  return { sidebar: raw, surfaceIntensity: fallback.surfaceIntensity, surfaceColorIntensity: fallback.surfaceColorIntensity };
}

function normalizeProfile(value: Partial<ExpertsWorkspaceProfile> | undefined, fallback = DEFAULT_PROFILE): ExpertsWorkspaceProfile {
  return {
    name: typeof value?.name === 'string' ? value.name : fallback.name,
    business: typeof value?.business === 'string' ? value.business : fallback.business,
    role: typeof value?.role === 'string' ? value.role : fallback.role,
    avatar: typeof value?.avatar === 'string' ? value.avatar : fallback.avatar
  };
}

function normalizeAppearance(value: Partial<ExpertsWorkspaceAppearance> | Partial<PersistedAppearance> | undefined, fallback = DEFAULT_APPEARANCE): ExpertsWorkspaceAppearance {
  const decoded = decodeSidebar(value?.sidebar, fallback);
  const explicitSurface = value && 'surfaceIntensity' in value ? (value as Partial<ExpertsWorkspaceAppearance>).surfaceIntensity : undefined;
  const explicitIntensity = value && 'surfaceColorIntensity' in value ? (value as Partial<ExpertsWorkspaceAppearance>).surfaceColorIntensity : undefined;
  return {
    theme: typeof value?.theme === 'string' ? value.theme : fallback.theme,
    intensity: clampIntensity(value?.intensity, fallback.intensity),
    sidebar: decoded.sidebar,
    sidebarIntensity: clampIntensity(value?.sidebarIntensity, fallback.sidebarIntensity),
    surfaceIntensity: clampSurfaceIndex(explicitSurface, decoded.surfaceIntensity),
    surfaceColorIntensity: clampIntensity(explicitIntensity, decoded.surfaceColorIntensity)
  };
}

function surfaceVisuals(value: number, intensity: number) {
  const index = clampSurfaceIndex(value, 0);
  const selected = SURFACE_PALETTE[index] ?? SURFACE_PALETTE[0];
  if (selected.id === 'white') {
    return {
      surface: '#FFFFFF',
      blur: 0,
      saturate: 1,
      border: 'rgba(10,10,10,0.10)',
      shadow: '0 10px 30px rgba(10,10,10,0.035)',
      dark: false
    };
  }

  let mix = 22;
  if (selected.id === 'graphite') mix = 44;
  if (selected.id === 'charcoal') mix = 64;
  if (selected.id === 'smoke-black') mix = 82;
  if (selected.id === 'black') mix = 96;
  // Level 3 preserves the previously approved palette. Lower levels soften it;
  // higher levels deepen the same selected color, independently of the Workspace.
  const level = clampIntensity(intensity, DEFAULT_APPEARANCE.surfaceColorIntensity);
  const maxMix = ['graphite', 'charcoal', 'smoke-black', 'black'].includes(selected.id) ? 100 : 60;
  mix = level <= 3 ? mix * level / 3 : mix + (maxMix - mix) * (level - 3) / 7;
  const channels = selected.hex.slice(1).match(/../g)!.map((channel) => {
    const srgb = (255 + (parseInt(channel, 16) - 255) * mix / 100) / 255;
    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  const dark = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722 < 0.25;

  return {
    surface: `color-mix(in srgb, ${selected.hex} ${mix}%, rgba(255,255,255,0.96))`,
    blur: 12,
    saturate: 1.06,
    border: dark ? 'rgba(255,255,255,0.11)' : 'rgba(10,10,10,0.08)',
    shadow: dark ? '0 16px 38px rgba(0,0,0,0.12)' : '0 14px 34px rgba(10,10,10,0.05)',
    dark
  };
}

function applyWorkspaceSurface(appearance: ExpertsWorkspaceAppearance): void {
  if (typeof document === 'undefined') return;
  const visuals = surfaceVisuals(appearance.surfaceIntensity, appearance.surfaceColorIntensity);
  const accentId = appearance.sidebar === 'same' ? appearance.theme : appearance.sidebar;
  const accent = THEME_HEX[accentId] ?? THEME_HEX.stone;
  const root = document.documentElement;
  root.style.setProperty('--gkais-window-surface', visuals.surface);
  root.style.setProperty('--gkais-window-blur', `${visuals.blur}px`);
  root.style.setProperty('--gkais-window-saturate', String(visuals.saturate));
  root.style.setProperty('--gkais-window-border', visuals.border);
  root.style.setProperty('--gkais-window-shadow', visuals.shadow);
  root.style.setProperty('--gkais-sidebar-accent', accent);
  root.classList.add('gkais-window-surface');
  root.classList.toggle('gkais-surface-dark', visuals.dark);
}

export function readLocalExpertsWorkspaceSettings(): ExpertsWorkspaceSettings {
  if (typeof window === 'undefined') return { profile: DEFAULT_PROFILE, appearance: DEFAULT_APPEARANCE, language: 'es' };
  const storedProfile = safeParse<Partial<ExpertsWorkspaceProfile>>(window.localStorage.getItem(PROFILE_KEY), {});
  const storedAppearance = safeParse<Partial<ExpertsWorkspaceAppearance>>(window.localStorage.getItem(APPEARANCE_KEY), {});
  const storedLanguage = window.localStorage.getItem(LANGUAGE_KEY);

  if (window.localStorage.getItem(SURFACE_PALETTE_MIGRATION_KEY) !== '1') {
    storedAppearance.surfaceIntensity = 0;
    try {
      window.localStorage.setItem(APPEARANCE_KEY, JSON.stringify(storedAppearance));
      window.localStorage.setItem(SURFACE_PALETTE_MIGRATION_KEY, '1');
    } catch {}
  }

  return {
    profile: normalizeProfile(storedProfile),
    appearance: normalizeAppearance(storedAppearance),
    language: storedLanguage === 'en' ? 'en' : 'es'
  };
}

function writeLocalExpertsWorkspaceSettings(settings: ExpertsWorkspaceSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(settings.profile));
    window.localStorage.setItem(APPEARANCE_KEY, JSON.stringify(settings.appearance));
    window.localStorage.setItem(LANGUAGE_KEY, settings.language);
    window.localStorage.setItem(SURFACE_PALETTE_MIGRATION_KEY, '1');
  } catch {}
  applyWorkspaceSurface(settings.appearance);
}

function emitSettingsHydrated(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(WORKSPACE_SETTINGS_EVENT));
}

async function restoredUser(): Promise<User | null> {
  if (firebaseAuth.currentUser) return firebaseAuth.currentUser;
  return new Promise((resolve) => {
    let unsubscribe = () => {};
    const finish = (user: User | null) => {
      unsubscribe();
      resolve(user);
    };
    unsubscribe = onAuthStateChanged(firebaseAuth, (user) => finish(user), () => finish(null));
  });
}

async function ownerWorkspaceId(user: User): Promise<string | null> {
  if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('invite')) return null;
  const workspaceId = await resolveActiveExpertWorkspaceId(user);
  return workspaceId === user.uid ? workspaceId : null;
}

function settingsDocument(workspaceId: string) {
  return doc(firestoreDb, 'expert_workspaces', workspaceId, 'settings', 'workspace');
}

function persistedPayload(settings: ExpertsWorkspaceSettings): Omit<PersistedSettings, 'schemaVersion'> {
  const appearance = normalizeAppearance(settings.appearance);
  return {
    profile: {
      name: settings.profile.name,
      business: settings.profile.business,
      role: settings.profile.role
    },
    appearance: {
      theme: appearance.theme,
      intensity: appearance.intensity,
      sidebar: `${appearance.sidebar}|surface3:${appearance.surfaceIntensity}:${appearance.surfaceColorIntensity}`,
      sidebarIntensity: appearance.sidebarIntensity
    },
    language: settings.language
  };
}

function settingsFingerprint(settings: ExpertsWorkspaceSettings): string {
  return JSON.stringify(persistedPayload(settings));
}

export async function hydrateExpertsWorkspaceSettings(): Promise<ExpertsWorkspaceSettings> {
  const local = readLocalExpertsWorkspaceSettings();
  applyWorkspaceSurface(local.appearance);
  if (typeof window === 'undefined') return local;
  const user = await restoredUser();
  if (!user) return local;
  const workspaceId = await ownerWorkspaceId(user);
  if (!workspaceId) return local;

  try {
    const snapshot = await getDoc(settingsDocument(workspaceId));
    if (!snapshot.exists()) {
      await setDoc(settingsDocument(workspaceId), {
        schemaVersion: SCHEMA_VERSION,
        ...persistedPayload(local),
        migratedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      lastPersistedFingerprint = settingsFingerprint(local);
      emitSettingsHydrated();
      return local;
    }

    const remote = snapshot.data() as Partial<PersistedSettings>;
    const next: ExpertsWorkspaceSettings = {
      profile: normalizeProfile({ ...remote.profile, avatar: local.profile.avatar }, local.profile),
      appearance: normalizeAppearance(remote.appearance, local.appearance),
      language: remote.language === 'en' ? 'en' : remote.language === 'es' ? 'es' : local.language
    };
    const beforeFingerprint = settingsFingerprint(local);
    const remoteFingerprint = settingsFingerprint(next);
    writeLocalExpertsWorkspaceSettings(next);
    lastPersistedFingerprint = remoteFingerprint;
    emitSettingsHydrated();

    if (beforeFingerprint !== remoteFingerprint) {
      try {
        const previousReload = window.sessionStorage.getItem(RELOAD_GUARD_KEY);
        if (previousReload !== remoteFingerprint) {
          window.sessionStorage.setItem(RELOAD_GUARD_KEY, remoteFingerprint);
          window.setTimeout(() => window.location.reload(), 0);
        }
      } catch {}
    }
    return next;
  } catch {
    return local;
  }
}

export async function persistExpertsWorkspaceSettings(settings: ExpertsWorkspaceSettings): Promise<void> {
  const user = await restoredUser();
  if (!user) return;
  const workspaceId = await ownerWorkspaceId(user);
  if (!workspaceId) return;
  try {
    await setDoc(settingsDocument(workspaceId), {
      schemaVersion: SCHEMA_VERSION,
      ...persistedPayload(settings),
      updatedAt: serverTimestamp()
    }, { merge: true });
    lastPersistedFingerprint = settingsFingerprint(settings);
  } catch {}
}

async function syncLocalSettingsIfChanged(): Promise<void> {
  const settings = readLocalExpertsWorkspaceSettings();
  applyWorkspaceSurface(settings.appearance);
  const fingerprint = settingsFingerprint(settings);
  if (fingerprint === lastPersistedFingerprint) return;
  await persistExpertsWorkspaceSettings(settings);
}

if (typeof window !== 'undefined') {
  let hydratedUid = '';
  let syncTimer: number | undefined;
  applyWorkspaceSurface(readLocalExpertsWorkspaceSettings().appearance);
  const scheduleSync = () => {
    window.setTimeout(() => applyWorkspaceSurface(readLocalExpertsWorkspaceSettings().appearance), 0);
    if (syncTimer !== undefined) window.clearTimeout(syncTimer);
    syncTimer = window.setTimeout(() => {
      syncTimer = undefined;
      void syncLocalSettingsIfChanged();
    }, 300);
  };

  onAuthStateChanged(firebaseAuth, (user) => {
    if (!user) {
      hydratedUid = '';
      lastPersistedFingerprint = '';
      return;
    }
    if (hydratedUid === user.uid) return;
    hydratedUid = user.uid;
    if (new URLSearchParams(window.location.search).get('invite')) return;
    void hydrateExpertsWorkspaceSettings();
  });

  window.addEventListener('input', scheduleSync, true);
  window.addEventListener('change', scheduleSync, true);
  window.addEventListener('click', scheduleSync, true);
  window.addEventListener('storage', (event) => {
    if (event.key === PROFILE_KEY || event.key === APPEARANCE_KEY || event.key === LANGUAGE_KEY) scheduleSync();
  });
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void syncLocalSettingsIfChanged();
  });
}
