import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { calculateScaleFactor, clientToCanvasCoords, canvasViewport } from '../../utils/canvasGeometry';
import { createImageElement } from '../../utils/elementFactory';
import { uploadImage } from '../../utils/imageUpload';
import { GRID_SIZE } from '../../constants/canvas';
import TextNode from '../elements/TextNode';
import ImageNode from '../elements/ImageNode';
import ShapeNode from '../elements/ShapeNode';
import ButtonNode from '../elements/ButtonNode';
import ListNode from '../elements/ListNode';
import EmbedNode from '../elements/EmbedNode';
import GroupNode from '../elements/GroupNode';

/**
 * PageCanvas — the fixed-coordinate drawing surface.
 *
 * Responsibilities:
 *  - Renders all elements from the active page blueprint
 *  - Applies mobile zoom via CSS scale
 *  - Handles drag-and-drop of image files from the desktop (editor mode)
 *  - Lasso selection: drag on empty canvas to box-select elements
 *  - MultiSelectBox: drag bounding-box to move grouped elements together
 *  - Grid overlay: shown when snapToGrid is enabled
 *  - Sticky element overlay: elements flagged sticky render in a fixed layer
 */
function PageCanvas() {
  const {
    page, isEditing, clearSelection, addElement,
    selectElements, moveElements, setMultiDragOffset,
    selectedElementIds, snapToGrid,
  } = useCanvasStore();

  const containerRef  = useRef(null);
  const canvasRef     = useRef(null);
  const [scale, setScale]       = useState(1);
  const [isDragOver, setIsDragOver] = useState(false);
  // Track scroll position so sticky elements can be offset to appear viewport-fixed
  const [scrollTop,  setScrollTop]  = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

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

  // ─── Track scroll for sticky elements ─────────────────────────────────────
  useEffect(() => {
    // canvasViewport.scrollEl is set by MetaBrowser after mount, so we poll briefly
    let el = canvasViewport.scrollEl;
    let cleanupFn = () => {};
    function attach(scrollEl) {
      function onScroll() {
        setScrollTop(scrollEl.scrollTop);
        setScrollLeft(scrollEl.scrollLeft);
      }
      scrollEl.addEventListener('scroll', onScroll, { passive: true });
      onScroll(); // sync initial position
      cleanupFn = () => scrollEl.removeEventListener('scroll', onScroll);
    }
    if (el) {
      attach(el);
    } else {
      // scrollEl set asynchronously; retry a few times
      let attempts = 0;
      const timer = setInterval(() => {
        el = canvasViewport.scrollEl;
        if (el || attempts++ > 20) {
          clearInterval(timer);
          if (el) attach(el);
        }
      }, 100);
      cleanupFn = () => clearInterval(timer);
    }
    return () => cleanupFn();
  }, []);

  // ─── File drag-and-drop ───────────────────────────────────────────────────
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

  // Separate sticky vs regular elements
  const regularEntries = elementEntries.filter(([, d]) => !d.sticky);
  const stickyEntries  = elementEntries.filter(([, d]) => d.sticky);

  function renderElement(id, data) {
    const props = { id, data, scale };
    if (data.type === 'text')   return <TextNode   key={id} {...props} />;
    if (data.type === 'image')  return <ImageNode  key={id} {...props} />;
    if (data.type === 'shape')  return <ShapeNode  key={id} {...props} />;
    if (data.type === 'button') return <ButtonNode key={id} {...props} />;
    if (data.type === 'list')   return <ListNode   key={id} {...props} />;
    if (data.type === 'embed')  return <EmbedNode  key={id} {...props} />;
    if (data.type === 'group')  return <GroupNode  key={id} {...props} />;
    return null;
  }

  // Build the CSS background string respecting gradient and image
  const bgStyle = {};
  if (page.theme.backgroundGradient) {
    bgStyle.backgroundImage = page.theme.backgroundGradient;
  } else if (page.theme.backgroundImage) {
    bgStyle.backgroundImage = `url(${page.theme.backgroundImage})`;
    bgStyle.backgroundRepeat = 'repeat';
    bgStyle.backgroundSize = 'auto';
  } else {
    bgStyle.backgroundColor = page.theme.backgroundColor;
  }

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
          ...bgStyle,
          position: 'relative',
          transformOrigin: 'top left',
          transform: `scale(${scale})`,
          marginBottom: `${(page.theme.height * scale) - page.theme.height}px`,
          outline: isDragOver && isEditing ? '3px dashed #aa3bff' : 'none',
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
        {/* ── Grid overlay ──────────────────────────────────────────────── */}
        {isEditing && snapToGrid && (
          <div
            style={{
              position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 9998,
              backgroundImage: `
                linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)
              `,
              backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
            }}
          />
        )}

        {regularEntries.map(([id, data]) => renderElement(id, data))}

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

        {/* Sticky elements in edit mode get a yellow dashed border hint */}
        {isEditing && stickyEntries.map(([id, data]) => (
          <div
            key={`sticky-hint-${id}`}
            style={{
              position: 'absolute',
              left: data.x, top: data.y,
              width: data.width, height: data.height,
              pointerEvents: 'none',
              border: '2px dashed #f59e0b',
              zIndex: (data.zIndex ?? 1) + 1,
            }}
          />
        ))}
        {/* Sticky elements: in edit mode render at canvas position (easy to drag/resize);
            in view mode offset by scroll so they appear viewport-fixed */}
        {stickyEntries.map(([id, data]) => {
          if (isEditing) return renderElement(id, data);
          // Scroll-compensate: move element down by scrollTop/scale so it stays
          // at data.y pixels from the top of the visible viewport area
          const stickyData = {
            ...data,
            y: data.y + scrollTop  / scale,
            x: data.x + scrollLeft / scale,
          };
          return renderElement(id, stickyData);
        })}

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
    setOffset({ dx: 0, dy: 0 });
    setMultiDragOffset({ dx: 0, dy: 0 });
    const patches = {};
    validIds.forEach((id) => {
      patches[id] = {
        x: elements[id].x + dx,
        y: elements[id].y + dy,
      };
    });
    moveElements(patches);
  }

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        position: 'absolute',
        left:   bx + offset.dx,
        top:    by + offset.dy,
        width:  bw,
        height: bh,
        border: '2px dashed #f59e0b',
        cursor: 'move',
        zIndex: 9997,
        boxSizing: 'border-box',
        pointerEvents: 'all',
        borderRadius: 2,
      }}
    />
  );
});

export default PageCanvas;
