import React, { useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { useCanvasStore } from '../../store/canvasStore';
import { useTabStore } from '../../store/tabStore';

/**
 * GroupNode — a container that holds multiple child elements as a single unit.
 *
 * Behaviour:
 *  - In edit mode the group as a whole can be dragged and resized via react-rnd.
 *  - On resize, all children are scaled proportionally so the layout is preserved.
 *  - Children are rendered as static (non-interactive) visuals inside the group.
 *  - Group-level rotation is applied via CSS transform.
 *  - Ungrouping is triggered from the PropertyPanel; children are returned to the
 *    canvas at their absolute positions.
 */
const GroupNode = React.memo(function GroupNode({ id, data, scale = 1 }) {
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
    const newWidth  = parseInt(ref.style.width,  10);
    const newHeight = parseInt(ref.style.height, 10);
    const scaleX = data.width  > 0 ? newWidth  / data.width  : 1;
    const scaleY = data.height > 0 ? newHeight / data.height : 1;

    // Proportionally scale all child positions and sizes
    const newChildren = {};
    Object.entries(data.children ?? {}).forEach(([cid, child]) => {
      newChildren[cid] = {
        ...child,
        x: Math.round(child.x * scaleX),
        y: Math.round(child.y * scaleY),
        ...(typeof child.width  === 'number' ? { width:  Math.round(child.width  * scaleX) } : {}),
        ...(typeof child.height === 'number' ? { height: Math.round(child.height * scaleY) } : {}),
      };
    });

    commitElement(id, { width: newWidth, height: newHeight, x: pos.x, y: pos.y, children: newChildren });
  }, [id, data.width, data.height, data.children, commitElement]);

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

  // Apply group-level opacity from style if present
  const groupOpacity = data.style?.opacity ?? 1;

  const inner = (
    <div
      style={{
        width: '100%',
        height: '100%',
        outline: selectionRing,
        cursor: isEditing ? (isSoleSelected ? 'move' : 'default') : data.href ? 'pointer' : 'default',
        boxSizing: 'border-box',
        position: 'relative',
        transform: `rotate(${data.rotation ?? 0}deg)`,
        opacity: groupOpacity,
        overflow: 'visible',
      }}
      onClick={handleClick}
    >
      {Object.entries(data.children ?? {}).map(([cid, child]) =>
        renderStaticChild(cid, child)
      )}
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

// ─── Static child renderer ───────────────────────────────────────────────────
// Children inside a group are rendered as pure visuals — no Rnd, no event
// handlers. They can only be edited individually after ungrouping.

function renderStaticChild(cid, child) {
  let content = null;

  if (child.type === 'text') {
    content = (
      <div style={{
        width: '100%', height: '100%',
        color: child.style?.color ?? '#ffffff',
        fontSize: child.style?.fontSize ?? '18px',
        fontFamily: child.style?.fontFamily ?? 'Comic Sans MS',
        fontWeight: child.style?.fontWeight,
        textAlign: child.style?.textAlign ?? 'left',
        padding: child.style?.padding ?? '4px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {child.content}
      </div>
    );
  } else if (child.type === 'image') {
    content = (
      <img
        src={child.src}
        alt={child.alt ?? ''}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        draggable={false}
      />
    );
  } else if (child.type === 'shape') {
    if (child.shape === 'triangle') {
      content = (
        <div style={{
          width: 0, height: 0,
          borderLeft:   `${(child.width  ?? 150) / 2}px solid transparent`,
          borderRight:  `${(child.width  ?? 150) / 2}px solid transparent`,
          borderBottom: `${child.height ?? 150}px solid ${child.style?.backgroundColor ?? '#aa3bff'}`,
        }} />
      );
    } else {
      content = (
        <div style={{
          width: '100%', height: '100%',
          backgroundColor: child.style?.backgroundColor ?? '#aa3bff',
          borderRadius: child.shape === 'circle' ? '50%' : child.style?.borderRadius ?? '0%',
          opacity: child.style?.opacity ?? 1,
        }} />
      );
    }
  } else if (child.type === 'button') {
    content = (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: child.style?.backgroundColor ?? '#aa3bff',
        color: child.style?.color ?? '#ffffff',
        fontSize: child.style?.fontSize ?? '16px',
        fontFamily: child.style?.fontFamily,
        borderRadius: child.style?.borderRadius ?? '8px',
        boxSizing: 'border-box',
        userSelect: 'none',
        border: child.style?.border,
        boxShadow: child.style?.boxShadow,
      }}>
        {child.label ?? 'Button'}
      </div>
    );
  } else if (child.type === 'list') {
    content = (
      <div style={{
        width: '100%', height: '100%',
        overflowY: 'auto',
        backgroundColor: child.style?.backgroundColor ?? '#1e1e1e',
        color: child.style?.color ?? '#ffffff',
        fontSize: child.style?.fontSize ?? '14px',
        padding: '4px',
        boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', gap: '4px',
      }}>
        {(child.items ?? []).map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 4px' }}>
            {item.imageUrl && (
              <img src={item.imageUrl} alt="" style={{ width: 24, height: 24, objectFit: 'cover', borderRadius: 2 }} draggable={false} />
            )}
            <span>{item.text}</span>
          </div>
        ))}
      </div>
    );
  } else if (child.type === 'embed') {
    content = (
      <div style={{
        width: '100%', height: '100%',
        backgroundColor: '#111',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#555', fontSize: '12px', fontFamily: 'sans-serif',
      }}>
        ▶ Embed
      </div>
    );
  }

  return (
    <div
      key={cid}
      style={{
        position: 'absolute',
        left: child.x, top: child.y,
        width: child.width, height: child.height,
        zIndex: child.zIndex ?? 1,
        transform: `rotate(${child.rotation ?? 0}deg)`,
        pointerEvents: 'none',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: child.type === 'shape' && child.shape === 'triangle' ? 'flex-end' : 'stretch',
        justifyContent: child.type === 'shape' && child.shape === 'triangle' ? 'center' : 'stretch',
      }}
    >
      {content}
    </div>
  );
}

export default GroupNode;
