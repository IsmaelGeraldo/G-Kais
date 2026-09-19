import { initializeApp as initAdminApp, getApps as getAdminApps, cert, App as AdminApp } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, Firestore as AdminFirestore } from 'firebase-admin/firestore';

export interface AuditSubmissionDoc {
  id: string;
  name: string;
  company: string;
  website?: string;
  email: string;
  contactChannel: string;
  inquiryNotes?: string;
  status: string;
  createdAt: string;
  notificationStatus: 'PENDING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';
  ipAddress?: string;
}

export interface ContactSubmissionDoc {
  id: string;
  name: string;
  company?: string;
  email: string;
  message: string;
  status: string;
  createdAt: string;
  notificationStatus: 'PENDING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';
  ipAddress?: string;
}

class FirestoreClient {
  private static instance: FirestoreClient | null = null;
  private adminApp: AdminApp | null = null;
  private adminDb: AdminFirestore | null = null;
  private isConfigLoaded = false;

  private constructor() {
    this.init();
  }

  public static getInstance(): FirestoreClient {
    if (!FirestoreClient.instance) {
      FirestoreClient.instance = new FirestoreClient();
    }
    return FirestoreClient.instance;
  }

  private init(): void {
    if (this.isConfigLoaded) return;

    const projectId = process.env.FIREBASE_PROJECT_ID;

    // 1. Initialize Firebase Admin SDK once without duplication
    const existingApps = getAdminApps();
    if (existingApps.length > 0) {
      this.adminApp = existingApps[0];
    } else {
      try {
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
          const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
          this.adminApp = initAdminApp({
            credential: cert(serviceAccount),
            ...(projectId ? { projectId } : {})
          });
        } else {
          // Initialize with Application Default Credentials
          this.adminApp = initAdminApp({
            ...(projectId ? { projectId } : {})
          });
        }
      } catch (e) {
        console.warn('[Firestore] Firebase Admin initialization warning:', e instanceof Error ? e.message : String(e));
      }
    }

    if (this.adminApp) {
      try {
        const dbId = process.env.FIRESTORE_DATABASE_ID;
        this.adminDb = dbId ? getAdminFirestore(this.adminApp, dbId) : getAdminFirestore(this.adminApp);
        this.adminDb.settings({ ignoreUndefinedProperties: true });
      } catch {
        this.adminDb = null;
      }
    }

    this.isConfigLoaded = true;
  }

  public getAdminFirestore(): AdminFirestore | null {
    return this.adminDb;
  }

  /**
   * Persist audit submission to Firestore collection: audit_submissions
   */
  public async saveAudit(record: AuditSubmissionDoc): Promise<void> {
    if (!this.adminDb) throw new Error('Firestore Admin is not initialized.');
    const cleanRecord = Object.fromEntries(Object.entries(record).filter(([_, v]) => v !== undefined)) as AuditSubmissionDoc;
    await this.adminDb.collection('audit_submissions').doc(record.id).set(cleanRecord);
  }

  /**
   * Persist contact submission to Firestore collection: contact_submissions
   */
  public async saveContact(record: ContactSubmissionDoc): Promise<void> {
    if (!this.adminDb) throw new Error('Firestore Admin is not initialized.');
    const cleanRecord = Object.fromEntries(Object.entries(record).filter(([_, v]) => v !== undefined)) as ContactSubmissionDoc;
    await this.adminDb.collection('contact_submissions').doc(record.id).set(cleanRecord);
  }

  /**
   * Fetch recent audit submissions from Firestore
   */
  public async getRecentAudits(limitCount = 10): Promise<AuditSubmissionDoc[]> {
    try {
      if (!this.adminDb) return [];
      const snapshot = await this.adminDb.collection('audit_submissions').orderBy('createdAt', 'desc').limit(limitCount).get();
      return snapshot.docs.map(d => d.data() as AuditSubmissionDoc);
    } catch { return []; }
  }

  /**
   * Fetch recent contact submissions from Firestore
   */
  public async getRecentContacts(limitCount = 10): Promise<ContactSubmissionDoc[]> {
    try {
      if (!this.adminDb) return [];
      const snapshot = await this.adminDb.collection('contact_submissions').orderBy('createdAt', 'desc').limit(limitCount).get();
      return snapshot.docs.map(d => d.data() as ContactSubmissionDoc);
    } catch { return []; }
  }
}

export const firestoreClient = FirestoreClient.getInstance();
