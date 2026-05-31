import React, { useCallback, useRef } from 'react';
import { Rnd } from 'react-rnd';
import { useCanvasStore } from '../../store/canvasStore';
import { useTabStore } from '../../store/tabStore';

/**
 * ImageNode — renders an image/GIF element on the canvas.
 *
 * - Clicking an image with an href navigates the Meta-Browser (intercepted link)
 * - Shift+click adds to multi-selection
 * - In editor mode: draggable/resizable via react-rnd
 */
const ImageNode = React.memo(function ImageNode({ id, data, scale = 1 }) {
  const {
    updateElement, selectElement, addToSelection, moveElements,
    selectedElementId, selectedElementIds, isEditing, commitElement,
  } = useCanvasStore();
  const navigateTo   = useTabStore((s) => s.navigateTo);
  const openInNewTab = useTabStore((s) => s.openInNewTab);
  const isSelected      = selectedElementId === id;
  const isMultiSelected = selectedElementIds.includes(id);
  const dragStartRef = useRef(null);

  const handleDragStart = useCallback((_e, d) => {
    dragStartRef.current = { x: d.x, y: d.y };
  }, []);

  const handleDragStop = useCallback((_e, d) => {
    const { selectedElementIds: ids, page } = useCanvasStore.getState();
    if (ids.length > 1 && ids.includes(id)) {
      const dx = d.x - (dragStartRef.current?.x ?? data.x);
      const dy = d.y - (dragStartRef.current?.y ?? data.y);
      const patches = {};
      ids.forEach((sid) => {
        const el = page.elements[sid];
        if (el) patches[sid] = { x: el.x + dx, y: el.y + dy };
      });
      moveElements(patches);
    } else {
      commitElement(id, { x: d.x, y: d.y });
    }
    dragStartRef.current = null;
  }, [id, data.x, data.y, commitElement, moveElements]);

  const handleResizeStop = useCallback((_e, _dir, ref, _delta, pos) => {
    commitElement(id, {
      width: parseInt(ref.style.width, 10),
      height: parseInt(ref.style.height, 10),
      x: pos.x,
      y: pos.y,
    });
  }, [id, commitElement]);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    if (!isEditing && data.href) {
      // Intercept link — navigate inside Meta-Browser instead of real nav
      e.preventDefault();
      if (data.target === '_blank') {
        openInNewTab(data.href, data.title);
      } else {
        navigateTo(data.href, data.title);
      }
      return;
    }
    if (e.shiftKey && isEditing) {
      addToSelection(id);
      return;
    }
    selectElement(id);
  }, [id, isEditing, data.href, data.target, data.title, selectElement, addToSelection, navigateTo, openInNewTab]);

  const selectionRing = (isSelected || isMultiSelected) && isEditing
    ? `2px solid ${isMultiSelected && selectedElementIds.length > 1 ? '#f59e0b' : '#aa3bff'}`
    : '2px solid transparent';

  const imgEl = (
    <div
      style={{
        width: '100%',
        height: '100%',
        outline: selectionRing,
        cursor: isEditing ? 'move' : data.href ? 'pointer' : 'default',
        overflow: 'hidden',
        boxSizing: 'border-box',
        transform: `rotate(${data.rotation ?? 0}deg)`,
        ...data.style,
      }}
      onClick={handleClick}
    >
      <img
        src={data.src}
        alt={data.alt ?? ''}
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', userSelect: 'none', pointerEvents: 'none' }}
        onError={(e) => { e.currentTarget.style.opacity = '0.3'; }}
      />
    </div>
  );

  if (!isEditing) {
    return (
      <div
        style={{
          position: 'absolute',
          left: data.x,
          top: data.y,
          width: data.width,
          height: data.height,
          zIndex: data.zIndex ?? 1,
        }}
      >
        {imgEl}
      </div>
    );
  }

  return (
    <Rnd
      size={{ width: data.width, height: data.height }}
      position={{ x: data.x, y: data.y }}
      onDragStart={handleDragStart}
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
      disableDragging={!isSelected && !isMultiSelected}
      style={{ zIndex: data.zIndex ?? 1 }}
      scale={scale}
      bounds="parent"
    >
      {imgEl}
    </Rnd>
  );
});

export default ImageNode;
