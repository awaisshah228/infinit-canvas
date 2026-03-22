# react-infinite-canvas

A high-performance infinite canvas React component powered by OffscreenCanvas and Web Workers. Handles 2000+ cards at 60fps with spatial indexing, batched rendering, and automatic LOD.

## Install

```bash
npm install react-infinite-canvas
```

## Usage

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
| `dark` | auto | Force dark/light mode |
| `gridSize` | `40` | Grid cell size in px |
| `zoomMin` / `zoomMax` | `0.1` / `4` | Zoom limits |
| `initialCamera` | `{ x:0, y:0, zoom:1 }` | Starting position |
| `onHudUpdate` | - | Callback: `{ wx, wy, zoom, renderMs, fps, visible }` |
| `showHud` / `showHint` | `true` | Toggle overlays |
| `width` / `height` | `'100%'` / `'420px'` | Container size |
| `className` / `style` | - | Custom styling |
| `children` | - | Render inside canvas wrapper |

## Hook API

```jsx
import { useInfiniteCanvas } from 'react-infinite-canvas';

const { wrapRef, canvasRef, onPointerDown, onPointerMove, onPointerUp,
        resetView, addCard, getCamera, setCamera } = useInfiniteCanvas({ cards });
```

## Performance

- **Spatial grid index** for O(1) viewport culling
- **Batched multi-pass rendering** (~10 draw calls for any number of cards)
- **Level of Detail** — text/shadows hidden at low zoom
- **Web Worker rendering** — main thread never blocked
- **Pre-computed colors** and font constants
- **Throttled HUD** updates (100ms)

## License

MIT
