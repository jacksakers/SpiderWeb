import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useTabStore } from '../../store/tabStore';
import { useCanvasStore } from '../../store/canvasStore';
import { useAuthStore } from '../../store/authStore';
import { usePageLoader } from '../../hooks/usePageLoader';
import { useSavePage } from '../../hooks/useSavePage';
import { useEditorShortcuts } from '../../hooks/useEditorShortcuts';
import { canvasViewport } from '../../utils/canvasGeometry';
import TabBar from './TabBar';
import AddressBar from './AddressBar';
import EditorToolbar from '../editor/EditorToolbar';
import PageCanvas from '../editor/PageCanvas';
import PropertyPanel from '../editor/PropertyPanel';
import SocialPanel from '../editor/SocialPanel';
import ProfileMenu from '../profile/ProfileMenu';
import PageNotFoundPrompt from './PageNotFoundPrompt';

/**
 * MetaBrowser — the outer "operating system" window.
 *
 * Desktop layout:
 *  ┌──────────────────────────────────────────────┐
 *  │  TabBar                    [ProfileMenu]     │
 *  │  AddressBar (back/fwd/url)                   │
 *  │  EditorToolbar                               │
 *  ├──────────────────────────────┬───────────────┤
 *  │  PageCanvas (scrollable)     │ SidePanel     │
 *  │                              │  [Props][Soc] │
 *  └──────────────────────────────┴───────────────┘
 *
 * Mobile layout:
 *  - Side panel becomes a bottom sheet.
 *  - A persistent FAB opens the Social tab.
 *  - Selecting an element in edit mode auto-opens the Properties sheet.
 */

/** Returns true when the viewport is narrower than 768 px. */
function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e) => setMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return mobile;
}

// ─── Tab strip shared by both desktop and mobile panels ──────────────────────

function PanelTabs({ activeTab, onSelect, showProperties }) {
  return (
    <div className="flex border-b border-white/10 bg-black/40 shrink-0">
      {showProperties && (
        <button
          onClick={() => onSelect('properties')}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            activeTab === 'properties'
              ? 'text-white border-b-2 border-purple-500'
              : 'text-white/40 hover:text-white/70'
          }`}
        >
          ⚙ Properties
        </button>
      )}
      <button
        onClick={() => onSelect('social')}
        className={`flex-1 py-2 text-xs font-medium transition-colors ${
          activeTab === 'social'
            ? 'text-white border-b-2 border-purple-500'
            : 'text-white/40 hover:text-white/70'
        }`}
      >
        💬 Social
      </button>
    </div>
  );
}

// ─── Desktop right sidebar ────────────────────────────────────────────────────

function DesktopSidePanel({ activeTab, onSelectTab, showProperties }) {
  return (
    <div className="w-64 shrink-0 flex flex-col bg-black/70 border-l border-white/10 overflow-hidden">
      <PanelTabs activeTab={activeTab} onSelect={onSelectTab} showProperties={showProperties} />
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === 'properties' && showProperties
          ? <PropertyPanel />
          : <SocialPanel />}
      </div>
    </div>
  );
}

// ─── Mobile bottom sheet ──────────────────────────────────────────────────────
// No full-screen scrim — the sheet floats over the bottom portion only so the
// canvas above it remains visible and interactive.

function MobileBottomSheet({ open, onClose, activeTab, onSelectTab, showProperties }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl shadow-2xl"
      style={{
        maxHeight: '48dvh',
        background: 'rgba(20,20,20,0.97)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      {/* Drag handle + close */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1 shrink-0">
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto absolute left-1/2 -translate-x-1/2" />
        <div className="flex-1" />
        <button
          onClick={onClose}
          className="text-white/30 hover:text-white text-lg leading-none"
          title="Close panel"
        >
          ×
        </button>
      </div>
      <PanelTabs activeTab={activeTab} onSelect={onSelectTab} showProperties={showProperties} />
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === 'properties' && showProperties
          ? <PropertyPanel />
          : <SocialPanel />}
      </div>
    </div>
  );
}

// ─── Main MetaBrowser ─────────────────────────────────────────────────────────

function MetaBrowser() {
  const { initActiveTab, getActiveTab } = useTabStore();
  const { isEditing, selectedElementId, selectedElementIds } = useCanvasStore();
  const activeTab = getActiveTab();
  const isMobile = useIsMobile();

  const [panelTab,        setPanelTab]        = useState('social');
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  // Kick off auth and tab initialisation
  useEffect(() => { initActiveTab(); }, [initActiveTab]);

  const status = usePageLoader();
  useSavePage();
  useEditorShortcuts();

  const showProperties = isEditing && (selectedElementId !== null || selectedElementIds.length > 1);

  // Auto-switch to Properties when an element is selected
  useEffect(() => {
    if (showProperties) {
      setPanelTab('properties');
      if (isMobile) setMobilePanelOpen(true);
    }
  }, [showProperties, isMobile]);

  // Close sheet when deselecting in edit mode
  useEffect(() => {
    if (isEditing && !showProperties) setMobilePanelOpen(false);
  }, [isEditing, showProperties]);

  const handleSelectTab = useCallback((tab) => {
    setPanelTab(tab);
    if (isMobile) setMobilePanelOpen(true);
  }, [isMobile]);

  const isLoading  = status === 'loading';
  const isNotFound = status === 'not_found';

  return (
    <div className="flex flex-col bg-[#111] text-white overflow-hidden" style={{ height: '100dvh' }}>

      {/* ── Browser chrome ──────────────────────────────────────────── */}
      <div className="flex items-stretch border-b border-white/10 shrink-0 min-w-0">
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <TabBar />
          <AddressBar />
        </div>
        {/* shrink-0 ensures ProfileMenu is never squeezed off-screen */}
        <div className="shrink-0 flex items-center px-2 border-l border-white/10 bg-black/40">
          <ProfileMenu />
        </div>
      </div>

      <EditorToolbar />

      {/* ── Viewport ────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {isLoading && (
          <div className="flex-1 flex items-center justify-center text-white/30 text-sm">
            <div className="flex flex-col items-center gap-3">
              <span className="text-4xl animate-spin">🕸️</span>
              <span>Loading sw://{activeTab?.pageId}…</span>
            </div>
          </div>
        )}

        {isNotFound && <PageNotFoundPrompt pageId={activeTab?.pageId ?? ''} />}

        {!isLoading && !isNotFound && (
          <div
            className="flex-1 overflow-auto min-w-0"
            ref={(el) => { canvasViewport.scrollEl = el; }}
            style={isMobile && mobilePanelOpen ? { paddingBottom: '48dvh' } : undefined}
          >
            <PageCanvas />
          </div>
        )}

        {/* Desktop side panel — always visible on md+ */}
        {!isLoading && !isNotFound && !isMobile && (
          <DesktopSidePanel
            activeTab={panelTab}
            onSelectTab={handleSelectTab}
            showProperties={showProperties}
          />
        )}
      </div>

      {/* ── Mobile bottom sheet ──────────────────────────────────────── */}
      {isMobile && (
        <MobileBottomSheet
          open={mobilePanelOpen}
          onClose={() => setMobilePanelOpen(false)}
          activeTab={panelTab}
          onSelectTab={setPanelTab}
          showProperties={showProperties}
        />
      )}

      {/* ── Mobile Social FAB ────────────────────────────────────────── */}
      {isMobile && !mobilePanelOpen && !isLoading && !isNotFound && (
        <button
          onClick={() => { setPanelTab('social'); setMobilePanelOpen(true); }}
          title="Social"
          className="fixed bottom-5 right-4 z-30 w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-xl shadow-lg flex items-center justify-center transition-colors"
        >
          💬
        </button>
      )}
    </div>
  );
}

export default MetaBrowser;
