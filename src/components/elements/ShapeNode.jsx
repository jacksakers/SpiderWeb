import React, { useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { useCanvasStore } from '../../store/canvasStore';
import { useTabStore } from '../../store/tabStore';

/**
 * ShapeNode — rectangle, circle, or triangle shape element.
 *
 * Edit mode rules mirror TextNode/ImageNode:
 *  - Only singly-selected element can be dragged/resized.
 *  - Group movement handled by MultiSelectBox + multiDragOffset.
 *  - Triangle is achieved via a CSS border trick (no SVG).
 */
const ShapeNode = React.memo(function ShapeNode({ id, data, scale = 1 }) {
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

  const isTriangle = data.shape === 'triangle';

  const shapeStyle = isTriangle
    ? {
        width: 0,
        height: 0,
        borderLeft:   `${(data.width  ?? 150) / 2}px solid transparent`,
        borderRight:  `${(data.width  ?? 150) / 2}px solid transparent`,
        borderBottom: `${data.height ?? 150}px solid ${data.style?.backgroundColor ?? '#aa3bff'}`,
        backgroundColor: 'transparent',
      }
    : {
        width: '100%',
        height: '100%',
        backgroundColor: data.style?.backgroundColor ?? '#aa3bff',
        borderRadius: data.shape === 'circle' ? '50%' : data.style?.borderRadius ?? '0%',
        opacity: data.style?.opacity ?? 1,
      };

  const inner = (
    <div
      style={{
        width: '100%',
        height: '100%',
        outline: selectionRing,
        cursor: isEditing ? (isSoleSelected ? 'move' : 'default') : data.href ? 'pointer' : 'default',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        transform: `rotate(${data.rotation ?? 0}deg)`,
      }}
      onClick={handleClick}
    >
      <div style={shapeStyle} />
    </div>
  );

  if (!isEditing) {
    return (
      <div style={{ position: 'absolute', left: data.x, top: data.y, width: data.width, height: data.height, zIndex: data.zIndex ?? 1 }}>
        {inner}
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
      {inner}
    </Rnd>
  );
});

export default ShapeNode;
