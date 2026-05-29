import React, { useEffect } from 'react';
import { useTabStore } from '../../store/tabStore';
import { useCanvasStore } from '../../store/canvasStore';
import TabBar from './TabBar';
import AddressBar from './AddressBar';
import EditorToolbar from '../editor/EditorToolbar';
import PageCanvas from '../editor/PageCanvas';
import PropertyPanel from '../editor/PropertyPanel';

/**
 * MetaBrowser — the outer "operating system" window.
 *
 * Renders:
 *  ┌────────────────────────────────────────────────────────┐
 *  │  TabBar                                                │
 *  │  AddressBar  (back / forward / url input)              │
 *  │  EditorToolbar  (when in edit mode)                    │
 *  ├──────────────────────────────┬─────────────────────────┤
 *  │  PageCanvas (scrollable)     │  PropertyPanel (slide)  │
 *  └──────────────────────────────┴─────────────────────────┘
 *
 * Phase 2: when the active tab's pageId changes, fetch the blueprint from
 * Firestore and call canvasStore.setPage() to load it.
 */
function MetaBrowser() {
  const { initActiveTab, getActiveTab } = useTabStore();
  const { isEditing, selectedElementId } = useCanvasStore();
  const activeTab = getActiveTab();

  // Initialise the active tab on first mount
  useEffect(() => {
    initActiveTab();
  }, [initActiveTab]);

  // ── Phase 2 hook point ──────────────────────────────────────────────────
  // useEffect(() => {
  //   if (!activeTab?.pageId) return;
  //   loadPageFromFirestore(activeTab.pageId).then(canvasStore.setPage);
  // }, [activeTab?.pageId]);

  const showPropertyPanel = isEditing && selectedElementId !== null;

  return (
    <div className="flex flex-col h-screen bg-[#111] text-white overflow-hidden">
      {/* Browser chrome */}
      <TabBar />
      <AddressBar />
      <EditorToolbar />

      {/* Viewport area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas scroll area */}
        <div className="flex-1 overflow-auto">
          <PageCanvas />
        </div>

        {/* Property panel — slides in when an element is selected */}
        {showPropertyPanel && <PropertyPanel />}
      </div>
    </div>
  );
}

export default MetaBrowser;
