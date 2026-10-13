import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseAppletConfig from '../../firebase-applet-config.json';
import { resolveFirebaseTarget } from './firebaseConfig';

const selected = resolveFirebaseTarget({
  apiKey: firebaseAppletConfig.apiKey,
  authDomain: firebaseAppletConfig.authDomain,
  projectId: firebaseAppletConfig.projectId,
  storageBucket: firebaseAppletConfig.storageBucket,
  messagingSenderId: firebaseAppletConfig.messagingSenderId,
  appId: firebaseAppletConfig.appId,
  firestoreDatabaseId: firebaseAppletConfig.firestoreDatabaseId
}, {
  VITE_GKAIS_FIREBASE_TARGET: import.meta.env.VITE_GKAIS_FIREBASE_TARGET,
  VITE_GKAIS_QA_API_KEY: import.meta.env.VITE_GKAIS_QA_API_KEY,
  VITE_GKAIS_QA_AUTH_DOMAIN: import.meta.env.VITE_GKAIS_QA_AUTH_DOMAIN,
  VITE_GKAIS_QA_PROJECT_ID: import.meta.env.VITE_GKAIS_QA_PROJECT_ID,
  VITE_GKAIS_QA_STORAGE_BUCKET: import.meta.env.VITE_GKAIS_QA_STORAGE_BUCKET,
  VITE_GKAIS_QA_MESSAGING_SENDER_ID: import.meta.env.VITE_GKAIS_QA_MESSAGING_SENDER_ID,
  VITE_GKAIS_QA_APP_ID: import.meta.env.VITE_GKAIS_QA_APP_ID,
  VITE_GKAIS_QA_FIRESTORE_DATABASE_ID: import.meta.env.VITE_GKAIS_QA_FIRESTORE_DATABASE_ID
});

export const firebaseTarget = selected.target;
export const firebaseApp = getApps().length > 0
  ? getApp()
  : initializeApp(selected.config);

// A preexisting Firebase singleton may not silently cross environments.
if (firebaseApp.options.projectId !== selected.config.projectId) {
  throw new Error('FIREBASE_APP_PROJECT_MISMATCH');
}

export const firebaseAuth = getAuth(firebaseApp);

export const firestoreDb = selected.config.firestoreDatabaseId === '(default)'
  ? getFirestore(firebaseApp)
  : getFirestore(firebaseApp, selected.config.firestoreDatabaseId);
