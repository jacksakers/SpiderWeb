import { nanoid } from 'nanoid';
import {
  DEFAULT_TEXT_WIDTH,
  DEFAULT_TEXT_HEIGHT,
  DEFAULT_IMAGE_WIDTH,
  DEFAULT_IMAGE_HEIGHT,
  DEFAULT_SHAPE_WIDTH,
  DEFAULT_SHAPE_HEIGHT,
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
    shape,
    style: {
      backgroundColor: '#aa3bff',
      borderRadius: shape === 'circle' ? '50%' : '0%',
      opacity: 1,
    },
  };
}
