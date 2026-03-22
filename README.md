# Infinite Canvas

A high-performance infinite canvas engine with smooth pan, zoom, and card rendering. All rendering runs in a **Web Worker** via `OffscreenCanvas` so the main thread is never blocked. Handles **2000+ cards** at 60fps.

## Monorepo Structure

```
packages/
  react-infinite-canvas/   — npm package: <InfiniteCanvas> component + useInfiniteCanvas hook

apps/
  html/                    — Pure HTML/JS demo (no build tools)
  react/                   — React + Vite demo consuming the package
```

## Install

```bash
npm install react-infinite-canvas
```

## Quick Start

```jsx
import { InfiniteCanvas } from 'react-infinite-canvas';
import 'react-infinite-canvas/styles.css';

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
| `cards` | `[]` | Array of `{ x, y, w, h, title, body }` |
| `dark` | auto | Force dark/light mode (auto-detects system preference) |
| `gridSize` | `40` | Grid cell size in pixels |
| `zoomMin` / `zoomMax` | `0.1` / `4` | Zoom range |
| `initialCamera` | `{ x:0, y:0, zoom:1 }` | Starting camera position |
| `onHudUpdate` | - | Callback with `{ wx, wy, zoom, renderMs, fps, visible }` |
| `showHud` / `showHint` | `true` | Toggle HUD and hint overlays |
| `hintText` | `'Drag to pan...'` | Custom hint text |
| `width` / `height` | `'100%'` / `'420px'` | Container dimensions |
| `className` / `style` | - | Custom styling |
| `children` | - | Render children inside canvas wrapper |

## Hook API

For full control, use the hook directly:

```jsx
import { useInfiniteCanvas } from 'react-infinite-canvas';
import 'react-infinite-canvas/styles.css';

function MyCanvas() {
  const {
    wrapRef,
    canvasRef,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    resetView,
    addCard,
    getCamera,
    setCamera,
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

## Architecture

```
Main Thread                     Worker Thread (OffscreenCanvas)
-----------                     --------------------------------
Pointer/wheel events   --->     postMessage({ camera })
                                Spatial grid lookup (O(1) culling)
                                Multi-pass batched rendering
HUD update (DOM)       <---     postMessage({ hud }) @ 100ms throttle
```

The main thread only handles input events and DOM. The worker owns the `OffscreenCanvas` and does all drawing, so heavy frames never cause input lag.

## Performance Optimizations

### Spatial Grid Index
Cards are bucketed into a 400px spatial grid. On each frame, only cells overlapping the viewport are queried — **O(1) culling** instead of O(n) linear scan.

### Batched Multi-Pass Rendering
Instead of per-card state changes (shadow, bg, border, header, text = ~15 draw calls per card), rendering is batched by operation:

| Pass | What | Draw Calls |
|------|------|-----------|
| 1 | Shadows (all cards) | 1 |
| 2 | Card backgrounds | 1 |
| 3 | Card borders | 1 |
| 4 | Headers (by color) | 4 |
| 5 | Text (by font) | 3 |
| **Total** | | **~10** |

2000 cards: **10 draw calls** instead of 30,000.

### Level of Detail (LOD)
| Zoom Level | What's Rendered |
|------------|----------------|
| < 0.08 | Cards only (no shadows, no text) |
| 0.08 - 0.15 | Cards + shadows (if < 200 visible) |
| 0.15 - 0.3 | Cards + shadows + titles + body text |
| > 0.3 | Full detail (+ coordinate labels) |

### Other Optimizations
- **Pre-computed theme colors** — no conditionals per card during render
- **Font constants** — set once per pass, not 3x per card
- **Grid skip** — grid lines not drawn when step < 2px
- **Throttled HUD** — `postMessage` every 100ms, not every frame
- **Coalesced renders** — multiple camera updates per frame batched via `requestAnimationFrame`

## How It Works

### Camera Transform
```js
ctx.translate(camera.x, camera.y);   // pan offset
ctx.scale(camera.zoom, camera.zoom); // zoom level
drawEverything();                     // all content in world space
```

### Zoom Around Cursor
```js
camera.x = mx - (mx - camera.x) * factor;
camera.y = my - (my - camera.y) * factor;
camera.zoom *= factor;
```

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
- React: http://localhost:3000#stress (2000 cards)
- HTML: http://localhost:3001/stress-test.html (2000 cards)

### Build
```bash
yarn build
```

## Tech Stack

- **Package**: React 17+, OffscreenCanvas, Web Worker, Spatial Grid Index
- **HTML demo**: Vanilla JS, zero dependencies
- **React demo**: React 19, Vite
- **Monorepo**: Turborepo + yarn workspaces
