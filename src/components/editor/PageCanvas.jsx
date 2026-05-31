import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { calculateScaleFactor, clientToCanvasCoords, canvasViewport } from '../../utils/canvasGeometry';
import { createImageElement } from '../../utils/elementFactory';
import { uploadImage } from '../../utils/imageUpload';
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
  const { page, isEditing, clearSelection, addElement, selectElements } = useCanvasStore();
  const containerRef  = useRef(null);
  const canvasRef     = useRef(null);  // inner fixed-size canvas div
  const [scale, setScale]       = useState(1);
  const [isDragOver, setIsDragOver] = useState(false);

  // ─── Lasso selection state ─────────────────────────────────────────────────
  const [lasso, setLasso]       = useState(null); // { x1,y1,x2,y2 } in canvas px
  const lassoStartRef = useRef(null);

  // ─── Responsive scale ──────────────────────────────────────────────────────
  useEffect(() => {
    function updateScale() {
      if (!containerRef.current) return;
      const newScale = calculateScaleFactor(containerRef.current.offsetWidth);
      setScale(newScale);
      canvasViewport.scale = newScale;  // keep shared ref in sync
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

  const handleDrop = useCallback(async (e) => {
    if (!isEditing) return;
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const { x, y } = clientToCanvasCoords(e, rect, scale);

    // Upload to Firebase Storage (or blob URL if offline)
    const src = await uploadImage(file, page.pageId);
    const element = createImageElement({ x, y, src, alt: file.name });
    addElement(element);
  }, [isEditing, scale, addElement, page.pageId]);

  // ─── Lasso selection (desktop mouse only) ─────────────────────────────────
  const LASSO_THRESHOLD = 6; // px in canvas space before lasso activates

  const handleCanvasMouseDown = useCallback((e) => {
    if (!isEditing) return;
    if (e.button !== 0) return;
    // Only start lasso when clicking the bare canvas background, not an element
    if (e.target !== canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top)  / scale;
    lassoStartRef.current = { x, y };
  }, [isEditing, scale]);

  const handleCanvasMouseMove = useCallback((e) => {
    if (!lassoStartRef.current) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top)  / scale;
    const dx = x - lassoStartRef.current.x;
    const dy = y - lassoStartRef.current.y;
    if (Math.abs(dx) > LASSO_THRESHOLD || Math.abs(dy) > LASSO_THRESHOLD) {
      setLasso({ x1: lassoStartRef.current.x, y1: lassoStartRef.current.y, x2: x, y2: y });
    }
  }, [scale]);

  const handleCanvasMouseUp = useCallback(() => {
    if (lassoStartRef.current && lasso) {
      const { x1, y1, x2, y2 } = lasso;
      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      const minY = Math.min(y1, y2);
      const maxY = Math.max(y1, y2);
      const hitIds = Object.entries(page.elements)
        .filter(([, el]) => {
          const ew = typeof el.width  === 'number' ? el.width  : 100;
          const eh = typeof el.height === 'number' ? el.height : 40;
          return el.x < maxX && el.x + ew > minX && el.y < maxY && el.y + eh > minY;
        })
        .map(([id]) => id);
      if (hitIds.length > 0) selectElements(hitIds);
      else clearSelection();
    }
    lassoStartRef.current = null;
    setLasso(null);
  }, [lasso, page.elements, selectElements, clearSelection]);

  // ─── Render elements ───────────────────────────────────────────────────────
  const elementEntries = Object.entries(page.elements);

  return (
    // Outer wrapper measures physical width for scale calculation
    <div ref={containerRef} className="w-full overflow-x-hidden"
         style={{ minHeight: page.theme.height * scale }}>
      {/* Scaled canvas */}
      <div
        ref={canvasRef}
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
          // Collapse the extra layout space created by the scaled-down canvas
          // so the scrollable parent knows the true rendered height.
          marginBottom: `${(page.theme.height * scale) - page.theme.height}px`,
          outline: isDragOver && isEditing ? '3px dashed #aa3bff' : 'none',
        }}
        onClick={clearSelection}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {elementEntries.map(([id, data]) => {
          if (data.type === 'text') return <TextNode key={id} id={id} data={data} scale={scale} />;
          if (data.type === 'image') return <ImageNode key={id} id={id} data={data} scale={scale} />;
          if (data.type === 'shape') return <ShapeNode key={id} id={id} data={data} scale={scale} />;
          return null;
        })}

        {/* Lasso selection box */}
        {lasso && isEditing && (
          <div
            style={{
              position: 'absolute',
              left:   Math.min(lasso.x1, lasso.x2),
              top:    Math.min(lasso.y1, lasso.y2),
              width:  Math.abs(lasso.x2 - lasso.x1),
              height: Math.abs(lasso.y2 - lasso.y1),
              border: '1.5px dashed #aa3bff',
              backgroundColor: 'rgba(170,59,255,0.08)',
              pointerEvents: 'none',
              zIndex: 9999,
              borderRadius: 2,
            }}
          />
        )}

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
