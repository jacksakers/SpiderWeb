import React, { useState, useEffect, useCallback } from 'react';
import {
  collection, doc, getDoc, getDocs, addDoc, deleteDoc,
  setDoc, query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { useCanvasStore } from '../../store/canvasStore';
import { useAuthStore } from '../../store/authStore';
import { useTabStore } from '../../store/tabStore';
import { isFirebaseConfigured, db } from '../../utils/firebase';

const MAX_COMMENT_LEN = 500;
const MAX_LINK_LEN = 64;

/**
 * SocialPanel — likes and comments for the currently viewed page.
 *
 * Firestore structure:
 *   pages/{pageId}/likes/{userId}   — presence doc (existence = liked)
 *   pages/{pageId}/comments/{id}    — { authorId, authorName, authorAvatar,
 *                                       content, pageLink, createdAt }
 *
 * Rules: anyone can read; signed-in users can create; authors + page owner
 * can delete comments; users can toggle their own like doc.
 */
function SocialPanel() {
  const page    = useCanvasStore((s) => s.page);
  const { user, userProfile } = useAuthStore();
  const navigateTo = useTabStore((s) => s.navigateTo);

  const [liked,       setLiked]       = useState(false);
  const [likeCount,   setLikeCount]   = useState(0);
  const [comments,    setComments]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [content,     setContent]     = useState('');
  const [pageLink,    setPageLink]    = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);

  const pageId  = page?.pageId;
  const ownerId = page?.ownerId;

  // ─── Load likes + comments ─────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!isFirebaseConfigured() || !db || !pageId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [likesSnap, commentsSnap] = await Promise.all([
        getDocs(collection(db, 'pages', pageId, 'likes')),
        getDocs(query(
          collection(db, 'pages', pageId, 'comments'),
          orderBy('createdAt', 'asc'),
        )),
      ]);

      setLikeCount(likesSnap.size);
      setLiked(user ? likesSnap.docs.some((d) => d.id === user.uid) : false);
      setComments(commentsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('SocialPanel load error', err);
    } finally {
      setLoading(false);
    }
  }, [pageId, user?.uid]);

  useEffect(() => { load(); }, [load]);

  // ─── Like / unlike ─────────────────────────────────────────────────────────
  async function toggleLike() {
    if (!user || !db) return;
    const likeRef = doc(db, 'pages', pageId, 'likes', user.uid);
    if (liked) {
      await deleteDoc(likeRef);
      setLiked(false);
      setLikeCount((c) => Math.max(0, c - 1));
    } else {
      await setDoc(likeRef, { likedAt: serverTimestamp() });
      setLiked(true);
      setLikeCount((c) => c + 1);
    }
  }

  // ─── Post comment ──────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || !user || !db) return;
    const link = pageLink.trim().replace(/[^a-z0-9-_]/gi, '').toLowerCase().slice(0, MAX_LINK_LEN);

    setSubmitting(true);
    try {
      const newDoc = await addDoc(collection(db, 'pages', pageId, 'comments'), {
        authorId:     user.uid,
        authorName:   userProfile?.displayName ?? user.displayName ?? 'Anonymous',
        authorAvatar: userProfile?.photoURL ?? user.photoURL ?? '',
        content:      trimmed,
        pageLink:     link || null,
        createdAt:    serverTimestamp(),
      });
      setComments((prev) => [
        ...prev,
        {
          id:           newDoc.id,
          authorId:     user.uid,
          authorName:   userProfile?.displayName ?? user.displayName ?? 'Anonymous',
          authorAvatar: userProfile?.photoURL ?? user.photoURL ?? '',
          content:      trimmed,
          pageLink:     link || null,
          createdAt:    null,
        },
      ]);
      setContent('');
      setPageLink('');
      setShowLinkInput(false);
    } catch (err) {
      console.error('Post comment error', err);
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Delete comment ────────────────────────────────────────────────────────
  async function handleDeleteComment(commentId) {
    if (!db) return;
    await deleteDoc(doc(db, 'pages', pageId, 'comments', commentId));
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const firebaseReady = isFirebaseConfigured() && !!db;
  const canDelete = (comment) =>
    user && (user.uid === comment.authorId || user.uid === ownerId);

  function Avatar({ src, name }) {
    const initial = name?.[0]?.toUpperCase() ?? '?';
    if (src) {
      return (
        <img src={src} alt={name} className="w-7 h-7 rounded-full object-cover shrink-0" />
      );
    }
    return (
      <div className="w-7 h-7 rounded-full bg-purple-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
        {initial}
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  if (!firebaseReady) {
    return (
      <div className="p-4 text-white/30 text-xs text-center">
        Social features require Firebase.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full text-sm text-white">

      {/* ── Likes bar ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <button
          onClick={toggleLike}
          disabled={!user}
          title={user ? (liked ? 'Unlike' : 'Like this page') : 'Sign in to like'}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            liked
              ? 'bg-pink-600 text-white hover:bg-pink-500'
              : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {liked ? '❤️' : '🤍'} {likeCount}
        </button>
        {!user && (
          <span className="text-white/30 text-xs">Sign in to interact</span>
        )}
      </div>

      {/* ── Comments list ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        {loading && (
          <p className="text-white/30 text-xs text-center py-4">Loading…</p>
        )}
        {!loading && comments.length === 0 && (
          <p className="text-white/20 text-xs text-center py-4">
            No comments yet. Be the first!
          </p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="flex gap-2">
            <Avatar src={c.authorAvatar} name={c.authorName} />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-white/80 text-xs font-medium truncate">{c.authorName}</span>
                {c.createdAt && (
                  <span className="text-white/20 text-[10px] shrink-0">
                    {new Date(c.createdAt.seconds * 1000).toLocaleDateString()}
                  </span>
                )}
              </div>
              <p className="text-white/70 text-xs mt-0.5 break-words whitespace-pre-wrap">
                {c.content}
              </p>
              {c.pageLink && (
                <button
                  onClick={() => navigateTo(c.pageLink)}
                  className="mt-1 text-purple-400 hover:text-purple-300 text-xs underline break-all"
                >
                  🔗 sw://{c.pageLink}
                </button>
              )}
              {canDelete(c) && (
                <button
                  onClick={() => handleDeleteComment(c.id)}
                  className="mt-1 text-red-500/60 hover:text-red-400 text-[10px]"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Comment form ─────────────────────────────────────────────── */}
      {user ? (
        <form onSubmit={handleSubmit} className="border-t border-white/10 p-3 flex flex-col gap-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, MAX_COMMENT_LEN))}
            placeholder="Write a comment…"
            rows={2}
            className="w-full bg-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none focus:ring-1 focus:ring-purple-500 resize-none"
          />
          {showLinkInput && (
            <input
              type="text"
              value={pageLink}
              onChange={(e) => setPageLink(e.target.value.slice(0, MAX_LINK_LEN))}
              placeholder="Page ID to link (optional)"
              className="bg-white/10 rounded px-3 py-1.5 text-xs text-white placeholder:text-white/30 outline-none focus:ring-1 focus:ring-purple-500"
            />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowLinkInput((v) => !v)}
              title="Attach a page link"
              className={`text-xs px-2 py-1 rounded transition-colors ${
                showLinkInput ? 'bg-purple-700 text-white' : 'bg-white/10 text-white/50 hover:bg-white/20'
              }`}
            >
              🔗 Link
            </button>
            <div className="flex-1" />
            <span className="text-white/20 text-[10px]">{content.length}/{MAX_COMMENT_LEN}</span>
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="px-3 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors disabled:opacity-40"
            >
              {submitting ? '…' : 'Post'}
            </button>
          </div>
        </form>
      ) : (
        <div className="border-t border-white/10 p-3 text-white/30 text-xs text-center">
          Sign in to comment
        </div>
      )}
    </div>
  );
}

export default SocialPanel;
