import {
  doc,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../lib/firebase';
import type { ExpertPerson } from './expertsAcquisition';
import { continuityReasonLabel, type NoPurchaseReason } from './expertsContinuity';
import {
  appendExpertAuditLog,
  appendExpertRelationshipEvent,
  resolveActiveExpertWorkspaceId,
  type WorkspaceMember
} from './expertsWorkspaceCore';

export type NurtureStatus = 'active' | 'closed';
export type NurtureEngagement = 'unknown' | 'none' | 'low' | 'medium' | 'high';
export type NurtureCandidate = 'not-yet' | 'course' | 'scholarship' | 'high-potential' | 'not-interested';
export type ContactPermission = 'unknown' | 'confirmed' | 'declined';

export type NurtureState = {
  status: NurtureStatus | 'none';
  reason: NoPurchaseReason;
  reasonNote: string;
  originWebinarId: string;
  originRegistrationId: string;
  learning: NurtureEngagement;
  communityActivity: NurtureEngagement;
  youtubeActivity: NurtureEngagement;
  candidate: NurtureCandidate;
  reviewNote: string;
  contactPermission: ContactPermission;
  nextActionType: 'email' | 'whatsapp' | 'call' | 'meeting' | 'task';
  nextActionDate: string;
  nextActionTime: string;
  nextActionOwnerUid: string;
  nextActionOwnerName: string;
  updatedAt: string;
};

function sanitize<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => sanitize(item)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, sanitize(item)])
    ) as T;
  }
  return value;
}

async function workspaceId(): Promise<string> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('AUTH_REQUIRED');
  const id = await resolveActiveExpertWorkspaceId(user);
  if (!id) throw new Error('WORKSPACE_REQUIRED');
  return id;
}

function workspaceDocument(workspaceId: string, collectionName: string, id: string) {
  return doc(firestoreDb, 'expert_workspaces', workspaceId, collectionName, id);
}

function safeReason(value: unknown): NoPurchaseReason {
  return ['unknown', 'budget', 'timing', 'not-fit', 'needs-trust', 'decision', 'not-interested', 'other'].includes(String(value))
    ? value as NoPurchaseReason
    : 'unknown';
}

function safeEngagement(value: unknown): NurtureEngagement {
  return ['unknown', 'none', 'low', 'medium', 'high'].includes(String(value)) ? value as NurtureEngagement : 'unknown';
}

function safeCandidate(value: unknown): NurtureCandidate {
  return ['not-yet', 'course', 'scholarship', 'high-potential', 'not-interested'].includes(String(value)) ? value as NurtureCandidate : 'not-yet';
}

function safePermission(value: unknown): ContactPermission {
  return ['unknown', 'confirmed', 'declined'].includes(String(value)) ? value as ContactPermission : 'unknown';
}

function safeActionType(value: unknown): NurtureState['nextActionType'] {
  return ['email', 'whatsapp', 'call', 'meeting', 'task'].includes(String(value)) ? value as NurtureState['nextActionType'] : 'whatsapp';
}

export function nurtureState(person: ExpertPerson): NurtureState {
  const memory = person.outcomeMemory || {};
  return {
    status: memory.nurtureStatus === 'active' || memory.nurtureStatus === 'closed' ? memory.nurtureStatus : 'none',
    reason: safeReason(memory.nurtureReason || memory.continuityReason),
    reasonNote: typeof memory.nurtureReasonNote === 'string' ? memory.nurtureReasonNote : (typeof memory.continuityNote === 'string' ? memory.continuityNote : ''),
    originWebinarId: typeof memory.nurtureOriginWebinarId === 'string' ? memory.nurtureOriginWebinarId : '',
    originRegistrationId: typeof memory.nurtureOriginRegistrationId === 'string' ? memory.nurtureOriginRegistrationId : '',
    learning: safeEngagement(memory.nurtureLearning),
    communityActivity: safeEngagement(memory.nurtureCommunityActivity),
    youtubeActivity: safeEngagement(memory.nurtureYoutubeActivity),
    candidate: safeCandidate(memory.nurtureCandidate),
    reviewNote: typeof memory.nurtureReviewNote === 'string' ? memory.nurtureReviewNote : '',
    contactPermission: safePermission(memory.nurtureContactPermission),
    nextActionType: safeActionType(memory.nurtureNextActionType),
    nextActionDate: typeof memory.nurtureNextActionDate === 'string' ? memory.nurtureNextActionDate : '',
    nextActionTime: typeof memory.nurtureNextActionTime === 'string' ? memory.nurtureNextActionTime : '',
    nextActionOwnerUid: typeof memory.nurtureNextActionOwnerUid === 'string' ? memory.nurtureNextActionOwnerUid : '',
    nextActionOwnerName: typeof memory.nurtureNextActionOwnerName === 'string' ? memory.nurtureNextActionOwnerName : '',
    updatedAt: typeof memory.nurtureUpdatedAt === 'string' ? memory.nurtureUpdatedAt : ''
  };
}

export function engagementLabel(value: NurtureEngagement, language: 'es' | 'en'): string {
  const es: Record<NurtureEngagement, string> = { unknown: 'Sin evaluar', none: 'Nada', low: 'Bajo', medium: 'Medio', high: 'Alto' };
  const en: Record<NurtureEngagement, string> = { unknown: 'Not assessed', none: 'None', low: 'Low', medium: 'Medium', high: 'High' };
  return (language === 'es' ? es : en)[value];
}

export function candidateLabel(value: NurtureCandidate, language: 'es' | 'en'): string {
  const es: Record<NurtureCandidate, string> = {
    'not-yet': 'Aún no', course: 'Candidato a curso', scholarship: 'Candidato a beca / cupo',
    'high-potential': 'Alta oportunidad', 'not-interested': 'Sin interés'
  };
  const en: Record<NurtureCandidate, string> = {
    'not-yet': 'Not yet', course: 'Course candidate', scholarship: 'Scholarship / seat candidate',
    'high-potential': 'High opportunity', 'not-interested': 'Not interested'
  };
  return (language === 'es' ? es : en)[value];
}

export function contactPermissionLabel(value: ContactPermission, language: 'es' | 'en'): string {
  const es: Record<ContactPermission, string> = { unknown: 'Sin confirmar', confirmed: 'Confirmado', declined: 'No autorizado' };
  const en: Record<ContactPermission, string> = { unknown: 'Not confirmed', confirmed: 'Confirmed', declined: 'Not allowed' };
  return (language === 'es' ? es : en)[value];
}

export async function resolveWebinarNoPurchaseContact(input: {
  taskId: string;
  registrationId: string;
  personId: string;
  webinarId: string;
  personName: string;
  reason: NoPurchaseReason;
  reasonNote?: string;
  decision: 'nurture' | 'closed';
  assignee: WorkspaceMember;
  nextActionType?: NurtureState['nextActionType'];
  nextActionDate?: string;
  nextActionTime?: string;
  contactPermission?: ContactPermission;
  language: 'es' | 'en';
}): Promise<string> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('AUTH_REQUIRED');
  if (input.reason === 'unknown') throw new Error('NO_PURCHASE_REASON_REQUIRED');
  const workspace = await workspaceId();
  const personRef = workspaceDocument(workspace, 'people', input.personId);
  const registrationRef = workspaceDocument(workspace, 'webinar_registrations', input.registrationId);
  const status: NurtureStatus = input.decision === 'nurture' ? 'active' : 'closed';
  const nextType = input.nextActionType || 'whatsapp';
  const reasonLabel = continuityReasonLabel(input.reason, input.language);
  const result = input.decision === 'nurture'
    ? (input.language === 'es'
      ? `No compró: ${reasonLabel}. Acepta Pack gratuito (curso/recursos + comunidad + YouTube) y pasa a Seguimiento.`
      : `No purchase: ${reasonLabel}. Accepted free pack (course/resources + community + YouTube) and moved to Follow-up.`)
    : (input.language === 'es'
      ? `No compró: ${reasonLabel}. Sin interés en continuar; relación comercial cerrada.`
      : `No purchase: ${reasonLabel}. Not interested in continuing; commercial follow-up closed.`);

  await runTransaction(firestoreDb, async (transaction) => {
    const [personSnapshot, registrationSnapshot] = await Promise.all([
      transaction.get(personRef), transaction.get(registrationRef)
    ]);
    if (!personSnapshot.exists()) throw new Error('PERSON_NOT_FOUND');
    if (!registrationSnapshot.exists()) throw new Error('WEBINAR_REGISTRATION_NOT_FOUND');
    const currentMemory = personSnapshot.data().outcomeMemory && typeof personSnapshot.data().outcomeMemory === 'object'
      ? personSnapshot.data().outcomeMemory as Record<string, unknown>
      : {};
    transaction.set(personRef, {
      outcomeMemory: sanitize({
        ...currentMemory,
        nurtureStatus: status,
        nurtureReason: input.reason,
        nurtureReasonNote: input.reasonNote?.trim() || '',
        nurtureOriginWebinarId: input.webinarId,
        nurtureOriginRegistrationId: input.registrationId,
        nurturePackage: input.decision === 'nurture' ? {
          freeCourseOrResources: true,
          community: true,
          youtube: true
        } : {},
        nurtureContactPermission: input.contactPermission || 'unknown',
        nurtureNextActionType: input.decision === 'nurture' ? nextType : '',
        nurtureNextActionDate: input.decision === 'nurture' ? (input.nextActionDate || '') : '',
        nurtureNextActionTime: input.decision === 'nurture' ? (input.nextActionTime || '') : '',
        nurtureNextActionOwnerUid: input.decision === 'nurture' ? input.assignee.uid : '',
        nurtureNextActionOwnerName: input.decision === 'nurture' ? (input.assignee.displayName || input.assignee.email) : '',
        nurtureCandidate: input.decision === 'nurture' ? 'not-yet' : 'not-interested',
        nurtureUpdatedAt: new Date().toISOString(),
        continuityStatus: input.decision === 'nurture' ? 'active' : 'recorded',
        continuityReason: input.reason,
        continuityNote: input.reasonNote?.trim() || '',
        nextActionLabel: input.decision === 'nurture'
          ? (input.language === 'es' ? 'Seguimiento de Pack gratuito' : 'Free pack follow-up')
          : '',
        nextActionType: input.decision === 'nurture' ? nextType : '',
        nextActionAt: input.decision === 'nurture' ? [input.nextActionDate || '', input.nextActionTime || ''].filter(Boolean).join(' ') : '',
        nextActionOwnerUid: input.decision === 'nurture' ? input.assignee.uid : ''
      }),
      updatedAt: serverTimestamp()
    }, { merge: true });
    transaction.update(registrationRef, {
      followUpStatus: 'completed',
      followUpResult: result,
      followUpCompletedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  });

  await appendExpertRelationshipEvent({
    personId: input.personId,
    type: input.decision === 'nurture' ? 'nurture.activated' : 'nurture.closed',
    sourceType: 'webinar',
    sourceId: input.webinarId,
    idempotencyKey: `${input.registrationId}:nurture:${input.decision}:${input.reason}`,
    metadata: {
      taskId: input.taskId,
      registrationId: input.registrationId,
      reason: input.reason,
      reasonNote: input.reasonNote?.trim() || '',
      package: input.decision === 'nurture' ? ['free-course-or-resources', 'community', 'youtube'] : [],
      nextActionType: input.nextActionType || '',
      nextActionDate: input.nextActionDate || '',
      nextActionTime: input.nextActionTime || ''
    }
  }).catch((error) => console.error('[G-KAIS NURTURE EVENT]', error));
  await appendExpertAuditLog({
    entityType: 'person', entityId: input.personId, action: `nurture.${input.decision}`,
    changes: { registrationId: input.registrationId, webinarId: input.webinarId, reason: input.reason }
  }).catch((error) => console.error('[G-KAIS NURTURE AUDIT]', error));
  return result;
}

export async function saveNurtureReview(input: {
  personId: string;
  personName: string;
  learning: NurtureEngagement;
  communityActivity: NurtureEngagement;
  youtubeActivity: NurtureEngagement;
  candidate: NurtureCandidate;
  reviewNote?: string;
  contactPermission: ContactPermission;
  nextActionType: NurtureState['nextActionType'];
  nextActionDate?: string;
  nextActionTime?: string;
  assignee: WorkspaceMember;
  close?: boolean;
}): Promise<void> {
  const workspace = await workspaceId();
  const personRef = workspaceDocument(workspace, 'people', input.personId);
  const status: NurtureStatus = input.close || input.candidate === 'not-interested' ? 'closed' : 'active';
  await runTransaction(firestoreDb, async (transaction) => {
    const snapshot = await transaction.get(personRef);
    if (!snapshot.exists()) throw new Error('PERSON_NOT_FOUND');
    const currentMemory = snapshot.data().outcomeMemory && typeof snapshot.data().outcomeMemory === 'object'
      ? snapshot.data().outcomeMemory as Record<string, unknown>
      : {};
    transaction.set(personRef, {
      outcomeMemory: sanitize({
        ...currentMemory,
        nurtureStatus: status,
        nurtureLearning: input.learning,
        nurtureCommunityActivity: input.communityActivity,
        nurtureYoutubeActivity: input.youtubeActivity,
        nurtureCandidate: input.candidate,
        nurtureReviewNote: input.reviewNote?.trim() || '',
        nurtureContactPermission: input.contactPermission,
        nurtureNextActionType: status === 'active' ? input.nextActionType : '',
        nurtureNextActionDate: status === 'active' ? (input.nextActionDate || '') : '',
        nurtureNextActionTime: status === 'active' ? (input.nextActionTime || '') : '',
        nurtureNextActionOwnerUid: status === 'active' ? input.assignee.uid : '',
        nurtureNextActionOwnerName: status === 'active' ? (input.assignee.displayName || input.assignee.email) : '',
        nurtureUpdatedAt: new Date().toISOString(),
        nextActionLabel: status === 'active' ? 'Seguimiento de continuidad' : '',
        nextActionType: status === 'active' ? input.nextActionType : '',
        nextActionAt: status === 'active' ? [input.nextActionDate || '', input.nextActionTime || ''].filter(Boolean).join(' ') : '',
        nextActionOwnerUid: status === 'active' ? input.assignee.uid : ''
      }),
      updatedAt: serverTimestamp()
    }, { merge: true });
  });
  await appendExpertRelationshipEvent({
    personId: input.personId,
    type: status === 'active' ? 'nurture.reviewed' : 'nurture.closed',
    sourceType: 'person',
    sourceId: input.personId,
    idempotencyKey: `${input.personId}:nurture-review:${Date.now()}`,
    metadata: {
      learning: input.learning,
      communityActivity: input.communityActivity,
      youtubeActivity: input.youtubeActivity,
      candidate: input.candidate,
      contactPermission: input.contactPermission,
      nextActionDate: input.nextActionDate || ''
    }
  }).catch((error) => console.error('[G-KAIS NURTURE REVIEW EVENT]', error));
}
