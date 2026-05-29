import React, { useRef, useState } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { useAuthStore } from '../../store/authStore';
import { createTextElement, createImageElement, createShapeElement } from '../../utils/elementFactory';
import ToolbarButton from './ToolbarButton';
import CollaboratorsModal from './CollaboratorsModal';

/**
 * EditorToolbar — adds elements, toggles edit mode, shows save status, and
 * opens the collaborators/share modal.
 *
 * Edit mode is gated: button only appears if the current user has permission.
 */
function EditorToolbar() {
  const { isEditing, setEditing, addElement, canUserEdit, page, isSaving } = useCanvasStore();
  const { user } = useAuthStore();
  const fileInputRef = useRef(null);
  const [showShare, setShowShare] = useState(false);

  const canEdit    = canUserEdit(user?.uid ?? null);
  const isOwner    = user?.uid && user.uid === page.ownerId;

  function handleAddText()  { addElement(createTextElement({ x: 80, y: 80 })); }
  function handleAddShape(shape) { addElement(createShapeElement({ x: 100, y: 100, shape })); }

  function handleImageFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    addElement(createImageElement({ x: 100, y: 100, src: objectUrl, alt: file.name }));
    e.target.value = '';
    // Phase 2: upload to Firebase Storage then replace src
  }

  function handleEditToggle() {
    if (!canEdit) return;
    setEditing(!isEditing);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap px-3 py-2 bg-black/60 border-b border-white/10 backdrop-blur min-h-[44px]">

      {/* Page title */}
      <span className="text-white/60 text-xs font-mono truncate max-w-[160px] hidden sm:block">
        sw://{page.pageId}
      </span>

      {canEdit && (
        <>
          <div className="w-px h-5 bg-white/20 hidden sm:block" />

          {/* Edit mode toggle */}
          <ToolbarButton onClick={handleEditToggle} active={isEditing} title="Toggle edit mode">
            {isEditing ? '✏️ Editing' : '👁 View'}
          </ToolbarButton>
        </>
      )}

      {isEditing && (
        <>
          <div className="w-px h-5 bg-white/20" />

          <ToolbarButton onClick={handleAddText}                  title="Add a text box">T Text</ToolbarButton>
          <ToolbarButton onClick={() => fileInputRef.current?.click()} title="Add an image">🖼 Image</ToolbarButton>
          <ToolbarButton onClick={() => handleAddShape('rectangle')}    title="Add rectangle">▭ Rect</ToolbarButton>
          <ToolbarButton onClick={() => handleAddShape('circle')}        title="Add circle">◯ Circle</ToolbarButton>
          <ToolbarButton onClick={() => handleAddShape('triangle')}      title="Add triangle">△ Tri</ToolbarButton>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Share button (owner only) */}
      {isOwner && (
        <ToolbarButton onClick={() => setShowShare(true)} title="Share & Collaborators">
          🔗 Share
        </ToolbarButton>
      )}

      {/* Save status */}
      {isEditing && (
        <span className={`text-xs shrink-0 ${isSaving ? 'text-yellow-400' : 'text-white/30'}`}>
          {isSaving ? '● Saving…' : '✓ Saved'}
        </span>
      )}

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFileChange} />

      {showShare && <CollaboratorsModal onClose={() => setShowShare(false)} />}
    </div>
  );
}

export default EditorToolbar;
