import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, getDoc } from 'firebase/firestore';
import { useAuthStore } from '../../store/authStore';
import { useTabStore } from '../../store/tabStore';
import { useCanvasStore } from '../../store/canvasStore';
import { db, isFirebaseConfigured } from '../../utils/firebase';

/**
 * UserPagesPanel — slide-in panel showing all pages a user owns.
 *
 * If targetUserId is provided, it shows pages owned by that user (read-only).
 * Otherwise, it shows the current user's pages with editing capabilities.
 */
function UserPagesPanel({ onClose, targetUserId = null }) {
  const { user } = useAuthStore();
  const navigateTo  = useTabStore((s) => s.navigateTo);
  const deletePage  = useCanvasStore((s) => s.deletePage);

  const isOwnPanel = !targetUserId || targetUserId === user?.uid;
  const effectiveUserId = targetUserId || user?.uid;

  const [tab, setTab]       = useState('owned');
  const [pages, setPages]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [targetUserDisplayName, setTargetUserDisplayName] = useState('');
  // siteEditor: { pageId, siteId, siteTitle } | null
  const [siteEditor, setSiteEditor] = useState(null);

  useEffect(() => {
    if (!effectiveUserId || !isFirebaseConfigured() || !db) { setLoading(false); return; }
    loadPages();
    if (!isOwnPanel) {
      loadTargetUserName();
    }
  }, [tab, effectiveUserId]);

  async function loadTargetUserName() {
    try {
      const uSnap = await getDoc(doc(db, 'users', targetUserId));
      if (uSnap.exists()) {
        setTargetUserDisplayName(uSnap.data().displayName);
      }
    } catch (e) {
      console.error('Error loading target user name', e);
    }
  }

  async function loadPages() {
    setLoading(true);
    try {
      const col = collection(db, 'pages');
      let q;
      if (isOwnPanel) {
        q = tab === 'owned'
          ? query(col, where('ownerId', '==', effectiveUserId), orderBy('updatedAt', 'desc'))
          : query(col, where('editors', 'array-contains', effectiveUserId), orderBy('updatedAt', 'desc'));
      } else {
        // For others, only show public pages they own
        q = query(col, where('ownerId', '==', effectiveUserId), where('isPublic', '==', true), orderBy('updatedAt', 'desc'));
      }
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
            {p.isPublic && isOwnPanel && <span className="text-green-400 text-xs">● Public</span>}
          </div>
          {isOwnPanel && tab === 'owned' && (
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

        {isEditing && (
          <div className="mx-4 mb-3 p-3 bg-white/5 rounded-lg border border-white/10" onClick={(e) => e.stopPropagation()}>
            <p className="text-white/50 text-[10px] uppercase tracking-wider mb-2">📁 Site Group</p>
            <input
              type="text"
              value={siteEditor.siteId}
              onChange={(e) => setSiteEditor((s) => ({ ...s, siteId: e.target.value }))}
              placeholder="group-slug"
              className="w-full bg-black/40 rounded px-2 py-1 text-xs text-white placeholder:text-white/20 outline-none mb-1.5"
            />
            <input
              type="text"
              value={siteEditor.siteTitle}
              onChange={(e) => setSiteEditor((s) => ({ ...s, siteTitle: e.target.value }))}
              placeholder="Display name"
              className="w-full bg-black/40 rounded px-2 py-1 text-xs text-white placeholder:text-white/20 outline-none mb-2"
            />
            <div className="flex gap-2">
              <button onClick={handleSaveSite} className="flex-1 py-1 rounded text-xs bg-purple-700 text-white">Save</button>
              <button onClick={() => setSiteEditor(null)} className="px-2 py-1 rounded text-xs bg-white/5 text-white/40">✕</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderPageList() {
    if (loading) return <div className="flex items-center justify-center h-32 text-white/30 text-sm">Loading…</div>;
    if (pages.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-32 gap-2 text-white/30">
          <p className="text-3xl">📄</p>
          <p className="text-sm">No pages found</p>
        </div>
      );
    }
    if (tab !== 'owned' || !isOwnPanel) {
      return pages.map((p) => <PageRow key={p.pageId} p={p} />);
    }
    const groups = groupBySite(pages);
    return groups.map((g) => (
      <div key={g.siteId ?? '__ungrouped__'}>
        {g.siteId && (
          <div className="px-4 pt-3 pb-1 flex items-center gap-2">
            <span className="text-white/30 text-[10px] uppercase tracking-wider font-semibold">🌐 {g.siteTitle ?? g.siteId}</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>
        )}
        {g.pages.map((p) => <PageRow key={p.pageId} p={p} />)}
      </div>
    ));
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60" onClick={onClose} />
      <div className="w-80 bg-[#111] border-l border-white/10 flex flex-col h-full shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-white font-semibold truncate">{isOwnPanel ? 'My Pages' : `${targetUserDisplayName || 'User'}'s Pages`}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl">×</button>
        </div>
        {isOwnPanel && (
          <div className="flex border-b border-white/10">
            {['owned', 'shared'].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2.5 text-xs font-medium transition-colors ${tab === t ? 'text-purple-400 border-b-2 border-purple-500' : 'text-white/40 hover:text-white'}`}
              >
                {t === 'owned' ? 'My Pages' : 'Shared with Me'}
              </button>
            ))}
          </div>
        )}
        <div className="flex-1 overflow-y-auto">{renderPageList()}</div>
      </div>
    </div>
  );
}

export default UserPagesPanel;
