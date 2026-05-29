/**
 * Firebase configuration placeholder.
 *
 * ─── PHASE 2 SETUP ─────────────────────────────────────────────────────────
 * 1. Create a Firebase project at https://console.firebase.google.com
 * 2. Enable Firestore, Firebase Storage, and Authentication.
 * 3. Copy your project's web config object and replace the placeholder
 *    values below, OR (recommended) create a .env file at the project root:
 *
 *       VITE_FIREBASE_API_KEY=...
 *       VITE_FIREBASE_AUTH_DOMAIN=...
 *       VITE_FIREBASE_PROJECT_ID=...
 *       VITE_FIREBASE_STORAGE_BUCKET=...
 *       VITE_FIREBASE_MESSAGING_SENDER_ID=...
 *       VITE_FIREBASE_APP_ID=...
 *
 *    Vite exposes these to the client via import.meta.env.*
 * ──────────────────────────────────────────────────────────────────────────
 */

export const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            ?? '__REPLACE_ME__',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        ?? '__REPLACE_ME__',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         ?? '__REPLACE_ME__',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     ?? '__REPLACE_ME__',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '__REPLACE_ME__',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             ?? '__REPLACE_ME__',
};

/**
 * Returns true when Firebase is fully configured (Phase 2 ready).
 * Components can check this before attempting any Firebase operation.
 */
export function isFirebaseConfigured() {
  return !Object.values(firebaseConfig).some((v) => v === '__REPLACE_ME__');
}

// ─── Lazy-initialised Firebase singletons ────────────────────────────────────
// Imported and called only when isFirebaseConfigured() is true.
// This tree-shakes Firebase out of the Phase 1 bundle entirely.

let _app = null;
let _db  = null;
let _storage = null;
let _auth    = null;

export async function getFirebaseApp() {
  if (!isFirebaseConfigured()) throw new Error('Firebase is not configured yet.');
  if (_app) return _app;
  const { initializeApp } = await import('firebase/app');
  _app = initializeApp(firebaseConfig);
  return _app;
}

export async function getFirestore() {
  const app = await getFirebaseApp();
  if (_db) return _db;
  const { getFirestore: _getFirestore } = await import('firebase/firestore');
  _db = _getFirestore(app);
  return _db;
}

export async function getStorage() {
  const app = await getFirebaseApp();
  if (_storage) return _storage;
  const { getStorage: _getStorage } = await import('firebase/storage');
  _storage = _getStorage(app);
  return _storage;
}

export async function getAuth() {
  const app = await getFirebaseApp();
  if (_auth) return _auth;
  const { getAuth: _getAuth } = await import('firebase/auth');
  _auth = _getAuth(app);
  return _auth;
}
