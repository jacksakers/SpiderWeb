import React, { useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { useCanvasStore } from '../../store/canvasStore';
import { useTabStore } from '../../store/tabStore';

/**
 * ImageNode — renders an image/GIF element on the canvas.
 *
 * - Clicking an image with an href navigates the Meta-Browser (intercepted link)
 * - In editor mode: draggable/resizable via react-rnd
 * - Phase 2: src will be a Firebase Storage URL
 */
const ImageNode = React.memo(function ImageNode({ id, data }) {
  const { updateElement, selectElement, selectedElementId, isEditing } = useCanvasStore();
  const navigateTo = useTabStore((s) => s.navigateTo);
  const isSelected = selectedElementId === id;

  const handleDragStop = useCallback((_e, d) => {
    updateElement(id, { x: d.x, y: d.y });
  }, [id, updateElement]);

  const handleResizeStop = useCallback((_e, _dir, ref, _delta, pos) => {
    updateElement(id, {
      width: parseInt(ref.style.width, 10),
      height: parseInt(ref.style.height, 10),
      x: pos.x,
      y: pos.y,
    });
  }, [id, updateElement]);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    if (!isEditing && data.href) {
      // Intercept link — navigate inside Meta-Browser instead of real nav
      e.preventDefault();
      navigateTo(data.href);
      return;
    }
    selectElement(id);
  }, [id, isEditing, data.href, selectElement, navigateTo]);

  const selectionRing = isSelected && isEditing
    ? '2px solid #aa3bff'
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
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
      style={{ zIndex: data.zIndex ?? 1 }}
      bounds="parent"
    >
      {imgEl}
    </Rnd>
  );
});

export default ImageNode;
