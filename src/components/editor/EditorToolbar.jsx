import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useCanvasStore } from '../../store/canvasStore';
import { useHistoryStore } from '../../store/historyStore';
import { useAuthStore } from '../../store/authStore';
import {
  createTextElement, createImageElement, createShapeElement,
  createButtonElement, createListElement, createEmbedElement,
} from '../../utils/elementFactory';
import { uploadImage } from '../../utils/imageUpload';
import { canvasViewport } from '../../utils/canvasGeometry';
import {
  DEFAULT_TEXT_WIDTH,  DEFAULT_TEXT_HEIGHT,
  DEFAULT_IMAGE_WIDTH, DEFAULT_IMAGE_HEIGHT,
  DEFAULT_SHAPE_WIDTH, DEFAULT_SHAPE_HEIGHT,
  DEFAULT_BUTTON_WIDTH, DEFAULT_BUTTON_HEIGHT,
  DEFAULT_LIST_WIDTH,  DEFAULT_LIST_HEIGHT,
  DEFAULT_EMBED_WIDTH, DEFAULT_EMBED_HEIGHT,
  EMOJI_GROUPS,
} from '../../constants/canvas';
import ToolbarButton from './ToolbarButton';
import CollaboratorsModal from './CollaboratorsModal';
import TemplateGalleryModal from './TemplateGalleryModal';
import BackgroundPanel from './BackgroundPanel';

/**
 * Renders children into a fixed portal anchored below `anchorRef`.
 * Clicking outside the portal calls `onClose`.
 */
const DROPDOWN_MAX_W = 320;
const DROPDOWN_MAX_H = 480;

function DropdownPortal({ anchorRef, onClose, children }) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Position below anchor, clamped so the dropdown stays on screen
    const top  = Math.min(rect.bottom + 4, vh - DROPDOWN_MAX_H - 8);
    const left = Math.min(rect.left, vw - DROPDOWN_MAX_W - 8);
    setPos({ top: Math.max(4, top), left: Math.max(4, left) });
  }, [anchorRef]);

  useEffect(() => {
    function handlePointerDown(e) {
      if (!e.target.closest('[data-toolbar-dropdown]')) onClose();
    }
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [onClose]);

  return createPortal(
    <div data-toolbar-dropdown style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 99999 }}>
      {children}
    </div>,
    document.body
  );
}

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
 *
 * Toolbar sections (edit mode):
 *   - Page title rename
 *   - Edit/View toggle
 *   - Multi-select toggle
 *   - Add elements (Text, Image, Shape, Button, List, Embed)
 *   - Grid toggle
 *   - Emoji picker
 *   - Background panel
 *   - Template gallery
 *   - Share / Collaborators
 *   - Save status
 */
function EditorToolbar() {
  const {
    isEditing, setEditing, addElement, addElements, canUserEdit, page, isSaving, updatePageTitle,
    multiSelectMode, setMultiSelectMode, snapToGrid, toggleSnapToGrid,
    undo, redo,
  } = useCanvasStore();
  const canUndo     = useHistoryStore((s) => s.past.length > 0);
  const canRedo     = useHistoryStore((s) => s.future.length > 0);
  const clipboard   = useHistoryStore((s) => s.clipboard);
  const paste       = useHistoryStore((s) => s.paste);
  const hasClipboard = clipboard && clipboard.length > 0;
  const { user } = useAuthStore();
  const fileInputRef    = useRef(null);
  const emojiButtonRef  = useRef(null);
  const bgButtonRef     = useRef(null);
  const [showShare,      setShowShare]      = useState(false);
  const [showTemplates,  setShowTemplates]  = useState(false);
  const [showBackground, setShowBackground] = useState(false);
  const [showEmoji,      setShowEmoji]      = useState(false);
  const [editingTitle,   setEditingTitle]   = useState(false);
  const [titleDraft,     setTitleDraft]     = useState('');

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
  function handleAddButton() {
    const pos = getViewportCenter(DEFAULT_BUTTON_WIDTH, DEFAULT_BUTTON_HEIGHT);
    addElement(createButtonElement(pos));
  }
  function handleAddList() {
    const pos = getViewportCenter(DEFAULT_LIST_WIDTH, DEFAULT_LIST_HEIGHT);
    addElement(createListElement(pos));
  }
  function handleAddEmbed() {
    const pos = getViewportCenter(DEFAULT_EMBED_WIDTH, DEFAULT_EMBED_HEIGHT);
    addElement(createEmbedElement(pos));
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

  function handleEmojiInsert(emoji) {
    const pos = getViewportCenter(DEFAULT_TEXT_WIDTH, DEFAULT_TEXT_HEIGHT);
    addElement(createTextElement({ ...pos, content: emoji, style: { color: '#ffffff', fontSize: '48px', fontFamily: 'Arial', textAlign: 'center' } }));
    setShowEmoji(false);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap px-3 py-2 bg-black/60 border-b border-white/10 backdrop-blur min-h-[44px]">

      {/* Page title */}
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
          <ToolbarButton onClick={handleEditToggle} active={isEditing} title="Toggle edit mode">
            {isEditing ? '✏️ Editing' : '👁 View'}
          </ToolbarButton>
        </>
      )}

      {isEditing && (
        <>
          <div className="w-px h-5 bg-white/20" />

          {/* Multi-select mode */}
          <ToolbarButton
            onClick={() => setMultiSelectMode(!multiSelectMode)}
            active={multiSelectMode}
            title="Select mode: tap elements to multi-select"
          >
            ◻ Select
          </ToolbarButton>

          {/* Paste — visible on all breakpoints when clipboard is non-empty */}
          {hasClipboard && (
            <ToolbarButton
              onClick={() => {
                const els = paste();
                if (!els) return;
                if (els.length === 1) addElement(els[0]);
                else addElements(els);
              }}
              title={`Paste ${clipboard.length > 1 ? `${clipboard.length} elements` : 'element'} (Ctrl+V)`}
            >
              📋 Paste
            </ToolbarButton>
          )}

          <div className="w-px h-5 bg-white/20 hidden sm:block" />

          {/* Add elements — desktop */}
          <ToolbarButton onClick={handleAddText}                       title="Add text"       className="hidden sm:flex">T Text</ToolbarButton>
          <ToolbarButton onClick={() => fileInputRef.current?.click()} title="Add image"      className="hidden sm:flex">🖼 Image</ToolbarButton>
          <ToolbarButton onClick={() => handleAddShape('rectangle')}   title="Add rectangle"  className="hidden sm:flex">▭ Rect</ToolbarButton>
          <ToolbarButton onClick={() => handleAddShape('circle')}      title="Add circle"     className="hidden sm:flex">◯ Circle</ToolbarButton>
          <ToolbarButton onClick={() => handleAddShape('triangle')}    title="Add triangle"   className="hidden sm:flex">△ Tri</ToolbarButton>
          <ToolbarButton onClick={handleAddButton}                     title="Add nav button" className="hidden sm:flex">🔘 Button</ToolbarButton>
          <ToolbarButton onClick={handleAddList}                       title="Add list/feed"  className="hidden sm:flex">☰ List</ToolbarButton>
          <ToolbarButton onClick={handleAddEmbed}                      title="Add embed"      className="hidden sm:flex">▶ Embed</ToolbarButton>

          {/* Mobile: Add menu + extra tools (undo/redo/grid/emoji/bg) */}
          <AddMenuMobile
            onAddText={handleAddText}
            onAddImage={() => fileInputRef.current?.click()}
            onAddShape={handleAddShape}
            onAddButton={handleAddButton}
            onAddList={handleAddList}
            onAddEmbed={handleAddEmbed}
          />
          <ToolbarButton onClick={undo} disabled={!canUndo} title="Undo" className="sm:hidden">↩</ToolbarButton>
          <ToolbarButton onClick={redo} disabled={!canRedo} title="Redo" className="sm:hidden">↪</ToolbarButton>

          <div className="w-px h-5 bg-white/20 hidden sm:block" />

          {/* Snap-to-grid toggle */}
          <ToolbarButton
            onClick={toggleSnapToGrid}
            active={snapToGrid}
            title="Toggle snap-to-grid"
            className="hidden sm:flex"
          >
            # Grid
          </ToolbarButton>

          {/* Undo / Redo */}
          <ToolbarButton onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)" className="hidden sm:flex">↩ Undo</ToolbarButton>
          <ToolbarButton onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)" className="hidden sm:flex">↪ Redo</ToolbarButton>

          {/* Emoji picker */}
          {/* <div className="hidden sm:block">
            <ToolbarButton
              ref={emojiButtonRef}
              onClick={() => { setShowBackground(false); setShowEmoji((v) => !v); }}
              active={showEmoji}
              title="Emoji / sticker picker"
            >
              😀 Emoji
            </ToolbarButton>
            {showEmoji && (
              <DropdownPortal anchorRef={emojiButtonRef} onClose={() => setShowEmoji(false)}>
                <EmojiPicker onInsert={handleEmojiInsert} onClose={() => setShowEmoji(false)} />
              </DropdownPortal>
            )}
          </div> */}

          {/* Background panel */}
          <div className="hidden sm:block">
            <ToolbarButton
              ref={bgButtonRef}
              onClick={() => { setShowEmoji(false); setShowBackground((v) => !v); }}
              active={showBackground}
              title="Page background"
            >
              🎨 BG
            </ToolbarButton>
            {showBackground && (
              <DropdownPortal anchorRef={bgButtonRef} onClose={() => setShowBackground(false)}>
                <BackgroundPanel onClose={() => setShowBackground(false)} />
              </DropdownPortal>
            )}
          </div>

          {/* Template gallery */}
          <ToolbarButton
            onClick={() => setShowTemplates(true)}
            title="Browse page templates"
            className="hidden sm:flex"
          >
            📋 Templates
          </ToolbarButton>
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
      {showTemplates && createPortal(
        <TemplateGalleryModal onClose={() => setShowTemplates(false)} />,
        document.body
      )}
    </div>
  );
}

export default EditorToolbar;

// --- Mobile-only collapsed add menu ------------------------------------------
function AddMenuMobile({ onAddText, onAddImage, onAddShape, onAddButton, onAddList, onAddEmbed }) {
  const [open, setOpen] = React.useState(false);
  const btnRef = React.useRef(null);
  return (
    <div className="sm:hidden">
      <ToolbarButton ref={btnRef} onClick={() => setOpen((v) => !v)} active={open} title="Add element">
        + Add
      </ToolbarButton>
      {open && (
        <DropdownPortal anchorRef={btnRef} onClose={() => setOpen(false)}>
        <div
          className="flex flex-col gap-1 bg-[#1a1a1a] border border-white/10 rounded-lg p-2 shadow-xl min-w-[160px]"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {[
            { label: 'T Text',      fn: onAddText },
            { label: '🖼 Image',    fn: onAddImage },
            { label: '▭ Rect',     fn: () => onAddShape('rectangle') },
            { label: '◯ Circle',   fn: () => onAddShape('circle') },
            { label: '△ Triangle', fn: () => onAddShape('triangle') },
            { label: '🔘 Button',  fn: onAddButton },
            { label: '☰ List',     fn: onAddList },
            { label: '▶ Embed',    fn: onAddEmbed },
          ].map(({ label, fn }) => (
            <button
              key={label}
              onClick={() => { fn(); setOpen(false); }}
              className="text-left text-xs text-white/80 hover:text-white hover:bg-white/10 rounded px-2 py-1.5 transition-colors"
            >
              {label}
            </button>
          ))}
        </div>        </DropdownPortal>      )}
    </div>
  );
}

// --- Emoji picker dropdown ----------------------------------------------------
function EmojiPicker({ onInsert, onClose }) {
  const [group, setGroup] = React.useState(Object.keys(EMOJI_GROUPS)[0]);
  return (
    <div
      className="absolute top-full left-0 mt-1 z-50 bg-[#1a1a1a] border border-white/10 rounded-lg p-3 shadow-xl w-64"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-2">
        <span className="text-white/50 text-xs">Emoji &amp; Stickers</span>
        <button onClick={onClose} className="text-white/30 hover:text-white text-lg leading-none">x</button>
      </div>
      <div className="flex gap-1 flex-wrap mb-2">
        {Object.keys(EMOJI_GROUPS).map((g) => (
          <button
            key={g}
            onClick={() => setGroup(g)}
            className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
              group === g ? 'bg-purple-600 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'
            }`}
          >
            {g}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-8 gap-1">
        {(EMOJI_GROUPS[group] ?? []).map((emoji) => (
          <button
            key={emoji}
            onClick={() => onInsert(emoji)}
            className="text-xl hover:bg-white/10 rounded p-0.5 transition-colors"
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
