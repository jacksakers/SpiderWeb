import React, { useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { useCanvasStore } from '../../store/canvasStore';
import { toEmbedUrl } from '../../utils/elementFactory';

/**
 * EmbedNode — renders a YouTube, Spotify, SoundCloud, or generic iframe.
 *
 * In edit mode the iframe is covered by a pointer-events-none overlay so
 * drag/resize still works.  In view mode the iframe is fully interactive.
 */
const EmbedNode = React.memo(function EmbedNode({ id, data, scale = 1 }) {
  const {
    selectElement, addToSelection,
    selectedElementId, selectedElementIds, multiDragOffset, multiSelectMode,
    isEditing, commitElement,
  } = useCanvasStore();

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

  const embedUrl = toEmbedUrl(data.url, data.embedType ?? 'generic');
  const hasUrl   = !!data.url;

  const inner = (
    <div
      style={{
        width: '100%',
        height: '100%',
        outline: selectionRing,
        boxSizing: 'border-box',
        backgroundColor: '#000',
        overflow: 'hidden',
        transform: `rotate(${data.rotation ?? 0}deg)`,
        position: 'relative',
      }}
      onClick={handleClick}
    >
      {hasUrl ? (
        <iframe
          src={embedUrl}
          title="Embedded media"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
        />
      ) : (
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          color: 'rgba(255,255,255,0.3)', fontSize: '13px', gap: 8,
        }}>
          <span style={{ fontSize: 32 }}>▶</span>
          <span>Paste a YouTube, Spotify, or SoundCloud URL in Properties</span>
        </div>
      )}

      {/* Edit-mode overlay — blocks pointer events to the iframe so drag/resize works */}
      {isEditing && (
        <div
          style={{
            position: 'absolute', inset: 0,
            cursor: isSoleSelected ? 'move' : 'default',
            pointerEvents: 'all',
          }}
          onClick={handleClick}
        />
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

export default EmbedNode;
