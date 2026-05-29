import React, { useCallback } from 'react';
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

  if (!element) return null;

  return (
    <div className="w-64 shrink-0 bg-black/70 border-l border-white/10 p-4 flex flex-col gap-4 overflow-y-auto text-white text-sm backdrop-blur">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-white/40">
          {element.type}
        </span>
        <button
          onClick={clearSelection}
          className="text-white/40 hover:text-white text-lg leading-none"
          title="Close panel"
        >
          ×
        </button>
      </div>

      {/* Position & Size */}
      <Section label="Transform">
        <Row label="X">
          <NumInput value={element.x} onChange={(v) => update({ x: v })} />
        </Row>
        <Row label="Y">
          <NumInput value={element.y} onChange={(v) => update({ y: v })} />
        </Row>
        {element.width !== 'auto' && (
          <Row label="W">
            <NumInput value={element.width} onChange={(v) => update({ width: v })} min={40} />
          </Row>
        )}
        {element.height !== 'auto' && (
          <Row label="H">
            <NumInput value={element.height} onChange={(v) => update({ height: v })} min={20} />
          </Row>
        )}
      </Section>

      {/* Z-index */}
      <Section label="Layer">
        <div className="flex gap-2">
          <PanelButton onClick={() => bringForward(selectedElementId)}>↑ Forward</PanelButton>
          <PanelButton onClick={() => sendBackward(selectedElementId)}>↓ Back</PanelButton>
        </div>
        <Row label="Z">
          <NumInput value={element.zIndex ?? 1} onChange={(v) => update({ zIndex: v })} min={0} max={999} />
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
            <NumInput
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
              className="bg-white/10 rounded px-1 py-0.5 text-xs w-full"
            >
              {AVAILABLE_FONTS.map((f) => (
                <option key={f} value={f} style={{ fontFamily: f }}>
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
                  className={`px-2 py-0.5 rounded text-xs ${
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
              placeholder="Page ID to navigate to"
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
          <Row label="→ Page">
            <input
              type="text"
              value={element.href ?? ''}
              maxLength={128}
              onChange={(e) => update({ href: e.target.value })}
              className="bg-white/10 rounded px-2 py-0.5 text-xs w-full"
              placeholder="Page ID"
            />
          </Row>
        </Section>
      )}

      {/* Delete */}
      <button
        onClick={() => deleteElement(selectedElementId)}
        className="mt-auto px-3 py-1.5 rounded text-sm bg-red-900/50 hover:bg-red-700 text-red-200 transition-colors"
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
      <span className="text-white/50 w-10 shrink-0 text-right text-xs">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function NumInput({ value, onChange, min, max }) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(Number(e.target.value))}
      className="bg-white/10 rounded px-2 py-0.5 text-xs w-full"
    />
  );
}

function PanelButton({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="px-2 py-0.5 rounded text-xs bg-white/10 hover:bg-white/20 transition-colors"
    >
      {children}
    </button>
  );
}

export default PropertyPanel;
