# Infinite Canvas — HTML Version

Pure HTML/JS implementation with zero dependencies. All rendering runs in a **Web Worker** via `OffscreenCanvas`.

## Architecture

```
Main Thread (input only)          Worker Thread (rendering only)
────────────────────────          ──────────────────────────────
Pointer/wheel events              OffscreenCanvas + ctx.getContext('2d')
  ↓                                 ↑
camera state update               Receives camera/cards/theme via postMessage
  ↓                                 ↑
postMessage({ camera })  ───→    Draws grid, cards, origin dot
                                    ↓
DOM update (HUD)         ←───    postMessage({ hud })
```

The main thread **never touches the canvas**. It only handles input events, updates the camera object, and sends it to the worker. This means even if the worker is drawing 100+ cards with shadows, your drag/scroll stays smooth at 60fps.

## File Structure

```
infinite_canvas_explainer.html   — HTML + CSS + code explainer tabs
js/
  main.js                        — Entry point, wires everything together
  state.js                       — Camera, cards, and app state
  worker-bridge.js               — Sets up the worker, sends messages
  events.js                      — Pointer (pan) and wheel (zoom) handlers
  controls.js                    — Reset view, add card, tab switching
canvas.worker.js                 — Web Worker: all rendering happens here
```

## How Each File Works

### `js/state.js`
Holds the camera position `{ x, y, zoom }` and the array of note cards. The main thread owns this state and sends copies to the worker.

### `js/worker-bridge.js`
Creates the Web Worker, transfers the `OffscreenCanvas` to it (zero-copy via transferable), and provides `sendCamera()` / `sendCards()` helpers to send state updates.

### `js/events.js`
Attaches pointer events for panning (drag) and wheel events for zooming. Both update `camera` in `state.js` and call `sendCamera()`.

### `js/controls.js`
UI button handlers: reset view, add card, tab switching.

### `canvas.worker.js`
Receives messages from the main thread and renders:
1. **Grid** — Modulo-based infinite tiling, only visible lines drawn
2. **Origin dot** — Circle at world (0,0)
3. **Cards** — With frustum culling (skips off-screen cards), shadows, colored headers
4. **HUD** — Sends world coordinates + zoom back to main thread

Uses `requestAnimationFrame` batching to coalesce multiple camera updates into one paint per frame.

## Running

```bash
# From monorepo root
yarn dev:html

# Or directly
yarn dlx serve . -l 3001
```

Open http://localhost:3001/infinite_canvas_explainer.html

## Key Concepts

| Concept | How |
|---------|-----|
| Camera transform | `ctx.translate(cam.x, cam.y)` + `ctx.scale(cam.zoom, cam.zoom)` |
| Zoom around cursor | Adjust offset so world point under cursor stays fixed |
| Infinite grid | `((cam.x % step) + step) % step` gives positive start offset |
| Frustum culling | Convert screen bounds to world space, skip cards outside |
| Off-thread render | `OffscreenCanvas` transferred to Worker, main thread stays free |
