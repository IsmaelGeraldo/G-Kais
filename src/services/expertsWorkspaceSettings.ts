import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../lib/firebase';

const PROFILE_KEY = 'gkais-experts-profile-v1';
const APPEARANCE_KEY = 'gkais-experts-appearance-v2';
const LANGUAGE_KEY = 'gkais-language';
const RELOAD_GUARD_KEY = 'gkais-experts-settings-reload-v1';
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
};

export type ExpertsWorkspaceSettings = {
  profile: ExpertsWorkspaceProfile;
  appearance: ExpertsWorkspaceAppearance;
  language: 'es' | 'en';
};

type PersistedSettings = {
  schemaVersion: number;
  profile: Omit<ExpertsWorkspaceProfile, 'avatar'>;
  appearance: ExpertsWorkspaceAppearance;
  language: 'es' | 'en';
};

const DEFAULT_PROFILE: ExpertsWorkspaceProfile = {
  name: 'Carlos Espinoza',
  business: 'Método Escala',
  role: 'Mentor',
  avatar: ''
};

const DEFAULT_APPEARANCE: ExpertsWorkspaceAppearance = {
  theme: 'stone',
  intensity: 3,
  sidebar: 'same',
  sidebarIntensity: 7
};

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

function normalizeProfile(value: Partial<ExpertsWorkspaceProfile> | undefined, fallback = DEFAULT_PROFILE): ExpertsWorkspaceProfile {
  return {
    name: typeof value?.name === 'string' ? value.name : fallback.name,
    business: typeof value?.business === 'string' ? value.business : fallback.business,
    role: typeof value?.role === 'string' ? value.role : fallback.role,
    avatar: typeof value?.avatar === 'string' ? value.avatar : fallback.avatar
  };
}

function normalizeAppearance(value: Partial<ExpertsWorkspaceAppearance> | undefined, fallback = DEFAULT_APPEARANCE): ExpertsWorkspaceAppearance {
  const intensity = Number(value?.intensity);
  const sidebarIntensity = Number(value?.sidebarIntensity);
  return {
    theme: typeof value?.theme === 'string' ? value.theme : fallback.theme,
    intensity: Number.isFinite(intensity) ? Math.max(1, Math.min(10, Math.round(intensity))) : fallback.intensity,
    sidebar: typeof value?.sidebar === 'string' ? value.sidebar : fallback.sidebar,
    sidebarIntensity: Number.isFinite(sidebarIntensity) ? Math.max(1, Math.min(10, Math.round(sidebarIntensity))) : fallback.sidebarIntensity
  };
}

export function readLocalExpertsWorkspaceSettings(): ExpertsWorkspaceSettings {
  if (typeof window === 'undefined') {
    return { profile: DEFAULT_PROFILE, appearance: DEFAULT_APPEARANCE, language: 'es' };
  }
  const storedProfile = safeParse<Partial<ExpertsWorkspaceProfile>>(window.localStorage.getItem(PROFILE_KEY), {});
  const storedAppearance = safeParse<Partial<ExpertsWorkspaceAppearance>>(window.localStorage.getItem(APPEARANCE_KEY), {});
  const storedLanguage = window.localStorage.getItem(LANGUAGE_KEY);
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
  } catch {}
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

function settingsDocument(uid: string) {
  return doc(firestoreDb, 'expert_workspaces', uid, 'settings', 'workspace');
}

function persistedPayload(settings: ExpertsWorkspaceSettings): Omit<PersistedSettings, 'schemaVersion'> {
  return {
    profile: {
      name: settings.profile.name,
      business: settings.profile.business,
      role: settings.profile.role
    },
    appearance: normalizeAppearance(settings.appearance),
    language: settings.language
  };
}

function settingsFingerprint(settings: ExpertsWorkspaceSettings): string {
  return JSON.stringify(persistedPayload(settings));
}

export async function hydrateExpertsWorkspaceSettings(): Promise<ExpertsWorkspaceSettings> {
  const local = readLocalExpertsWorkspaceSettings();
  if (typeof window === 'undefined') return local;
  const user = await restoredUser();
  if (!user) return local;

  try {
    const snapshot = await getDoc(settingsDocument(user.uid));
    if (!snapshot.exists()) {
      await setDoc(settingsDocument(user.uid), {
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
  try {
    await setDoc(settingsDocument(user.uid), {
      schemaVersion: SCHEMA_VERSION,
      ...persistedPayload(settings),
      updatedAt: serverTimestamp()
    }, { merge: true });
    lastPersistedFingerprint = settingsFingerprint(settings);
  } catch {}
}

async function syncLocalSettingsIfChanged(): Promise<void> {
  const settings = readLocalExpertsWorkspaceSettings();
  const fingerprint = settingsFingerprint(settings);
  if (fingerprint === lastPersistedFingerprint) return;
  await persistExpertsWorkspaceSettings(settings);
}

if (typeof window !== 'undefined') {
  let hydratedUid = '';
  let syncTimer: number | undefined;
  const scheduleSync = () => {
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
