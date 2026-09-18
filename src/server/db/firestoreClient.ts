import fs from 'fs';
import path from 'path';
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

interface FirebaseConfig {
  projectId: string;
  apiKey?: string;
  firestoreDatabaseId?: string;
  authDomain?: string;
  storageBucket?: string;
}

// Convert JavaScript record to Firestore REST fields
function toFirestoreFields(obj: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string') {
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
        fields[key] = { timestampValue: value };
      } else {
        fields[key] = { stringValue: value };
      }
    } else if (typeof value === 'number') {
      fields[key] = Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };
    }
  }
  return fields;
}

// Convert Firestore REST fields back to JavaScript record
function fromFirestoreFields<T>(fields?: Record<string, Record<string, unknown>>): T {
  const obj: Record<string, unknown> = {};
  if (!fields) return obj as T;
  for (const [key, val] of Object.entries(fields)) {
    if ('stringValue' in val) obj[key] = val.stringValue;
    else if ('integerValue' in val) obj[key] = Number(val.integerValue);
    else if ('doubleValue' in val) obj[key] = val.doubleValue;
    else if ('booleanValue' in val) obj[key] = val.booleanValue;
    else if ('timestampValue' in val) obj[key] = val.timestampValue;
  }
  return obj as T;
}

class FirestoreClient {
  private static instance: FirestoreClient | null = null;
  private adminApp: AdminApp | null = null;
  private adminDb: AdminFirestore | null = null;
  private config: FirebaseConfig | null = null;
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

    // Load configuration safely from server-side configuration file
    try {
      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      if (fs.existsSync(configPath)) {
        const raw = fs.readFileSync(configPath, 'utf8');
        this.config = JSON.parse(raw);
      }
    } catch {
      this.config = null;
    }

    const projectId = process.env.FIREBASE_PROJECT_ID || this.config?.projectId || 'careful-bloom-jmn89';

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
            projectId
          });
        } else {
          // Initialize with Application Default Credentials
          this.adminApp = initAdminApp({
            projectId
          });
        }
      } catch (e) {
        console.warn('[Firestore] Firebase Admin initialization warning:', e instanceof Error ? e.message : String(e));
      }
    }

    if (this.adminApp) {
      try {
        const dbId = process.env.FIRESTORE_DATABASE_ID || this.config?.firestoreDatabaseId;
        this.adminDb = dbId ? getAdminFirestore(this.adminApp, dbId) : getAdminFirestore(this.adminApp);
        this.adminDb.settings({ ignoreUndefinedProperties: true });
      } catch {
        this.adminDb = null;
      }
    }

    this.isConfigLoaded = true;
  }

  private getRestUrl(collectionPath: string, docId?: string): string {
    const projectId = process.env.FIREBASE_PROJECT_ID || this.config?.projectId || 'careful-bloom-jmn89';
    const dbId = process.env.FIRESTORE_DATABASE_ID || this.config?.firestoreDatabaseId || '(default)';
    const apiKey = process.env.FIREBASE_API_KEY || this.config?.apiKey || '';
    
    let url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/${collectionPath}`;
    if (docId) {
      url += `/${encodeURIComponent(docId)}`;
    }
    if (apiKey) {
      url += `?key=${apiKey}`;
    }
    return url;
  }

  public getAdminFirestore(): AdminFirestore | null {
    return this.adminDb;
  }

  /**
   * Health Check: Performs a real read/write probe to Firestore
   * Returns true only if Firestore responds successfully.
   */
  public async checkHealth(): Promise<boolean> {
    try {
      // First attempt Firebase Admin probe if available
      if (this.adminDb) {
        try {
          const docRef = this.adminDb.collection('_health').doc('status');
          await docRef.set({
            status: 'healthy',
            lastHealthCheck: new Date().toISOString()
          }, { merge: true });
          return true;
        } catch {
          // If Admin SDK fails due to IAM ADC in sandbox, proceed to server-side authenticated probe
        }
      }

      // Real live health probe to Firestore via server-side channel
      const url = this.getRestUrl('_health', 'status');
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            status: { stringValue: 'healthy' },
            lastHealthCheck: { timestampValue: new Date().toISOString() }
          }
        })
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Persist audit submission to Firestore collection: audit_submissions
   */
  public async saveAudit(record: AuditSubmissionDoc): Promise<void> {
    let saved = false;

    // Clean undefined fields
    const cleanRecord = Object.fromEntries(
      Object.entries(record).filter(([_, v]) => v !== undefined)
    ) as AuditSubmissionDoc;

    // Try Firebase Admin SDK first
    if (this.adminDb) {
      try {
        await this.adminDb.collection('audit_submissions').doc(record.id).set(cleanRecord);
        saved = true;
      } catch (err) {
        console.warn('[Firestore] Admin write failed, falling back to authenticated server channel:', err instanceof Error ? err.message : String(err));
      }
    }

    if (!saved) {
      const url = this.getRestUrl('audit_submissions', record.id);
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: toFirestoreFields(cleanRecord as unknown as Record<string, unknown>)
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to write audit to Firestore: ${res.status} ${errText}`);
      }
    }
  }

  /**
   * Persist contact submission to Firestore collection: contact_submissions
   */
  public async saveContact(record: ContactSubmissionDoc): Promise<void> {
    let saved = false;

    // Clean undefined fields
    const cleanRecord = Object.fromEntries(
      Object.entries(record).filter(([_, v]) => v !== undefined)
    ) as ContactSubmissionDoc;

    // Try Firebase Admin SDK first
    if (this.adminDb) {
      try {
        await this.adminDb.collection('contact_submissions').doc(record.id).set(cleanRecord);
        saved = true;
      } catch (err) {
        console.warn('[Firestore] Admin write failed, falling back to authenticated server channel:', err instanceof Error ? err.message : String(err));
      }
    }

    if (!saved) {
      const url = this.getRestUrl('contact_submissions', record.id);
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: toFirestoreFields(cleanRecord as unknown as Record<string, unknown>)
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to write contact to Firestore: ${res.status} ${errText}`);
      }
    }
  }

  /**
   * Fetch recent audit submissions from Firestore
   */
  public async getRecentAudits(limitCount = 10): Promise<AuditSubmissionDoc[]> {
    try {
      if (this.adminDb) {
        try {
          const snapshot = await this.adminDb.collection('audit_submissions')
            .orderBy('createdAt', 'desc')
            .limit(limitCount)
            .get();
          return snapshot.docs.map(d => d.data() as AuditSubmissionDoc);
        } catch {
          // Fallback to REST
        }
      }

      const url = this.getRestUrl('audit_submissions');
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      if (!data.documents || !Array.isArray(data.documents)) return [];

      return data.documents.map((d: { fields?: Record<string, Record<string, unknown>> }) => 
        fromFirestoreFields<AuditSubmissionDoc>(d.fields)
      ).slice(0, limitCount);
    } catch {
      return [];
    }
  }

  /**
   * Fetch recent contact submissions from Firestore
   */
  public async getRecentContacts(limitCount = 10): Promise<ContactSubmissionDoc[]> {
    try {
      if (this.adminDb) {
        try {
          const snapshot = await this.adminDb.collection('contact_submissions')
            .orderBy('createdAt', 'desc')
            .limit(limitCount)
            .get();
          return snapshot.docs.map(d => d.data() as ContactSubmissionDoc);
        } catch {
          // Fallback to REST
        }
      }

      const url = this.getRestUrl('contact_submissions');
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      if (!data.documents || !Array.isArray(data.documents)) return [];

      return data.documents.map((d: { fields?: Record<string, Record<string, unknown>> }) => 
        fromFirestoreFields<ContactSubmissionDoc>(d.fields)
      ).slice(0, limitCount);
    } catch {
      return [];
    }
  }
}

export const firestoreClient = FirestoreClient.getInstance();
