import React, { useState, useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { useCanvasStore } from '../../store/canvasStore';
import { useTabStore } from '../../store/tabStore';

/**
 * ListNode — a scrollable list/feed element.
 *
 * Items have text, an optional image, and an optional page link.
 * In edit mode: drag, resize, and select like other nodes. Item editing
 * is done via the PropertyPanel.
 */
const ListNode = React.memo(function ListNode({ id, data, scale = 1 }) {
  const {
    selectElement, addToSelection,
    selectedElementId, selectedElementIds, multiDragOffset, multiSelectMode,
    isEditing, commitElement,
  } = useCanvasStore();
  const navigateTo = useTabStore((s) => s.navigateTo);

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
    if (isEditing && (e.shiftKey || multiSelectMode)) {
      addToSelection(id);
      return;
    }
    selectElement(id);
  }, [id, isEditing, multiSelectMode, selectElement, addToSelection]);

  const selectionRing = (isSelected || isInGroup) && isEditing
    ? `2px solid ${isInGroup ? '#f59e0b' : '#aa3bff'}`
    : '2px solid transparent';

  const liveX = isInGroup ? data.x + multiDragOffset.dx : data.x;
  const liveY = isInGroup ? data.y + multiDragOffset.dy : data.y;

  const items = data.items ?? [];
  const bg    = data.style?.backgroundColor ?? '#1e1e1e';
  const color = data.style?.color ?? '#ffffff';
  const fs    = data.style?.fontSize ?? '14px';
  const ff    = data.style?.fontFamily ?? 'Arial';
  const br    = data.style?.borderRadius ?? '8px';

  const inner = (
    <div
      style={{
        width: '100%',
        height: '100%',
        outline: selectionRing,
        boxSizing: 'border-box',
        backgroundColor: bg,
        borderRadius: br,
        overflow: 'hidden',
        cursor: isEditing ? (isSoleSelected ? 'move' : 'default') : 'default',
        display: 'flex',
        flexDirection: 'column',
        transform: `rotate(${data.rotation ?? 0}deg)`,
      }}
      onClick={handleClick}
    >
      {/* Scrollable item list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {items.length === 0 && (
          <p style={{ color: `${color}66`, fontSize: '12px', textAlign: 'center', padding: '12px' }}>
            No items — add some in the Properties panel
          </p>
        )}
        {items.map((item, i) => (
          <div
            key={i}
            onClick={(e) => {
              if (!isEditing && item.link) {
                e.stopPropagation();
                navigateTo(item.link);
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 12px',
              borderBottom: `1px solid ${color}22`,
              cursor: !isEditing && item.link ? 'pointer' : 'default',
            }}
          >
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt=""
                style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            )}
            <span style={{ color, fontSize: fs, fontFamily: ff, flex: 1, wordBreak: 'break-word' }}>
              {item.text}
            </span>
            {!isEditing && item.link && (
              <span style={{ color: '#aa3bff', fontSize: '11px' }}>→</span>
            )}
          </div>
        ))}
      </div>
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

export default ListNode;
