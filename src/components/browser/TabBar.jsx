import React from 'react';
import { useTabStore } from '../../store/tabStore';

/**
 * TabBar — renders the row of open tabs at the top of the Meta-Browser.
 *
 * Each tab shows its title and a close button.
 * A "+" button opens a new tab pointed at 'demo'.
 */
function TabBar() {
  const { tabs, activeTabId, setActiveTab, openTab, closeTab } = useTabStore();

  return (
    <div className="flex items-end gap-0.5 px-2 pt-1.5 bg-black/60 border-b border-white/10 overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-t text-xs cursor-pointer select-none max-w-[160px] shrink-0 transition-colors ${
              isActive
                ? 'bg-[#1a1a1a] text-white border-t border-l border-r border-white/10'
                : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80'
            }`}
          >
            <span className="truncate">{tab.title || tab.pageId}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              title="Close tab"
              className="text-white/40 hover:text-white leading-none"
            >
              ×
            </button>
          </div>
        );
      })}

      {/* New tab button */}
      <button
        onClick={() => openTab('demo', 'New Tab')}
        title="New tab"
        className="px-2.5 py-1.5 text-white/40 hover:text-white transition-colors text-lg leading-none shrink-0"
      >
        +
      </button>
    </div>
  );
}

export default TabBar;
