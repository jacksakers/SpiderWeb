import { useEffect } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { useHistoryStore } from '../store/historyStore';
import { nanoid } from 'nanoid';

/**
 * useEditorShortcuts — global keyboard shortcuts for the canvas editor.
 *
 * Ctrl+Z            → undo
 * Ctrl+Y            → redo
 * Ctrl+Shift+Z      → redo
 * Ctrl+C            → copy selected element
 * Ctrl+V            → paste element (offset by 20px)
 * Ctrl+D            → duplicate selected element (offset by 20px)
 * Ctrl+Shift+C      → copy style of selected element
 * Ctrl+Shift+V      → paste style onto selected element
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
    addElements,
    updateElement,
    undo,
    redo,
  } = useCanvasStore();

  const { copy, paste, copyStyle, pasteStyle } = useHistoryStore();

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

      if (ctrl && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        if (!selectedElementId) return;
        const el = page.elements[selectedElementId];
        if (el) copyStyle(el);
        return;
      }

      if (ctrl && e.shiftKey && e.key === 'V') {
        e.preventDefault();
        if (!selectedElementId) return;
        const style = pasteStyle();
        if (style) {
          const current = page.elements[selectedElementId]?.style ?? {};
          updateElement(selectedElementId, { style: { ...current, ...style } });
        }
        return;
      }

      if (ctrl && e.key === 'c') {
        e.preventDefault();
        if (selectedElementIds.length > 1) {
          // Multi-select copy — grab all selected elements
          const els = selectedElementIds
            .map((id) => ({ id, ...page.elements[id] }))
            .filter((el) => el.type !== undefined);
          if (els.length > 0) copy(els);
        } else if (selectedElementId) {
          const el = page.elements[selectedElementId];
          if (el) copy({ id: selectedElementId, ...el });
        }
        return;
      }

      if (ctrl && e.key === 'd') {
        e.preventDefault();
        if (!selectedElementId) return;
        const el = page.elements[selectedElementId];
        if (!el) return;
        const { id: _id, ...data } = { id: selectedElementId, ...el };
        addElement({
          id: `elem_${nanoid(8)}`,
          ...data,
          x: (el.x ?? 0) + 20,
          y: (el.y ?? 0) + 20,
        });
        return;
      }

      if (ctrl && e.key === 'v') {
        e.preventDefault();
        const newEls = paste();
        if (newEls) {
          if (newEls.length === 1) {
            addElement(newEls[0]);
          } else if (newEls.length > 1) {
            addElements(newEls);
          }
        }
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
  }, [isEditing, selectedElementId, selectedElementIds, page.elements, copy, paste, copyStyle, pasteStyle, addElement, addElements, updateElement, deleteElement, deleteSelectedElements, selectElements, clearSelection, undo, redo]);
}
