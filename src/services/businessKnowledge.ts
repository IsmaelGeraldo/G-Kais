import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { firestoreDb } from '../lib/firebase';

export interface BusinessKnowledge {
  businessName: string;
  businessDescription: string;
  offers: string;
  idealCustomer: string;
  qualificationCriteria: string;
  faqObjections: string;
  policies: string;
  tone: string;
  updatedAt?: string;
}

export const EMPTY_BUSINESS_KNOWLEDGE: BusinessKnowledge = {
  businessName: '',
  businessDescription: '',
  offers: '',
  idealCustomer: '',
  qualificationCriteria: '',
  faqObjections: '',
  policies: '',
  tone: ''
};

const KNOWLEDGE_DOC = doc(firestoreDb, 'business_knowledge', 'default');

function stringValue(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export async function fetchBusinessKnowledge(): Promise<BusinessKnowledge> {
  const snapshot = await getDoc(KNOWLEDGE_DOC);

  if (!snapshot.exists()) {
    return { ...EMPTY_BUSINESS_KNOWLEDGE };
  }

  const data = snapshot.data();

  return {
    businessName: stringValue(data.businessName, 160),
    businessDescription: stringValue(data.businessDescription, 4000),
    offers: stringValue(data.offers, 5000),
    idealCustomer: stringValue(data.idealCustomer, 4000),
    qualificationCriteria: stringValue(data.qualificationCriteria, 4000),
    faqObjections: stringValue(data.faqObjections, 5000),
    policies: stringValue(data.policies, 4000),
    tone: stringValue(data.tone, 2000),
    updatedAt:
      data.updatedAt && typeof data.updatedAt.toDate === 'function'
        ? data.updatedAt.toDate().toISOString()
        : undefined
  };
}

export async function saveBusinessKnowledge(
  input: BusinessKnowledge
): Promise<BusinessKnowledge> {
  const normalized: BusinessKnowledge = {
    businessName: stringValue(input.businessName, 160),
    businessDescription: stringValue(input.businessDescription, 4000),
    offers: stringValue(input.offers, 5000),
    idealCustomer: stringValue(input.idealCustomer, 4000),
    qualificationCriteria: stringValue(input.qualificationCriteria, 4000),
    faqObjections: stringValue(input.faqObjections, 5000),
    policies: stringValue(input.policies, 4000),
    tone: stringValue(input.tone, 2000)
  };

  await setDoc(
    KNOWLEDGE_DOC,
    {
      ...normalized,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  return {
    ...normalized,
    updatedAt: new Date().toISOString()
  };
}

export function hasBusinessKnowledge(value: BusinessKnowledge): boolean {
  return Boolean(
    value.businessName ||
      value.businessDescription ||
      value.offers ||
      value.idealCustomer ||
      value.qualificationCriteria ||
      value.faqObjections ||
      value.policies ||
      value.tone
  );
}
