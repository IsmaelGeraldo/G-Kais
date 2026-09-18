import crypto from 'crypto';
import { firestoreClient, ContactSubmissionDoc } from '../db/firestoreClient';

export interface CreateContactInput {
  name: string;
  company?: string;
  email: string;
  message: string;
  ipAddress?: string;
}

export class ContactRepository {
  /**
   * Generates a unique, server-authoritative contact tracking ID.
   */
  public generateId(): string {
    const timestampPart = Date.now().toString(36).toUpperCase();
    const entropyPart = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
    return `GK-CNT-${timestampPart}-${entropyPart}`;
  }

  /**
   * Persists a new inquiry to Firestore collection 'contact_submissions'.
   */
  public async create(input: CreateContactInput): Promise<ContactSubmissionDoc> {
    const record: ContactSubmissionDoc = {
      id: this.generateId(),
      name: input.name.trim(),
      company: input.company?.trim() ? input.company.trim() : undefined,
      email: input.email.trim().toLowerCase(),
      message: input.message.trim(),
      status: 'NEW',
      createdAt: new Date().toISOString(),
      notificationStatus: 'PENDING',
      ipAddress: input.ipAddress
    };

    await firestoreClient.saveContact(record);
    return record;
  }

  /**
   * Retrieves recent contact submissions from Firestore.
   */
  public async getRecent(limitCount = 10): Promise<ContactSubmissionDoc[]> {
    return await firestoreClient.getRecentContacts(limitCount);
  }

  /**
   * Updates notification dispatch status for an existing contact record in Firestore.
   */
  public async updateNotificationStatus(
    record: ContactSubmissionDoc,
    status: 'SUCCESS' | 'FAILED' | 'SKIPPED'
  ): Promise<ContactSubmissionDoc> {
    record.notificationStatus = status;
    await firestoreClient.saveContact(record);
    return record;
  }
}

export const contactRepository = new ContactRepository();
export type { ContactSubmissionDoc as ContactRecord };
