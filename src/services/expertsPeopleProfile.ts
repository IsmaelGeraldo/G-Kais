import { collection, doc, onSnapshot, runTransaction, serverTimestamp, writeBatch, type DocumentReference, type Unsubscribe } from 'firebase/firestore';
import { regions } from 'react-svg-worldmap';
import { firebaseAuth, firestoreDb } from '../lib/firebase';
import { resolveActiveExpertWorkspaceId } from './expertsWorkspaceCore';

export type ExpertPersonProfileMeta = {
  id: string;
  createdAt: Date | null;
  country: string;
  countryCode: string;
};

function normalizeCountry(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

const COUNTRY_ALIASES: Record<string, string> = {
  chile: 'CL',
  argentina: 'AR',
  peru: 'PE',
  bolivia: 'BO',
  brasil: 'BR',
  brazil: 'BR',
  colombia: 'CO',
  ecuador: 'EC',
  paraguay: 'PY',
  uruguay: 'UY',
  venezuela: 'VE',
  mexico: 'MX',
  mejico: 'MX',
  espana: 'ES',
  spain: 'ES',
  usa: 'US',
  eeuu: 'US',
  'estados unidos': 'US',
  'estados unidos de america': 'US',
  'united states': 'US',
  uk: 'GB',
  'reino unido': 'GB',
  'united kingdom': 'GB'
};

const COUNTRY_CODE_LOOKUP = (() => {
  const lookup = new Map<string, string>();
  const displays = [
    new Intl.DisplayNames(['es'], { type: 'region' }),
    new Intl.DisplayNames(['en'], { type: 'region' })
  ];
  regions.forEach((region) => {
    const code = String(region.code).toUpperCase();
    [region.name, code, ...displays.map((display) => display.of(code) || '')]
      .filter(Boolean)
      .forEach((name) => lookup.set(normalizeCountry(String(name)), code));
  });
  Object.entries(COUNTRY_ALIASES).forEach(([name, code]) => lookup.set(normalizeCountry(name), code));
  return lookup;
})();

export function resolveExpertCountryCode(country: string): string {
  const clean = country.trim();
  if (!clean) return '';
  if (/^[A-Za-z]{2}$/.test(clean)) return clean.toUpperCase();
  return COUNTRY_CODE_LOOKUP.get(normalizeCountry(clean)) || '';
}

async function workspaceId(): Promise<string> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('AUTH_REQUIRED');
  const id = await resolveActiveExpertWorkspaceId(user);
  if (!id) throw new Error('WORKSPACE_REQUIRED');
  return id;
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

export async function subscribeExpertPeopleProfileMeta(
  callback: (items: ExpertPersonProfileMeta[]) => void
): Promise<Unsubscribe> {
  const workspace = await workspaceId();
  const canBackfillCountryCodes = firebaseAuth.currentUser?.uid === workspace;
  return onSnapshot(collection(firestoreDb, 'expert_workspaces', workspace, 'people'), (snapshot) => {
    const pendingBackfill: Array<{ ref: DocumentReference; countryCode: string }> = [];
    const items = snapshot.docs.map((item) => {
      const data = item.data() as Record<string, unknown>;
      const memory = data.outcomeMemory && typeof data.outcomeMemory === 'object'
        ? data.outcomeMemory as Record<string, unknown>
        : {};
      const country = typeof memory.country === 'string' ? memory.country.trim() : '';
      const storedCountryCode = typeof memory.countryCode === 'string' ? memory.countryCode.trim().toUpperCase() : '';
      const countryCode = storedCountryCode || resolveExpertCountryCode(country);
      if (canBackfillCountryCodes && !storedCountryCode && countryCode) pendingBackfill.push({ ref: item.ref, countryCode });
      return {
        id: item.id,
        createdAt: toDate(data.createdAt),
        country,
        countryCode
      };
    });
    callback(items);

    if (pendingBackfill.length) {
      const batch = writeBatch(firestoreDb);
      pendingBackfill.forEach(({ ref, countryCode }) => {
        batch.update(ref, {
          'outcomeMemory.countryCode': countryCode,
          updatedAt: serverTimestamp()
        });
      });
      void batch.commit().catch((error) => console.error('[G-KAIS COUNTRY CODE BACKFILL]', error));
    }
  }, () => callback([]));
}

export async function updateExpertPersonCountry(personId: string, country: string): Promise<void> {
  const workspace = await workspaceId();
  const ref = doc(firestoreDb, 'expert_workspaces', workspace, 'people', personId);
  const normalizedCountry = country.trim();
  const countryCode = resolveExpertCountryCode(normalizedCountry);
  await runTransaction(firestoreDb, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error('PERSON_NOT_FOUND');
    const data = snapshot.data();
    const memory = data.outcomeMemory && typeof data.outcomeMemory === 'object'
      ? data.outcomeMemory as Record<string, unknown>
      : {};
    transaction.update(ref, {
      outcomeMemory: { ...memory, country: normalizedCountry, countryCode },
      updatedAt: serverTimestamp()
    });
  });
}
