import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { isFirebaseConfigured } from '../../utils/firebase';

/**
 * LoginModal — sign-in overlay with three modes: Sign In, Sign Up, Forgot Password.
 */
function LoginModal({ onClose }) {
  const { signIn, signUp, signInAnon, resetPassword, authError, loading } = useAuthStore();

  const [mode, setMode]         = useState('signin'); // 'signin' | 'signup' | 'reset'
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]         = useState('');
  const [resetSent, setResetSent] = useState(false);

  if (!isFirebaseConfigured()) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (mode === 'signin') {
      await signIn(email, password);
    } else if (mode === 'signup') {
      await signUp(email, password, name.trim());
    } else if (mode === 'reset') {
      const ok = await resetPassword(email);
      if (ok) setResetSent(true);
    }
    // onAuthStateChanged will close the modal by updating user state
  }

  async function handleAnon() {
    await signInAnon();
    onClose?.();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-8 w-full max-w-sm flex flex-col gap-5 shadow-2xl">
        {/* Logo */}
        <div className="text-center">
          <p className="text-4xl mb-2">🌐</p>
          <h1 className="text-2xl font-bold text-white">SpiderWeb</h1>
          <p className="text-white/50 text-sm mt-1">
            {mode === 'signin'  && 'Sign in to your account'}
            {mode === 'signup'  && 'Create an account'}
            {mode === 'reset'   && 'Reset your password'}
          </p>
        </div>

        {/* Error */}
        {authError && (
          <p className="text-red-400 text-sm text-center bg-red-900/20 rounded px-3 py-2">
            {authError}
          </p>
        )}

        {resetSent ? (
          <div className="text-center text-green-400 text-sm py-4">
            ✓ Password reset email sent! Check your inbox.
            <button onClick={() => { setMode('signin'); setResetSent(false); }} className="block mx-auto mt-3 text-white/50 hover:text-white text-xs underline">
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {mode === 'signup' && (
              <input
                type="text"
                placeholder="Display name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={64}
                className="bg-white/10 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-white/30 outline-none focus:ring-1 focus:ring-purple-500"
              />
            )}
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-white/10 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-white/30 outline-none focus:ring-1 focus:ring-purple-500"
            />
            {mode !== 'reset' && (
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-white/10 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-white/30 outline-none focus:ring-1 focus:ring-purple-500"
              />
            )}

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Please wait…' : mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Email'}
            </button>
          </form>
        )}

        {/* Mode switchers */}
        <div className="flex flex-col items-center gap-1 text-xs">
          {mode === 'signin' && (
            <>
              <button onClick={() => setMode('signup')} className="text-purple-400 hover:text-purple-300">
                Don't have an account? Sign up
              </button>
              <button onClick={() => setMode('reset')} className="text-white/30 hover:text-white/60">
                Forgot password?
              </button>
            </>
          )}
          {mode === 'signup' && (
            <button onClick={() => setMode('signin')} className="text-purple-400 hover:text-purple-300">
              Already have an account? Sign in
            </button>
          )}
          {mode === 'reset' && !resetSent && (
            <button onClick={() => setMode('signin')} className="text-white/40 hover:text-white">
              Back to Sign In
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-white/30 text-xs">or</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <button
          onClick={handleAnon}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/10 text-white/70 font-medium text-sm hover:bg-white/20 transition-colors disabled:opacity-50"
        >
          👤 Continue as Guest
        </button>

        <p className="text-white/20 text-xs text-center">
          Guest accounts can't be recovered. Link an email in settings later.
        </p>

        {onClose && (
          <button onClick={onClose} className="text-white/20 hover:text-white/50 text-xs text-center transition-colors">
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}

export default LoginModal;
