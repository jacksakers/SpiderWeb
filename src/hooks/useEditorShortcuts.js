import { useEffect } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { useHistoryStore } from '../store/historyStore';

/**
 * useEditorShortcuts — global keyboard shortcuts for the canvas editor.
 *
 * Ctrl+Z            → undo
 * Ctrl+Y            → redo
 * Ctrl+Shift+Z      → redo
 * Ctrl+C            → copy selected element
 * Ctrl+V            → paste element (offset by 20px)
 * Ctrl+A            → select all elements
 * Delete/Backspace  → delete selected element(s) (not when a text input is focused)
 * Escape            → clear selection
 */
export function useEditorShortcuts() {
  const {
    isEditing,
    selectedElementId,
    selectedElementIds,
    page,
    deleteElement,
    deleteSelectedElements,
    selectElements,
    clearSelection,
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

      if (e.key === 'Escape') {
        clearSelection();
        return;
      }

      if (!isEditing) return;  // copy/paste/delete/select-all only in edit mode

      if (ctrl && e.key === 'a') {
        e.preventDefault();
        selectElements(Object.keys(page.elements));
        return;
      }

      if (ctrl && e.key === 'c') {
        if (!selectedElementId) return;
        const el = page.elements[selectedElementId];
        if (el) copy({ id: selectedElementId, ...el });
        return;
      }

      if (ctrl && e.key === 'v') {
        e.preventDefault();
        const newEl = paste();
        if (newEl) addElement(newEl);
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementIds.length > 1) {
          e.preventDefault();
          deleteSelectedElements();
        } else if (selectedElementId) {
          e.preventDefault();
          deleteElement(selectedElementId);
        }
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isEditing, selectedElementId, selectedElementIds, page.elements, copy, paste, addElement, deleteElement, deleteSelectedElements, selectElements, clearSelection, undo, redo]);
}
