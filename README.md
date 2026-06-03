# SpiderWeb

> A miniaturised, retro-styled creative internet � think Myspace/Geocities rebuilt as a zero-code drag-and-drop editor with a Meta-Browser that lets you navigate between user-built pages.

---

## What it is

SpiderWeb gives every user an **interactive canvas page** � a fixed-coordinate plane where they can place text, images, GIFs, and shapes with pixel-perfect freedom. No HTML, no CSS knowledge needed. Pages link to each other, and users browse the network through a **Meta-Browser**: a browser-within-the-browser complete with tabs, back/forward history, and a custom address bar.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Drag & Resize | `react-rnd` |
| State | Zustand |
| IDs | `nanoid` |
| Schema Validation | `zod` |
| Backend *(Phase 2)* | Firebase � Firestore + Storage + Auth |

---

## Project Structure

```
src/
+-- components/
�   +-- browser/          # Meta-Browser chrome (TabBar, AddressBar, MetaBrowser)
�   +-- editor/           # Editor tools (EditorToolbar, PropertyPanel, PageCanvas)
�   +-- elements/         # Canvas nodes (TextNode, ImageNode, ShapeNode)
+-- constants/
�   +-- canvas.js         # MAX_CANVAS_WIDTH, font list, z-index limits, etc.
+-- store/
�   +-- canvasStore.js    # Active page blueprint + element CRUD (Zustand)
�   +-- tabStore.js       # Meta-Browser tab system + navigation history (Zustand)
+-- utils/
    +-- blueprintSchema.js  # Zod schema � validates pages before Firestore writes
    +-- canvasGeometry.js   # Scale factor + coordinate helpers
    +-- elementFactory.js   # Factory functions for Text / Image / Shape elements
    +-- firebase.js         # Firebase config + lazy-initialised singletons (Phase 2)
```

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev
```

Open http://localhost:5173.

Click **Editing** in the toolbar to enter edit mode, then use the toolbar buttons to add text, images, and shapes. Drag elements around, resize them, and tweak styles in the Property Panel on the right.

---

## Development Phases

### Phase 1 � Core Editor & Renderer (current)

- [x] Vite + React + Tailwind CSS
- [x] Fixed-coordinate canvas with mobile zoom (CSS scale)
- [x] React.memo canvas nodes � dragging one element never re-renders others
- [x] react-rnd drag & resize with final-position-only state dispatch
- [x] **`scale` prop passed to every `<Rnd>` so drag positions are correct on mobile** *(bug fix)*
- [x] Text, Image, and Shape elements
- [x] Inline text editing (double-click)
- [x] Desktop image drag-and-drop onto canvas
- [x] Property Panel: position, size, z-index, typography, color, links
- [x] **Page title editable inline in the EditorToolbar (owner only)** *(new)*
- [x] Zustand canvas store (element CRUD, z-ordering, theme)
- [x] Zustand tab store (tabs, history, back/forward, address bar)
- [x] Meta-Browser chrome (TabBar, AddressBar)
- [x] Zod blueprint schema for future Firestore validation
- [x] Firebase placeholder � drop in credentials to unlock Phase 2

### Phase 2 � Firebase Integration & Real Navigation

- [x] Firebase Auth (anonymous + Google Sign-In)
- [x] Save / load page blueprints to Firestore
- [x] **Element deletion now persists — switched `savePage` from `setDoc+merge` to `updateDoc` (full field overwrite)** *(bug fix)*
- [x] Blueprint validation with Zod before every write
- [x] Upload images to Firebase Storage
- [x] Meta-Browser navigates between real page IDs fetched from Firestore
- [x] Link interception — clicking an href element loads the target page in the active tab
- [x] **Social panel — likes & comments with full CRUD; page owner can delete any comment; comments support page links** *(new)*
- [x] **Firestore security rules for `likes` and `comments` subcollections** *(new)*

### Phase 3 � Polish & Figma Feel

- [ ] Multi-element bounding-box selection (marquee drag)
- [ ] Keyboard shortcuts: Delete, Ctrl+C, Ctrl+V, Ctrl+Z
- [ ] Full undo/redo history stack
- [ ] Page background image upload
- [ ] Public profile URLs (/page/:id)- [x] **Mobile overhaul — `100dvh` layout, ProfileMenu overflow fix, PropertyPanel & SocialPanel as a bottom sheet on mobile, Social FAB, `useIsMobile` hook** *(new)*
---

## Adding Firebase (Phase 2)

1. Create a project at https://console.firebase.google.com
2. Enable Firestore, Firebase Storage, and Authentication.
3. Copy `.env.example` to `.env` and fill in your project credentials.
4. That is it � `src/utils/firebase.js` detects the config and initialises lazily.

---

## Security

- All user text is rendered as plain string children � dangerouslySetInnerHTML is never used.
- Every page blueprint is validated through a strict Zod schema before any Firestore write.
- Firebase is tree-shaken out of the Phase 1 bundle entirely (lazy dynamic imports).
- Only a curated list of web-safe fonts is available � no custom font file uploads.

---

## Coding Standards

See docs/coding_rules.txt for the full style guide. Key points:

- Functional components only, max ~150 lines each
- React.memo on every canvas element
- useCallback on all props passed to memoised children
- Global state (Zustand) vs. local/ephemeral state (useState) strictly separated
- Drag coordinates stay local � only onDragStop writes to the store
