import React, { useState, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';

/**
 * ProfileSettingsModal — edit display name, bio, and avatar.
 */
function ProfileSettingsModal({ onClose }) {
  const { userProfile, updateProfile, uploadAvatar, user } = useAuthStore();

  const [displayName, setDisplayName] = useState(userProfile?.displayName ?? '');
  const [bio, setBio]         = useState(userProfile?.bio ?? '');
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const fileRef = useRef(null);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    await updateProfile({ displayName: displayName.trim(), bio: bio.trim() });
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

  return (
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
}

export default ProfileSettingsModal;
