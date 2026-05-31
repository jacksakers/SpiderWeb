import React, { useRef, useState } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { uploadImage } from '../../utils/imageUpload';

const PRESET_GRADIENTS = [
  { label: 'Purple Haze',  value: 'linear-gradient(135deg, #1a0030 0%, #3d006e 100%)' },
  { label: 'Midnight',     value: 'linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%)' },
  { label: 'Retro Sunset', value: 'linear-gradient(135deg, #1a0030 0%, #6b00a0 50%, #ff6b35 100%)' },
  { label: 'Ocean Deep',   value: 'linear-gradient(180deg, #000428 0%, #004e92 100%)' },
  { label: 'Forest Dark',  value: 'linear-gradient(135deg, #0a1a0a 0%, #0d4a0d 100%)' },
  { label: 'Neon City',    value: 'linear-gradient(135deg, #0d0d0d 0%, #1a0030 50%, #002244 100%)' },
];

/**
 * BackgroundPanel — lets the owner set the page background.
 *
 * Options:
 *  - Solid color
 *  - Custom gradient (from-color → to-color, choose angle)
 *  - Preset gradients
 *  - Background image upload
 */
function BackgroundPanel({ onClose }) {
  const { page, updateTheme } = useCanvasStore();
  const bgImageInputRef = useRef(null);
  const [gradFrom, setGradFrom] = useState('#1a0030');
  const [gradTo,   setGradTo]   = useState('#3d006e');
  const [gradAngle, setGradAngle] = useState(135);
  const [uploading, setUploading] = useState(false);

  async function handleBgImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const src = await uploadImage(file, page.pageId);
      updateTheme({ backgroundImage: src, backgroundGradient: '' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  function applyCustomGradient() {
    updateTheme({
      backgroundGradient: `linear-gradient(${gradAngle}deg, ${gradFrom} 0%, ${gradTo} 100%)`,
      backgroundImage: '',
    });
  }

  return (
    <div
      className="absolute top-full left-0 mt-1 z-50 bg-[#1a1a1a] border border-white/10 rounded-lg p-4 shadow-xl w-72"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-3">
        <span className="text-white/70 text-sm font-medium">Page Background</span>
        <button onClick={onClose} className="text-white/30 hover:text-white text-lg leading-none">×</button>
      </div>

      {/* Solid color */}
      <div className="mb-3">
        <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1.5">Solid Color</p>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={page.theme.backgroundColor ?? '#1a1a1a'}
            onChange={(e) => updateTheme({ backgroundColor: e.target.value, backgroundImage: '', backgroundGradient: '' })}
            className="w-10 h-8 cursor-pointer rounded border-none bg-transparent"
          />
          <span className="text-white/50 text-xs">{page.theme.backgroundColor ?? '#1a1a1a'}</span>
        </div>
      </div>

      {/* Custom gradient */}
      <div className="mb-3">
        <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1.5">Custom Gradient</p>
        <div className="flex items-center gap-2 mb-1.5">
          <input type="color" value={gradFrom} onChange={(e) => setGradFrom(e.target.value)} className="w-8 h-7 cursor-pointer rounded border-none" title="From color" />
          <input type="color" value={gradTo}   onChange={(e) => setGradTo(e.target.value)}   className="w-8 h-7 cursor-pointer rounded border-none" title="To color" />
          <input
            type="range" min={0} max={360} value={gradAngle}
            onChange={(e) => setGradAngle(Number(e.target.value))}
            className="flex-1 accent-purple-500"
            title="Angle"
          />
          <span className="text-white/40 text-[10px] w-8">{gradAngle}°</span>
        </div>
        <div
          className="w-full h-8 rounded mb-1.5"
          style={{ background: `linear-gradient(${gradAngle}deg, ${gradFrom} 0%, ${gradTo} 100%)` }}
        />
        <button
          onClick={applyCustomGradient}
          className="w-full px-2 py-1.5 rounded text-xs bg-purple-700 hover:bg-purple-600 text-white transition-colors"
        >
          Apply Gradient
        </button>
      </div>

      {/* Preset gradients */}
      <div className="mb-3">
        <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1.5">Presets</p>
        <div className="grid grid-cols-3 gap-1.5">
          {PRESET_GRADIENTS.map((p) => (
            <button
              key={p.label}
              onClick={() => updateTheme({ backgroundGradient: p.value, backgroundImage: '' })}
              title={p.label}
              className="h-8 rounded transition-opacity hover:opacity-80 border border-white/10"
              style={{ background: p.value }}
            />
          ))}
        </div>
      </div>

      {/* Background image */}
      <div>
        <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1.5">Background Image</p>
        <button
          onClick={() => bgImageInputRef.current?.click()}
          disabled={uploading}
          className="w-full px-2 py-1.5 rounded text-xs bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-40"
        >
          {uploading ? 'Uploading…' : '📁 Upload image…'}
        </button>
        {page.theme.backgroundImage && (
          <button
            onClick={() => updateTheme({ backgroundImage: '' })}
            className="mt-1 w-full px-2 py-1 rounded text-xs text-red-400 hover:text-red-300 bg-red-900/20 transition-colors"
          >
            Remove image
          </button>
        )}
        <input
          ref={bgImageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleBgImageUpload}
        />
      </div>
    </div>
  );
}

export default BackgroundPanel;
