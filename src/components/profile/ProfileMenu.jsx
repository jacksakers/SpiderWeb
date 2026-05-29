import React, { useState, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useTabStore } from '../../store/tabStore';
import LoginModal from '../auth/LoginModal';
import UserPagesPanel from './UserPagesPanel';
import ProfileSettingsModal from './ProfileSettingsModal';

/**
 * ProfileMenu — top-right corner avatar / account control.
 *
 * Shows:
 *  - Avatar (or initials) + display name
 *  - Dropdown: My Pages, Profile Settings, View Profile Page, Sign Out
 *  - "Sign In" button when not authenticated
 */
function ProfileMenu() {
  const { user, userProfile, signOut } = useAuthStore();
  const navigateTo = useTabStore((s) => s.navigateTo);

  const [open, setOpen]         = useState(false);
  const [showLogin, setShowLogin]   = useState(false);
  const [showPages, setShowPages]   = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const menuRef = useRef(null);

  function close() { setOpen(false); }

  function goToProfilePage() {
    if (!userProfile?.profilePageId) return;
    navigateTo(userProfile.profilePageId, `${userProfile.displayName}'s Profile`);
    close();
  }

  const displayName = userProfile?.displayName ?? user?.displayName ?? 'User';
  const photoURL    = userProfile?.photoURL ?? user?.photoURL ?? '';
  const initial     = displayName[0]?.toUpperCase() ?? '?';

  if (!user) {
    return (
      <>
        <button
          onClick={() => setShowLogin(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
        >
          Sign In
        </button>
        {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      </>
    );
  }

  return (
    <>
      {/* Avatar button */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
          title={displayName}
        >
          {photoURL ? (
            <img src={photoURL} alt={displayName} className="w-7 h-7 rounded-full object-cover" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold">
              {initial}
            </div>
          )}
          <span className="text-white/80 text-sm hidden sm:block max-w-[100px] truncate">
            {displayName}
          </span>
          <span className="text-white/40 text-xs">▾</span>
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute right-0 top-full mt-1 w-52 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
            {/* User info header */}
            <div className="px-4 py-3 border-b border-white/10">
              <p className="text-white text-sm font-medium truncate">{displayName}</p>
              <p className="text-white/40 text-xs truncate">{user.email ?? (user.isAnonymous ? 'Guest account' : '')}</p>
            </div>

            <MenuItem icon="🌐" label="My Profile Page" onClick={() => { goToProfilePage(); }} />
            <MenuItem icon="📄" label="My Pages"          onClick={() => { setShowPages(true); close(); }} />
            <MenuItem icon="⚙️" label="Settings"          onClick={() => { setShowSettings(true); close(); }} />

            <div className="border-t border-white/10 mt-1">
              <MenuItem icon="🚪" label="Sign Out" onClick={async () => { await signOut(); close(); }} danger />
            </div>
          </div>
        )}
      </div>

      {/* Backdrop to close dropdown */}
      {open && <div className="fixed inset-0 z-40" onClick={close} />}

      {/* Panels & modals */}
      {showPages    && <UserPagesPanel onClose={() => setShowPages(false)} />}
      {showSettings && <ProfileSettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
}

function MenuItem({ icon, label, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
        danger
          ? 'text-red-400 hover:bg-red-900/30'
          : 'text-white/80 hover:bg-white/10 hover:text-white'
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export default ProfileMenu;
