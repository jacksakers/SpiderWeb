import { useEffect, useRef } from 'react';
import { useTabStore } from '../store/tabStore';
import { useCanvasStore } from '../store/canvasStore';

/**
 * usePageLoader — watches the active tab's pageId and calls canvasStore.loadPage
 * whenever it changes. Also syncs the browser URL hash for shareable links and
 * updates the tab title once the page title is known from Firestore.
 */
export function usePageLoader() {
  const activeTab              = useTabStore((s) => s.getActiveTab());
  const updateActiveTabTitle   = useTabStore((s) => s.updateActiveTabTitle);
  const loadPage               = useCanvasStore((s) => s.loadPage);
  const pageStatus             = useCanvasStore((s) => s.pageStatus);
  const pageTitle              = useCanvasStore((s) => s.page?.title);
  const prevPageId             = useRef(null);

  // Load page when active tab changes
  useEffect(() => {
    const pageId = activeTab?.pageId;
    if (!pageId || pageId === prevPageId.current) return;
    prevPageId.current = pageId;
    loadPage(pageId);

    // Keep the URL hash in sync so the page is shareable
    window.location.hash = pageId === 'demo' ? '' : pageId;
  }, [activeTab?.pageId, loadPage]);

  // Update tab title and document title once the page has loaded from Firestore
  useEffect(() => {
    if (pageStatus !== 'loaded' || !pageTitle) return;
    updateActiveTabTitle(pageTitle);
    document.title = `sw://${activeTab?.pageId} — SpiderWeb`;
  }, [pageStatus, pageTitle, activeTab?.pageId, updateActiveTabTitle]);

  return pageStatus;
}
