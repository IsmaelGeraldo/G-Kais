import {
  collection,
  getDocs,
  limit,
  orderBy,
  query
} from 'firebase/firestore';
import { firestoreDb } from '../lib/firebase';
import type { AdminLead } from '../types/admin';

function normalizeAudit(data: any): AdminLead {
  return {
    id: String(data.id || ''),
    source: 'AUDIT',
    name: String(data.name || 'Unknown'),
    company: data.company ? String(data.company) : undefined,
    email: String(data.email || ''),
    contactChannel: data.contactChannel ? String(data.contactChannel) : undefined,
    website: data.website ? String(data.website) : undefined,
    inquiryNotes: data.inquiryNotes ? String(data.inquiryNotes) : undefined,
    status: String(data.status || 'PENDING_REVIEW'),
    notificationStatus: String(data.notificationStatus || 'PENDING'),
    createdAt: String(data.createdAt || '')
  };
}

function normalizeContact(data: any): AdminLead {
  return {
    id: String(data.id || ''),
    source: 'CONTACT',
    name: String(data.name || 'Unknown'),
    email: String(data.email || ''),
    message: data.message ? String(data.message) : undefined,
    status: String(data.status || 'PENDING_REVIEW'),
    notificationStatus: String(data.notificationStatus || 'PENDING'),
    createdAt: String(data.createdAt || '')
  };
}

export async function fetchAdminLeads(): Promise<AdminLead[]> {
  const auditQuery = query(
    collection(firestoreDb, 'audit_submissions'),
    orderBy('createdAt', 'desc'),
    limit(100)
  );

  const contactQuery = query(
    collection(firestoreDb, 'contact_submissions'),
    orderBy('createdAt', 'desc'),
    limit(100)
  );

  const [auditSnapshot, contactSnapshot] = await Promise.all([
    getDocs(auditQuery),
    getDocs(contactQuery)
  ]);

  const audits = auditSnapshot.docs.map((doc) => normalizeAudit(doc.data()));
  const contacts = contactSnapshot.docs.map((doc) => normalizeContact(doc.data()));

  return [...audits, ...contacts].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
}
