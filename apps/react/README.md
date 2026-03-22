# Infinite Canvas — React Version

React 19 + Vite implementation. Canvas rendering runs in a **Web Worker** via `OffscreenCanvas`, keeping the React main thread free for UI updates.

## Architecture

```
React (Main Thread)                  Worker Thread
───────────────────                  ──────────────
useInfiniteCanvas hook               canvas.worker.js
  ├─ Pointer/wheel events              ↑
  ├─ Camera state (useRef)           Receives camera/cards/theme
  ├─ postMessage({ camera })  ───→   Draws everything on OffscreenCanvas
  └─ setState(hud)           ←───   postMessage({ hud })

App.jsx
  ├─ <canvas ref>
  ├─ Controls (Reset / Add card)
  └─ CodeTabs
```

## File Structure

```
src/
  main.jsx                    — React entry point
  App.jsx                     — Main layout, connects hook to UI
  App.css                     — Styles (dark mode via media queries)
  components/
    InfiniteCanvas.jsx        — Custom hook: worker setup, pan/zoom events
    CodeTabs.jsx              — Tabbed code explainer component
  workers/
    canvas.worker.js          — Web Worker: all rendering happens here
```

## How Each File Works

### `src/components/InfiniteCanvas.jsx`
A custom hook (`useInfiniteCanvas`) that:
1. **Transfers** the `<canvas>` to an `OffscreenCanvas` and sends it to a Web Worker
2. **Handles** pointer events (pan) and wheel events (zoom) on the main thread
3. **Sends** camera state to the worker via `postMessage` on every input
4. **Receives** HUD data back from the worker and passes it to the parent via callback
5. **Guards** against React StrictMode double-mount (transferControlToOffscreen can only be called once)

Camera state lives in `useRef` (not `useState`) to avoid re-renders on every mouse move.

### `src/components/CodeTabs.jsx`
Stateful tabbed component showing code snippets that explain how the canvas works. Managed entirely with React state — no worker involvement.

### `src/workers/canvas.worker.js`
Identical rendering logic to the HTML version:
- Grid (modulo-based infinite tiling)
- Origin dot
- Cards (with frustum culling)
- `requestAnimationFrame` batching
- Sends HUD data back to main thread

### `src/App.jsx`
Connects the hook to the DOM:
- Renders the canvas wrapper, hint, and HUD overlay
- Passes pointer event handlers from the hook to the wrapper div
- Renders control buttons and code tabs

## Key Design Decisions

| Decision | Why |
|----------|-----|
| Custom hook, not component | The canvas element must be in App's JSX so React owns the ref. The hook returns refs + handlers. |
| `useRef` for camera | Camera updates 60x/sec during drag. Using `useState` would trigger 60 re-renders/sec. |
| WeakSet for transfer guard | `transferControlToOffscreen()` throws if called twice. StrictMode double-mounts in dev. |
| Native `addEventListener` for wheel | React's `onWheel` doesn't support `{ passive: false }`, which is needed for `preventDefault()`. |
| Worker for rendering | Keeps React's main thread free. Complex shadow/card rendering never blocks UI updates. |

## Running

```bash
# From monorepo root
yarn dev:react

# Or directly
cd apps/react && yarn vite --port 3000
```

Open http://localhost:3000

## Building

```bash
yarn build
# Output in apps/react/dist/
```
