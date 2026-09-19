import {
  collection,
  getDocs
} from 'firebase/firestore';
import { firestoreDb } from '../lib/firebase';
import type { AdminLead } from '../types/admin';

function normalizeCreatedAt(value: unknown): string {
  if (!value) return '';

  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  ) {
    const date = (value as { toDate: () => Date }).toDate();
    return date.toISOString();
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'seconds' in value &&
    typeof (value as { seconds?: unknown }).seconds === 'number'
  ) {
    const seconds = (value as { seconds: number }).seconds;
    return new Date(seconds * 1000).toISOString();
  }

  return '';
}

function normalizeAudit(data: any, documentId: string): AdminLead {
  return {
    id: String(data.id || documentId),
    source: 'AUDIT',
    name: String(data.name || 'Unknown'),
    company: data.company ? String(data.company) : undefined,
    email: String(data.email || ''),
    contactChannel: data.contactChannel ? String(data.contactChannel) : undefined,
    website: data.website ? String(data.website) : undefined,
    inquiryNotes: data.inquiryNotes ? String(data.inquiryNotes) : undefined,
    status: String(data.status || 'PENDING_REVIEW'),
    notificationStatus: String(data.notificationStatus || 'PENDING'),
    createdAt: normalizeCreatedAt(data.createdAt)
  };
}

function normalizeContact(data: any, documentId: string): AdminLead {
  return {
    id: String(data.id || documentId),
    source: 'CONTACT',
    name: String(data.name || 'Unknown'),
    email: String(data.email || ''),
    message: data.message ? String(data.message) : undefined,
    status: String(data.status || 'PENDING_REVIEW'),
    notificationStatus: String(data.notificationStatus || 'PENDING'),
    createdAt: normalizeCreatedAt(data.createdAt)
  };
}

export async function fetchAdminLeads(): Promise<AdminLead[]> {
  // Fetch each intake collection and sort after normalizing dates. Historical
  // records use Firestore Timestamp while current browser submissions use ISO
  // strings, so server-side orderBy(createdAt) would sort by Firestore type
  // before chronology.
  const [auditSnapshot, contactSnapshot] = await Promise.all([
    getDocs(collection(firestoreDb, 'audit_submissions')),
    getDocs(collection(firestoreDb, 'contact_submissions'))
  ]);

  const audits = auditSnapshot.docs.map((document) =>
    normalizeAudit(document.data(), document.id)
  );

  const contacts = contactSnapshot.docs.map((document) =>
    normalizeContact(document.data(), document.id)
  );

  return [...audits, ...contacts].sort((a, b) => {
    const aTime = Date.parse(a.createdAt) || 0;
    const bTime = Date.parse(b.createdAt) || 0;
    return bTime - aTime;
  });
}
