import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { calculateScaleFactor, clientToCanvasCoords } from '../../utils/canvasGeometry';
import { createImageElement } from '../../utils/elementFactory';
import TextNode from '../elements/TextNode';
import ImageNode from '../elements/ImageNode';
import ShapeNode from '../elements/ShapeNode';

/**
 * PageCanvas — the fixed-coordinate drawing surface.
 *
 * Responsibilities:
 *  - Renders all elements from the active page blueprint
 *  - Applies mobile zoom via CSS scale
 *  - Handles drag-and-drop of image files from the desktop (editor mode)
 *  - Deselects elements when clicking on empty canvas
 *
 * Phase 2: will receive a `pageId` prop, triggering a Firestore blueprint fetch.
 */
function PageCanvas() {
  const { page, isEditing, clearSelection, addElement } = useCanvasStore();
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [isDragOver, setIsDragOver] = useState(false);

  // ─── Responsive scale ──────────────────────────────────────────────────────
  useEffect(() => {
    function updateScale() {
      if (!containerRef.current) return;
      const newScale = calculateScaleFactor(containerRef.current.offsetWidth);
      setScale(newScale);
    }
    updateScale();
    const ro = new ResizeObserver(updateScale);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // ─── Desktop image drop ────────────────────────────────────────────────────
  const handleDragOver = useCallback((e) => {
    if (!isEditing) return;
    e.preventDefault();
    setIsDragOver(true);
  }, [isEditing]);

  const handleDragLeave = useCallback(() => setIsDragOver(false), []);

  const handleDrop = useCallback((e) => {
    if (!isEditing) return;
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    // Calculate canvas-local coords for the drop position
    const rect = e.currentTarget.getBoundingClientRect();
    const { x, y } = clientToCanvasCoords(e, rect, scale);

    // Phase 1: create an object URL for preview; Phase 2: upload to Firebase Storage
    const objectUrl = URL.createObjectURL(file);
    const element = createImageElement({ x, y, src: objectUrl, alt: file.name });
    addElement(element);

    // TODO (Phase 2): revoke objectUrl after Firebase upload resolves and replace src
  }, [isEditing, scale, addElement]);

  // ─── Render elements ───────────────────────────────────────────────────────
  const elementEntries = Object.entries(page.elements);

  return (
    // Outer wrapper measures physical width for scale calculation
    <div ref={containerRef} className="w-full overflow-hidden">
      {/* Scaled canvas */}
      <div
        style={{
          width: page.theme.width,
          height: page.theme.height,
          backgroundColor: page.theme.backgroundColor,
          backgroundImage: page.theme.backgroundImage
            ? `url(${page.theme.backgroundImage})`
            : 'none',
          backgroundRepeat: 'repeat',
          position: 'relative',
          transformOrigin: 'top left',
          transform: `scale(${scale})`,
          // Shrink wrapper height to match scaled canvas so page layout isn't broken
          marginBottom: `${page.theme.height * scale - page.theme.height}px`,
          outline: isDragOver && isEditing ? '3px dashed #aa3bff' : 'none',
        }}
        onClick={clearSelection}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {elementEntries.map(([id, data]) => {
          if (data.type === 'text') return <TextNode key={id} id={id} data={data} />;
          if (data.type === 'image') return <ImageNode key={id} id={id} data={data} />;
          if (data.type === 'shape') return <ShapeNode key={id} id={id} data={data} />;
          return null;
        })}

        {/* Empty state hint */}
        {elementEntries.length === 0 && isEditing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-white/30 text-xl select-none">
              Use the toolbar to add elements, or drop an image here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PageCanvas;
