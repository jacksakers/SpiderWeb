import { create } from 'zustand';
import { nanoid } from 'nanoid';

/**
 * tabStore — owns the Meta-Browser tab system.
 *
 * Each tab tracks:
 *   - id:      unique tab identifier
 *   - pageId:  the currently loaded SpiderWeb page ID
 *   - title:   display label for the tab
 *   - history: array of previously visited page IDs (for Back/Forward)
 *   - historyIndex: current position in the history array
 *
 * Phase 2: pageId will trigger a Firestore fetch in the Meta-Browser component.
 */

function makeTab(pageId = 'demo', title = 'New Tab') {
  return {
    id: nanoid(6),
    pageId,
    title,
    history: [pageId],
    historyIndex: 0,
  };
}

// Read the hash synchronously at module load time — before any React effects
// can overwrite it — so the first tab opens the correct page.
const _initialPageId = (() => {
  if (typeof window === 'undefined') return 'demo';
  return window.location.hash.replace(/^#/, '').trim() || 'demo';
})();

export const useTabStore = create((set, get) => ({
  // ─── State ────────────────────────────────────────────────────────────────
  tabs: [makeTab(_initialPageId, _initialPageId === 'demo' ? 'My Retro Space' : _initialPageId)],
  activeTabId: null,   // initialised to tabs[0].id after first render

  // ─── Init ─────────────────────────────────────────────────────────────────
  initActiveTab() {
    const { tabs, activeTabId } = get();
    if (!activeTabId && tabs.length > 0) {
      set({ activeTabId: tabs[0].id });
    }
  },

  // Open in new tab from external link (e.g. from ImageNode) — creates a new tab with the given pageId and title.
  openInNewTab(pageId, title) {
    const newTab = makeTab(pageId, title);
    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newTab.id,
    }));
  },

  // ─── Derived helper ───────────────────────────────────────────────────────
  getActiveTab() {
    const { tabs, activeTabId } = get();
    return tabs.find((t) => t.id === activeTabId) ?? tabs[0] ?? null;
  },

  // ─── Tab management ───────────────────────────────────────────────────────
  openTab(pageId = 'demo', title = 'New Tab') {
    const newTab = makeTab(pageId, title);
    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newTab.id,
    }));
  },

  closeTab(tabId) {
    set((state) => {
      const remaining = state.tabs.filter((t) => t.id !== tabId);
      if (remaining.length === 0) {
        // Always keep at least one tab open
        const fallback = makeTab('demo', 'New Tab');
        return { tabs: [fallback], activeTabId: fallback.id };
      }
      const nextActive =
        state.activeTabId === tabId
          ? remaining[remaining.length - 1].id
          : state.activeTabId;
      return { tabs: remaining, activeTabId: nextActive };
    });
  },

  setActiveTab(tabId) {
    set({ activeTabId: tabId });
  },

  // ─── Navigation ───────────────────────────────────────────────────────────

  /** Navigate the active tab to a new pageId (pushes history) */
  navigateTo(pageId, title = pageId) {
    set((state) => {
      const tabs = state.tabs.map((tab) => {
        if (tab.id !== state.activeTabId) return tab;
        const truncatedHistory = tab.history.slice(0, tab.historyIndex + 1);
        return {
          ...tab,
          pageId,
          title,
          history: [...truncatedHistory, pageId],
          historyIndex: truncatedHistory.length,
        };
      });
      return { tabs };
    });
  },

  goBack() {
    set((state) => {
      const tabs = state.tabs.map((tab) => {
        if (tab.id !== state.activeTabId) return tab;
        const newIndex = Math.max(0, tab.historyIndex - 1);
        return { ...tab, historyIndex: newIndex, pageId: tab.history[newIndex] };
      });
      return { tabs };
    });
  },

  goForward() {
    set((state) => {
      const tabs = state.tabs.map((tab) => {
        if (tab.id !== state.activeTabId) return tab;
        const newIndex = Math.min(tab.history.length - 1, tab.historyIndex + 1);
        return { ...tab, historyIndex: newIndex, pageId: tab.history[newIndex] };
      });
      return { tabs };
    });
  },

  /** Update the title of the currently active tab (called after Firestore page load) */
  updateActiveTabTitle(title) {
    if (!title) return;
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === state.activeTabId ? { ...tab, title } : tab,
      ),
    }));
  },
}));
