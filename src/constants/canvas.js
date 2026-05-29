// Canvas / layout constants used across the entire app.
// When Phase 2 lands, these can be moved to a remote config.

export const MAX_CANVAS_WIDTH = 1200;
export const DEFAULT_CANVAS_HEIGHT = 2000;
export const DEFAULT_CANVAS_BG = '#1a1a1a';

// Minimum element dimensions (px)
export const MIN_ELEMENT_WIDTH = 40;
export const MIN_ELEMENT_HEIGHT = 20;

// Default size for newly-placed elements
export const DEFAULT_TEXT_WIDTH = 300;
export const DEFAULT_TEXT_HEIGHT = 60;
export const DEFAULT_IMAGE_WIDTH = 250;
export const DEFAULT_IMAGE_HEIGHT = 250;
export const DEFAULT_SHAPE_WIDTH = 150;
export const DEFAULT_SHAPE_HEIGHT = 150;

// Z-index step when the user clicks "bring forward / send back"
export const Z_INDEX_STEP = 1;
export const Z_INDEX_MIN = 0;
export const Z_INDEX_MAX = 999;

// Nostalgic / classic web-safe fonts exposed to users
export const AVAILABLE_FONTS = [
  'Comic Sans MS',
  'Courier New',
  'Times New Roman',
  'Impact',
  'Arial',
  'Verdana',
  'Georgia',
  'Trebuchet MS',
  'Palatino Linotype',
  'Lucida Console',
];
