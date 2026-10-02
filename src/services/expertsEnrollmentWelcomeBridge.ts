import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, serverTimestamp, updateDoc, type Unsubscribe } from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../lib/firebase';
import { appendExpertRelationshipEvent, resolveActiveExpertWorkspaceId } from './expertsWorkspaceCore';

let stopEnrollmentSubscription: Unsubscribe | null = null;
let activeKey = '';
const processing = new Set<string>();

function asText(value: unknown): string { return typeof value === 'string' ? value : ''; }

async function sendWelcome(user: User, workspaceId: string, enrollmentId: string, data: Record<string, unknown>) {
  if (processing.has(enrollmentId)) return;
  processing.add(enrollmentId);
  try {
    const personId = asText(data.personId);
    const formationId = asText(data.formationId);
    const cohortId = asText(data.cohortId);
    if (!personId || !formationId || !cohortId || data.status !== 'active') return;

    const [personSnapshot, formationSnapshot, cohortSnapshot] = await Promise.all([
      getDoc(doc(firestoreDb, 'expert_workspaces', workspaceId, 'people', personId)),
      getDoc(doc(firestoreDb, 'expert_workspaces', workspaceId, 'formations', formationId)),
      getDoc(doc(firestoreDb, 'expert_workspaces', workspaceId, 'cohorts', cohortId))
    ]);
    if (!personSnapshot.exists() || !formationSnapshot.exists() || !cohortSnapshot.exists()) return;

    const person = personSnapshot.data() as Record<string, unknown>;
    const formation = formationSnapshot.data() as Record<string, unknown>;
    const cohort = cohortSnapshot.data() as Record<string, unknown>;
    const email = asText(person.email).trim();
    const personRef = personSnapshot.ref;
    if (!email) {
      await updateDoc(personRef, {
        'outcomeMemory.enrollmentWelcomeStatus': 'missing-email',
        'outcomeMemory.enrollmentWelcomeEnrollmentId': enrollmentId,
        'outcomeMemory.enrollmentWelcomeAt': serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return;
    }

    const token = await user.getIdToken();
    const response = await fetch('/api/workspace/enrollment-welcome', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientEmail: email,
        personName: asText(person.name) || email.split('@')[0],
        formationTitle: asText(formation.title) || 'Formación',
        cohortTitle: asText(cohort.title) || 'Cohorte',
        startsAt: asText(cohort.startsAt)
      })
    });
    const result = await response.json().catch(() => ({})) as Record<string, unknown>;
    const status = response.ok ? (asText(result.status).toLowerCase() || 'sent') : 'failed';
    await updateDoc(personRef, {
      'outcomeMemory.enrollmentWelcomeStatus': status,
      'outcomeMemory.enrollmentWelcomeEnrollmentId': enrollmentId,
      'outcomeMemory.enrollmentWelcomeMessageId': asText(result.messageId),
      'outcomeMemory.enrollmentWelcomeAt': serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    await appendExpertRelationshipEvent({
      personId,
      type: response.ok ? 'formation.welcome_email_processed' : 'formation.welcome_email_failed',
      sourceType: 'enrollment',
      sourceId: enrollmentId,
      idempotencyKey: `${enrollmentId}:welcome:${status}`,
      metadata: { formationId, cohortId, status }
    }).catch(() => {});
  } catch (error) {
    console.error('[G-KAIS ENROLLMENT WELCOME BRIDGE]', error);
  } finally {
    processing.delete(enrollmentId);
  }
}

async function start(user: User) {
  const workspaceId = await resolveActiveExpertWorkspaceId(user);
  if (!workspaceId) return;
  const key = `${user.uid}:${workspaceId}`;
  if (key === activeKey && stopEnrollmentSubscription) return;
  stopEnrollmentSubscription?.();
  activeKey = key;
  let initial = true;
  const known = new Set<string>();
  stopEnrollmentSubscription = onSnapshot(collection(firestoreDb, 'expert_workspaces', workspaceId, 'enrollments'), (snapshot) => {
    if (initial) {
      snapshot.docs.forEach((item) => known.add(item.id));
      initial = false;
      return;
    }
    snapshot.docChanges().forEach((change) => {
      if (change.type !== 'added' || known.has(change.doc.id)) return;
      known.add(change.doc.id);
      void sendWelcome(user, workspaceId, change.doc.id, change.doc.data() as Record<string, unknown>);
    });
  }, (error) => console.error('[G-KAIS ENROLLMENT WELCOME SUBSCRIPTION]', error));
}

if (typeof window !== 'undefined') {
  onAuthStateChanged(firebaseAuth, (user) => {
    stopEnrollmentSubscription?.();
    stopEnrollmentSubscription = null;
    activeKey = '';
    processing.clear();
    if (user) void start(user).catch((error) => console.error('[G-KAIS ENROLLMENT WELCOME START]', error));
  });
}
