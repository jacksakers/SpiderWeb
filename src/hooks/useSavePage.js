import { useEffect, useRef } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { useAuthStore } from '../store/authStore';

const DEBOUNCE_MS = 1500;

/**
 * useSavePage — debounced auto-save whenever the canvas blueprint changes.
 *
 * Only saves if:
 *  - Firebase is configured
 *  - User is logged in
 *  - The page is in 'loaded' state (not still loading / not found)
 *  - The current user has edit permission
 */
export function useSavePage() {
  const page       = useCanvasStore((s) => s.page);
  const pageStatus = useCanvasStore((s) => s.pageStatus);
  const savePage   = useCanvasStore((s) => s.savePage);
  const canUserEdit = useCanvasStore((s) => s.canUserEdit);
  const user       = useAuthStore((s) => s.user);

  const timerRef = useRef(null);

  useEffect(() => {
    if (pageStatus !== 'loaded') return;
    if (!user) return;
    if (!canUserEdit(user.uid)) return;

    // Clear any pending save
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      savePage();
    }, DEBOUNCE_MS);

    return () => clearTimeout(timerRef.current);
  }, [page, pageStatus, user?.uid]);
}
