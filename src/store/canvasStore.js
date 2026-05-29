import { create } from 'zustand';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { isFirebaseConfigured, db } from '../utils/firebase';
import { validateBlueprint } from '../utils/blueprintSchema';
import { useHistoryStore } from '../store/historyStore';
import {
  MAX_CANVAS_WIDTH,
  DEFAULT_CANVAS_HEIGHT,
  DEFAULT_CANVAS_BG,
  Z_INDEX_STEP,
  Z_INDEX_MAX,
  Z_INDEX_MIN,
} from '../constants/canvas';

// ─── Empty page template ──────────────────────────────────────────────────────

export function emptyPage(pageId = 'new', ownerId = '') {
  return {
    pageId,
    ownerId,
    title:    'Untitled Page',
    editors:  [],
    isPublic: false,
    theme: {
      backgroundColor: DEFAULT_CANVAS_BG,
      backgroundImage: '',
      width:           MAX_CANVAS_WIDTH,
      height:          DEFAULT_CANVAS_HEIGHT,
    },
    elements: {},
  };
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCanvasStore = create((set, get) => ({
  // ─── State ────────────────────────────────────────────────────────────────
  page:              emptyPage('demo', 'local'),
  /** 'idle' | 'loading' | 'loaded' | 'not_found' | 'error' */
  pageStatus:        'idle',
  isSaving:          false,
  selectedElementId: null,
  isEditing:         false,

  // ─── Permission helper ────────────────────────────────────────────────────
  canUserEdit(userId) {
    const { page } = get();
    if (!userId) return page.isPublic === true;
    return (
      page.ownerId === userId ||
      (page.editors ?? []).includes(userId) ||
      page.isPublic === true
    );
  },

  // ─── Page loading ─────────────────────────────────────────────────────────
  async loadPage(pageId) {
    if (get().page.pageId === pageId && get().pageStatus === 'loaded') return;

    set({ pageStatus: 'loading', isEditing: false, selectedElementId: null });

    if (!isFirebaseConfigured() || !db) {
      // Offline / Phase 1 mode — just show a blank demo page
      set({ page: emptyPage(pageId, 'local'), pageStatus: 'loaded' });
      return;
    }

    try {
      const snap = await getDoc(doc(db, 'pages', pageId));
      if (!snap.exists()) {
        set({ page: emptyPage(pageId, ''), pageStatus: 'not_found' });
      } else {
        set({
          page:       { pageId, ...snap.data() },
          pageStatus: 'loaded',
        });
        useHistoryStore.getState().init(snap.data().elements ?? {});
      }
    } catch (err) {
      console.error('loadPage error', err);
      set({ pageStatus: 'error' });
    }
  },

  // ─── Page creation ────────────────────────────────────────────────────────
  async createPage(pageId, ownerId, title = 'Untitled Page') {
    if (!isFirebaseConfigured() || !db) return;
    const newPage = { ...emptyPage(pageId, ownerId), title };
    const { pageId: _id, ...firestoreData } = newPage;

    try {
      await setDoc(doc(db, 'pages', pageId), {
        ...firestoreData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      set({ page: newPage, pageStatus: 'loaded', isEditing: true });
    } catch (err) {
      console.error('createPage error', err);
    }
  },

  // ─── Page saving ──────────────────────────────────────────────────────────
  async savePage() {
    const { page, isSaving, pageStatus } = get();
    if (isSaving || pageStatus !== 'loaded') return;
    if (!isFirebaseConfigured() || !db) return;

    const { pageId, ...firestoreData } = page;
    const result = validateBlueprint(page);
    if (!result.success) {
      console.warn('Blueprint validation failed — not saving:', result.error.issues);
      return;
    }

    set({ isSaving: true });
    try {
      await setDoc(
        doc(db, 'pages', pageId),
        { ...firestoreData, updatedAt: serverTimestamp() },
        { merge: true }
      );
    } catch (err) {
      console.error('savePage error', err);
    } finally {
      set({ isSaving: false });
    }
  },

  // ─── Page deletion ────────────────────────────────────────────────────────
  async deletePage(pageId) {
    if (!isFirebaseConfigured() || !db) return;
    await deleteDoc(doc(db, 'pages', pageId));
  },

  // ─── Element CRUD ─────────────────────────────────────────────────────────
  addElement(element) {
    const { id, ...rest } = element;
    set((state) => {
      const elements = { ...state.page.elements, [id]: rest };
      useHistoryStore.getState().commit(elements);
      return {
        page: { ...state.page, elements },
        selectedElementId: id,
      };
    });
  },

  updateElement(id, patch) {
    set((state) => {
      const existing = state.page.elements[id];
      if (!existing) return state;
      return {
        page: {
          ...state.page,
          elements: { ...state.page.elements, [id]: { ...existing, ...patch } },
        },
      };
    });
  },

  /** Call after a drag/resize stop to commit the position change to history */
  commitElement(id, patch) {
    set((state) => {
      const existing = state.page.elements[id];
      if (!existing) return state;
      const elements = { ...state.page.elements, [id]: { ...existing, ...patch } };
      useHistoryStore.getState().commit(elements);
      return { page: { ...state.page, elements } };
    });
  },

  deleteElement(id) {
    set((state) => {
      const { [id]: _removed, ...elements } = state.page.elements;
      useHistoryStore.getState().commit(elements);
      return {
        page: { ...state.page, elements },
        selectedElementId: state.selectedElementId === id ? null : state.selectedElementId,
      };
    });
  },

  bringForward(id) {
    const el = get().page.elements[id];
    if (!el) return;
    get().updateElement(id, { zIndex: Math.min((el.zIndex ?? 1) + Z_INDEX_STEP, Z_INDEX_MAX) });
  },

  sendBackward(id) {
    const el = get().page.elements[id];
    if (!el) return;
    get().updateElement(id, { zIndex: Math.max((el.zIndex ?? 1) - Z_INDEX_STEP, Z_INDEX_MIN) });
  },

  // ─── Selection ────────────────────────────────────────────────────────────
  selectElement(id)  { set({ selectedElementId: id }); },
  clearSelection()   { set({ selectedElementId: null }); },

  // ─── Page-level ───────────────────────────────────────────────────────────
  updateTheme(patch) {
    set((state) => ({
      page: { ...state.page, theme: { ...state.page.theme, ...patch } },
    }));
  },

  updatePageMeta(patch) {
    set((state) => ({ page: { ...state.page, ...patch } }));
  },

  setPage(newPage) {
    set({ page: newPage, selectedElementId: null });
  },

  setEditing(bool) {
    set({ isEditing: bool, selectedElementId: null });
  },

  // Legacy toggle — now requires external permission check before calling
  toggleEditing() {
    set((state) => ({ isEditing: !state.isEditing, selectedElementId: null }));
  },

  // ─── Undo / Redo ──────────────────────────────────────────────────────────
  undo() {
    const elements = useHistoryStore.getState().undo();
    if (elements === null) return;
    set((state) => ({
      page: { ...state.page, elements },
      selectedElementId: null,
    }));
  },

  redo() {
    const elements = useHistoryStore.getState().redo();
    if (elements === null) return;
    set((state) => ({
      page: { ...state.page, elements },
      selectedElementId: null,
    }));
  },
}));
