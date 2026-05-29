import React, { useState } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { useAuthStore } from '../../store/authStore';
import { doc, getDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../utils/firebase';

/**
 * CollaboratorsModal — manage who can edit the current page.
 *
 * Owner can:
 *  - Toggle public editing (anyone with the link can edit)
 *  - Add collaborators by their UID
 *  - Remove collaborators
 *  - Copy the shareable URL
 */
function CollaboratorsModal({ onClose }) {
  const { page, updatePageMeta } = useCanvasStore();
  const { user } = useAuthStore();

  const [uidInput, setUidInput]   = useState('');
  const [adding, setAdding]       = useState(false);
  const [error, setError]         = useState('');
  const [copied, setCopied]       = useState(false);

  const isOwner = user?.uid === page.ownerId;
  const editors = page.editors ?? [];
  const shareUrl = `${window.location.origin}/#${page.pageId}`;

  async function handleAddEditor(e) {
    e.preventDefault();
    const uid = uidInput.trim();
    if (!uid || editors.includes(uid)) { setError('Already added or empty.'); return; }
    if (uid === page.ownerId) { setError('That is already the owner.'); return; }

    // Validate the UID exists as a user doc
    if (isFirebaseConfigured() && db) {
      setAdding(true);
      const snap = await getDoc(doc(db, 'users', uid));
      if (!snap.exists()) {
        setAdding(false);
        setError('User not found. Make sure you have the exact UID.');
        return;
      }
      setAdding(false);
    }

    await updatePageMeta({ editors: [...editors, uid] });
    setUidInput('');
    setError('');
  }

  async function handleRemoveEditor(uid) {
    await updatePageMeta({ editors: editors.filter((e) => e !== uid) });
  }

  async function handleTogglePublic() {
    await updatePageMeta({ isPublic: !page.isPublic });
  }

  function handleCopy() {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold">Share & Collaborate</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl">×</button>
        </div>

        {/* Shareable link */}
        <div className="mb-5">
          <p className="text-white/50 text-xs uppercase tracking-widest mb-2">Shareable Link</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={shareUrl}
              className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-white/70 text-xs font-mono outline-none select-all"
            />
            <button
              onClick={handleCopy}
              className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs transition-colors shrink-0"
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Public toggle */}
        {isOwner && (
          <div className="flex items-center justify-between mb-5 p-3 bg-white/5 rounded-lg">
            <div>
              <p className="text-white text-sm font-medium">Public Editing</p>
              <p className="text-white/40 text-xs">Anyone with the link can edit this page</p>
            </div>
            <button
              onClick={handleTogglePublic}
              className={`relative w-11 h-6 rounded-full transition-colors ${page.isPublic ? 'bg-purple-600' : 'bg-white/20'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${page.isPublic ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        )}

        {/* Editors list */}
        <div className="mb-4">
          <p className="text-white/50 text-xs uppercase tracking-widest mb-2">
            Editors ({editors.length})
          </p>
          {editors.length === 0 ? (
            <p className="text-white/30 text-sm">No collaborators yet.</p>
          ) : (
            <ul className="flex flex-col gap-1 max-h-36 overflow-y-auto">
              {editors.map((uid) => (
                <li key={uid} className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-lg">
                  <span className="text-white/70 text-xs font-mono truncate">{uid}</span>
                  {isOwner && (
                    <button
                      onClick={() => handleRemoveEditor(uid)}
                      className="text-red-400 hover:text-red-300 text-sm ml-2 shrink-0"
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Add editor */}
        {isOwner && (
          <form onSubmit={handleAddEditor} className="flex flex-col gap-2">
            <p className="text-white/50 text-xs uppercase tracking-widest">Add Collaborator by UID</p>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <div className="flex gap-2">
              <input
                type="text"
                value={uidInput}
                onChange={(e) => { setUidInput(e.target.value); setError(''); }}
                placeholder="Firebase User UID"
                className="flex-1 bg-white/10 rounded-lg px-3 py-2 text-white text-xs font-mono outline-none focus:ring-1 focus:ring-purple-500 placeholder:text-white/30"
              />
              <button
                type="submit"
                disabled={adding}
                className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs transition-colors disabled:opacity-50 shrink-0"
              >
                {adding ? '…' : 'Add'}
              </button>
            </div>
            <p className="text-white/30 text-xs">
              Find your UID in Profile Settings. Phase 3 will add username search.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default CollaboratorsModal;
