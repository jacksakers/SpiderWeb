import { nanoid } from 'nanoid';
import {
  DEFAULT_TEXT_WIDTH,
  DEFAULT_TEXT_HEIGHT,
  DEFAULT_IMAGE_WIDTH,
  DEFAULT_IMAGE_HEIGHT,
  DEFAULT_SHAPE_WIDTH,
  DEFAULT_SHAPE_HEIGHT,
  DEFAULT_BUTTON_WIDTH,
  DEFAULT_BUTTON_HEIGHT,
  DEFAULT_LIST_WIDTH,
  DEFAULT_LIST_HEIGHT,
  DEFAULT_EMBED_WIDTH,
  DEFAULT_EMBED_HEIGHT,
} from '../constants/canvas';

/**
 * Factory helpers — create a fresh element descriptor ready to be merged
 * into the elements dictionary on the canvas store.
 */

export function createTextElement({ x = 100, y = 100 } = {}) {
  return {
    id: `elem_${nanoid(8)}`,
    type: 'text',
    x,
    y,
    width: DEFAULT_TEXT_WIDTH,
    height: DEFAULT_TEXT_HEIGHT,
    zIndex: 1,
    rotation: 0,
    content: 'Double-click to edit',
    style: {
      color: '#ffffff',
      fontSize: '18px',
      fontFamily: 'Comic Sans MS',
      textAlign: 'left',
    },
  };
}

export function createImageElement({ x = 100, y = 100, src = '', alt = '' } = {}) {
  return {
    id: `elem_${nanoid(8)}`,
    type: 'image',
    x,
    y,
    width: DEFAULT_IMAGE_WIDTH,
    height: DEFAULT_IMAGE_HEIGHT,
    zIndex: 1,
    rotation: 0,
    src,
    alt,
    style: {},
  };
}

export function createShapeElement({ x = 100, y = 100, shape = 'rectangle' } = {}) {
  return {
    id: `elem_${nanoid(8)}`,
    type: 'shape',
    x,
    y,
    width: DEFAULT_SHAPE_WIDTH,
    height: DEFAULT_SHAPE_HEIGHT,
    zIndex: 1,
    rotation: 0,
    shape,
    style: {
      backgroundColor: '#aa3bff',
      borderRadius: shape === 'circle' ? '50%' : '0%',
      opacity: 1,
    },
  };
}

export function createButtonElement({ x = 100, y = 100, label = 'Click Me', href = '' } = {}) {
  return {
    id: `elem_${nanoid(8)}`,
    type: 'button',
    x,
    y,
    width: DEFAULT_BUTTON_WIDTH,
    height: DEFAULT_BUTTON_HEIGHT,
    zIndex: 1,
    rotation: 0,
    label,
    href,
    style: {
      backgroundColor: '#aa3bff',
      color: '#ffffff',
      fontSize: '16px',
      fontFamily: 'Arial',
      borderRadius: '8px',
      fontWeight: 'bold',
    },
  };
}

export function createListElement({ x = 100, y = 100 } = {}) {
  return {
    id: `elem_${nanoid(8)}`,
    type: 'list',
    x,
    y,
    width: DEFAULT_LIST_WIDTH,
    height: DEFAULT_LIST_HEIGHT,
    zIndex: 1,
    rotation: 0,
    items: [
      { text: 'Item one' },
      { text: 'Item two' },
      { text: 'Item three' },
    ],
    style: {
      backgroundColor: '#1e1e1e',
      color: '#ffffff',
      fontSize: '14px',
      fontFamily: 'Arial',
      borderRadius: '8px',
    },
  };
}

export function createEmbedElement({ x = 100, y = 100, url = '' } = {}) {
  return {
    id: `elem_${nanoid(8)}`,
    type: 'embed',
    x,
    y,
    width: DEFAULT_EMBED_WIDTH,
    height: DEFAULT_EMBED_HEIGHT,
    zIndex: 1,
    rotation: 0,
    url,
    embedType: detectEmbedType(url),
    style: {},
  };
}

/** Detect the embed platform from the URL. */
export function detectEmbedType(url) {
  if (!url) return 'generic';
  if (/youtube\.com|youtu\.be/.test(url)) return 'youtube';
  if (/spotify\.com/.test(url)) return 'spotify';
  if (/soundcloud\.com/.test(url)) return 'soundcloud';
  return 'generic';
}

/**
 * Convert a YouTube watch/short URL to an embed URL.
 * E.g. https://youtu.be/abc123 → https://www.youtube.com/embed/abc123
 */
export function toEmbedUrl(url, embedType) {
  if (embedType === 'youtube') {
    const m = url.match(/(?:youtu\.be\/|v=|embed\/)([a-zA-Z0-9_-]{11})/);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
  }
  if (embedType === 'spotify') {
    // https://open.spotify.com/track/id → https://open.spotify.com/embed/track/id
    return url.replace('open.spotify.com/', 'open.spotify.com/embed/');
  }
  if (embedType === 'soundcloud') {
    return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=false&color=%23aa3bff`;
  }
  return url;
}
