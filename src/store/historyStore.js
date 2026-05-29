import { create } from 'zustand';
import { nanoid } from 'nanoid';

/**
 * historyStore — undo/redo stack and clipboard for canvas elements.
 *
 * Works as a snapshot stack: every time a "commit" is made (on drag-stop,
 * resize-stop, delete, add), a deep clone of the elements dict is pushed.
 *
 * Design choices:
 * - Max 50 snapshots to keep memory bounded.
 * - Clipboard stores a single element object (no IDs — a new ID is assigned on paste).
 * - The store is wired to canvasStore via the `commitSnapshot` helper below.
 */

const MAX_HISTORY = 50;

export const useHistoryStore = create((set, get) => ({
  // Array of elements-dict snapshots (plain objects, no Firestore timestamps)
  past:    [],
  // Current committed state (the "present" before any pending changes)
  present: null,
  future:  [],

  clipboard: null,   // { type, ...elementData } — no id field

  // ─── Init ──────────────────────────────────────────────────────────────────
  init(elements) {
    set({ past: [], present: deepClone(elements), future: [] });
  },

  // ─── Snapshot management ──────────────────────────────────────────────────

  /**
   * Push the current elements state onto the undo stack.
   * Call this AFTER a mutation has been applied to canvasStore.
   */
  commit(elements) {
    set((state) => {
      const past = [...state.past, state.present].slice(-MAX_HISTORY);
      return { past, present: deepClone(elements), future: [] };
    });
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  undo() {
    const { past, present, future } = get();
    if (past.length === 0) return null;
    const previous = past[past.length - 1];
    set({
      past:    past.slice(0, -1),
      present: previous,
      future:  [present, ...future],
    });
    return previous;
  },

  redo() {
    const { past, present, future } = get();
    if (future.length === 0) return null;
    const next = future[0];
    set({
      past:    [...past, present],
      present: next,
      future:  future.slice(1),
    });
    return next;
  },

  // ─── Clipboard ────────────────────────────────────────────────────────────
  copy(element) {
    if (!element) return;
    // Strip the id — a new one is assigned on paste
    const { id: _id, ...data } = element;
    set({ clipboard: deepClone(data) });
  },

  paste() {
    const { clipboard } = get();
    if (!clipboard) return null;
    return {
      id: `elem_${nanoid(8)}`,
      ...deepClone(clipboard),
      // Offset paste position so it's visible
      x: (clipboard.x ?? 0) + 20,
      y: (clipboard.y ?? 0) + 20,
    };
  },
}));

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj ?? {}));
}
