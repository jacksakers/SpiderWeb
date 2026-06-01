import React, { useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import { useCanvasStore } from '../../store/canvasStore';
import { useHistoryStore } from '../../store/historyStore';

/**
 * TemplateGalleryModal — two-tab modal:
 *
 *  1. Templates  — pre-built page templates that replace the canvas.
 *  2. JSON Editor — view/edit/import the raw element JSON.
 *                   Also accepts a .json file upload and shows an AI schema guide.
 */

// ─── AI-facing schema reference (plain string, copy-pasteable) ────────────────
const AI_SCHEMA = `# SpiderWeb Element JSON Schema

## Structure
The import/export format is a JSON **object** (dictionary) where every key is a
unique element ID (e.g. "elem_abc12345") and every value is an element object.

## Base fields (all element types)
{
  "type":     "text" | "image" | "shape" | "button" | "list" | "embed",  // REQUIRED
  "x":        number,   // left position on the 1200-wide canvas (px)
  "y":        number,   // top position (px)
  "width":    number | "auto",
  "height":   number | "auto",
  "zIndex":   number (0–999),   // optional, layering order
  "rotation": number (-360–360), // optional, degrees
  "href":     string (max 128), // optional, link target (page ID or URL)
  "target":   "_self" | "_blank",
  "sticky":   boolean,          // stays fixed when scrolling
  "style": {
    "color":           string (CSS colour),
    "backgroundColor": string (CSS colour),
    "fontSize":        string (e.g. "24px"),
    "fontFamily":      string (e.g. "Comic Sans MS"),
    "fontWeight":      string (e.g. "bold"),
    "textAlign":       "left" | "center" | "right",
    "borderRadius":    string (e.g. "8px"),
    "opacity":         number (0–1),
    "border":          string (CSS border shorthand),
    "boxShadow":       string (CSS box-shadow),
    "padding":         string (e.g. "8px 16px")
  }
}

## Type-specific extra fields

### text
  "content": string (max 4000)
  // Inline links: [label](pageId)

### image
  "src": string (https URL, max 1024)
  "alt": string (max 256, optional)

### shape
  "shape": "rectangle" | "circle" | "triangle"

### button
  "label": string (max 256)

### list
  "items": [
    { "text": string, "imageUrl": string (optional), "link": string (optional) }
    // max 50 items
  ]

### embed
  "url":       string (max 1024)
  "embedType": "youtube" | "spotify" | "soundcloud" | "generic"

## Canvas constraints
  - Canvas width: 1200 px
  - Default canvas height: 2000 px
  - Available fonts: "Comic Sans MS", "Courier New", "Times New Roman",
    "Impact", "Arial", "Verdana", "Georgia", "Trebuchet MS",
    "Palatino Linotype", "Lucida Console"

## Example
{
  "elem_abc12345": {
    "type": "text",
    "x": 100, "y": 60,
    "width": 800, "height": 80,
    "zIndex": 2, "rotation": 0,
    "content": "Hello SpiderWeb!",
    "style": { "color": "#ff00ff", "fontSize": "48px", "fontFamily": "Impact", "textAlign": "center" }
  },
  "elem_xyz98765": {
    "type": "shape",
    "x": 0, "y": 0,
    "width": 1200, "height": 6,
    "zIndex": 1,
    "shape": "rectangle",
    "style": { "backgroundColor": "#aa3bff" }
  }
}
`;

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
  const [activeTab, setActiveTab] = useState('templates');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-[#111] border border-white/10 rounded-xl shadow-2xl w-[700px] max-w-[95vw] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-4">
            <h2 className="text-white font-semibold text-lg">📋 Templates & JSON</h2>
            <div className="flex gap-1">
              <TabPill active={activeTab === 'templates'} onClick={() => setActiveTab('templates')}>Templates</TabPill>
              <TabPill active={activeTab === 'json'} onClick={() => setActiveTab('json')}>JSON Editor</TabPill>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white text-2xl leading-none">×</button>
        </div>

        {activeTab === 'templates' && <TemplatesTab onClose={onClose} />}
        {activeTab === 'json'      && <JsonEditorTab />}
      </div>
    </div>
  );
}

// ─── Tab pill ─────────────────────────────────────────────────────────────────

function TabPill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
        active ? 'bg-purple-600 text-white' : 'text-white/40 hover:text-white/80'
      }`}
    >
      {children}
    </button>
  );
}

// ─── Templates tab ────────────────────────────────────────────────────────────

function TemplatesTab({ onClose }) {
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
    <>
      <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {TEMPLATES.map((t) => (
          <div
            key={t.name}
            className="flex flex-col rounded-lg overflow-hidden border border-white/10 cursor-pointer group hover:border-purple-500 transition-colors"
            onClick={() => applyTemplate(t)}
          >
            <div className="h-28 flex items-center justify-center" style={{ background: t.preview }}>
              <span className="text-white/70 text-sm font-medium group-hover:text-white transition-colors">
                {t.name}
              </span>
            </div>
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
    </>
  );
}

// ─── JSON editor tab ──────────────────────────────────────────────────────────

function JsonEditorTab() {
  const page = useCanvasStore((s) => s.page);
  const [jsonText, setJsonText] = useState(() => JSON.stringify(page.elements, null, 2));
  const [error, setError]       = useState('');
  const [showSchema, setShowSchema] = useState(false);
  const [schemaCopied, setSchemaCopied] = useState(false);
  const fileInputRef = useRef(null);

  function handleApply() {
    setError('');
    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (e) {
      setError(`Invalid JSON: ${e.message}`);
      return;
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      setError('JSON must be an object (dictionary of elements).');
      return;
    }
    useCanvasStore.setState((state) => ({
      page: { ...state.page, elements: parsed },
    }));
    useHistoryStore.getState().commit(parsed);
    setError('');
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(page.elements, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${page.title ?? 'page'}-elements.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setJsonText(ev.target.result);
      setError('');
    };
    reader.readAsText(file);
    // reset so the same file can be re-uploaded
    e.target.value = '';
  }

  function handleCopySchema() {
    navigator.clipboard.writeText(AI_SCHEMA).then(() => {
      setSchemaCopied(true);
      setTimeout(() => setSchemaCopied(false), 2000);
    });
  }

  return (
    <div className="flex-1 overflow-y-auto flex flex-col gap-4 p-6">
      {/* Toolbar row */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setJsonText(JSON.stringify(page.elements, null, 2))}
          className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
        >
          ↺ Refresh from canvas
        </button>
        <button
          onClick={handleExport}
          className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
        >
          ⬇ Download .json
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
        >
          📂 Upload .json file
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleFileUpload}
        />
        <button
          onClick={() => setShowSchema((v) => !v)}
          className="px-3 py-1.5 text-xs bg-indigo-900/60 hover:bg-indigo-800/80 text-indigo-300 rounded transition-colors ml-auto"
        >
          {showSchema ? '▲ Hide AI Schema' : '🤖 View AI Schema'}
        </button>
      </div>

      {/* AI schema reference panel */}
      {showSchema && (
        <div className="bg-black/40 border border-indigo-500/30 rounded-lg p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-indigo-300 text-xs font-medium">
              Copy this schema and paste it into any AI chat to generate elements JSON.
            </p>
            <button
              onClick={handleCopySchema}
              className="px-3 py-1 text-xs bg-indigo-700 hover:bg-indigo-600 text-white rounded transition-colors shrink-0"
            >
              {schemaCopied ? '✓ Copied!' : 'Copy schema'}
            </button>
          </div>
          <pre className="text-xs text-white/60 overflow-auto max-h-48 whitespace-pre-wrap leading-relaxed">
            {AI_SCHEMA}
          </pre>
        </div>
      )}

      {/* JSON textarea */}
      <textarea
        value={jsonText}
        onChange={(e) => { setJsonText(e.target.value); setError(''); }}
        spellCheck={false}
        className="flex-1 min-h-[280px] bg-black/50 border border-white/10 rounded-lg p-4 text-xs text-green-300 font-mono resize-y outline-none focus:border-purple-500/60 transition-colors"
        placeholder='{ "elem_abc123": { "type": "text", ... } }'
      />

      {/* Error */}
      {error && (
        <p className="text-red-400 text-xs bg-red-900/20 border border-red-500/30 rounded px-3 py-2">{error}</p>
      )}

      {/* Apply */}
      <button
        onClick={handleApply}
        className="self-end px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
      >
        Apply JSON to canvas
      </button>
    </div>
  );
}

export default TemplateGalleryModal;
