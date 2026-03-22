# Infinite Canvas

A high-performance infinite canvas engine with smooth pan, zoom, and card rendering. All rendering runs in a **Web Worker** via `OffscreenCanvas` so the main thread is never blocked. Handles **2000+ cards** at 60fps.

## Monorepo Structure

```
infinit-canvas/
  packages/
    react-infinite-canvas/       -- npm package (publishable)
      src/
        index.js                 -- Package entry: exports <InfiniteCanvas> + useInfiniteCanvas
        InfiniteCanvas.jsx       -- Ready-to-use React component with all props
        useInfiniteCanvas.js     -- Core hook: worker lifecycle, pan/zoom, pointer events
        workerCode.js            -- Worker source inlined as JS string (for blob URL)
        canvas.worker.js         -- Standalone worker file (reference/HTML usage)
        createWorker.js          -- Worker factory (legacy, replaced by inline blob)
        styles.css               -- Minimal CSS for the canvas wrapper
      vite.config.js             -- Vite library build config
      package.json               -- npm package config with peer deps

  apps/
    html/                        -- Pure HTML/JS demo (zero build tools)
      canvas.worker.js           -- Worker with spatial grid + batched rendering
      js/
        main.js                  -- Entry: wires worker, events, controls
        state.js                 -- Camera + cards state
        events.js                -- Pointer/wheel event handlers
        worker-bridge.js         -- OffscreenCanvas transfer + worker init
        controls.js              -- UI button handlers
      stress-test.html           -- 2000-card performance benchmark
      infinite_canvas_explainer.html -- Interactive demo with code tabs

    react/                       -- React + Vite demo app
      src/
        App.jsx                  -- Demo app consuming the package
        StressTest.jsx           -- 2000-card stress test page
        components/
          InfiniteCanvas.jsx     -- Original hook (before package extraction)
          CodeTabs.jsx           -- Code snippet tabs UI
```

## Install

```bash
npm install react-infinite-canvas
```

## Quick Start

```jsx
import { InfiniteCanvas } from 'react-infinite-canvas';
import 'react-infinite-canvas/styles.css';

// Cards are positioned in world-space coordinates
// x, y = top-left position | w, h = card dimensions
const cards = [
  { x: 60, y: 80, w: 160, h: 90, title: 'Note A', body: 'Hello!' },
  { x: 320, y: 140, w: 160, h: 90, title: 'Note B', body: 'World!' },
];

function App() {
  return <InfiniteCanvas cards={cards} height="500px" />;
}
```

## Props

| Prop | Default | Description |
|------|---------|-------------|
| `cards` | `[]` | Array of `{ x, y, w, h, title, body }` positioned in world coordinates |
| `dark` | auto | Force dark/light mode (auto-detects `prefers-color-scheme`) |
| `gridSize` | `40` | Background grid cell size in pixels |
| `zoomMin` / `zoomMax` | `0.1` / `4` | Zoom clamp range |
| `initialCamera` | `{ x:0, y:0, zoom:1 }` | Starting camera position and zoom |
| `onHudUpdate` | - | Callback fired with `{ wx, wy, zoom, renderMs, fps, visible }` |
| `showHud` / `showHint` | `true` | Toggle coordinate HUD and drag hint overlays |
| `hintText` | `'Drag to pan...'` | Custom hint text |
| `width` / `height` | `'100%'` / `'420px'` | Container dimensions (CSS values) |
| `className` / `style` | - | Custom styling on the wrapper div |
| `children` | - | Render arbitrary React children inside the canvas wrapper |

## Hook API

For full control over the canvas (custom UI, imperative camera control):

```jsx
import { useInfiniteCanvas } from 'react-infinite-canvas';
import 'react-infinite-canvas/styles.css';

function MyCanvas() {
  const {
    wrapRef,        // ref for the wrapper div (attach pointer events here)
    canvasRef,      // ref for the <canvas> element
    onPointerDown,  // handler: starts drag, captures pointer
    onPointerMove,  // handler: updates camera.x/y during drag
    onPointerUp,    // handler: ends drag
    resetView,      // () => resets camera to initialCamera
    addCard,        // (card?) => adds card at center or at given position
    getCamera,      // () => { x, y, zoom } snapshot
    setCamera,      // ({ x?, y?, zoom? }) => updates camera imperatively
  } = useInfiniteCanvas({
    cards: myCards,
    onHudUpdate: (hud) => console.log(hud),
  });

  return (
    <div ref={wrapRef} className="ric-wrap"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <canvas ref={canvasRef} className="ric-canvas" />
    </div>
  );
}
```

## Deep Dive: How It Works

### 1. Architecture Overview

```
Main Thread (React)                  Worker Thread (OffscreenCanvas)
===================                  ================================

User drags/scrolls
        |
        v
Pointer/wheel event handlers
capture input, update camera
state (cameraRef), and send
postMessage({ type: 'camera' })  --->  Worker receives camera update
                                       |
                                       v
                                       scheduleRender() coalesces
                                       multiple updates into one
                                       requestAnimationFrame
                                       |
                                       v
                                       render() executes:
                                       1. Spatial grid lookup (O(1))
                                       2. LOD determination
                                       3. Multi-pass batched drawing
                                       4. FPS/timing measurement
                                       |
                                       v
postMessage({ type: 'hud' })   <---  Sends HUD data back (throttled
        |                            to every 100ms, not every frame)
        v
onHudUpdate callback fires,
React updates HUD overlay
```

### 2. Camera Transform (The Core Idea)

The infinite canvas works by never moving content — instead, we move a **camera**. All cards exist at fixed world-space coordinates. The camera's position and zoom level determine what's visible.

```js
// Before drawing any content, apply the camera transform:
ctx.save();
ctx.translate(camera.x, camera.y);   // Pan: shift the origin by camera offset
ctx.scale(camera.zoom, camera.zoom); // Zoom: scale everything uniformly
// Now draw all cards at their world-space (x, y) coordinates
// The canvas context handles the screen projection automatically
drawAllCards();
ctx.restore();
```

**Why this works:** When you draw a card at world position (200, 300), the canvas context automatically transforms it to screen position `(200 * zoom + camera.x, 300 * zoom + camera.y)`. No per-card math needed.

### 3. Panning (Pointer Events)

Panning accumulates the pointer's delta movement into the camera offset:

```js
// On pointermove during drag:
camera.x += e.clientX - lastPointer.x;  // Add horizontal delta
camera.y += e.clientY - lastPointer.y;  // Add vertical delta
lastPointer = { x: e.clientX, y: e.clientY };

// Send updated camera to worker for re-render
worker.postMessage({ type: 'camera', data: { camera } });
```

**Key detail:** We use `setPointerCapture()` on pointerdown so the drag continues even if the cursor leaves the canvas bounds.

### 4. Zooming Around Cursor

Zooming must keep the point under the cursor fixed in world space. This requires adjusting the camera offset simultaneously with the zoom level:

```js
// factor > 1 = zoom in, factor < 1 = zoom out
const factor = e.deltaY > 0 ? 0.92 : 1.08;

// mx, my = cursor position relative to canvas top-left
const mx = e.clientX - rect.left;
const my = e.clientY - rect.top;

// The key formula: adjust offset so cursor stays at same world point
// Before zoom: worldX = (mx - camera.x) / camera.zoom
// After zoom:  worldX = (mx - newCameraX) / newZoom
// Setting them equal and solving for newCameraX gives:
camera.x = mx - (mx - camera.x) * factor;
camera.y = my - (my - camera.y) * factor;
camera.zoom *= factor;
```

**Math explanation:** The cursor is at screen position `(mx, my)`. Its world position is `(mx - cam.x) / zoom`. After zooming, we want the same world position to map back to the same screen position. Solving for the new camera offset gives the formula above.

### 5. OffscreenCanvas + Web Worker

The rendering runs entirely in a Web Worker to keep the main thread free for input events:

```js
// Main thread: transfer canvas control to worker (one-time, irreversible)
const offscreen = canvas.transferControlToOffscreen();
const worker = new Worker(workerBlobUrl);
worker.postMessage({ type: 'init', data: { canvas: offscreen } }, [offscreen]);
// The [offscreen] array marks it as a "transferable" — zero-copy handoff

// Worker thread: receives the OffscreenCanvas and draws on it
self.onmessage = (e) => {
  if (e.data.type === 'init') {
    ctx = e.data.data.canvas.getContext('2d');
    // Now the worker owns this canvas — main thread cannot draw on it
  }
};
```

**Why blob URL:** The worker code is inlined as a JavaScript string and loaded via `URL.createObjectURL(new Blob([code]))`. This avoids cross-package file resolution issues with bundlers like Vite, where `new URL('./worker.js', import.meta.url)` doesn't work across workspace packages.

**StrictMode handling:** React's StrictMode unmounts and remounts components in dev mode. Since `transferControlToOffscreen()` can only be called once per canvas element, we store the worker in a `WeakMap` keyed by the canvas DOM element, so re-mounts reuse the existing worker instead of crashing.

### 6. Render Scheduling (Coalescing)

Multiple camera updates can arrive between animation frames (e.g., fast mouse movement). We coalesce them into a single render:

```js
let renderScheduled = false;

function scheduleRender() {
  if (renderScheduled) return;  // Already scheduled — skip
  renderScheduled = true;
  requestAnimationFrame(() => {
    renderScheduled = false;
    render();  // Only render once with the latest state
  });
}
```

This prevents wasted renders when 5-10 pointermove events fire between frames.

## Performance Optimizations

### Spatial Grid Index

Instead of checking every card against the viewport (O(n) per frame), cards are bucketed into a spatial grid at insertion time:

```
World space divided into 400x400px cells:

   Cell(0,0)    Cell(1,0)    Cell(2,0)
  ┌──────────┬──────────┬──────────┐
  │ Card 1   │          │ Card 4   │
  │ Card 2   │          │          │
  ├──────────┼──────────┼──────────┤
  │          │ Card 3   │          │
  │          │          │ Card 5   │
  └──────────┴──────────┴──────────┘
   Cell(0,1)    Cell(1,1)    Cell(2,1)
```

On each frame, we compute which cells overlap the viewport and only check cards in those cells. A card spanning multiple cells is stored in all of them (with deduplication via a `seen` set).

**Complexity:** O(visible_cells) instead of O(total_cards). With 2000 cards but only ~20 visible, this skips 99% of cards.

### Batched Multi-Pass Rendering

The naive approach sets canvas state per card (shadow, fill, stroke, font = ~15 state changes per card). Our approach batches by operation:

```
NAIVE (per card):                    OPTIMIZED (per pass):
─────────────────                    ─────────────────────
For each card:                       PASS 1 - All shadows:
  set shadow  ─┐                       set shadow once
  fill bg     ─┤ 15 state             fill ALL card rects → 1 draw call
  clear shadow ┤ changes              clear shadow
  stroke border┤ per card
  fill header  ┤                     PASS 2 - All backgrounds:
  set font 1   ┤                       (only if no shadow pass)
  draw title   ┤                       fill ALL card rects → 1 draw call
  set font 2   ┤
  draw body    ┤                     PASS 3 - All borders:
  set font 3   ┤                       stroke ALL card rects → 1 draw call
  draw coords  ┘
                                     PASS 4 - Headers by color:
2000 cards = 30,000 calls              4 colors × 1 fill each → 4 draw calls

                                     PASS 5 - Text by font:
                                       3 fonts × 1 pass each → 3 draw calls

                                     2000 cards = ~10 calls total
```

### Level of Detail (LOD)

At low zoom levels, text is too small to read and shadows are invisible. We skip them entirely:

| Zoom Level | Rendered | Why |
|------------|----------|-----|
| < 0.08 | Cards only (no shadows, no text) | Everything is tiny — details invisible |
| 0.08 - 0.15 | + shadows (if < 200 visible) | Shadows are most expensive (Gaussian blur) |
| 0.15 - 0.3 | + titles + body text | Text becomes readable |
| > 0.3 | + coordinate labels | Full detail |

### Pre-Computed Theme Colors

Instead of evaluating `dark ? 'rgba(...)' : 'rgba(...)'` per card per frame, colors are computed once when the theme changes and stored in a `COLORS` object:

```js
// Computed once on theme change — not per card, not per frame
const COLORS = {
  cardBg: dark ? '#2a2a28' : '#ffffff',
  bodyText: dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)',
  // ...
};

// In render loop — just reference the pre-computed value
ctx.fillStyle = COLORS.cardBg;  // No conditional evaluation
```

### Other Optimizations

- **Font constants** — `ctx.font` is set once per pass (not 3x per card). Font parsing is expensive.
- **Grid skip** — Background grid lines are not drawn when `step < 2px` (too zoomed out to see individual lines).
- **Throttled HUD** — `postMessage()` to main thread happens every 100ms, not every frame. Reduces serialization overhead.
- **Coalesced renders** — Multiple `pointermove` events between frames produce a single render via `requestAnimationFrame`.
- **ResizeObserver** — Canvas dimensions auto-update when container resizes. No polling.

## Development

```bash
yarn install
```

### Run both apps

```bash
yarn dev
```

### Run individually

```bash
yarn dev:html    # http://localhost:3001
yarn dev:react   # http://localhost:3000
```

### Stress Test

- **React**: http://localhost:3000#stress (2000 cards, buttons for 5k/10k)
- **HTML**: http://localhost:3001/stress-test.html (2000 cards)

### Build

```bash
yarn build
```

## Tech Stack

- **Package**: React 17+, OffscreenCanvas, Web Worker, Spatial Grid Index
- **HTML demo**: Vanilla JS, zero dependencies
- **React demo**: React 19, Vite
- **Monorepo**: Turborepo + yarn workspaces
