import React, { useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { useCanvasStore } from '../../store/canvasStore';
import { useTabStore } from '../../store/tabStore';

/**
 * ButtonNode — a pre-styled clickable button element.
 *
 * In view mode: clicking navigates to data.href (page ID).
 * In edit mode: behaves like other nodes (drag/resize/select).
 */
const ButtonNode = React.memo(function ButtonNode({ id, data, scale = 1 }) {
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
      if (data.target === '_blank') openInNewTab(data.href, data.label);
      else navigateTo(data.href, data.label);
      return;
    }
    if (isEditing && (e.shiftKey || multiSelectMode)) {
      addToSelection(id);
      return;
    }
    selectElement(id);
  }, [id, isEditing, data.href, data.target, data.label, multiSelectMode, selectElement, addToSelection, navigateTo, openInNewTab]);

  const selectionRing = (isSelected || isInGroup) && isEditing
    ? `2px solid ${isInGroup ? '#f59e0b' : '#aa3bff'}`
    : '2px solid transparent';

  const liveX = isInGroup ? data.x + multiDragOffset.dx : data.x;
  const liveY = isInGroup ? data.y + multiDragOffset.dy : data.y;

  const buttonEl = (
    <div
      style={{
        width: '100%',
        height: '100%',
        outline: selectionRing,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isEditing ? (isSoleSelected ? 'move' : 'default') : data.href ? 'pointer' : 'default',
        transform: `rotate(${data.rotation ?? 0}deg)`,
        backgroundColor: data.style?.backgroundColor ?? '#aa3bff',
        borderRadius: data.style?.borderRadius ?? '8px',
        color: data.style?.color ?? '#ffffff',
        fontSize: data.style?.fontSize ?? '16px',
        fontFamily: data.style?.fontFamily ?? 'Arial',
        fontWeight: data.style?.fontWeight ?? 'bold',
        border: data.style?.border ?? 'none',
        boxShadow: data.style?.boxShadow ?? '0 2px 8px rgba(0,0,0,0.3)',
        padding: data.style?.padding ?? '0 16px',
        userSelect: 'none',
        transition: 'filter 0.1s',
      }}
      onClick={handleClick}
    >
      {data.label || 'Button'}
    </div>
  );

  if (!isEditing) {
    return (
      <div style={{
        position: 'absolute',
        left: data.x, top: data.y,
        width: data.width, height: data.height,
        zIndex: data.zIndex ?? 1,
      }}>
        {buttonEl}
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
      {buttonEl}
    </Rnd>
  );
});

export default ButtonNode;
