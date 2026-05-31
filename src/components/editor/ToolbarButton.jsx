import React from 'react';

/**
 * ToolbarButton — reusable button for the editor toolbar.
 * Keeps Tailwind class strings DRY across all toolbar actions.
 */
const ToolbarButton = React.forwardRef(function ToolbarButton(
  { onClick, title, children, active = false, danger = false, disabled = false, className = '' },
  ref
) {
  const base =
    'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors cursor-pointer select-none';
  const variant = disabled
    ? 'bg-white/5 text-white/20 cursor-not-allowed'
    : danger
    ? 'bg-red-900/60 hover:bg-red-700 text-red-200'
    : active
    ? 'bg-purple-600 text-white'
    : 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white';

  return (
    <button
      ref={ref}
      onClick={disabled ? undefined : onClick}
      title={title}
      disabled={disabled}
      className={`${base} ${variant} ${className}`}
    >
      {children}
    </button>
  );
});

export default ToolbarButton;
