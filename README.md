# GifAlchemy

A browser-based GIF editor for adding animated text overlays, resizing, and exporting—all in the client. No server upload required for editing.

![GifAlchemy](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js) ![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript)

---

## Features

### Upload & timeline
- **Upload** GIF, MP4, WebM, or PNG (single frame) — up to 50 MB
- **Frame-by-frame timeline** with thumbnails, scrubber, and play/pause
- **Autosave** to browser storage (IndexedDB) so work is preserved

### Resize
- **Presets**: Original, Sticker (128×128), Social (480px), HD (720px)
- Output dimensions drive export size

### Text overlays
- **Multiple text layers** — add, reorder, and edit in the properties panel
- **Position** text by dragging on the canvas (keyframes interpolated across the timeline)
- **Double-click** any text on the canvas to jump into editing the content
- **Fonts**: System, Georgia, Arial, Times New Roman, Courier, Impact, Verdana, Comic Sans — with **live preview** in the font dropdown
- **Style**: Bold, italic, font size (8–120px), text color (picker + swatches)
- **Stroke**: Width (0–12px) and color (default black) for readable text on any background
- **Default**: White fill with 2px black stroke

### Text effects (animation presets)
- **Visual effect picker** — grid of cards with animated “Aa” previews
- **Effects**: None, Fade In, Fade Out, Slide Up, Slide Down, Pop, Bounce, Shake, Wiggle, Pulse, Typewriter (left-to-right reveal)
- **Clear selection** — “None” removes the effect and resets keyframes
- **Selected effect** is clearly indicated (checkmark and highlight)

### Export
- **GIF export** with progress bar, ETA, and **Cancel**
- Export uses the current output size (from Resize tool) and composites all text overlays with their keyframe animations

---

## Tech stack

| Layer | Stack |
|-------|--------|
| **Framework** | Next.js 15 (App Router), React 19 |
| **Language** | TypeScript 5.6 |
| **Styling** | Tailwind CSS 4, Radix UI (Select, Slider, Tooltip, etc.) |
| **GIF decode** | gifuct-js (client-side) |
| **GIF encode** | gif.js (worker-based) |
| **Persistence** | IndexedDB (optional Supabase adapter) |

---

## Getting started

### Prerequisites
- **Node.js** 18+ (recommend 20+)
- **npm** (or pnpm / yarn)

### Install
```bash
git clone https://github.com/hawxxx/GifAlchemy.git
cd GifAlchemy
npm install
```

### Development
```bash
npm run dev
```
Runs the app with Turbopack at [http://localhost:3000](http://localhost:3000). Use **Open editor** to go to `/editor`.

### Build & run
```bash
npm run build
npm start
```

### Lint
```bash
npm run lint
```

---

## Project structure

```
GifAlchemy/
├── app/
│   ├── page.tsx              # Landing: “Open editor”
│   ├── layout.tsx
│   ├── globals.css           # Theme + text-effect keyframes
│   └── (editor)/editor/
│       └── page.tsx          # Editor route
├── components/
│   ├── editor/               # Editor UI
│   │   ├── canvas-stage.tsx  # Canvas, overlay layer, export overlay
│   │   ├── overlay-renderer.tsx  # Text overlays (drag, double-click edit)
│   │   ├── text-tool-panel.tsx   # Layers, content, font, stroke, effects
│   │   ├── resize-tool-panel.tsx
│   │   ├── timeline-panel.tsx
│   │   ├── tools-rail.tsx
│   │   ├── export-button.tsx
│   │   └── ...
│   └── ui/                   # Radix-based primitives
├── core/
│   ├── domain/               # project.ts, presets.ts, gif-types
│   ├── application/
│   │   ├── commands/         # overlay-commands, editor-commands
│   │   ├── processors/       # gif-processor port
│   │   └── repositories/     # project-repository port
│   └── infrastructure/
│       ├── processors/       # wasm-gif-processor (gifuct-js + gif.js)
│       └── repositories/     # IndexedDB + Supabase adapters
├── hooks/                    # use-editor, use-overlays, use-playback, use-autosave
├── providers/
│   └── editor-provider.tsx   # State, undo/redo, contentInputRef
└── public/
    └── gif.worker.js         # GIF encoder worker
```

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Run production server |
| `npm run lint` | Run ESLint |

---

## Browser support
- Modern browsers with support for **Web Workers**, **IndexedDB**, and **Canvas 2D**
- Tested on recent Chrome, Firefox, Edge, Safari

---

## License
MIT (or as specified in the repository).
