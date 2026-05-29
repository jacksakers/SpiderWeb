/**
 * Firebase initialisation.
 *
 * ─── SETUP ────────────────────────────────────────────────────────────────────
 * Copy .env.example → .env and fill in your project credentials.
 * Vite exposes VITE_* vars via import.meta.env.
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * When Firebase is NOT configured (missing .env), all exports are null and
 * isFirebaseConfigured() returns false. The app runs in Phase 1 offline mode.
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore }  from 'firebase/firestore';
import { getStorage }    from 'firebase/storage';
import { getAuth }       from 'firebase/auth';

const _config = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

export function isFirebaseConfigured() {
  return Object.values(_config).every((v) => Boolean(v));
}

let app      = null;
export let db      = null;
export let storage = null;
export let auth    = null;

if (isFirebaseConfigured()) {
  app     = getApps().length ? getApp() : initializeApp(_config);
  db      = getFirestore(app);
  storage = getStorage(app);
  auth    = getAuth(app);
}
