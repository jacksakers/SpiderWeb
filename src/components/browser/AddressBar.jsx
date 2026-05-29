import React, { useEffect, useRef, useState } from 'react';
import { useTabStore } from '../../store/tabStore';

/**
 * AddressBar — shows the current pageId and lets the user type a new one.
 *
 * Pressing Enter (or clicking Go) calls tabStore.navigateTo with the new ID.
 * Phase 2: validate that the typed page ID exists in Firestore before navigating.
 */
function AddressBar() {
  const { getActiveTab, navigateTo, goBack, goForward } = useTabStore();
  const activeTab = getActiveTab();
  const [inputValue, setInputValue] = useState(activeTab?.pageId ?? '');
  const inputRef = useRef(null);

  // Sync input with the active tab's current pageId
  useEffect(() => {
    setInputValue(activeTab?.pageId ?? '');
  }, [activeTab?.pageId, activeTab?.id]);

  function handleNavigate() {
    const trimmed = inputValue.trim();
    if (trimmed) navigateTo(trimmed);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleNavigate();
    if (e.key === 'Escape') inputRef.current?.blur();
  }

  const canBack = activeTab && activeTab.historyIndex > 0;
  const canForward = activeTab && activeTab.historyIndex < activeTab.history.length - 1;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 border-b border-white/10">
      {/* Back / Forward */}
      <button
        onClick={goBack}
        disabled={!canBack}
        title="Back"
        className="text-white/60 hover:text-white disabled:opacity-20 transition-colors text-lg leading-none"
      >
        ←
      </button>
      <button
        onClick={goForward}
        disabled={!canForward}
        title="Forward"
        className="text-white/60 hover:text-white disabled:opacity-20 transition-colors text-lg leading-none"
      >
        →
      </button>

      {/* URL bar */}
      <div className="flex flex-1 items-center bg-white/10 rounded px-3 py-1 gap-2">
        <span className="text-white/30 text-xs select-none">sw://</span>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter a page ID…"
          className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/20"
          spellCheck={false}
          autoComplete="off"
        />
      </div>

      <button
        onClick={handleNavigate}
        title="Go"
        className="text-white/60 hover:text-white transition-colors text-sm px-2"
      >
        Go
      </button>
    </div>
  );
}

export default AddressBar;
