import { MAX_CANVAS_WIDTH } from '../constants/canvas';

/**
 * Shared mutable object so any module can read the current canvas scale and
 * the scrollable viewport container without prop-drilling.
 *
 * - PageCanvas sets `canvasViewport.scale` on every ResizeObserver tick.
 * - MetaBrowser sets `canvasViewport.scrollEl` when the scrollable div mounts.
 */
export const canvasViewport = {
  scale:     1,
  scrollEl:  null, // HTMLElement | null
};

/**
 * Calculates the CSS scale factor so the fixed-width canvas fits inside
 * the current viewport on any screen size (mobile, tablet, desktop).
 *
 * Usage:
 *   const scale = calculateScaleFactor(window.innerWidth);
 *   // apply: transform: `scale(${scale})`, transform-origin: 'top left'
 *
 * @param {number} containerWidth - The physical container width in px.
 * @returns {number} - Scale factor (≤ 1). Never scales UP — the canvas is
 *                     already at its natural size on large screens.
 */
export function calculateScaleFactor(containerWidth) {
  if (!containerWidth || containerWidth >= MAX_CANVAS_WIDTH) return 1;
  return containerWidth / MAX_CANVAS_WIDTH;
}

/**
 * Converts a mouse/touch event's client coordinates into canvas-local
 * coordinates, accounting for the current scale factor and the canvas
 * element's bounding rect.
 *
 * @param {MouseEvent|Touch} event
 * @param {DOMRect}          canvasRect
 * @param {number}           scale
 * @returns {{ x: number, y: number }}
 */
export function clientToCanvasCoords(event, canvasRect, scale) {
  const x = (event.clientX - canvasRect.left) / scale;
  const y = (event.clientY - canvasRect.top) / scale;
  return { x: Math.round(x), y: Math.round(y) };
}
