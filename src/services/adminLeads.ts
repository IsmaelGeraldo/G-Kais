import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { firestoreDb } from '../lib/firebase';
import type {
  AdminLead,
  LeadOperationsUpdate,
  LeadStatus
} from '../types/admin';

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

function normalizeStatus(value: unknown): LeadStatus {
  const allowed: LeadStatus[] = [
    'PENDING_REVIEW',
    'NEW',
    'CONTACTED',
    'FOLLOW_UP',
    'MEETING',
    'CLIENT',
    'LOST'
  ];

  return allowed.includes(value as LeadStatus)
    ? (value as LeadStatus)
    : 'PENDING_REVIEW';
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
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
    status: normalizeStatus(data.status),
    notificationStatus: String(data.notificationStatus || 'PENDING'),
    createdAt: normalizeCreatedAt(data.createdAt),
    updatedAt: normalizeCreatedAt(data.updatedAt),
    assignedTo: optionalString(data.assignedTo),
    nextAction: optionalString(data.nextAction),
    followUpAt: normalizeCreatedAt(data.followUpAt) || undefined,
    internalNotes: optionalString(data.internalNotes)
  };
}

function normalizeContact(data: any, documentId: string): AdminLead {
  return {
    id: String(data.id || documentId),
    source: 'CONTACT',
    name: String(data.name || 'Unknown'),
    email: String(data.email || ''),
    message: data.message ? String(data.message) : undefined,
    status: normalizeStatus(data.status),
    notificationStatus: String(data.notificationStatus || 'PENDING'),
    createdAt: normalizeCreatedAt(data.createdAt),
    updatedAt: normalizeCreatedAt(data.updatedAt),
    assignedTo: optionalString(data.assignedTo),
    nextAction: optionalString(data.nextAction),
    followUpAt: normalizeCreatedAt(data.followUpAt) || undefined,
    internalNotes: optionalString(data.internalNotes)
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


export async function updateLeadOperations(
  lead: AdminLead,
  update: LeadOperationsUpdate
): Promise<void> {
  const assignedTo = update.assignedTo?.trim() || '';
  const nextAction = update.nextAction?.trim() || '';
  const followUpAt = update.followUpAt?.trim() || '';
  const internalNotes = update.internalNotes?.trim() || '';

  if (assignedTo.length > 100) {
    throw new Error('Responsible person cannot exceed 100 characters.');
  }
  if (nextAction.length > 240) {
    throw new Error('Next action cannot exceed 240 characters.');
  }
  if (internalNotes.length > 3000) {
    throw new Error('Internal notes cannot exceed 3,000 characters.');
  }
  if (followUpAt && Number.isNaN(Date.parse(followUpAt))) {
    throw new Error('Follow-up date is invalid.');
  }

  const collectionName =
    lead.source === 'AUDIT' ? 'audit_submissions' : 'contact_submissions';

  await updateDoc(doc(firestoreDb, collectionName, lead.id), {
    status: update.status,
    assignedTo,
    nextAction,
    followUpAt,
    internalNotes,
    updatedAt: serverTimestamp()
  });
}
