import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveFirebaseTarget, type ClientFirebaseConfig } from './firebaseConfig';

const prod: ClientFirebaseConfig = {
  apiKey: 'synthetic-prod-api-key',
  authDomain: 'prod.firebaseapp.com',
  projectId: 'prod',
  storageBucket: 'prod.firebasestorage.app',
  messagingSenderId: '123',
  appId: 'synthetic-prod-app-id',
  firestoreDatabaseId: 'prod-named-firestore'
};
const qa = {
  VITE_GKAIS_FIREBASE_TARGET: 'qa',
  VITE_GKAIS_QA_API_KEY: 'synthetic-qa-api-key',
  VITE_GKAIS_QA_AUTH_DOMAIN: 'g-kais-qa.firebaseapp.com',
  VITE_GKAIS_QA_PROJECT_ID: 'g-kais-qa',
  VITE_GKAIS_QA_STORAGE_BUCKET: 'g-kais-qa.firebasestorage.app',
  VITE_GKAIS_QA_MESSAGING_SENDER_ID: '456',
  VITE_GKAIS_QA_APP_ID: 'synthetic-qa-app-id',
  VITE_GKAIS_QA_FIRESTORE_DATABASE_ID: '(default)'
};

test('production configuration remains unchanged unless QA selected', () => {
  const x = resolveFirebaseTarget(prod, {});
  assert.equal(x.target, 'production');
  assert.deepEqual(x.config, prod);
});

test('QA selects a distinct Firebase project and default Firestore database', () => {
  const x = resolveFirebaseTarget(prod, qa);
  assert.equal(x.target, 'qa');
  assert.equal(x.config.projectId, 'g-kais-qa');
  assert.equal(x.config.firestoreDatabaseId, '(default)');
});

test('QA rejects incomplete credentials instead of falling back to production', () => {
  assert.throws(() => resolveFirebaseTarget(prod, {
    VITE_GKAIS_FIREBASE_TARGET: 'qa',
    VITE_GKAIS_QA_PROJECT_ID: 'g-kais-qa'
  }), /FIREBASE_QA_CONFIG_INCOMPLETE/);
});

test('QA rejects an unexpected project or mismatched auth domain', () => {
  assert.throws(() => resolveFirebaseTarget(prod, { ...qa, VITE_GKAIS_QA_PROJECT_ID: 'prod' }), /FIREBASE_QA_PROJECT_MISMATCH/);
  assert.throws(() => resolveFirebaseTarget(prod, { ...qa, VITE_GKAIS_QA_AUTH_DOMAIN: 'prod.firebaseapp.com' }), /FIREBASE_QA_AUTH_DOMAIN_MISMATCH/);
});

test('QA rejects a non-default Firestore database and unknown environment', () => {
  assert.throws(() => resolveFirebaseTarget(prod, { ...qa, VITE_GKAIS_QA_FIRESTORE_DATABASE_ID: 'prod-named-firestore' }), /FIREBASE_QA_DATABASE_MISMATCH/);
  assert.throws(() => resolveFirebaseTarget(prod, { VITE_GKAIS_FIREBASE_TARGET: 'invalid' }), /FIREBASE_TARGET_INVALID/);
});
