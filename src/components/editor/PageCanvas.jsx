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
 *  - Lasso selection: drag on empty canvas to box-select elements
 *  - MultiSelectBox: drag bounding-box to move grouped elements together
 */
function PageCanvas() {
  const {
    page, isEditing, clearSelection, addElement,
    selectElements, moveElements, setMultiDragOffset,
    selectedElementIds,
  } = useCanvasStore();

  const containerRef  = useRef(null);
  const canvasRef     = useRef(null);
  const [scale, setScale]       = useState(1);
  const [isDragOver, setIsDragOver] = useState(false);

  // ─── Lasso selection state ─────────────────────────────────────────────────
  const [lasso, setLasso] = useState(null); // { x1,y1,x2,y2 } in canvas px
  const lassoStartRef     = useRef(null);

  // ─── Responsive scale ──────────────────────────────────────────────────────
  useEffect(() => {
    function updateScale() {
      if (!containerRef.current) return;
      const newScale = calculateScaleFactor(containerRef.current.offsetWidth);
      setScale(newScale);
      canvasViewport.scale = newScale;
    }
    updateScale();
    const ro = new ResizeObserver(updateScale);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // ─── File drag-and-drop ───────────────────────────────────────────────────
  // Only activate when the dragged payload actually contains Files, so that
  // dragging canvas elements around never triggers the dashed outline.
  const handleDragOver = useCallback((e) => {
    if (!isEditing) return;
    if (!e.dataTransfer.types.includes('Files')) return;
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
    const src = await uploadImage(file, page.pageId);
    addElement(createImageElement({ x, y, src, alt: file.name }));
  }, [isEditing, scale, addElement, page.pageId]);

  // ─── Lasso (desktop mouse, background canvas only) ────────────────────────
  const LASSO_THRESHOLD = 6;

  const handleCanvasMouseDown = useCallback((e) => {
    if (!isEditing) return;
    if (e.button !== 0) return;
    if (e.target !== canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    lassoStartRef.current = {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top)  / scale,
    };
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

  // ─── Render ────────────────────────────────────────────────────────────────
  const elementEntries = Object.entries(page.elements);
  const isMultiSelect  = isEditing && selectedElementIds.length > 1;

  return (
    <div
      ref={containerRef}
      className="w-full overflow-x-hidden"
      style={{ minHeight: page.theme.height * scale }}
    >
      <div
        ref={canvasRef}
        style={{
          width: page.theme.width,
          height: page.theme.height,
          backgroundColor: page.theme.backgroundColor,
          backgroundImage: page.theme.backgroundImage ? `url(${page.theme.backgroundImage})` : 'none',
          backgroundRepeat: 'repeat',
          position: 'relative',
          transformOrigin: 'top left',
          transform: `scale(${scale})`,
          marginBottom: `${(page.theme.height * scale) - page.theme.height}px`,
          outline: isDragOver && isEditing ? '3px dashed #aa3bff' : 'none',
          // Prevent text-highlighting during lasso drag
          userSelect: isEditing ? 'none' : undefined,
        }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {elementEntries.map(([id, data]) => {
          if (data.type === 'text')  return <TextNode  key={id} id={id} data={data} scale={scale} />;
          if (data.type === 'image') return <ImageNode key={id} id={id} data={data} scale={scale} />;
          if (data.type === 'shape') return <ShapeNode key={id} id={id} data={data} scale={scale} />;
          return null;
        })}

        {/* Multi-select bounding-box dragger */}
        {isMultiSelect && (
          <MultiSelectBox
            selectedIds={selectedElementIds}
            elements={page.elements}
            scale={scale}
            setMultiDragOffset={setMultiDragOffset}
            moveElements={moveElements}
          />
        )}

        {/* Lasso box overlay */}
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

        {/* Empty-state hint */}
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

// ─── MultiSelectBox ──────────────────────────────────────────────────────────
/**
 * Amber dashed bounding-box rendered over all selected elements.
 * Uses pointer-capture so dragging works on both desktop and touch.
 * During drag, updates canvasStore.multiDragOffset so each selected element
 * visually follows the box in real-time.  On release, commits final positions.
 */
const MultiSelectBox = React.memo(function MultiSelectBox({
  selectedIds, elements, scale, setMultiDragOffset, moveElements,
}) {
  const dragRef = useRef(null);
  const [offset, setOffset] = useState({ dx: 0, dy: 0 });

  const validIds = selectedIds.filter((id) => elements[id]);
  if (validIds.length < 2) return null;

  const xs  = validIds.map((id) => elements[id].x);
  const ys  = validIds.map((id) => elements[id].y);
  const x2s = validIds.map((id) => elements[id].x + (typeof elements[id].width  === 'number' ? elements[id].width  : 100));
  const y2s = validIds.map((id) => elements[id].y + (typeof elements[id].height === 'number' ? elements[id].height : 40));

  const PAD = 6;
  const bx = Math.min(...xs)  - PAD;
  const by = Math.min(...ys)  - PAD;
  const bw = Math.max(...x2s) - Math.min(...xs) + PAD * 2;
  const bh = Math.max(...y2s) - Math.min(...ys) + PAD * 2;

  function handlePointerDown(e) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { sx: e.clientX, sy: e.clientY };
  }

  function handlePointerMove(e) {
    if (!dragRef.current) return;
    const dx = (e.clientX - dragRef.current.sx) / scale;
    const dy = (e.clientY - dragRef.current.sy) / scale;
    setOffset({ dx, dy });
    setMultiDragOffset({ dx, dy });
  }

  function handlePointerUp(e) {
    if (!dragRef.current) return;
    const dx = (e.clientX - dragRef.current.sx) / scale;
    const dy = (e.clientY - dragRef.current.sy) / scale;
    dragRef.current = null;

    const patches = {};
    validIds.forEach((id) => {
      const el = elements[id];
      if (el) patches[id] = { x: Math.round(el.x + dx), y: Math.round(el.y + dy) };
    });
    moveElements(patches);

    setOffset({ dx: 0, dy: 0 });
    setMultiDragOffset({ dx: 0, dy: 0 });
  }

  return (
    <div
      style={{
        position: 'absolute',
        left:   bx + offset.dx,
        top:    by + offset.dy,
        width:  bw,
        height: bh,
        border: '2px dashed #f59e0b',
        borderRadius: 4,
        backgroundColor: 'rgba(245,158,11,0.06)',
        cursor: 'move',
        zIndex: 10000,
        boxSizing: 'border-box',
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <span
        style={{
          position: 'absolute',
          bottom: -20,
          left: 0,
          fontSize: 10,
          color: '#f59e0b',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          fontFamily: 'monospace',
        }}
      >
        {validIds.length} selected · drag to move
      </span>
    </div>
  );
});

export default PageCanvas;
