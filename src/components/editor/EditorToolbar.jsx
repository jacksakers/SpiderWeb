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
  const {
    isEditing, setEditing, addElement, canUserEdit, page, isSaving, updatePageTitle,
    multiSelectMode, setMultiSelectMode,
  } = useCanvasStore();
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

          {/* Select mode — primary multi-select path on mobile (tap to add) */}
          <ToolbarButton
            onClick={() => setMultiSelectMode(!multiSelectMode)}
            active={multiSelectMode}
            title="Select mode: tap elements to multi-select"
          >
            ◻ Select
          </ToolbarButton>

          <div className="w-px h-5 bg-white/20 hidden sm:block" />

          <ToolbarButton onClick={handleAddText}                       title="Add a text box" className="hidden sm:flex">T Text</ToolbarButton>
          <ToolbarButton onClick={() => fileInputRef.current?.click()} title="Add an image"   className="hidden sm:flex">🖼 Image</ToolbarButton>
          <ToolbarButton onClick={() => handleAddShape('rectangle')}   title="Add rectangle"  className="hidden sm:flex">▭ Rect</ToolbarButton>
          <ToolbarButton onClick={() => handleAddShape('circle')}      title="Add circle"     className="hidden sm:flex">◯ Circle</ToolbarButton>
          <ToolbarButton onClick={() => handleAddShape('triangle')}    title="Add triangle"   className="hidden sm:flex">△ Tri</ToolbarButton>

          {/* Collapsed add menu on mobile */}
          <AddMenuMobile
            onAddText={handleAddText}
            onAddImage={() => fileInputRef.current?.click()}
            onAddShape={handleAddShape}
          />
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

// ─── Mobile-only collapsed add menu ──────────────────────────────────────────
function AddMenuMobile({ onAddText, onAddImage, onAddShape }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative sm:hidden">
      <ToolbarButton onClick={() => setOpen((v) => !v)} active={open} title="Add element">
        + Add
      </ToolbarButton>
      {open && (
        <div
          className="absolute top-full left-0 mt-1 z-50 flex flex-col gap-1 bg-[#1a1a1a] border border-white/10 rounded-lg p-2 shadow-xl min-w-[120px]"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {[
            { label: 'T Text',    fn: onAddText },
            { label: '🖼 Image',  fn: onAddImage },
            { label: '▭ Rect',   fn: () => onAddShape('rectangle') },
            { label: '◯ Circle', fn: () => onAddShape('circle') },
            { label: '△ Triangle', fn: () => onAddShape('triangle') },
          ].map(({ label, fn }) => (
            <button
              key={label}
              onClick={() => { fn(); setOpen(false); }}
              className="text-left text-xs text-white/80 hover:text-white hover:bg-white/10 rounded px-2 py-1.5 transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
