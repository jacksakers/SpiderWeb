import React, { useState } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { useAuthStore } from '../../store/authStore';
import LoginModal from '../auth/LoginModal';

/**
 * PageNotFoundPrompt — shown when a page ID doesn't exist in Firestore.
 *
 * If the user is signed in, they can claim the page and become its owner.
 * If not signed in, they're prompted to log in first.
 */
function PageNotFoundPrompt({ pageId }) {
  const { createPage } = useCanvasStore();
  const { user } = useAuthStore();

  const [title, setTitle]       = useState('');
  const [creating, setCreating] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    if (!user) { setShowLogin(true); return; }
    setCreating(true);
    await createPage(pageId, user.uid, title.trim() || `${pageId}`);
    setCreating(false);
  }

  return (
    <>
      <div className="flex-1 flex items-center justify-center bg-[#0d0d0d]">
        <div className="text-center max-w-md px-6">
          {/* 404-style art */}
          <div className="text-7xl mb-4 select-none">🕸️</div>
          <h2 className="text-white text-2xl font-bold mb-2">
            Nothing here… yet.
          </h2>
          <p className="text-white/50 text-sm mb-1">
            <span className="text-purple-400 font-mono">sw://{pageId}</span> doesn't exist.
          </p>
          <p className="text-white/30 text-xs mb-8">
            On SpiderWeb, the first person to arrive claims a page forever.
          </p>

          {user ? (
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`Give this page a title (optional)`}
                maxLength={128}
                className="bg-white/10 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-white/30 outline-none focus:ring-1 focus:ring-purple-500 text-center"
              />
              <button
                type="submit"
                disabled={creating}
                className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition-colors disabled:opacity-50"
              >
                {creating ? 'Creating…' : `🚀 Claim sw://${pageId}`}
              </button>
            </form>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-white/50 text-sm">Sign in to claim this page.</p>
              <button
                onClick={() => setShowLogin(true)}
                className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition-colors"
              >
                Sign In to Claim
              </button>
            </div>
          )}
        </div>
      </div>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  );
}

export default PageNotFoundPrompt;
