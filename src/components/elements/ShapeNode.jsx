import React, { useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { useCanvasStore } from '../../store/canvasStore';

/**
 * ShapeNode — rectangle, circle, or triangle shape element.
 *
 * Triangle is achieved via a CSS border trick without any SVG/Canvas API.
 */
const ShapeNode = React.memo(function ShapeNode({ id, data }) {
  const { updateElement, selectElement, selectedElementId, isEditing } = useCanvasStore();
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
    selectElement(id);
  }, [id, selectElement]);

  const selectionRing = isSelected && isEditing ? '2px solid #aa3bff' : '2px solid transparent';

  const isTriangle = data.shape === 'triangle';

  // Triangle uses CSS border trick — resize handles still work via the Rnd wrapper
  const shapeStyle = isTriangle
    ? {
        width: 0,
        height: 0,
        borderLeft: `${(data.width ?? 150) / 2}px solid transparent`,
        borderRight: `${(data.width ?? 150) / 2}px solid transparent`,
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
        cursor: isEditing ? 'move' : 'default',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
      onClick={handleClick}
    >
      <div style={shapeStyle} />
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
        {inner}
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
      {inner}
    </Rnd>
  );
});

export default ShapeNode;
