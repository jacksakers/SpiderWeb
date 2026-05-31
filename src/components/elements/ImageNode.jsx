import React, { useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { useCanvasStore } from '../../store/canvasStore';
import { useTabStore } from '../../store/tabStore';

/**
 * ImageNode — renders an image/GIF element on the canvas.
 *
 * Edit mode rules mirror TextNode: only the singly-selected element can be
 * dragged/resized. Group movement is handled by MultiSelectBox + multiDragOffset.
 */
const ImageNode = React.memo(function ImageNode({ id, data, scale = 1 }) {
  const {
    selectElement, addToSelection,
    selectedElementId, selectedElementIds, multiDragOffset, multiSelectMode,
    isEditing, commitElement,
  } = useCanvasStore();
  const navigateTo   = useTabStore((s) => s.navigateTo);
  const openInNewTab = useTabStore((s) => s.openInNewTab);

  const isSelected     = selectedElementId === id;
  const isInGroup      = selectedElementIds.length > 1 && selectedElementIds.includes(id);
  const isSoleSelected = isSelected && selectedElementIds.length === 1;

  const handleDragStop = useCallback((_e, d) => {
    commitElement(id, { x: d.x, y: d.y });
  }, [id, commitElement]);

  const handleResizeStop = useCallback((_e, _dir, ref, _delta, pos) => {
    commitElement(id, {
      width:  parseInt(ref.style.width,  10),
      height: parseInt(ref.style.height, 10),
      x: pos.x,
      y: pos.y,
    });
  }, [id, commitElement]);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    if (!isEditing && data.href) {
      e.preventDefault();
      if (data.target === '_blank') openInNewTab(data.href, data.title);
      else navigateTo(data.href, data.title);
      return;
    }
    if (isEditing && (e.shiftKey || multiSelectMode)) {
      addToSelection(id);
      return;
    }
    selectElement(id);
  }, [id, isEditing, data.href, data.target, data.title, multiSelectMode, selectElement, addToSelection, navigateTo, openInNewTab]);

  const selectionRing = (isSelected || isInGroup) && isEditing
    ? `2px solid ${isInGroup ? '#f59e0b' : '#aa3bff'}`
    : '2px solid transparent';

  const liveX = isInGroup ? data.x + multiDragOffset.dx : data.x;
  const liveY = isInGroup ? data.y + multiDragOffset.dy : data.y;

  const imgEl = (
    <div
      style={{
        width: '100%',
        height: '100%',
        outline: selectionRing,
        cursor: isEditing ? (isSoleSelected ? 'move' : 'default') : data.href ? 'pointer' : 'default',
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
      <div style={{ position: 'absolute', left: data.x, top: data.y, width: data.width, height: data.height, zIndex: data.zIndex ?? 1 }}>
        {imgEl}
      </div>
    );
  }

  return (
    <Rnd
      size={{ width: data.width, height: data.height }}
      position={{ x: liveX, y: liveY }}
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
      disableDragging={!isSoleSelected}
      enableResizing={isSoleSelected}
      style={{ zIndex: data.zIndex ?? 1 }}
      scale={scale}
      bounds="parent"
    >
      {imgEl}
    </Rnd>
  );
});

export default ImageNode;
