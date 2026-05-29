import { useEffect } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { useHistoryStore } from '../store/historyStore';

/**
 * useEditorShortcuts — global keyboard shortcuts for the canvas editor.
 *
 * Ctrl+Z        → undo
 * Ctrl+Y        → redo
 * Ctrl+Shift+Z  → redo
 * Ctrl+C        → copy selected element
 * Ctrl+V        → paste element (offset by 20px)
 * Delete/Backspace → delete selected element (not when a text input is focused)
 */
export function useEditorShortcuts() {
  const {
    isEditing,
    selectedElementId,
    page,
    deleteElement,
    addElement,
    undo,
    redo,
  } = useCanvasStore();

  const { copy, paste } = useHistoryStore();

  useEffect(() => {
    function onKeyDown(e) {
      // Never fire shortcuts when typing inside a text field
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) {
        return;
      }

      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
      }

      if (!isEditing) return;  // copy/paste/delete only in edit mode

      if (ctrl && e.key === 'c') {
        if (!selectedElementId) return;
        const elements = page.elements;
        const el = elements[selectedElementId];
        if (el) copy({ id: selectedElementId, ...el });
        return;
      }

      if (ctrl && e.key === 'v') {
        e.preventDefault();
        const newEl = paste();
        if (newEl) addElement(newEl);
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementId) {
        e.preventDefault();
        deleteElement(selectedElementId);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isEditing, selectedElementId, page.elements, copy, paste, addElement, deleteElement, undo, redo]);
}
