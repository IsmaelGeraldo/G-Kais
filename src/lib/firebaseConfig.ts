/**
 * Firebase client environment selector.
 *
 * Never infer QA from Vercel Preview: ordinary previews currently share the
 * live Firebase. QA must be explicitly selected and configured in full.
 */
export type ClientFirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  firestoreDatabaseId: string;
};

export type FirebaseTargetEnv = {
  VITE_GKAIS_FIREBASE_TARGET?: string;
  VITE_GKAIS_QA_API_KEY?: string;
  VITE_GKAIS_QA_AUTH_DOMAIN?: string;
  VITE_GKAIS_QA_PROJECT_ID?: string;
  VITE_GKAIS_QA_STORAGE_BUCKET?: string;
  VITE_GKAIS_QA_MESSAGING_SENDER_ID?: string;
  VITE_GKAIS_QA_APP_ID?: string;
  VITE_GKAIS_QA_FIRESTORE_DATABASE_ID?: string;
};

export function resolveFirebaseTarget(
  productionConfig: ClientFirebaseConfig,
  env: FirebaseTargetEnv
): { target: 'production' | 'qa'; config: ClientFirebaseConfig } {
  const target = (env.VITE_GKAIS_FIREBASE_TARGET || 'production').trim();
  if (target === 'production') return { target, config: productionConfig };
  if (target !== 'qa') throw new Error('FIREBASE_TARGET_INVALID');

  const required = {
    apiKey: env.VITE_GKAIS_QA_API_KEY,
    authDomain: env.VITE_GKAIS_QA_AUTH_DOMAIN,
    projectId: env.VITE_GKAIS_QA_PROJECT_ID,
    storageBucket: env.VITE_GKAIS_QA_STORAGE_BUCKET,
    messagingSenderId: env.VITE_GKAIS_QA_MESSAGING_SENDER_ID,
    appId: env.VITE_GKAIS_QA_APP_ID,
    firestoreDatabaseId: env.VITE_GKAIS_QA_FIRESTORE_DATABASE_ID
  };
  if (Object.values(required).some((value) => !value?.trim())) {
    throw new Error('FIREBASE_QA_CONFIG_INCOMPLETE');
  }

  const config = Object.fromEntries(
    Object.entries(required).map(([key, value]) => [key, value!.trim()])
  ) as ClientFirebaseConfig;
  if (config.projectId !== 'g-kais-qa' || config.projectId === productionConfig.projectId) {
    throw new Error('FIREBASE_QA_PROJECT_MISMATCH');
  }
  if (config.authDomain !== 'g-kais-qa.firebaseapp.com') {
    throw new Error('FIREBASE_QA_AUTH_DOMAIN_MISMATCH');
  }
  if (config.firestoreDatabaseId !== '(default)') {
    throw new Error('FIREBASE_QA_DATABASE_MISMATCH');
  }
  return { target: 'qa', config };
}
