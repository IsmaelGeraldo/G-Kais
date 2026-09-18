import crypto from 'crypto';
import { firestoreClient, AuditSubmissionDoc } from '../db/firestoreClient';

export interface CreateAuditInput {
  name: string;
  company: string;
  website?: string;
  email: string;
  contactChannel: string;
  inquiryNotes?: string;
  ipAddress?: string;
}

export class AuditRepository {
  /**
   * Generates a unique, server-authoritative audit tracking ID.
   */
  public generateId(): string {
    const timestampPart = Date.now().toString(36).toUpperCase();
    const entropyPart = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
    return `GK-AUD-${timestampPart}-${entropyPart}`;
  }

  /**
   * Persists a new commercial audit request to Firestore collection 'audit_submissions'.
   */
  public async create(input: CreateAuditInput): Promise<AuditSubmissionDoc> {
    const record: AuditSubmissionDoc = {
      id: this.generateId(),
      name: input.name.trim(),
      company: input.company.trim(),
      website: input.website?.trim() ? input.website.trim() : undefined,
      email: input.email.trim().toLowerCase(),
      contactChannel: input.contactChannel.trim(),
      inquiryNotes: input.inquiryNotes?.trim() ? input.inquiryNotes.trim() : undefined,
      status: 'PENDING_REVIEW',
      createdAt: new Date().toISOString(),
      notificationStatus: 'PENDING',
      ipAddress: input.ipAddress
    };

    await firestoreClient.saveAudit(record);
    return record;
  }

  /**
   * Retrieves recent audit records from Firestore.
   */
  public async getRecent(limitCount = 10): Promise<AuditSubmissionDoc[]> {
    return await firestoreClient.getRecentAudits(limitCount);
  }

  /**
   * Updates notification dispatch status for an existing audit in Firestore.
   */
  public async updateNotificationStatus(
    record: AuditSubmissionDoc,
    status: 'SUCCESS' | 'FAILED' | 'SKIPPED'
  ): Promise<AuditSubmissionDoc> {
    record.notificationStatus = status;
    await firestoreClient.saveAudit(record);
    return record;
  }
}

export const auditRepository = new AuditRepository();
export type { AuditSubmissionDoc as AuditRecord };
