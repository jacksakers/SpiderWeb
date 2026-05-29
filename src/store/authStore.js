import { create } from 'zustand';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  onAuthStateChanged,
  updateProfile as firebaseUpdateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { isFirebaseConfigured, auth, db, storage } from '../utils/firebase';

/**
 * authStore — owns auth state and the current user's Firestore profile.
 *
 * Call initAuth() once at app startup to begin listening for auth changes.
 */
export const useAuthStore = create((set, get) => ({
  // ─── State ────────────────────────────────────────────────────────────────
  user:        null,   // Firebase Auth user object (or null)
  userProfile: null,   // Firestore users/{uid} document
  loading:     true,
  authError:   null,

  // ─── Init (call once at startup) ──────────────────────────────────────────
  initAuth() {
    if (!isFirebaseConfigured() || !auth) {
      set({ loading: false });
      return;
    }
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        set({ user: firebaseUser, authError: null });
        await get()._loadOrCreateProfile(firebaseUser);
      } else {
        set({ user: null, userProfile: null, loading: false });
      }
    });
  },

  // ─── Internal: load or create Firestore profile ───────────────────────────
  async _loadOrCreateProfile(user) {
    if (!db) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        set({ userProfile: snap.data(), loading: false });
      } else {
        const displayName = user.displayName ?? (user.isAnonymous ? 'Anon' : 'New User');
        const profilePageId = `profile-${user.uid}`;
        const profile = {
          uid:           user.uid,
          displayName,
          photoURL:      user.photoURL ?? '',
          bio:           '',
          profilePageId,
          isAnonymous:   user.isAnonymous ?? false,
          createdAt:     serverTimestamp(),
        };
        await setDoc(userRef, profile);

        // Auto-create the user's personal profile canvas page
        const pageRef = doc(db, 'pages', profilePageId);
        const pageSnap = await getDoc(pageRef);
        if (!pageSnap.exists()) {
          await setDoc(pageRef, {
            ownerId:         user.uid,
            title:           `${displayName}'s Profile`,
            editors:         [],
            isPublic:        false,
            theme: {
              backgroundColor: '#0d0d0d',
              backgroundImage: '',
              width:           1200,
              height:          2000,
            },
            elements:  {},
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        set({ userProfile: profile, loading: false });
      }
    } catch (err) {
      console.error('_loadOrCreateProfile error', err);
      set({ loading: false });
    }
  },

  // ─── Auth actions ─────────────────────────────────────────────────────────
  async signInWithGoogle() {
    if (!auth) return;
    set({ authError: null });
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        set({ authError: err.message });
      }
    }
  },

  async signInAnon() {
    if (!auth) return;
    set({ authError: null });
    try {
      await signInAnonymously(auth);
    } catch (err) {
      set({ authError: err.message });
    }
  },

  async signOut() {
    if (!auth) return;
    await auth.signOut();
    set({ user: null, userProfile: null });
  },

  // ─── Profile updates ──────────────────────────────────────────────────────
  async updateProfile(patch) {
    const { user } = get();
    if (!user || !db) return;
    await setDoc(doc(db, 'users', user.uid), patch, { merge: true });
    set((state) => ({
      userProfile: { ...state.userProfile, ...patch },
    }));
    // Also sync displayName to Firebase Auth if updated
    if (patch.displayName && auth?.currentUser) {
      await firebaseUpdateProfile(auth.currentUser, { displayName: patch.displayName });
    }
  },

  async uploadAvatar(file) {
    const { user } = get();
    if (!user || !storage) return null;
    const storageRef = ref(storage, `users/${user.uid}/avatar`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    await get().updateProfile({ photoURL: url });
    return url;
  },
}));
