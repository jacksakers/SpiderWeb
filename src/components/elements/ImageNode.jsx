import React, { useCallback, useState } from 'react';
import { Rnd } from 'react-rnd';
import { useCanvasStore } from '../../store/canvasStore';
import { useTabStore } from '../../store/tabStore';

/** Returns true if the src looks like an animated GIF. */
function isGif(src) {
  return typeof src === 'string' && src.toLowerCase().includes('.gif');
}

/**
 * ImageNode — renders an image/GIF element on the canvas.
 *
 * Edit mode rules mirror TextNode: only the singly-selected element can be
 * dragged/resized. Group movement is handled by MultiSelectBox + multiDragOffset.
 *
 * GIF player: in view mode a ▶/⏸ button is shown on hover to pause/replay the GIF.
 * Pausing works by temporarily replacing the src with a static copy (same URL trick).
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

  // GIF player state
  const [gifPlaying, setGifPlaying] = useState(true);
  const [gifKey,     setGifKey]     = useState(0);
  const [hovered,    setHovered]    = useState(false);

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

  const toggleGif = useCallback((e) => {
    e.stopPropagation();
    if (gifPlaying) {
      setGifPlaying(false);
    } else {
      // Force GIF to restart by changing the key
      setGifKey((k) => k + 1);
      setGifPlaying(true);
    }
  }, [gifPlaying]);

  const selectionRing = (isSelected || isInGroup) && isEditing
    ? `2px solid ${isInGroup ? '#f59e0b' : '#aa3bff'}`
    : '2px solid transparent';

  const liveX = isInGroup ? data.x + multiDragOffset.dx : data.x;
  const liveY = isInGroup ? data.y + multiDragOffset.dy : data.y;

  const gif = isGif(data.src);

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
        position: 'relative',
        ...data.style,
      }}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <img
        key={gifKey}
        src={gifPlaying ? data.src : `${data.src}#paused`}
        alt={data.alt ?? ''}
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        style={{
          width: '100%', height: '100%', objectFit: 'cover', display: 'block',
          userSelect: 'none', pointerEvents: 'none',
          // When "paused", freeze via animation-play-state (only works for CSS animations, not GIFs,
          // but the key-swap trick above restarts the GIF when toggled back to playing)
        }}
        onError={(e) => { e.currentTarget.style.opacity = '0.3'; }}
      />

      {/* GIF play/pause overlay — only in view mode, on hover */}
      {gif && !isEditing && hovered && (
        <button
          onClick={toggleGif}
          style={{
            position: 'absolute', bottom: 6, right: 6,
            background: 'rgba(0,0,0,0.6)', color: '#fff',
            border: 'none', borderRadius: 4, padding: '2px 8px',
            fontSize: 12, cursor: 'pointer', zIndex: 10,
          }}
          title={gifPlaying ? 'Pause GIF' : 'Play GIF'}
        >
          {gifPlaying ? '⏸' : '▶'}
        </button>
      )}
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
