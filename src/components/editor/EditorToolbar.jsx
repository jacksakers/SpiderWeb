import React, { useRef } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { createTextElement, createImageElement, createShapeElement } from '../../utils/elementFactory';
import ToolbarButton from './ToolbarButton';

/**
 * EditorToolbar — floating toolbar for adding elements and toggling edit mode.
 *
 * Add Text → createTextElement → canvasStore.addElement
 * Add Image → triggers a hidden <input type="file"> for Phase 1 local preview
 *             (Phase 2: upload to Firebase Storage first, then add element)
 * Add Shape → prompts shape selection then creates ShapeNode
 */
function EditorToolbar() {
  const { isEditing, toggleEditing, addElement } = useCanvasStore();
  const fileInputRef = useRef(null);

  function handleAddText() {
    addElement(createTextElement({ x: 80, y: 80 }));
  }

  function handleAddShape(shape) {
    addElement(createShapeElement({ x: 100, y: 100, shape }));
  }

  function handleImageFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    addElement(createImageElement({ x: 100, y: 100, src: objectUrl, alt: file.name }));
    // Reset so the same file can be re-selected
    e.target.value = '';
  }

  return (
    <div className="flex items-center gap-2 flex-wrap p-2 bg-black/60 border-b border-white/10 backdrop-blur">
      {/* Edit Mode Toggle */}
      <ToolbarButton onClick={toggleEditing} active={isEditing} title="Toggle edit mode">
        {isEditing ? '✏️ Editing' : '👁 View'}
      </ToolbarButton>

      {isEditing && (
        <>
          <div className="w-px h-5 bg-white/20" />

          {/* Add Elements */}
          <ToolbarButton onClick={handleAddText} title="Add a text box">
            T Text
          </ToolbarButton>

          <ToolbarButton onClick={() => fileInputRef.current?.click()} title="Add an image">
            🖼 Image
          </ToolbarButton>

          <ToolbarButton onClick={() => handleAddShape('rectangle')} title="Add rectangle">
            ▭ Rect
          </ToolbarButton>

          <ToolbarButton onClick={() => handleAddShape('circle')} title="Add circle">
            ◯ Circle
          </ToolbarButton>

          <ToolbarButton onClick={() => handleAddShape('triangle')} title="Add triangle">
            △ Triangle
          </ToolbarButton>
        </>
      )}

      {/* Hidden file input for image picking */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFileChange}
      />
    </div>
  );
}

export default EditorToolbar;
