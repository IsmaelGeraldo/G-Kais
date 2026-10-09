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
}, import.meta.env);

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
