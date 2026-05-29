import React from 'react';

/**
 * ToolbarButton — reusable button for the editor toolbar.
 * Keeps Tailwind class strings DRY across all toolbar actions.
 */
function ToolbarButton({ onClick, title, children, active = false, danger = false }) {
  const base =
    'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors cursor-pointer select-none';
  const variant = danger
    ? 'bg-red-900/60 hover:bg-red-700 text-red-200'
    : active
    ? 'bg-purple-600 text-white'
    : 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white';

  return (
    <button
      onClick={onClick}
      title={title}
      className={`${base} ${variant}`}
    >
      {children}
    </button>
  );
}

export default ToolbarButton;
