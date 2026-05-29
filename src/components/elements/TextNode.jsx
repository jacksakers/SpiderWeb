import React, { useState, useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { useCanvasStore } from '../../store/canvasStore';
import { useTabStore } from '../../store/tabStore';

/**
 * TextNode — renders a single text element on the canvas.
 *
 * - Read-only in renderer mode (isEditing=false)
 * - Draggable/resizable in editor mode via react-rnd
 * - Double-click to enter inline text editing
 * - All text rendered as plain string children (never innerHTML) per security rules
 */
const TextNode = React.memo(function TextNode({ id, data, scale = 1 }) {
  const { updateElement, selectElement, selectedElementId, isEditing, commitElement } = useCanvasStore();
  const navigateTo = useTabStore((s) => s.navigateTo);
  const isSelected = selectedElementId === id;

  const [localText, setLocalText] = useState(data.content);
  const [textEditing, setTextEditing] = useState(false);

  const handleDragStop = useCallback((_e, d) => {
    commitElement(id, { x: d.x, y: d.y });
  }, [id, commitElement]);

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
      e.preventDefault();
      navigateTo(data.href);
      return;
    }
    selectElement(id);
  }, [id, isEditing, data.href, selectElement, navigateTo]);

  const handleDoubleClick = useCallback((e) => {
    if (!isEditing) return;
    e.stopPropagation();
    setTextEditing(true);
  }, [isEditing]);

  const handleBlur = useCallback(() => {
    setTextEditing(false);
    updateElement(id, { content: localText });
  }, [id, localText, updateElement]);

  const selectionRing = isSelected && isEditing
    ? '2px solid #aa3bff'
    : '2px solid transparent';

  const content = (
    <div
      style={{
        width: '100%',
        height: '100%',
        outline: selectionRing,
        cursor: isEditing ? 'move' : data.href ? 'pointer' : 'default',
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
            width: '100%',
            height: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            color: 'inherit',
            fontSize: 'inherit',
            fontFamily: 'inherit',
            textAlign: 'inherit',
          }}
        />
      ) : (
        // Render as plain text — XSS-safe
        <p style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {data.content}
        </p>
      )}
    </div>
  );

  if (!isEditing) {
    // Pure renderer — no drag handles
    return (
      <div
        style={{
          position: 'absolute',
          left: data.x,
          top: data.y,
          width: data.width === 'auto' ? 'auto' : data.width,
          height: data.height === 'auto' ? 'auto' : data.height,
          zIndex: data.zIndex ?? 1,
        }}
      >
        {content}
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
      scale={scale}
      bounds="parent"
      disableDragging={textEditing}
    >
      {content}
    </Rnd>
  );
});

export default TextNode;
