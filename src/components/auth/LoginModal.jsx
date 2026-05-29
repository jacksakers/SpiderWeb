import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { isFirebaseConfigured } from '../../utils/firebase';

/**
 * LoginModal — sign-in overlay shown when Firebase is configured but user is not authenticated.
 * Supports Google Sign-In and anonymous ("guest") mode.
 */
function LoginModal({ onClose }) {
  const { signInWithGoogle, signInAnon, authError, loading } = useAuthStore();

  if (!isFirebaseConfigured()) return null;

  async function handleGoogle() {
    await signInWithGoogle();
    onClose?.();
  }

  async function handleAnon() {
    await signInAnon();
    onClose?.();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-8 w-full max-w-sm flex flex-col gap-6 shadow-2xl">
        {/* Logo / title */}
        <div className="text-center">
          <p className="text-4xl mb-2">🌐</p>
          <h1 className="text-2xl font-bold text-white">SpiderWeb</h1>
          <p className="text-white/50 text-sm mt-1">Sign in to create and save your pages</p>
        </div>

        {/* Error */}
        {authError && (
          <p className="text-red-400 text-sm text-center bg-red-900/20 rounded px-3 py-2">
            {authError}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-white text-gray-900 font-medium text-sm hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <button
            onClick={handleAnon}
            disabled={loading}
            className="flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-white/10 text-white font-medium text-sm hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            👤 Continue as Guest
          </button>
        </div>

        <p className="text-white/30 text-xs text-center">
          Guest accounts are not linked to your Google profile. You can upgrade later.
        </p>

        {onClose && (
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white text-xs text-center transition-colors"
          >
            Dismiss — browse without signing in
          </button>
        )}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

export default LoginModal;
