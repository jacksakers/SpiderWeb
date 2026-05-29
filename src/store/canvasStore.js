import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { MAX_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT, DEFAULT_CANVAS_BG, Z_INDEX_STEP, Z_INDEX_MAX, Z_INDEX_MIN } from '../constants/canvas';

/**
 * canvasStore — owns the active page blueprint being viewed or edited.
 *
 * Phase 2: add a `loadPage(pageId)` action that fetches from Firestore and
 * a `savePage()` action that validates with blueprintSchema then writes back.
 */

const DEMO_PAGE = {
  pageId: 'demo',
  ownerId: 'local',
  title: 'My Retro Space',
  theme: {
    backgroundColor: DEFAULT_CANVAS_BG,
    backgroundImage: '',
    width: MAX_CANVAS_WIDTH,
    height: DEFAULT_CANVAS_HEIGHT,
  },
  elements: {},
};

export const useCanvasStore = create((set, get) => ({
  // ─── State ────────────────────────────────────────────────────────────────
  page: DEMO_PAGE,
  selectedElementId: null,
  isEditing: false,         // true when the user owns the page and is in edit mode

  // ─── Element CRUD ─────────────────────────────────────────────────────────

  /** Add a pre-built element object (from elementFactory) to the page */
  addElement(element) {
    const { id, ...rest } = element;
    set((state) => ({
      page: {
        ...state.page,
        elements: { ...state.page.elements, [id]: rest },
      },
      selectedElementId: id,
    }));
  },

  /** Update specific fields on an element (e.g. after a drag-stop) */
  updateElement(id, patch) {
    set((state) => {
      const existing = state.page.elements[id];
      if (!existing) return state;
      return {
        page: {
          ...state.page,
          elements: {
            ...state.page.elements,
            [id]: { ...existing, ...patch },
          },
        },
      };
    });
  },

  /** Delete an element by ID */
  deleteElement(id) {
    set((state) => {
      const { [id]: _removed, ...rest } = state.page.elements;
      return {
        page: { ...state.page, elements: rest },
        selectedElementId: state.selectedElementId === id ? null : state.selectedElementId,
      };
    });
  },

  /** Bring an element one step forward in z-order */
  bringForward(id) {
    const el = get().page.elements[id];
    if (!el) return;
    get().updateElement(id, { zIndex: Math.min((el.zIndex ?? 1) + Z_INDEX_STEP, Z_INDEX_MAX) });
  },

  /** Send an element one step back in z-order */
  sendBackward(id) {
    const el = get().page.elements[id];
    if (!el) return;
    get().updateElement(id, { zIndex: Math.max((el.zIndex ?? 1) - Z_INDEX_STEP, Z_INDEX_MIN) });
  },

  // ─── Selection ────────────────────────────────────────────────────────────
  selectElement(id) {
    set({ selectedElementId: id });
  },

  clearSelection() {
    set({ selectedElementId: null });
  },

  // ─── Page-level ───────────────────────────────────────────────────────────
  updateTheme(patch) {
    set((state) => ({
      page: { ...state.page, theme: { ...state.page.theme, ...patch } },
    }));
  },

  setPage(newPage) {
    set({ page: newPage, selectedElementId: null });
  },

  toggleEditing() {
    set((state) => ({ isEditing: !state.isEditing, selectedElementId: null }));
  },
}));
