import React, { useCallback, useState, useRef } from 'react';
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
  // refs for canvas-based pause capture
  const imgRef       = useRef(null);
  const gifCanvasRef = useRef(null);

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
      // Capture the current GIF frame onto a canvas element so it appears "frozen"
      const img = imgRef.current;
      const cvs = gifCanvasRef.current;
      if (img && cvs) {
        cvs.width  = img.naturalWidth  || img.clientWidth  || 200;
        cvs.height = img.naturalHeight || img.clientHeight || 200;
        try { cvs.getContext('2d').drawImage(img, 0, 0, cvs.width, cvs.height); } catch (_) {}
      }
      setGifPlaying(false);
    } else {
      setGifKey((k) => k + 1); // restart GIF from frame 0
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
    >
      {/* Live GIF (shown when playing) */}
      <img
        ref={imgRef}
        key={gifKey}
        src={data.src}
        alt={data.alt ?? ''}
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        style={{
          width: '100%', height: '100%', objectFit: 'cover', display: gifPlaying ? 'block' : 'none',
          userSelect: 'none', pointerEvents: 'none',
        }}
        onError={(e) => { e.currentTarget.style.opacity = '0.3'; }}
      />

      {/* Frozen frame canvas (shown when paused) */}
      {gif && (
        <canvas
          ref={gifCanvasRef}
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            display: gifPlaying ? 'none' : 'block',
            userSelect: 'none', pointerEvents: 'none',
          }}
        />
      )}

      {/* GIF play/pause button — visible in view mode; always shown so it works on touch */}
      {gif && !isEditing && (
        <button
          onClick={toggleGif}
          style={{
            position: 'absolute', bottom: 6, right: 6,
            background: 'rgba(0,0,0,0.65)', color: '#fff',
            border: 'none', borderRadius: 4, padding: '3px 9px',
            fontSize: 13, cursor: 'pointer', zIndex: 10,
            opacity: 0.85,
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
