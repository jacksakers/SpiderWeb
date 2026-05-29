import React, { useEffect } from 'react';
import { useTabStore } from '../../store/tabStore';
import { useCanvasStore } from '../../store/canvasStore';
import { useAuthStore } from '../../store/authStore';
import { usePageLoader } from '../../hooks/usePageLoader';
import { useSavePage } from '../../hooks/useSavePage';
import { useEditorShortcuts } from '../../hooks/useEditorShortcuts';
import TabBar from './TabBar';
import AddressBar from './AddressBar';
import EditorToolbar from '../editor/EditorToolbar';
import PageCanvas from '../editor/PageCanvas';
import PropertyPanel from '../editor/PropertyPanel';
import ProfileMenu from '../profile/ProfileMenu';
import PageNotFoundPrompt from './PageNotFoundPrompt';

/**
 * MetaBrowser — the outer "operating system" window.
 *
 * Layout:
 *  ┌──────────────────────────────────────────────┐
 *  │  TabBar                  [ProfileMenu]       │
 *  │  AddressBar (back/fwd/url)                   │
 *  │  EditorToolbar                               │
 *  ├──────────────────────────────┬───────────────┤
 *  │  PageCanvas (scrollable)     │ PropertyPanel │
 *  └──────────────────────────────┴───────────────┘
 */
function MetaBrowser() {
  const { initActiveTab, getActiveTab } = useTabStore();
  const { isEditing, selectedElementId, pageStatus, page } = useCanvasStore();
  const activeTab = getActiveTab();

  // Kick off auth and tab initialisation
  useEffect(() => { initActiveTab(); }, [initActiveTab]);

  // Load pages when tab changes + sync URL hash
  const status = usePageLoader();

  // Auto-save debounce
  useSavePage();

  // Keyboard shortcuts: Ctrl+Z/Y, Ctrl+C/V, Delete
  useEditorShortcuts();

  const showPropertyPanel = isEditing && selectedElementId !== null;
  const isLoading   = status === 'loading';
  const isNotFound  = status === 'not_found';

  return (
    <div className="flex flex-col h-screen bg-[#111] text-white overflow-hidden">
      {/* ── Browser chrome ─────────────────────────────────────────── */}
      <div className="flex items-stretch border-b border-white/10">
        <div className="flex-1 flex flex-col">
          <TabBar />
          <AddressBar />
        </div>
        {/* Profile menu anchored to the top-right corner */}
        <div className="flex items-center px-3 border-l border-white/10 bg-black/40">
          <ProfileMenu />
        </div>
      </div>

      <EditorToolbar />

      {/* ── Viewport ───────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Loading state */}
        {isLoading && (
          <div className="flex-1 flex items-center justify-center text-white/30 text-sm">
            <div className="flex flex-col items-center gap-3">
              <span className="text-4xl animate-spin">🕸️</span>
              <span>Loading sw://{activeTab?.pageId}…</span>
            </div>
          </div>
        )}

        {/* Page not found */}
        {isNotFound && <PageNotFoundPrompt pageId={activeTab?.pageId ?? ''} />}

        {/* Page loaded */}
        {!isLoading && !isNotFound && (
          <div className="flex-1 overflow-auto">
            <PageCanvas />
          </div>
        )}

        {/* Property panel slides in when element is selected */}
        {showPropertyPanel && <PropertyPanel />}
      </div>
    </div>
  );
}

export default MetaBrowser;
