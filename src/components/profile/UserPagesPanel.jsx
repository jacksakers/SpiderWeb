import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, doc, updateDoc } from 'firebase/firestore';
import { useAuthStore } from '../../store/authStore';
import { useTabStore } from '../../store/tabStore';
import { useCanvasStore } from '../../store/canvasStore';
import { db, isFirebaseConfigured } from '../../utils/firebase';

/**
 * UserPagesPanel — slide-in panel showing all pages the user owns or can edit.
 *
 * Two tabs: "My Pages" (owned) and "Shared with me" (editor role).
 *
 * In "My Pages", pages that share the same siteId are grouped under a
 * siteTitle header.  Hovering a page row reveals a 📁 button to assign
 * (or change) its site group inline — enter a slug for the group ID and a
 * display name, then Save.  Clearing siteId removes the page from its group.
 */
function UserPagesPanel({ onClose }) {
  const { user } = useAuthStore();
  const navigateTo  = useTabStore((s) => s.navigateTo);
  const deletePage  = useCanvasStore((s) => s.deletePage);

  const [tab, setTab]       = useState('owned');
  const [pages, setPages]   = useState([]);
  const [loading, setLoading] = useState(true);
  // siteEditor: { pageId, siteId, siteTitle } | null
  const [siteEditor, setSiteEditor] = useState(null);

  useEffect(() => {
    if (!user || !isFirebaseConfigured() || !db) { setLoading(false); return; }
    loadPages();
  }, [tab, user?.uid]);

  async function loadPages() {
    setLoading(true);
    try {
      const col = collection(db, 'pages');
      const q = tab === 'owned'
        ? query(col, where('ownerId', '==', user.uid), orderBy('updatedAt', 'desc'))
        : query(col, where('editors', 'array-contains', user.uid), orderBy('updatedAt', 'desc'));
      const snap = await getDocs(q);
      setPages(snap.docs.map((d) => ({ pageId: d.id, ...d.data() })));
    } catch (err) {
      console.error('loadPages error', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(pageId, e) {
    e.stopPropagation();
    if (!window.confirm(`Delete page "${pageId}"? This cannot be undone.`)) return;
    await deletePage(pageId);
    setPages((prev) => prev.filter((p) => p.pageId !== pageId));
  }

  function handleNavigate(p) {
    navigateTo(p.pageId, p.title ?? p.pageId);
    onClose();
  }

  async function handleSaveSite() {
    if (!siteEditor || !db) return;
    const { pageId, siteId, siteTitle } = siteEditor;
    const cleaned = siteId.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-').slice(0, 64);
    try {
      await updateDoc(doc(db, 'pages', pageId), {
        siteId:    cleaned || null,
        siteTitle: cleaned ? (siteTitle.trim() || cleaned) : null,
      });
      setPages((prev) => prev.map((p) =>
        p.pageId === pageId
          ? { ...p, siteId: cleaned || null, siteTitle: cleaned ? (siteTitle.trim() || cleaned) : null }
          : p
      ));
    } catch (err) {
      console.error('updateDoc error', err);
    } finally {
      setSiteEditor(null);
    }
  }

  /**
   * Group owned pages by siteId.
   */
  function groupBySite(pageList) {
    const map = new Map();
    for (const p of pageList) {
      const key = p.siteId ?? null;
      if (!map.has(key)) {
        map.set(key, { siteId: key, siteTitle: p.siteTitle ?? null, pages: [] });
      }
      map.get(key).pages.push(p);
    }
    const groups = Array.from(map.values());
    groups.sort((a, b) => {
      if (a.siteId === null) return 1;
      if (b.siteId === null) return -1;
      return 0;
    });
    return groups;
  }

  function PageRow({ p }) {
    const isEditing = siteEditor?.pageId === p.pageId;
    return (
      <div className="border-b border-white/5">
        <div
          onClick={() => !isEditing && handleNavigate(p)}
          className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 cursor-pointer group"
        >
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{p.title ?? 'Untitled'}</p>
            <p className="text-white/40 text-xs truncate">sw://{p.pageId}</p>
            {p.isPublic && <span className="text-green-400 text-xs">● Public</span>}
          </div>
          {tab === 'owned' && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSiteEditor(isEditing ? null : { pageId: p.pageId, siteId: p.siteId ?? '', siteTitle: p.siteTitle ?? '' });
                }}
                className="text-white/40 hover:text-white text-base leading-none px-1"
                title="Assign to site group"
              >
                📁
              </button>
              <button
                onClick={(e) => handleDelete(p.pageId, e)}
                className="text-red-400 hover:text-red-300 text-lg leading-none"
                title="Delete page"
              >
                🗑
              </button>
            </div>
          )}
        </div>

        {/* Inline site-group editor */}
        {isEditing && (
          <div
            className="mx-4 mb-3 p-3 bg-white/5 rounded-lg border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-white/50 text-[10px] uppercase tracking-wider mb-2">
              📁 Site Group
              <span className="normal-case ml-1 text-white/30">— groups pages together under a shared header</span>
            </p>
            <input
              type="text"
              value={siteEditor.siteId}
              onChange={(e) => setSiteEditor((s) => ({ ...s, siteId: e.target.value }))}
              placeholder="group-slug  (e.g. my-portfolio)"
              className="w-full bg-black/40 rounded px-2 py-1 text-xs text-white placeholder:text-white/20 outline-none focus:ring-1 focus:ring-purple-500 mb-1.5"
            />
            <input
              type="text"
              value={siteEditor.siteTitle}
              onChange={(e) => setSiteEditor((s) => ({ ...s, siteTitle: e.target.value }))}
              placeholder="Display name  (e.g. My Portfolio)"
              className="w-full bg-black/40 rounded px-2 py-1 text-xs text-white placeholder:text-white/20 outline-none focus:ring-1 focus:ring-purple-500 mb-2"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveSite}
                className="flex-1 py-1 rounded text-xs bg-purple-700 hover:bg-purple-600 text-white transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => setSiteEditor((s) => ({ ...s, siteId: '', siteTitle: '' }))}
                className="px-2 py-1 rounded text-xs bg-white/10 hover:bg-white/20 text-white/60 transition-colors"
                title="Clear group (remove from site)"
              >
                Clear
              </button>
              <button
                onClick={() => setSiteEditor(null)}
                className="px-2 py-1 rounded text-xs bg-white/5 hover:bg-white/10 text-white/40 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderPageList() {
    if (loading) {
      return <div className="flex items-center justify-center h-32 text-white/30 text-sm">Loading…</div>;
    }
    if (pages.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-32 gap-2 text-white/30">
          <p className="text-3xl">📄</p>
          <p className="text-sm">{tab === 'owned' ? 'No pages yet' : 'No shared pages'}</p>
        </div>
      );
    }

    if (tab !== 'owned') {
      return pages.map((p) => <PageRow key={p.pageId} p={p} />);
    }

    // Owned pages — grouped by siteId
    const groups = groupBySite(pages);
    return groups.map((g) => (
      <div key={g.siteId ?? '__ungrouped__'}>
        {g.siteId && (
          <div className="px-4 pt-3 pb-1 flex items-center gap-2">
            <span className="text-white/30 text-[10px] uppercase tracking-wider font-semibold">
              🌐 {g.siteTitle ?? g.siteId}
            </span>
            <div className="flex-1 h-px bg-white/10" />
          </div>
        )}
        {g.pages.map((p) => <PageRow key={p.pageId} p={p} />)}
      </div>
    ));
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/60" onClick={onClose} />

      {/* Panel */}
      <div className="w-80 bg-[#111] border-l border-white/10 flex flex-col h-full shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-white font-semibold">My Pages</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          {['owned', 'shared'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                tab === t ? 'text-purple-400 border-b-2 border-purple-500' : 'text-white/40 hover:text-white'
              }`}
            >
              {t === 'owned' ? 'My Pages' : 'Shared with Me'}
            </button>
          ))}
        </div>

        {tab === 'owned' && (
          <p className="px-4 py-2 text-white/25 text-[10px] border-b border-white/5">
            Hover a page and click 📁 to add it to a site group
          </p>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {renderPageList()}
        </div>
      </div>
    </div>
  );
}

export default UserPagesPanel;
