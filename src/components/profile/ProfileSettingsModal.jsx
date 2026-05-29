import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuthStore } from '../../store/authStore';

/**
 * ProfileSettingsModal — edit display name, bio, and avatar.
 */
function ProfileSettingsModal({ onClose }) {
  const { userProfile, updateProfile, uploadAvatar, updateProfilePageId, user } = useAuthStore();

  const [displayName, setDisplayName] = useState(userProfile?.displayName ?? '');
  const [bio, setBio]               = useState(userProfile?.bio ?? '');
  const [slug, setSlug]             = useState(userProfile?.profilePageId ?? '');
  const [slugError, setSlugError]   = useState('');
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const fileRef = useRef(null);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSlugError('');

    // Save display name + bio
    await updateProfile({ displayName: displayName.trim(), bio: bio.trim() });

    // Save profile slug if changed
    const trimmedSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    if (trimmedSlug && trimmedSlug !== userProfile?.profilePageId) {
      const result = await updateProfilePageId(trimmedSlug);
      if (!result?.ok) {
        setSlugError(result?.error ?? 'Failed to update profile URL.');
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    await uploadAvatar(file);
    setSaving(false);
  }

  const photoURL = userProfile?.photoURL ?? '';
  const initial  = (userProfile?.displayName ?? 'U')[0].toUpperCase();

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-semibold text-lg">Profile Settings</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl">×</button>
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => fileRef.current?.click()}
            className="relative group shrink-0"
            title="Change avatar"
          >
            {photoURL ? (
              <img src={photoURL} alt="" className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                {initial}
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs transition-opacity">
              Edit
            </div>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          <div>
            <p className="text-white text-sm font-medium">{userProfile?.displayName}</p>
            <p className="text-white/40 text-xs">{user?.email ?? (user?.isAnonymous ? 'Guest account' : '')}</p>
            {userProfile?.profilePageId && (
              <p className="text-purple-400 text-xs mt-1">sw://{userProfile.profilePageId}</p>
            )}
          </div>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div>
            <label className="text-white/50 text-xs uppercase tracking-widest block mb-1">Display Name</label>
            <input
              type="text"
              value={displayName}
              maxLength={64}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="text-white/50 text-xs uppercase tracking-widest block mb-1">Bio</label>
            <textarea
              value={bio}
              maxLength={256}
              rows={3}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-1 focus:ring-purple-500 resize-none"
              placeholder="Tell the web who you are…"
            />
          </div>
          <div>
            <label className="text-white/50 text-xs uppercase tracking-widest block mb-1">Profile URL</label>
            <div className="flex items-center gap-1">
              <span className="text-white/40 text-sm">sw://</span>
              <input
                type="text"
                value={slug}
                maxLength={48}
                onChange={(e) => { setSlug(e.target.value); setSlugError(''); }}
                placeholder={userProfile?.profilePageId ?? `profile-${user?.uid?.slice(0, 8)}`}
                className="flex-1 bg-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
            {slugError && <p className="text-red-400 text-xs mt-1">{slugError}</p>}
            <p className="text-white/30 text-xs mt-1">Lowercase letters, numbers, hyphens only. 3–48 chars.</p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

export default ProfileSettingsModal;
