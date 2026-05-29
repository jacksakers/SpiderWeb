import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, isFirebaseConfigured } from './firebase';
import { useAuthStore } from '../store/authStore';

/**
 * Uploads an image File to Firebase Storage under pages/{pageId}/
 * and returns the public download URL.
 *
 * Falls back to a blob: object URL when Firebase is not configured (Phase 1 / offline).
 *
 * @param {File}   file
 * @param {string} pageId  - Used to namespace the storage path
 * @returns {Promise<string>} URL to use as element src
 */
export async function uploadImage(file, pageId = 'local') {
  if (!isFirebaseConfigured() || !storage) {
    // Offline mode — object URL works for the current session only
    return URL.createObjectURL(file);
  }

  const ext      = file.name.split('.').pop() ?? 'img';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const path     = `pages/${pageId}/${filename}`;
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return url;
}
