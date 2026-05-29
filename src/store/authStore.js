import { create } from 'zustand';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  onAuthStateChanged,
  sendPasswordResetEmail,
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
  async signIn(email, password) {
    if (!auth) return;
    set({ authError: null });
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      set({ authError: _friendlyError(err.code) });
    }
  },

  async signUp(email, password, displayName) {
    if (!auth) return;
    set({ authError: null });
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) {
        await firebaseUpdateProfile(cred.user, { displayName });
      }
    } catch (err) {
      set({ authError: _friendlyError(err.code) });
    }
  },

  async resetPassword(email) {
    if (!auth) return;
    set({ authError: null });
    try {
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (err) {
      set({ authError: _friendlyError(err.code) });
      return false;
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

  /**
   * Update the profile page slug.  Validates the new slug, then:
   *  1. Checks the new slug isn't already taken in Firestore
   *  2. Copies the existing profile page document to the new ID
   *  3. Deletes the old profile page
   *  4. Updates users/{uid}.profilePageId
   *
   * Returns { ok: true } on success or { ok: false, error: string } on failure.
   */
  async updateProfilePageId(newSlug) {
    const { user, userProfile } = get();
    if (!user || !db) return { ok: false, error: 'Not signed in.' };

    const slug = newSlug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    if (!slug) return { ok: false, error: 'Slug cannot be empty.' };
    if (slug.length < 3 || slug.length > 48) return { ok: false, error: 'Slug must be 3–48 characters.' };

    // Check availability
    const { getDoc: _getDoc, doc: _doc, setDoc: _setDoc, deleteDoc: _deleteDoc } = await import('firebase/firestore');
    const newRef = _doc(db, 'pages', slug);
    const snap = await _getDoc(newRef);
    if (snap.exists() && snap.data()?.ownerId !== user.uid) {
      return { ok: false, error: 'That URL is already taken.' };
    }

    const oldSlug = userProfile?.profilePageId;

    // Copy old page to new slug (if old one exists and differs)
    if (oldSlug && oldSlug !== slug) {
      const oldSnap = await _getDoc(_doc(db, 'pages', oldSlug));
      const data = oldSnap.exists() ? { ...oldSnap.data(), pageId: slug } : { pageId: slug, ownerId: user.uid, title: `${userProfile?.displayName ?? 'My'}'s Space`, elements: {}, editors: [], isPublic: true, theme: {} };
      await _setDoc(newRef, data);
      await _deleteDoc(_doc(db, 'pages', oldSlug));
    } else if (!snap.exists()) {
      // New slug doesn't exist yet — create minimal page
      await _setDoc(newRef, { pageId: slug, ownerId: user.uid, title: `${userProfile?.displayName ?? 'My'}'s Space`, elements: {}, editors: [], isPublic: true, theme: {} });
    }

    await get().updateProfile({ profilePageId: slug });
    return { ok: true };
  },
}));

function _friendlyError(code) {
  const map = {
    'auth/invalid-credential':      'Invalid email or password.',
    'auth/user-not-found':          'No account found with that email.',
    'auth/wrong-password':          'Incorrect password.',
    'auth/email-already-in-use':    'An account with this email already exists.',
    'auth/weak-password':           'Password must be at least 6 characters.',
    'auth/invalid-email':           'Please enter a valid email address.',
    'auth/too-many-requests':       'Too many attempts. Please try again later.',
  };
  return map[code] ?? 'Something went wrong. Please try again.';
}
