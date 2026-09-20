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
  LeadActivity,
  LeadActionCompletion,
  LeadOperationsUpdate,
  LeadStatus,
  TaskOutcome
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

function normalizeActivityLog(value: unknown): LeadActivity[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry: any) => ({
      at: normalizeCreatedAt(entry.at),
      actor: String(entry.actor || 'Admin'),
      fromStatus: normalizeStatus(entry.fromStatus),
      toStatus: normalizeStatus(entry.toStatus),
      nextAction: String(entry.nextAction || ''),
      result:
        typeof entry.result === 'string'
          ? (entry.result as TaskOutcome)
          : undefined
    }))
    .filter((entry) => entry.at)
    .slice(-20);
}

function serializeActivityLog(entries: LeadActivity[]): Record<string, unknown>[] {
  return entries.slice(-20).map((entry) => ({
    at: entry.at,
    actor: entry.actor,
    fromStatus: entry.fromStatus,
    toStatus: entry.toStatus,
    nextAction: entry.nextAction,
    ...(entry.result ? { result: entry.result } : {})
  }));
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
    internalNotes: optionalString(data.internalNotes),
    activityLog: normalizeActivityLog(data.activityLog)
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
    internalNotes: optionalString(data.internalNotes),
    activityLog: normalizeActivityLog(data.activityLog)
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
  update: LeadOperationsUpdate,
  actorLabel: string
): Promise<LeadActivity> {
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

  const activity: LeadActivity = {
    at: new Date().toISOString(),
    actor: actorLabel.trim().slice(0, 120) || 'Admin',
    fromStatus: lead.status,
    toStatus: update.status,
    nextAction
  };

  const activityLog = [...(lead.activityLog || []), activity].slice(-20);

  await updateDoc(doc(firestoreDb, collectionName, lead.id), {
    status: update.status,
    assignedTo,
    nextAction,
    followUpAt,
    internalNotes,
    activityLog: serializeActivityLog(activityLog),
    updatedAt: serverTimestamp()
  });

  return activity;
}


function addHours(hours: number): string {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}

function outcomePlaybook(
  lead: AdminLead,
  outcome: TaskOutcome
): { status: LeadStatus; nextAction: string; followUpAt: string } {
  const keepClientStatus = (nextStatus: LeadStatus): LeadStatus =>
    lead.status === 'CLIENT' ? 'CLIENT' : nextStatus;

  switch (outcome) {
    case 'NO_ANSWER':
      return {
        status: keepClientStatus('FOLLOW_UP'),
        nextAction: 'Follow up',
        followUpAt: addHours(24)
      };
    case 'INTERESTED':
      return {
        status: keepClientStatus('CONTACTED'),
        nextAction: 'Schedule meeting',
        followUpAt: addHours(24)
      };
    case 'MEETING_BOOKED':
      return {
        status: keepClientStatus('MEETING'),
        nextAction: 'Confirm meeting',
        followUpAt: ''
      };
    case 'PROPOSAL_SENT':
      return {
        status: keepClientStatus('FOLLOW_UP'),
        nextAction: 'Follow up',
        followUpAt: addHours(48)
      };
    case 'SALE_CLOSED':
      return {
        status: 'CLIENT',
        nextAction: '',
        followUpAt: ''
      };
    case 'NOT_INTERESTED':
      return {
        status: keepClientStatus('LOST'),
        nextAction: '',
        followUpAt: ''
      };
    case 'COMPLETED':
    default:
      return {
        status: lead.status,
        nextAction: '',
        followUpAt: ''
      };
  }
}

export async function completeLeadAction(
  lead: AdminLead,
  actorLabel: string,
  outcome: TaskOutcome
): Promise<LeadActionCompletion> {
  const collectionName =
    lead.source === 'AUDIT' ? 'audit_submissions' : 'contact_submissions';

  const completedLabel = (lead.nextAction?.trim() || 'Scheduled follow-up').slice(0, 220);
  const playbook = outcomePlaybook(lead, outcome);

  const activity: LeadActivity = {
    at: new Date().toISOString(),
    actor: actorLabel.trim().slice(0, 120) || 'Admin',
    fromStatus: lead.status,
    toStatus: playbook.status,
    nextAction: `Completed: ${completedLabel}`,
    result: outcome
  };

  const activityLog = [...(lead.activityLog || []), activity].slice(-20);

  await updateDoc(doc(firestoreDb, collectionName, lead.id), {
    status: playbook.status,
    assignedTo: lead.assignedTo?.trim() || '',
    nextAction: playbook.nextAction,
    followUpAt: playbook.followUpAt,
    internalNotes: lead.internalNotes?.trim() || '',
    activityLog: serializeActivityLog(activityLog),
    updatedAt: serverTimestamp()
  });

  return {
    activity,
    status: playbook.status,
    nextAction: playbook.nextAction,
    followUpAt: playbook.followUpAt
  };
}


export async function rescheduleLeadAction(
  lead: AdminLead,
  actorLabel: string,
  hoursFromNow: number
): Promise<LeadActionCompletion> {
  const collectionName =
    lead.source === 'AUDIT' ? 'audit_submissions' : 'contact_submissions';

  const nextAction = lead.nextAction?.trim() || 'Follow up';
  const followUpAt = addHours(hoursFromNow);

  const activity: LeadActivity = {
    at: new Date().toISOString(),
    actor: actorLabel.trim().slice(0, 120) || 'Admin',
    fromStatus: lead.status,
    toStatus: lead.status,
    nextAction: `Rescheduled: ${nextAction}`
  };

  const activityLog = [...(lead.activityLog || []), activity].slice(-20);

  await updateDoc(doc(firestoreDb, collectionName, lead.id), {
    status: lead.status,
    assignedTo: lead.assignedTo?.trim() || '',
    nextAction,
    followUpAt,
    internalNotes: lead.internalNotes?.trim() || '',
    activityLog: serializeActivityLog(activityLog),
    updatedAt: serverTimestamp()
  });

  return {
    activity,
    status: lead.status,
    nextAction,
    followUpAt
  };
}
