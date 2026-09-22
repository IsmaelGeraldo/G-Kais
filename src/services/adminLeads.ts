import {
  arrayUnion,
  collection,
  deleteDoc,
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
  LeadNote,
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

function normalizeLeadNotes(value: unknown): LeadNote[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry: any) => ({
      id: String(entry.id || ''),
      title: String(entry.title || ''),
      body: String(entry.body || ''),
      author: String(entry.author || 'Admin'),
      createdAt: normalizeCreatedAt(entry.createdAt)
    }))
    .filter((entry) => entry.id && entry.title && entry.body && entry.createdAt)
    .slice(-50);
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
          : undefined,
      actionType:
        entry.actionType === 'CRM_UPDATE' ||
        entry.actionType === 'NOTE_EDITED' ||
        entry.actionType === 'NOTE_DELETED'
          ? entry.actionType
          : undefined,
      noteTitle:
        typeof entry.noteTitle === 'string' && entry.noteTitle.trim()
          ? entry.noteTitle
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
    ...(entry.result ? { result: entry.result } : {}),
    ...(entry.actionType ? { actionType: entry.actionType } : {}),
    ...(entry.noteTitle ? { noteTitle: entry.noteTitle } : {})
  }));
}

function normalizeAudit(data: any, documentId: string): AdminLead {
  return {
    id: String(data.id || documentId),
    source: 'AUDIT',
    name: String(data.name || 'Unknown'),
    company: data.company ? String(data.company) : undefined,
    email: String(data.email || ''),
    phone: optionalString(data.phone),
    contactChannel: data.contactChannel ? String(data.contactChannel) : undefined,
    website: data.website ? String(data.website) : undefined,
    businessType: optionalString(data.businessType),
    primaryService: optionalString(data.primaryService),
    digitalPresence: optionalString(data.digitalPresence),
    acquisitionChannel: optionalString(data.acquisitionChannel),
    leadVolume: optionalString(data.leadVolume),
    currentCrm: optionalString(data.currentCrm),
    primaryProblem: optionalString(data.primaryProblem),
    currentSolution: optionalString(data.currentSolution),
    businessGoal: optionalString(data.businessGoal),
    inquiryNotes: data.inquiryNotes ? String(data.inquiryNotes) : undefined,
    status: normalizeStatus(data.status),
    notificationStatus: String(data.notificationStatus || 'PENDING'),
    createdAt: normalizeCreatedAt(data.createdAt),
    updatedAt: normalizeCreatedAt(data.updatedAt),
    assignedTo: optionalString(data.assignedTo),
    nextAction: optionalString(data.nextAction),
    followUpAt: normalizeCreatedAt(data.followUpAt) || undefined,
    internalNotes: optionalString(data.internalNotes),
    leadNotes: normalizeLeadNotes(data.leadNotes),
    activityLog: normalizeActivityLog(data.activityLog)
  };
}

function normalizeContact(data: any, documentId: string): AdminLead {
  return {
    id: String(data.id || documentId),
    source: 'CONTACT',
    name: String(data.name || 'Unknown'),
    email: String(data.email || ''),
    phone: optionalString(data.phone),
    website: data.website ? String(data.website) : undefined,
    businessType: optionalString(data.businessType),
    primaryService: optionalString(data.primaryService),
    digitalPresence: optionalString(data.digitalPresence),
    acquisitionChannel: optionalString(data.acquisitionChannel),
    leadVolume: optionalString(data.leadVolume),
    currentCrm: optionalString(data.currentCrm),
    primaryProblem: optionalString(data.primaryProblem),
    currentSolution: optionalString(data.currentSolution),
    businessGoal: optionalString(data.businessGoal),
    message: data.message ? String(data.message) : undefined,
    status: normalizeStatus(data.status),
    notificationStatus: String(data.notificationStatus || 'PENDING'),
    createdAt: normalizeCreatedAt(data.createdAt),
    updatedAt: normalizeCreatedAt(data.updatedAt),
    assignedTo: optionalString(data.assignedTo),
    nextAction: optionalString(data.nextAction),
    followUpAt: normalizeCreatedAt(data.followUpAt) || undefined,
    internalNotes: optionalString(data.internalNotes),
    leadNotes: normalizeLeadNotes(data.leadNotes),
    activityLog: normalizeActivityLog(data.activityLog)
  };
}

function normalizeImport(data: any, documentId: string): AdminLead {
  return {
    id: String(data.id || documentId),
    source: 'IMPORT',
    name: String(data.name || 'Unknown'),
    company: optionalString(data.company),
    email: String(data.email || ''),
    phone: optionalString(data.phone),
    contactChannel: optionalString(data.contactChannel),
    website: optionalString(data.website),
    businessType: optionalString(data.businessType),
    primaryService: optionalString(data.primaryService),
    digitalPresence: optionalString(data.digitalPresence),
    acquisitionChannel: optionalString(data.acquisitionChannel),
    leadVolume: optionalString(data.leadVolume),
    currentCrm: optionalString(data.currentCrm),
    primaryProblem: optionalString(data.primaryProblem),
    currentSolution: optionalString(data.currentSolution),
    businessGoal: optionalString(data.businessGoal),
    inquiryNotes: optionalString(data.inquiryNotes),
    status: normalizeStatus(data.status),
    notificationStatus: String(data.notificationStatus || 'IMPORTED'),
    createdAt: normalizeCreatedAt(data.createdAt),
    updatedAt: normalizeCreatedAt(data.updatedAt),
    assignedTo: optionalString(data.assignedTo),
    nextAction: optionalString(data.nextAction),
    followUpAt: normalizeCreatedAt(data.followUpAt) || undefined,
    internalNotes: optionalString(data.internalNotes),
    leadNotes: normalizeLeadNotes(data.leadNotes),
    activityLog: normalizeActivityLog(data.activityLog)
  };
}

function leadCollectionName(lead: AdminLead): string {
  if (lead.source === 'AUDIT') return 'audit_submissions';
  if (lead.source === 'CONTACT') return 'contact_submissions';
  return 'lead_imports';
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

  let imports: AdminLead[] = [];
  try {
    const importSnapshot = await getDocs(collection(firestoreDb, 'lead_imports'));
    imports = importSnapshot.docs.map((document) =>
      normalizeImport(document.data(), document.id)
    );
  } catch (error) {
    // Keep the existing CRM operational while the new lead_imports rules are
    // being deployed. Import writes will still surface their own permission
    // error until the admin publishes the updated Firestore rules.
    console.warn('[LEAD IMPORT] Imported leads unavailable:', error);
  }

  return [...audits, ...contacts, ...imports].sort((a, b) => {
    const aTime = Date.parse(a.createdAt) || 0;
    const bTime = Date.parse(b.createdAt) || 0;
    return bTime - aTime;
  });
}


function serializeLeadNotes(notes: LeadNote[]): Record<string, string>[] {
  return notes.slice(-50).map((note) => ({
    id: note.id,
    title: note.title,
    body: note.body,
    author: note.author,
    createdAt: note.createdAt
  }));
}

function operationalDefaults(lead: AdminLead) {
  return {
    status: lead.status,
    assignedTo: lead.assignedTo?.trim() || '',
    nextAction: lead.nextAction?.trim() || '',
    followUpAt: lead.followUpAt?.trim() || '',
    internalNotes: lead.internalNotes?.trim() || '',
    activityLog: serializeActivityLog(lead.activityLog || [])
  };
}

export async function updateLeadWebsite(
  lead: AdminLead,
  websiteInput: string
): Promise<string> {
  const website = websiteInput.trim();

  if (website.length > 250) {
    throw new Error('Website cannot exceed 250 characters.');
  }

  const collectionName = leadCollectionName(lead);

  await updateDoc(doc(firestoreDb, collectionName, lead.id), {
    ...operationalDefaults(lead),
    website,
    updatedAt: serverTimestamp()
  });

  return website;
}

export async function updateLeadNote(
  lead: AdminLead,
  noteId: string,
  titleInput: string,
  bodyInput: string,
  actorLabel: string
): Promise<{ notes: LeadNote[]; activity: LeadActivity }> {
  const title = titleInput.trim();
  const body = bodyInput.trim();
  const actor = actorLabel.trim().slice(0, 120) || 'Admin';

  if (!title) throw new Error('Note title is required.');
  if (!body) throw new Error('Note content is required.');
  if (title.length > 120) throw new Error('Note title cannot exceed 120 characters.');
  if (body.length > 3000) throw new Error('Note content cannot exceed 3,000 characters.');

  const existing = (lead.leadNotes || []).find((note) => note.id === noteId);
  if (!existing) throw new Error('Note not found.');

  const notes = (lead.leadNotes || []).map((note) =>
    note.id === noteId ? { ...note, title, body } : note
  );

  const activity: LeadActivity = {
    at: new Date().toISOString(),
    actor,
    fromStatus: lead.status,
    toStatus: lead.status,
    nextAction: lead.nextAction || '',
    actionType: 'NOTE_EDITED',
    noteTitle: title
  };

  const activityLog = [...(lead.activityLog || []), activity].slice(-20);
  const collectionName = leadCollectionName(lead);

  await updateDoc(doc(firestoreDb, collectionName, lead.id), {
    ...operationalDefaults(lead),
    leadNotes: serializeLeadNotes(notes),
    activityLog: serializeActivityLog(activityLog),
    updatedAt: serverTimestamp()
  });

  return { notes, activity };
}

export async function deleteLeadNote(
  lead: AdminLead,
  noteId: string,
  actorLabel: string
): Promise<{ notes: LeadNote[]; activity: LeadActivity }> {
  const actor = actorLabel.trim().slice(0, 120) || 'Admin';
  const existing = (lead.leadNotes || []).find((note) => note.id === noteId);
  if (!existing) throw new Error('Note not found.');

  const notes = (lead.leadNotes || []).filter((note) => note.id !== noteId);
  const activity: LeadActivity = {
    at: new Date().toISOString(),
    actor,
    fromStatus: lead.status,
    toStatus: lead.status,
    nextAction: lead.nextAction || '',
    actionType: 'NOTE_DELETED',
    noteTitle: existing.title
  };

  const activityLog = [...(lead.activityLog || []), activity].slice(-20);
  const collectionName = leadCollectionName(lead);

  await updateDoc(doc(firestoreDb, collectionName, lead.id), {
    ...operationalDefaults(lead),
    leadNotes: serializeLeadNotes(notes),
    activityLog: serializeActivityLog(activityLog),
    updatedAt: serverTimestamp()
  });

  return { notes, activity };
}

export async function deleteLead(lead: AdminLead): Promise<void> {
  const collectionName = leadCollectionName(lead);

  await deleteDoc(doc(firestoreDb, collectionName, lead.id));
}

export async function addLeadNote(
  lead: AdminLead,
  titleInput: string,
  bodyInput: string,
  actorLabel: string
): Promise<LeadNote> {
  const title = titleInput.trim();
  const body = bodyInput.trim();
  const author = actorLabel.trim().slice(0, 120) || 'Admin';

  if (!title) throw new Error('Note title is required.');
  if (!body) throw new Error('Note content is required.');
  if (title.length > 120) throw new Error('Note title cannot exceed 120 characters.');
  if (body.length > 3000) throw new Error('Note content cannot exceed 3,000 characters.');
  if ((lead.leadNotes || []).length >= 50) {
    throw new Error('This lead has reached the 50-note limit.');
  }

  const note: LeadNote = {
    id: `NOTE-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    title,
    body,
    author,
    createdAt: new Date().toISOString()
  };

  const collectionName = leadCollectionName(lead);

  await updateDoc(doc(firestoreDb, collectionName, lead.id), {
    status: lead.status,
    assignedTo: lead.assignedTo?.trim() || '',
    nextAction: lead.nextAction?.trim() || '',
    followUpAt: lead.followUpAt?.trim() || '',
    internalNotes: lead.internalNotes?.trim() || '',
    activityLog: serializeActivityLog(lead.activityLog || []),
    leadNotes: arrayUnion(note),
    updatedAt: serverTimestamp()
  });

  return note;
}

export async function updateLeadOperations(
  lead: AdminLead,
  update: LeadOperationsUpdate,
  actorLabel: string
): Promise<LeadActivity> {
  const website = update.website?.trim() || '';
  const businessType = update.businessType?.trim() || '';
  const primaryService = update.primaryService?.trim() || '';
  const digitalPresence = update.digitalPresence?.trim() || '';
  const acquisitionChannel = update.acquisitionChannel?.trim() || '';
  const leadVolume = update.leadVolume?.trim() || '';
  const currentCrm = update.currentCrm?.trim() || '';
  const primaryProblem = update.primaryProblem?.trim() || '';
  const currentSolution = update.currentSolution?.trim() || '';
  const businessGoal = update.businessGoal?.trim() || '';
  const assignedTo = update.assignedTo?.trim() || '';
  const nextAction = update.nextAction?.trim() || '';
  const followUpAt = update.followUpAt?.trim() || '';
  const internalNotes = update.internalNotes?.trim() || '';

  if (website.length > 250) {
    throw new Error('Website cannot exceed 250 characters.');
  }
  if (businessType.length > 160) {
    throw new Error('Business type cannot exceed 160 characters.');
  }
  if (primaryService.length > 300) {
    throw new Error('Primary service cannot exceed 300 characters.');
  }
  if (digitalPresence.length > 500) {
    throw new Error('Digital presence cannot exceed 500 characters.');
  }
  if (acquisitionChannel.length > 300) {
    throw new Error('Acquisition channel cannot exceed 300 characters.');
  }
  if (leadVolume.length > 160) {
    throw new Error('Lead volume cannot exceed 160 characters.');
  }
  if (currentCrm.length > 200) {
    throw new Error('Current CRM cannot exceed 200 characters.');
  }
  if (primaryProblem.length > 1200) {
    throw new Error('Primary problem cannot exceed 1,200 characters.');
  }
  if (currentSolution.length > 1200) {
    throw new Error('Current solution cannot exceed 1,200 characters.');
  }
  if (businessGoal.length > 1200) {
    throw new Error('Business goal cannot exceed 1,200 characters.');
  }
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

  const collectionName = leadCollectionName(lead);

  const activity: LeadActivity = {
    at: new Date().toISOString(),
    actor: actorLabel.trim().slice(0, 120) || 'Admin',
    fromStatus: lead.status,
    toStatus: update.status,
    nextAction,
    actionType: 'CRM_UPDATE'
  };

  const activityLog = [...(lead.activityLog || []), activity].slice(-20);

  await updateDoc(doc(firestoreDb, collectionName, lead.id), {
    status: update.status,
    website,
    businessType,
    primaryService,
    digitalPresence,
    acquisitionChannel,
    leadVolume,
    currentCrm,
    primaryProblem,
    currentSolution,
    businessGoal,
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
        nextAction: 'Send onboarding',
        followUpAt: addHours(24)
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
  const collectionName = leadCollectionName(lead);

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
  const collectionName = leadCollectionName(lead);

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
