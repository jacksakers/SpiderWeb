import { create } from 'zustand';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp, increment } from 'firebase/firestore';
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
  page:               emptyPage('demo', 'local'),
  /** 'idle' | 'loading' | 'loaded' | 'not_found' | 'error' */
  pageStatus:         'idle',
  isSaving:           false,
  selectedElementId:  null,
  /** Array of IDs for multi-select (always a superset of selectedElementId) */
  selectedElementIds: [],
  isEditing:          false,
  /**
   * When true, each tap/click on an element adds it to the selection instead
   * of replacing it. Useful as the primary multi-select path on mobile.
   */
  multiSelectMode:    false,
  /**
   * Ephemeral drag offset applied to all grouped elements while a
   * MultiSelectBox drag is in progress. Reset to {dx:0,dy:0} on commit.
   * Never written to Firestore.
   */
  multiDragOffset: { dx: 0, dy: 0 },

  /** When true, element drags/resizes snap to the GRID_SIZE grid. */
  snapToGrid: false,

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

    set({ pageStatus: 'loading', isEditing: false, selectedElementId: null, selectedElementIds: [] });

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
      // Use updateDoc (not setDoc+merge) so that deleted element keys are
      // fully removed from Firestore instead of being preserved by a deep merge.
      await updateDoc(
        doc(db, 'pages', pageId),
        { ...firestoreData, updatedAt: serverTimestamp() },
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
        selectedElementId:  state.selectedElementId  === id ? null : state.selectedElementId,
        selectedElementIds: state.selectedElementIds.filter((sid) => sid !== id),
      };
    });
  },

  /** Delete all currently selected elements (single or multi). */
  deleteSelectedElements() {
    set((state) => {
      const ids = state.selectedElementIds.length > 0
        ? state.selectedElementIds
        : state.selectedElementId ? [state.selectedElementId] : [];
      if (ids.length === 0) return state;
      const elements = { ...state.page.elements };
      ids.forEach((id) => { delete elements[id]; });
      useHistoryStore.getState().commit(elements);
      return {
        page: { ...state.page, elements },
        selectedElementId:  null,
        selectedElementIds: [],
      };
    });
  },

  /** Commit position/size patches for multiple elements in a single history entry. */
  moveElements(patches) {
    set((state) => {
      const elements = { ...state.page.elements };
      Object.entries(patches).forEach(([id, patch]) => {
        if (elements[id]) elements[id] = { ...elements[id], ...patch };
      });
      useHistoryStore.getState().commit(elements);
      return { page: { ...state.page, elements } };
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
  selectElement(id)  { set({ selectedElementId: id, selectedElementIds: [id] }); },
  clearSelection()   { set({ selectedElementId: null, selectedElementIds: [], multiDragOffset: { dx: 0, dy: 0 } }); },

  /** Add or remove a single element from the multi-selection (Shift+click or multiSelectMode tap). */
  addToSelection(id) {
    set((state) => {
      const ids = state.selectedElementIds.includes(id)
        ? state.selectedElementIds.filter((i) => i !== id)
        : [...state.selectedElementIds, id];
      return {
        selectedElementIds: ids,
        selectedElementId:  ids.length > 0 ? ids[ids.length - 1] : null,
      };
    });
  },

  /** Replace the entire selection with the given array of IDs (lasso). */
  selectElements(ids) {
    set({
      selectedElementIds: ids,
      selectedElementId:  ids.length > 0 ? ids[ids.length - 1] : null,
    });
  },

  /** Update the live drag offset for the multi-select bounding box (ephemeral). */
  setMultiDragOffset(offset) { set({ multiDragOffset: offset }); },

  /** Toggle the tap-to-add-select mode (primary multi-select path on mobile). */
  setMultiSelectMode(v) {
    set({ multiSelectMode: v, selectedElementId: null, selectedElementIds: [], multiDragOffset: { dx: 0, dy: 0 } });
  },

  // ─── Page-level ───────────────────────────────────────────────────────────
  updateTheme(patch) {
    set((state) => ({
      page: { ...state.page, theme: { ...state.page.theme, ...patch } },
    }));
  },

  updatePageMeta(patch) {
    set((state) => ({ page: { ...state.page, ...patch } }));
  },

  updatePageTitle(title) {
    const trimmed = title.trim().slice(0, 128);
    if (!trimmed) return;
    set((state) => ({ page: { ...state.page, title: trimmed } }));
  },

  setPage(newPage) {
    set({ page: newPage, selectedElementId: null });
  },

  setEditing(bool) {
    set({ isEditing: bool, selectedElementId: null, selectedElementIds: [], multiSelectMode: false, multiDragOffset: { dx: 0, dy: 0 } });
  },

  // Legacy toggle — now requires external permission check before calling
  toggleEditing() {
    set((state) => ({ isEditing: !state.isEditing, selectedElementId: null, selectedElementIds: [], multiSelectMode: false, multiDragOffset: { dx: 0, dy: 0 } }));
  },

  toggleSnapToGrid() {
    set((state) => ({ snapToGrid: !state.snapToGrid }));
  },

  // ─── Alignment ────────────────────────────────────────────────────────────
  /**
   * Align all currently selected elements.
   * direction: 'left' | 'right' | 'center' | 'top' | 'bottom' | 'middle'
   *          | 'distributeH' | 'distributeV'
   */
  alignElements(direction) {
    set((state) => {
      const ids = state.selectedElementIds.length > 1
        ? state.selectedElementIds
        : state.selectedElementId ? [state.selectedElementId] : [];
      if (ids.length < 2) return state;

      const els = ids.map((id) => ({ id, ...state.page.elements[id] })).filter(Boolean);
      if (els.length < 2) return state;

      const getW = (el) => (typeof el.width  === 'number' ? el.width  : 100);
      const getH = (el) => (typeof el.height === 'number' ? el.height : 40);

      const minX = Math.min(...els.map((e) => e.x));
      const maxX = Math.max(...els.map((e) => e.x + getW(e)));
      const minY = Math.min(...els.map((e) => e.y));
      const maxY = Math.max(...els.map((e) => e.y + getH(e)));
      const totalW = maxX - minX;
      const totalH = maxY - minY;

      const patches = {};
      if (direction === 'left')   els.forEach((e) => { patches[e.id] = { x: minX }; });
      if (direction === 'right')  els.forEach((e) => { patches[e.id] = { x: maxX - getW(e) }; });
      if (direction === 'center') els.forEach((e) => { patches[e.id] = { x: minX + totalW / 2 - getW(e) / 2 }; });
      if (direction === 'top')    els.forEach((e) => { patches[e.id] = { y: minY }; });
      if (direction === 'bottom') els.forEach((e) => { patches[e.id] = { y: maxY - getH(e) }; });
      if (direction === 'middle') els.forEach((e) => { patches[e.id] = { y: minY + totalH / 2 - getH(e) / 2 }; });

      if (direction === 'distributeH') {
        const sorted = [...els].sort((a, b) => a.x - b.x);
        const gap = (totalW - sorted.reduce((s, e) => s + getW(e), 0)) / (sorted.length - 1);
        let cursor = minX;
        sorted.forEach((e) => { patches[e.id] = { x: cursor }; cursor += getW(e) + gap; });
      }
      if (direction === 'distributeV') {
        const sorted = [...els].sort((a, b) => a.y - b.y);
        const gap = (totalH - sorted.reduce((s, e) => s + getH(e), 0)) / (sorted.length - 1);
        let cursor = minY;
        sorted.forEach((e) => { patches[e.id] = { y: cursor }; cursor += getH(e) + gap; });
      }

      const elements = { ...state.page.elements };
      Object.entries(patches).forEach(([id, patch]) => {
        if (elements[id]) elements[id] = { ...elements[id], ...patch };
      });
      useHistoryStore.getState().commit(elements);
      return { page: { ...state.page, elements } };
    });
  },

  // ─── Page visits ──────────────────────────────────────────────────────────
  async recordVisit(pageId) {
    if (!isFirebaseConfigured() || !db || !pageId || pageId === 'demo') return;
    const sessionKey = `sw_visited_${pageId}`;
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, '1');
    try {
      await updateDoc(doc(db, 'pages', pageId), {
        visitCount: increment(1),
      });
    } catch {
      // Non-critical — ignore errors (e.g. page doesn't exist yet)
    }
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
