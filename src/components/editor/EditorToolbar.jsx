import React, { useRef, useState } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { useAuthStore } from '../../store/authStore';
import { createTextElement, createImageElement, createShapeElement } from '../../utils/elementFactory';
import { uploadImage } from '../../utils/imageUpload';
import { canvasViewport } from '../../utils/canvasGeometry';
import {
  DEFAULT_TEXT_WIDTH,  DEFAULT_TEXT_HEIGHT,
  DEFAULT_IMAGE_WIDTH, DEFAULT_IMAGE_HEIGHT,
  DEFAULT_SHAPE_WIDTH, DEFAULT_SHAPE_HEIGHT,
} from '../../constants/canvas';
import ToolbarButton from './ToolbarButton';
import CollaboratorsModal from './CollaboratorsModal';

/**
 * Returns the canvas-space coordinates for the center of the currently
 * visible viewport, offset so the new element is centred there.
 */
function getViewportCenter(elementW, elementH) {
  const { scale, scrollEl } = canvasViewport;
  if (!scrollEl || scale <= 0) return { x: 100, y: 100 };
  const { scrollLeft, scrollTop, clientWidth, clientHeight } = scrollEl;
  const x = scrollLeft / scale + clientWidth  / (2 * scale) - elementW / 2;
  const y = scrollTop  / scale + clientHeight / (2 * scale) - elementH / 2;
  return { x: Math.max(0, Math.round(x)), y: Math.max(0, Math.round(y)) };
}

/**
 * EditorToolbar — adds elements, toggles edit mode, shows save status,
 * lets the owner rename the page title, and opens the collaborators modal.
 */
function EditorToolbar() {
  const { isEditing, setEditing, addElement, canUserEdit, page, isSaving, updatePageTitle } = useCanvasStore();
  const { user } = useAuthStore();
  const fileInputRef = useRef(null);
  const [showShare, setShowShare] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  const canEdit = canUserEdit(user?.uid ?? null);
  const isOwner = user?.uid && user.uid === page.ownerId;

  function handleAddText()  {
    const pos = getViewportCenter(DEFAULT_TEXT_WIDTH, DEFAULT_TEXT_HEIGHT);
    addElement(createTextElement(pos));
  }
  function handleAddShape(shape) {
    const pos = getViewportCenter(DEFAULT_SHAPE_WIDTH, DEFAULT_SHAPE_HEIGHT);
    addElement(createShapeElement({ ...pos, shape }));
  }

  async function handleImageFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const src = await uploadImage(file, page.pageId);
    const pos = getViewportCenter(DEFAULT_IMAGE_WIDTH, DEFAULT_IMAGE_HEIGHT);
    addElement(createImageElement({ ...pos, src, alt: file.name }));
    e.target.value = '';
  }

  function handleEditToggle() {
    if (!canEdit) return;
    setEditing(!isEditing);
  }

  function startTitleEdit() {
    setTitleDraft(page.title ?? '');
    setEditingTitle(true);
  }

  function commitTitleEdit() {
    setEditingTitle(false);
    updatePageTitle(titleDraft);
  }

  function handleTitleKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); commitTitleEdit(); }
    if (e.key === 'Escape') { setEditingTitle(false); }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap px-3 py-2 bg-black/60 border-b border-white/10 backdrop-blur min-h-[44px]">

      {/* Page title — editable for owners in edit mode */}
      {isEditing && isOwner ? (
        editingTitle ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitleEdit}
            onKeyDown={handleTitleKeyDown}
            maxLength={128}
            className="text-white text-xs font-mono bg-white/10 rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-purple-500 max-w-[200px] hidden sm:block"
          />
        ) : (
          <button
            onClick={startTitleEdit}
            title="Rename page"
            className="text-white/60 text-xs font-mono truncate max-w-[200px] hidden sm:block hover:text-white hover:underline"
          >
            {page.title || 'Untitled Page'}
          </button>
        )
      ) : (
        <span className="text-white/60 text-xs font-mono truncate max-w-[160px] hidden sm:block">
          {page.title || page.pageId}
        </span>
      )}

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
