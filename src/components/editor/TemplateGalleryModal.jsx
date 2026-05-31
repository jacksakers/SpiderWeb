import React from 'react';
import { nanoid } from 'nanoid';
import { useCanvasStore } from '../../store/canvasStore';
import { useHistoryStore } from '../../store/historyStore';

/**
 * TemplateGalleryModal — presents pre-built page templates.
 *
 * Clicking a template replaces the current canvas elements (after confirmation)
 * with the template's pre-defined set of elements.  The page theme is also updated
 * to match the template's suggested background.
 */

function makeId() {
  return `elem_${nanoid(8)}`;
}

const TEMPLATES = [
  {
    name: 'Fan Page',
    description: 'A classic fan-page layout: banner, title, tagline, and links',
    preview: 'linear-gradient(135deg, #1a0030 0%, #6b00a0 100%)',
    theme: { backgroundColor: '#0d0d0d', backgroundGradient: 'linear-gradient(135deg, #0a0010 0%, #1a0030 100%)' },
    elements: () => ({
      [makeId()]: {
        type: 'text', x: 60, y: 40, width: 1080, height: 80, zIndex: 2, rotation: 0,
        content: '⭐ MY FAN PAGE ⭐',
        style: { color: '#ff00ff', fontSize: '52px', fontFamily: 'Impact', textAlign: 'center' },
      },
      [makeId()]: {
        type: 'shape', x: 0, y: 0, width: 1200, height: 6, zIndex: 1, rotation: 0,
        shape: 'rectangle',
        style: { backgroundColor: '#aa3bff', opacity: 1 },
      },
      [makeId()]: {
        type: 'text', x: 200, y: 150, width: 800, height: 60, zIndex: 2, rotation: 0,
        content: 'Welcome to my page! 🎉 Feel free to look around.',
        style: { color: '#ffffff', fontSize: '22px', fontFamily: 'Comic Sans MS', textAlign: 'center' },
      },
      [makeId()]: {
        type: 'button', x: 400, y: 250, width: 200, height: 50, zIndex: 3, rotation: 0,
        label: '💬 Comment',
        href: '',
        style: { backgroundColor: '#aa3bff', color: '#fff', fontSize: '16px', fontFamily: 'Arial', borderRadius: '8px', fontWeight: 'bold' },
      },
      [makeId()]: {
        type: 'button', x: 620, y: 250, width: 200, height: 50, zIndex: 3, rotation: 0,
        label: '🔗 My Links',
        href: '',
        style: { backgroundColor: '#550080', color: '#fff', fontSize: '16px', fontFamily: 'Arial', borderRadius: '8px', fontWeight: 'bold' },
      },
      [makeId()]: {
        type: 'shape', x: 60, y: 330, width: 1080, height: 2, zIndex: 1, rotation: 0,
        shape: 'rectangle',
        style: { backgroundColor: '#ffffff', opacity: 0.1 },
      },
      [makeId()]: {
        type: 'text', x: 60, y: 360, width: 500, height: 200, zIndex: 2, rotation: 0,
        content: 'About Me\n\nHey there! I\'m a huge fan of awesome things. This is my little corner of SpiderWeb where I share what I love.',
        style: { color: '#cccccc', fontSize: '16px', fontFamily: 'Comic Sans MS', textAlign: 'left' },
      },
    }),
  },
  {
    name: 'Blog Post',
    description: 'A clean blog layout with header, body text, and an image',
    preview: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 100%)',
    theme: { backgroundColor: '#111122', backgroundGradient: '' },
    elements: () => ({
      [makeId()]: {
        type: 'text', x: 100, y: 60, width: 1000, height: 70, zIndex: 2, rotation: 0,
        content: 'My Blog Post Title',
        style: { color: '#ffffff', fontSize: '48px', fontFamily: 'Georgia', textAlign: 'left', fontWeight: 'bold' },
      },
      [makeId()]: {
        type: 'text', x: 100, y: 140, width: 600, height: 30, zIndex: 2, rotation: 0,
        content: 'Written by You · May 31, 2026',
        style: { color: '#888888', fontSize: '14px', fontFamily: 'Georgia', textAlign: 'left' },
      },
      [makeId()]: {
        type: 'shape', x: 100, y: 185, width: 600, height: 2, zIndex: 1, rotation: 0,
        shape: 'rectangle',
        style: { backgroundColor: '#333366', opacity: 1 },
      },
      [makeId()]: {
        type: 'image', x: 100, y: 210, width: 600, height: 300, zIndex: 2, rotation: 0,
        src: 'https://picsum.photos/600/300',
        alt: 'Header image',
        style: {},
      },
      [makeId()]: {
        type: 'text', x: 100, y: 530, width: 900, height: 400, zIndex: 2, rotation: 0,
        content: 'Start writing your blog post here...\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Replace this with your actual content!',
        style: { color: '#dddddd', fontSize: '17px', fontFamily: 'Georgia', textAlign: 'left' },
      },
    }),
  },
  {
    name: 'Link in Bio',
    description: 'A centered link-page with your name and social buttons',
    preview: 'linear-gradient(180deg, #000428 0%, #004e92 100%)',
    theme: { backgroundColor: '#000428', backgroundGradient: 'linear-gradient(180deg, #000428 0%, #004e92 100%)' },
    elements: () => ({
      [makeId()]: {
        type: 'shape', x: 525, y: 80, width: 150, height: 150, zIndex: 2, rotation: 0,
        shape: 'circle',
        style: { backgroundColor: '#0066cc', opacity: 1 },
      },
      [makeId()]: {
        type: 'text', x: 300, y: 250, width: 600, height: 60, zIndex: 2, rotation: 0,
        content: 'Your Name',
        style: { color: '#ffffff', fontSize: '40px', fontFamily: 'Arial', textAlign: 'center', fontWeight: 'bold' },
      },
      [makeId()]: {
        type: 'text', x: 350, y: 315, width: 500, height: 40, zIndex: 2, rotation: 0,
        content: 'Creator · Artist · Developer',
        style: { color: '#88aaff', fontSize: '16px', fontFamily: 'Arial', textAlign: 'center' },
      },
      [makeId()]: {
        type: 'button', x: 400, y: 380, width: 400, height: 52, zIndex: 3, rotation: 0,
        label: '🎵 My Music',
        href: '',
        style: { backgroundColor: '#1a1a3e', color: '#fff', fontSize: '18px', fontFamily: 'Arial', borderRadius: '26px', fontWeight: 'bold' },
      },
      [makeId()]: {
        type: 'button', x: 400, y: 450, width: 400, height: 52, zIndex: 3, rotation: 0,
        label: '📸 My Photos',
        href: '',
        style: { backgroundColor: '#1a1a3e', color: '#fff', fontSize: '18px', fontFamily: 'Arial', borderRadius: '26px', fontWeight: 'bold' },
      },
      [makeId()]: {
        type: 'button', x: 400, y: 520, width: 400, height: 52, zIndex: 3, rotation: 0,
        label: '💬 My Blog',
        href: '',
        style: { backgroundColor: '#1a1a3e', color: '#fff', fontSize: '18px', fontFamily: 'Arial', borderRadius: '26px', fontWeight: 'bold' },
      },
      [makeId()]: {
        type: 'button', x: 400, y: 590, width: 400, height: 52, zIndex: 3, rotation: 0,
        label: '📧 Contact Me',
        href: '',
        style: { backgroundColor: '#aa3bff', color: '#fff', fontSize: '18px', fontFamily: 'Arial', borderRadius: '26px', fontWeight: 'bold' },
      },
    }),
  },
];

function TemplateGalleryModal({ onClose }) {
  const { page, updateTheme } = useCanvasStore();

  function applyTemplate(template) {
    if (!window.confirm(`Apply the "${template.name}" template? This will replace all current elements on the canvas.`)) return;
    const elements = template.elements();
    useCanvasStore.setState((state) => ({
      page: {
        ...state.page,
        elements,
        theme: {
          ...state.page.theme,
          ...template.theme,
        },
      },
    }));
    useHistoryStore.getState().commit(elements);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-[#111] border border-white/10 rounded-xl shadow-2xl w-[700px] max-w-[95vw] max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-white font-semibold text-lg">📋 Page Templates</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-2xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TEMPLATES.map((t) => (
            <div
              key={t.name}
              className="flex flex-col rounded-lg overflow-hidden border border-white/10 cursor-pointer group hover:border-purple-500 transition-colors"
              onClick={() => applyTemplate(t)}
            >
              {/* Preview thumbnail */}
              <div
                className="h-28 flex items-center justify-center"
                style={{ background: t.preview }}
              >
                <span className="text-white/70 text-sm font-medium group-hover:text-white transition-colors">
                  {t.name}
                </span>
              </div>
              {/* Description */}
              <div className="p-3 bg-white/5">
                <p className="text-white font-medium text-sm">{t.name}</p>
                <p className="text-white/40 text-xs mt-0.5">{t.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-3 border-t border-white/10 text-white/30 text-xs">
          Applying a template replaces all current canvas elements.
        </div>
      </div>
    </div>
  );
}

export default TemplateGalleryModal;
