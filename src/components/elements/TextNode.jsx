import React, { useState, useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { useCanvasStore } from '../../store/canvasStore';
import { useTabStore } from '../../store/tabStore';

/**
 * TextNode — renders a single text element on the canvas.
 *
 * Edit mode rules:
 *  - Only the singly-selected element can be dragged/resized via react-rnd.
 *  - When ≥2 elements are selected, all are locked; the MultiSelectBox handles movement.
 *  - multiDragOffset (store) is applied as a real-time position shift so elements
 *    visually follow the amber bounding box during a group drag.
 *  - Shift+click or multiSelectMode tap adds to the selection.
 *  - Double-click or PropertyPanel textarea for inline text editing.
 */
const TextNode = React.memo(function TextNode({ id, data, scale = 1 }) {
  const {
    updateElement, selectElement, addToSelection,
    selectedElementId, selectedElementIds, multiDragOffset, multiSelectMode,
    isEditing, commitElement,
  } = useCanvasStore();
  const navigateTo   = useTabStore((s) => s.navigateTo);
  const openInNewTab = useTabStore((s) => s.openInNewTab);

  const isSelected      = selectedElementId === id;
  const isInGroup       = selectedElementIds.length > 1 && selectedElementIds.includes(id);
  // Resize/drag only when this is the ONE selected element
  const isSoleSelected  = isSelected && selectedElementIds.length === 1;

  const [localText, setLocalText] = useState(data.content);
  const [textEditing, setTextEditing] = useState(false);

  // Keep localText in sync when content is changed from the PropertyPanel textarea
  React.useEffect(() => { setLocalText(data.content); }, [data.content]);

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

  const handleDoubleClick = useCallback((e) => {
    if (!isEditing) return;
    e.stopPropagation();
    setTextEditing(true);
  }, [isEditing]);

  const handleBlur = useCallback(() => {
    setTextEditing(false);
    updateElement(id, { content: localText });
  }, [id, localText, updateElement]);

  const selectionRing = (isSelected || isInGroup) && isEditing
    ? `2px solid ${isInGroup ? '#f59e0b' : '#aa3bff'}`
    : '2px solid transparent';

  // During a group drag, shift this element by the live offset so it moves in sync
  const liveX = isInGroup ? data.x + multiDragOffset.dx : data.x;
  const liveY = isInGroup ? data.y + multiDragOffset.dy : data.y;

  const content = (
    <div
      style={{
        width: '100%',
        height: '100%',
        outline: selectionRing,
        cursor: isEditing ? (isSoleSelected ? 'move' : 'default') : data.href ? 'pointer' : 'default',
        boxSizing: 'border-box',
        padding: '4px',
        overflow: 'hidden',
        transform: `rotate(${data.rotation ?? 0}deg)`,
        ...data.style,
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {textEditing ? (
        <textarea
          autoFocus
          value={localText}
          onChange={(e) => setLocalText(e.target.value)}
          onBlur={handleBlur}
          style={{
            width: '100%', height: '100%',
            background: 'transparent', border: 'none', outline: 'none',
            resize: 'none', color: 'inherit', fontSize: 'inherit',
            fontFamily: 'inherit', textAlign: 'inherit',
          }}
        />
      ) : (
        <p style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {data.content}
        </p>
      )}
    </div>
  );

  if (!isEditing) {
    return (
      <div style={{ position: 'absolute', left: data.x, top: data.y, width: data.width === 'auto' ? 'auto' : data.width, height: data.height === 'auto' ? 'auto' : data.height, zIndex: data.zIndex ?? 1 }}>
        {content}
      </div>
    );
  }

  return (
    <Rnd
      size={{ width: data.width, height: data.height }}
      position={{ x: liveX, y: liveY }}
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
      disableDragging={textEditing || !isSoleSelected}
      enableResizing={isSoleSelected}
      style={{ zIndex: data.zIndex ?? 1 }}
      scale={scale}
      bounds="parent"
    >
      {content}
    </Rnd>
  );
});

export default TextNode;
