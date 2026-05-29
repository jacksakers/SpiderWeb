import React, { useCallback, useRef } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { AVAILABLE_FONTS } from '../../constants/canvas';

/**
 * PropertyPanel — floating side panel that appears when an element is selected.
 *
 * Shows context-relevant controls based on element type:
 *  - All elements: position, size, z-index
 *  - Text: content (handled inline), color, font size, font family, alignment
 *  - Image: alt text, link (href to another page ID)
 *  - Shape: background color, border radius, opacity
 *
 * Phase 2 additions: link autocomplete against known page IDs in Firestore.
 */
function PropertyPanel() {
  const {
    page,
    selectedElementId,
    updateElement,
    deleteElement,
    bringForward,
    sendBackward,
    clearSelection,
  } = useCanvasStore();

  const element = selectedElementId ? page.elements[selectedElementId] : null;

  const update = useCallback(
    (patch) => {
      if (!selectedElementId) return;
      updateElement(selectedElementId, patch);
    },
    [selectedElementId, updateElement]
  );

  const updateStyle = useCallback(
    (stylePatch) => {
      if (!selectedElementId) return;
      const current = page.elements[selectedElementId]?.style ?? {};
      updateElement(selectedElementId, { style: { ...current, ...stylePatch } });
    },
    [selectedElementId, page.elements, updateElement]
  );

  if (!element) return (
    <div className="p-4 text-white/20 text-xs text-center">
      Select an element to edit its properties.
    </div>
  );

  return (
    <div className="w-full bg-black/70 p-3 flex flex-col gap-3 overflow-y-auto text-white text-sm backdrop-blur">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-white/40">
          {element.type}
        </span>
        <button
          onClick={clearSelection}
          className="text-white/40 hover:text-white text-xl leading-none p-1 -mr-1"
          title="Close panel"
        >
          ×
        </button>
      </div>

      {/* Position, Size & Rotation */}
      <Section label="Transform">
        {/* 2-up grid for compact layout on both desktop and mobile */}
        <div className="grid grid-cols-2 gap-2">
          <ScrubRow label="X" value={element.x} onChange={(v) => update({ x: v })} />
          <ScrubRow label="Y" value={element.y} onChange={(v) => update({ y: v })} />
          {element.width !== 'auto' && (
            <ScrubRow label="W" value={element.width} onChange={(v) => update({ width: v })} min={40} />
          )}
          {element.height !== 'auto' && (
            <ScrubRow label="H" value={element.height} onChange={(v) => update({ height: v })} min={20} />
          )}
        </div>
        <Row label="°">
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={element.rotation ?? 0}
              onChange={(e) => update({ rotation: Number(e.target.value) })}
              className="flex-1 accent-purple-500"
            />
            <div className="w-20 shrink-0">
              <ScrubInput value={element.rotation ?? 0} onChange={(v) => update({ rotation: v })} min={-360} max={360} />
            </div>
          </div>
        </Row>
      </Section>

      {/* Z-index */}
      <Section label="Layer">
        <div className="flex gap-2">
          <PanelButton onClick={() => bringForward(selectedElementId)}>↑ Forward</PanelButton>
          <PanelButton onClick={() => sendBackward(selectedElementId)}>↓ Back</PanelButton>
        </div>
        <Row label="Z">
          <ScrubInput value={element.zIndex ?? 1} onChange={(v) => update({ zIndex: v })} min={0} max={999} />
        </Row>
      </Section>

      {/* Text-specific */}
      {element.type === 'text' && (
        <Section label="Typography">
          <Row label="Color">
            <input
              type="color"
              value={element.style?.color ?? '#ffffff'}
              onChange={(e) => updateStyle({ color: e.target.value })}
              className="w-8 h-6 cursor-pointer rounded border-none bg-transparent"
            />
          </Row>
          <Row label="Size">
            <ScrubInput
              value={parseInt(element.style?.fontSize ?? '18', 10)}
              onChange={(v) => updateStyle({ fontSize: `${v}px` })}
              min={8}
              max={200}
            />
          </Row>
          <Row label="Font">
            <select
              value={element.style?.fontFamily ?? 'Comic Sans MS'}
              onChange={(e) => updateStyle({ fontFamily: e.target.value })}
              className="bg-[#222] text-white rounded px-1 py-0.5 text-xs w-full border border-white/10"
              style={{ backgroundColor: '#222', color: '#fff' }}
            >
              {AVAILABLE_FONTS.map((f) => (
                <option key={f} value={f} style={{ backgroundColor: '#222', color: '#fff', fontFamily: f }}>
                  {f}
                </option>
              ))}
            </select>
          </Row>
          <Row label="Align">
            <div className="flex gap-1">
              {['left', 'center', 'right'].map((a) => (
                <button
                  key={a}
                  onClick={() => updateStyle({ textAlign: a })}
                  className={`flex-1 px-2 py-1.5 rounded text-xs ${
                    element.style?.textAlign === a ? 'bg-purple-600' : 'bg-white/10'
                  }`}
                >
                  {a[0].toUpperCase()}
                </button>
              ))}
            </div>
          </Row>
        </Section>
      )}

      {/* Image-specific */}
      {element.type === 'image' && (
        <Section label="Image">
          <Row label="Alt">
            <input
              type="text"
              value={element.alt ?? ''}
              maxLength={256}
              onChange={(e) => update({ alt: e.target.value })}
              className="bg-white/10 rounded px-2 py-0.5 text-xs w-full"
              placeholder="Description"
            />
          </Row>
          <Row label="Link">
            <input
              type="text"
              value={element.href ?? ''}
              maxLength={128}
              onChange={(e) => update({ href: e.target.value })}
              className="bg-white/10 rounded px-2 py-0.5 text-xs w-full"
              placeholder="Page ID"
            />
          </Row>
          <Row label="Open in New Tab">
            <input
              type="checkbox"
              checked={element.target === '_blank'}
              onChange={(e) => update({ target: e.target.checked ? '_blank' : undefined })}
              className="bg-white/10 rounded px-2 py-0.5 text-xs"
            />
          </Row>
        </Section>
      )}

      {/* Shape-specific */}
      {element.type === 'shape' && (
        <Section label="Shape">
          <Row label="Fill">
            <input
              type="color"
              value={element.style?.backgroundColor ?? '#aa3bff'}
              onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
              className="w-8 h-6 cursor-pointer rounded border-none bg-transparent"
            />
          </Row>
          <Row label="Opacity">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={element.style?.opacity ?? 1}
              onChange={(e) => updateStyle({ opacity: parseFloat(e.target.value) })}
              className="w-full accent-purple-500"
            />
          </Row>
        </Section>
      )}

      {/* Link (all types) */}
      {element.type !== 'image' && (
        <Section label="Link">
          <Row label="Page">
            <input
              type="text"
              value={element.href ?? ''}
              maxLength={128}
              onChange={(e) => update({ href: e.target.value })}
              className="bg-white/10 rounded px-2 py-0.5 text-xs w-full"
              placeholder="Page ID"
            />
          </Row>
          <Row label="Open in New Tab">
            <input
              type="checkbox"
              checked={element.target === '_blank'}
              onChange={(e) => update({ target: e.target.checked ? '_blank' : undefined })}
              className="bg-white/10 rounded px-2 py-0.5 text-xs"
            />
          </Row>
        </Section>
      )}

      {/* Delete */}
      <button
        onClick={() => deleteElement(selectedElementId)}
        className="mt-auto px-3 py-2.5 rounded text-sm bg-red-900/50 hover:bg-red-700 text-red-200 transition-colors"
      >
        🗑 Delete element
      </button>
    </div>
  );
}

// ─── Small helper sub-components (private to this file) ─────────────────────

function Section({ label, children }) {
  return (
    <div>
      <p className="text-xs text-white/40 uppercase tracking-widest mb-2">{label}</p>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-white/50 w-8 shrink-0 text-right text-xs">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

/**
 * ScrubInput — numeric input with a ↔ drag handle for desktop scrubbing.
 *
 * - Drag the ↔ handle left/right to decrement/increment (1 px per pixel moved)
 * - Click the number field to type directly
 * - Works via pointer capture so the pointer can leave the element during drag
 */
function ScrubInput({ value, onChange, min = -Infinity, max = Infinity, step = 1 }) {
  const startRef = useRef(null);

  function handlePointerDown(e) {
    e.preventDefault();
    startRef.current = { x: e.clientX, value: Number(value) };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e) {
    if (!startRef.current) return;
    const delta = Math.round((e.clientX - startRef.current.x) * step);
    const raw = startRef.current.value + delta;
    const clamped = Math.max(
      min === -Infinity ? raw : min,
      Math.min(max === Infinity ? raw : max, raw),
    );
    onChange(clamped);
  }

  function handlePointerUp() {
    startRef.current = null;
  }

  return (
    <div className="flex items-center bg-white/10 rounded overflow-hidden">
      {/* Scrub handle — desktop only */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="hidden sm:flex px-1.5 items-center text-white/30 hover:text-white/70 border-r border-white/10 select-none"
        style={{ cursor: 'ew-resize', height: '100%', minWidth: '22px', justifyContent: 'center' }}
        title="Drag to scrub"
      >
        ↔
      </div>
      <input
        type="number"
        value={value}
        min={min === -Infinity ? undefined : min}
        max={max === Infinity ? undefined : max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="bg-transparent text-xs text-white px-2 py-1 w-full outline-none"
      />
    </div>
  );
}

/** Compact labelled scrub input for the 2-column transform grid */
function ScrubRow({ label, value, onChange, min, max, step }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-white/40 text-[10px] uppercase tracking-wider">{label}</span>
      <ScrubInput value={value} onChange={onChange} min={min} max={max} step={step} />
    </div>
  );
}

function PanelButton({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 px-2 py-1.5 rounded text-xs bg-white/10 hover:bg-white/20 transition-colors"
    >
      {children}
    </button>
  );
}

export default PropertyPanel;
