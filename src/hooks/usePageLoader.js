import { useEffect, useRef } from 'react';
import { useTabStore } from '../store/tabStore';
import { useCanvasStore } from '../store/canvasStore';

/**
 * usePageLoader — watches the active tab's pageId and calls canvasStore.loadPage
 * whenever it changes. Also syncs the browser URL hash for shareable links.
 */
export function usePageLoader() {
  const activeTab  = useTabStore((s) => s.getActiveTab());
  const loadPage   = useCanvasStore((s) => s.loadPage);
  const pageStatus = useCanvasStore((s) => s.pageStatus);
  const prevPageId = useRef(null);

  useEffect(() => {
    const pageId = activeTab?.pageId;
    if (!pageId || pageId === prevPageId.current) return;
    prevPageId.current = pageId;
    loadPage(pageId);

    // Keep the URL hash in sync so the page is shareable
    window.location.hash = pageId === 'demo' ? '' : `#${pageId}`;
    document.title = pageId === 'demo' ? 'SpiderWeb' : `sw://${pageId} — SpiderWeb`;
  }, [activeTab?.pageId, loadPage]);

  return pageStatus;
}
