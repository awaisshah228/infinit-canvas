# Infinite Canvas — Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        React (Main Thread)                         │
│                                                                    │
│  ┌──────────────────────┐    ┌──────────────────────────────────┐  │
│  │  InfiniteCanvasProvider │  │  InfiniteCanvas (component)      │  │
│  │  (Zustand store)       │◄─┤  - Pointer events                │  │
│  │                        │  │  - DOM overlays (custom nodes)   │  │
│  │  Subscribed by:        │  │  - SVG overlays (custom edges)   │  │
│  │  - useStore()          │  │  - HUD display                   │  │
│  │  - useNodes()          │  │  - Selection box                 │  │
│  │  - useAutoLayout()     │  │  - Virtualization                │  │
│  └────────────────────────┘  └──────────┬───────────────────────┘  │
│                                         │                          │
│  ┌──────────────────────────────────────┐│                          │
│  │  useInfiniteCanvas (hook)            ││                          │
│  │  - Camera state (ref, not state)     ││                          │
│  │  - Hit testing (findNodeAt, etc.)    ││                          │
│  │  - Drag, connect, select logic       ││                          │
│  │  - screenToWorld transform           ││                          │
│  └──────────┬───────────────────────────┘│                          │
│             │ postMessage                │                          │
│             ▼                            ▼                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   OffscreenCanvas Worker                     │   │
│  │                                                             │   │
│  │  - Grid/background rendering (cached tile pattern)          │   │
│  │  - Node rendering (canvas-rendered nodes only)              │   │
│  │  - Edge rendering (batched Path2D, routed paths)            │   │
│  │  - Spatial grids (cards + nodes) for frustum culling        │   │
│  │  - Edge routing (obstacle avoidance)                        │   │
│  │  - Handle position resolution & caching                     │   │
│  │  - HUD data (throttled 100ms)                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Tree

```
<InfiniteCanvasProvider>          // Optional wrapper — creates Zustand store
  <InfiniteCanvasAutoLayout>      // User component (e.g., uses useAutoLayout)
    <InfiniteCanvas>              // Core component
      <canvas>                    // OffscreenCanvas — transferred to worker
      <svg.ric-edges-overlay>     // Custom edge components (React SVG)
      <div.ric-nodes-overlay>     // Custom node components (React DOM)
      <div.ric-edge-labels>       // EdgeLabelRenderer portal target
      <div.ric-viewport-portal>   // ViewportPortal target
      <SelectionBox>              // Selection rectangle UI
      <div.ric-hud>               // World coords + zoom display
    </InfiniteCanvas>
  </InfiniteCanvasAutoLayout>
</InfiniteCanvasProvider>
```

---

## Initialization Flow

```
1. <InfiniteCanvas> mounts
   │
2. useInfiniteCanvas() runs
   │
3. useEffect: canvas + wrap refs ready
   │  ├─ canvas.transferControlToOffscreen()
   │  ├─ new CanvasWorker()
   │  ├─ worker.postMessage({ type: 'init', data: { canvas, width, height, camera, nodes, edges, dark, gridSize }})
   │  │   └─ [canvas] transferred via Transferable (zero-copy)
   │  ├─ ResizeObserver attached to wrap div
   │  └─ fitView if requested (computes viewport from node bounds)
   │
4. Worker receives 'init'
   │  ├─ canvas.getContext('2d')
   │  ├─ updateColors() — pre-compute all theme colors
   │  ├─ gridDirty = true, nodeSpatialDirty = true, etc.
   │  ├─ render() — first frame
   │  ├─ postMessage({ type: 'ready' }) → sets canvasReady=true, hides spinner
   │  └─ startAnimationLoop() if any edge has animated=true
   │
5. Worker cached via WeakMap(canvas → worker)
   └─ Survives React strict-mode double-mount (same canvas element = same worker)
```

---

## Rendering Pipeline (Worker)

All canvas drawing happens in the worker thread — zero render work on main thread.

```
render() — called on every frame that needs redraw
│
├─ 1. Clear canvas
│
├─ 2. Grid / Background
│     ├─ Cached tile approach (OffscreenCanvas → createPattern('repeat'))
│     │   - Grid tile rendered once per zoom level change
│     │   - Pattern fill covers entire viewport in single call
│     ├─ Supports: 'lines' | 'dots' | 'cross' variants
│     └─ Skipped when step < 2px (too zoomed out)
│
├─ 3. Origin dot
│
├─ 4. ctx.save() → translate(cam.x, cam.y) → scale(cam.zoom)
│     └─ All subsequent drawing is in world coordinates
│
├─ 5. Frustum culling (world bounds + edge padding)
│     ├─ Cards: spatial grid (CELL_SIZE=400) → getVisibleCardIndices()
│     └─ Nodes: spatial grid (NODE_CELL_SIZE=500) → getVisibleNodeIndices()
│         - >100 nodes: uses spatial grid (O(visible), not O(n))
│         - ≤100 nodes: linear scan (avoids grid rebuild overhead)
│
├─ 6. Cards (legacy) — batched by draw operation
│     ├─ Shadows: single beginPath → all roundRects → fill (LOD: skip if >200 visible)
│     ├─ Backgrounds: batched fill
│     ├─ Borders: batched stroke
│     ├─ Headers: grouped by color (4 palettes), batched fill
│     └─ Text: LOD — labels at zoom>0.15, coords at zoom>0.3
│
├─ 7. Edges — batched into 3 Path2D groups
│     ├─ Edge culling: adjacency index (nodeId → edge indices)
│     │   - Only iterate edges connected to visible nodes
│     ├─ Path types: bezier, straight, smoothstep, step
│     │   - Routed edges: use _routedPoints (orthogonal with rounded corners)
│     │   - Non-routed: compute bezier control points or step waypoints
│     ├─ Batched stroke: normal → selected → animated (3 draw calls max)
│     ├─ Arrowheads: batched per category
│     ├─ Edge labels: drawn at midpoint (LOD: skip at zoom<0.3)
│     └─ Custom-rendered edges (_customRendered=true): SKIPPED by worker
│
├─ 8. Nodes — canvas-rendered nodes only
│     ├─ Shadows: batched (LOD: skip if >200 visible)
│     ├─ Backgrounds: batched fill
│     ├─ Borders: normal batch + selected batch (blue border)
│     ├─ Labels: centered text (LOD: skip at zoom<0.15)
│     ├─ Handles: source (right) + target (left) dots
│     └─ Custom-rendered nodes (_customRendered=true): SKIPPED by worker
│         (their positions are still tracked for edge endpoint resolution)
│
├─ 9. Connection line (blue, while user drags handle-to-handle)
│
├─ 10. Selection box (dashed rectangle)
│
├─ 11. ctx.restore()
│
└─ 12. HUD update (throttled every 100ms)
      └─ postMessage({ type: 'hud', data: { wx, wy, zoom, fps, nodeCount, ... }})
```

### scheduleRender()

```
Coalesces multiple data updates into a single rAF frame.
If render already scheduled, subsequent calls are no-ops.

camera message  ──┐
nodes message   ──┼──→ scheduleRender() ──→ requestAnimationFrame(render)
edges message   ──┘
```

---

## Panning & Camera

Camera is stored as a **ref** (`cameraRef`), not React state — no re-renders during pan/zoom.

```
User drags on empty space (onPointerDown → onPointerMove → onPointerUp)
│
├─ onPointerDown: sets draggingRef=true, captures pointer
│
├─ onPointerMove (per frame):
│   ├─ cam.x += deltaX, cam.y += deltaY  (mutate ref directly)
│   ├─ sendCamera():
│   │   ├─ clamp to translateExtent if set
│   │   ├─ worker.postMessage({ type: 'camera', data: { camera } })
│   │   │   └─ Worker: scheduleRender() (one rAF)
│   │   ├─ onMove callback
│   │   ├─ notify viewportListeners
│   │   └─ debounced setViewport() via rAF (for React subscribers)
│   └─ mousemove hit testing: SKIPPED during active drag (perf optimization)
│
├─ DOM overlays (custom nodes/edges):
│   └─ Synced via rAF loop reading cameraRef directly
│       - nodesOverlay.style.transform = `translate(x,y) scale(zoom)`
│       - edgesOverlay.setAttribute('transform', `translate(x,y) scale(zoom)`)
│       └─ No React re-render — pure DOM mutation
│
└─ onPointerUp: sets draggingRef=false
```

### Zoom

```
Scroll wheel / pinch → adjusts cam.zoom around cursor position
├─ zoom = clamp(zoom * factor, zoomMin, zoomMax)
├─ cam.x/y adjusted to zoom toward mouse position
└─ sendCamera() → worker re-renders at new zoom

Double-click → zoom in 1.5x (or zoom out if already zoomed)
```

---

## Data Flow: Nodes & Edges

### Main Thread → Worker

```
Props change (nodes/edges)
│
├─ useEffect([nodes]):
│   ├─ nodesRef.current = [...nodes]       (mutable copy)
│   ├─ resolveAbsolutePositions()          (parentId → _absolutePosition)
│   ├─ injectRegisteredHandles()           (DOM-measured handle positions)
│   └─ worker.postMessage({ type: 'nodes', data: { nodes } })
│
├─ useEffect([edges]):
│   ├─ edgesRef.current = [...edges]
│   └─ worker.postMessage({ type: 'edges', data: { edges } })
│
└─ Worker receives 'nodes' / 'edges':
    ├─ Marks lookup/spatial/adjacency caches as dirty
    ├─ scheduleRender()
    └─ scheduleEdgeRouting() (async, runs after render)
```

### During Node Drag (Optimized Path)

```
onPointerMove during drag:
│
├─ Mutate nodesRef in-place (no React setState!)
├─ Compute absolute positions for dragged + child nodes
├─ worker.postMessage({ type: 'nodePositions', data: { updates: [...] } })
│   └─ Worker: patch existing node objects (no full array replacement)
│       ├─ handleCacheDirty = true
│       ├─ nodeSpatialDirty = true
│       ├─ scheduleRender()
│       └─ scheduleEdgeRouting()
│
└─ onNodesChange callback fires ONLY on pointerUp (drag end)
    └─ React state updates once, not per-frame
```

### Zustand Store Sync (InfiniteCanvasProvider)

```
When <InfiniteCanvasProvider> wraps the tree:

InfiniteCanvas useEffect([measuredNodes, edges]):
│
├─ queueMicrotask(() => {          ← deferred to avoid commit-phase loops
│     parentCtx.setState({
│       nodes: measuredNodes,      ← nodes with guaranteed measured dimensions
│       edges,
│       nodesRef, edgesRef,        ← refs for imperative access
│       cameraRef, wrapRef,
│       workerRef,
│     })
│   })
│
└─ Zustand subscribers (useStore, useNodes, etc.) update
    └─ e.g., useAutoLayout reads new nodes → computes layout → setNodes
```

---

## Caching Strategy

| Cache | Location | Invalidated When | Purpose |
|---|---|---|---|
| **Grid tile** | Worker (`gridCache` OffscreenCanvas) | Zoom changes, theme changes, variant changes | Avoid redrawing grid lines every frame — single `createPattern('repeat')` fill |
| **Spatial grid (cards)** | Worker (`spatialGrid`, CELL_SIZE=400) | Cards array changes | O(visible) frustum culling instead of O(n) for cards |
| **Spatial grid (nodes)** | Worker (`nodeSpatialGrid`, NODE_CELL_SIZE=500) | Nodes change, positions change | O(visible) frustum culling for >100 nodes |
| **Node lookup** | Worker (`nodeLookup` = id→node map) | Nodes array changes | O(1) node-by-id for edge rendering |
| **Edge adjacency** | Worker (`edgeAdjacency` = nodeId→edge indices) | Edges array changes | Only render edges connected to visible nodes |
| **Handle cache** | Worker (`handleCache` = nodeId→handles) | Nodes change, positions change | Avoid recomputing handle positions multiple times per frame |
| **Worker instance** | Main thread (`WeakMap(canvas → worker)`) | Never (GC'd with canvas) | Survive React strict-mode double-mount |
| **Measured nodes** | Main thread (`useMemo([nodes])`) | Nodes prop changes | Guarantee every node has `measured.width/height` for layout |
| **Resolved nodes** | Main thread (`resolvedNodesRef`) | Nodes change | Pre-computed absolute positions for child nodes |

---

## Frustum Culling (Visibility)

### Worker Side (Canvas Rendering)

```
Viewport bounds (world space):
  worldLeft   = -cam.x / cam.zoom
  worldTop    = -cam.y / cam.zoom
  worldRight  = worldLeft + canvasWidth / cam.zoom
  worldBottom = worldTop + canvasHeight / cam.zoom
  + edgePadding (100px world-space) for edges that extend beyond nodes

Cards: spatialGrid lookup → only draw visible cards
Nodes (>100): nodeSpatialGrid lookup → only draw visible nodes
Nodes (≤100): linear scan with bounds check
Edges: adjacency index → only check edges connected to visible nodes
```

### Main Thread (React Node Virtualization)

```
InfiniteCanvas maintains visibleNodeIds (Set) via rAF loop:

Every frame:
├─ Read cameraRef (no re-render)
├─ Compute viewport bounds in world space (with 200px margin)
├─ For each custom node: check if overlaps viewport
├─ setVisibleNodeIds() with Set equality check (no update if unchanged)
└─ virtualizedNodes = customNodes.filter(n => visibleNodeIds.has(n.id))

Only visible custom nodes are mounted in React DOM.
Off-screen nodes are unmounted entirely.
```

---

## Level of Detail (LOD)

```
zoom > 0.3:  Show edge labels, card coordinates
zoom > 0.15: Show card text, node labels
zoom > 0.08: Show card shadows (if <200 visible)
zoom > 0.05: Show edge arrowheads
zoom ≤ 0.02: Skip grid entirely (step < 2px)
```

---

## Hit Testing (Main Thread)

All hit tests are on the main thread (worker has no access to pointer events).

```
findHandleAt(wx, wy)  — O(n) scan, check handle radius
findNodeAt(wx, wy)    — O(n) reverse scan (top node first), skip groups
findEdgeAt(wx, wy)    — O(n) scan, point-to-segment distance

Optimization: ALL hit tests are skipped during active pan/drag/connect/select.
The mousemove handler returns early when draggingRef or dragNodeRef is set.
```

---

## Edge Routing (Obstacle Avoidance)

```
scheduleEdgeRouting() → requestAnimationFrame → routeEdgesAsync()
│
├─ Runs AFTER render (non-blocking)
├─ Only for smoothstep/step edges (bezier uses curves, not routing)
├─ For each edge:
│   ├─ Get source/target handle positions and directions
│   ├─ getNearbyNodes() via spatial grid (excludes src/tgt, skips groups)
│   ├─ Compute orthogonal waypoints based on handle directions:
│   │   ├─ H→H: horizontal gap → vertical mid → horizontal gap
│   │   ├─ V→V: vertical gap → horizontal mid → vertical gap
│   │   └─ Mixed: combination of above
│   ├─ Collision check: hSegCrossesNode / vSegCrossesNode
│   │   └─ If crossing detected → nudge waypoint above/below obstacle
│   └─ edge._routedPoints = cleaned waypoints (deduped)
│
└─ If any edge changed → scheduleRender() (re-draw with routed paths)

Rendered as orthogonal paths with rounded corners (quadraticCurveTo at bends).
```

---

## Custom Nodes & Edges (React-Rendered)

```
Nodes/edges with a `type` matching a registered component are "custom-rendered":

Custom nodes:
├─ Rendered as React DOM elements in .ric-nodes-overlay
├─ Positioned via CSS transform (absolute world position)
├─ Transform synced to camera via rAF loop (no React re-render during pan)
├─ Virtualized: only visible nodes are mounted
└─ Worker skips drawing them (_customRendered=true) but tracks positions

Custom edges:
├─ Rendered as React SVG in .ric-edges-overlay
├─ Transform synced via SVG `transform` attribute
└─ Worker skips drawing them but resolves handle positions

Nodes/edges WITHOUT a type → canvas-rendered by worker (default path)
```

---

## Event Architecture

```
Pointer Events (on wrap div):
├─ onPointerDown → handle hit? → connection start
│                  node hit?   → drag start / select
│                  edge hit?   → select
│                  empty?      → pan start (or selection box if shift)
├─ onPointerMove → route to active mode (connect / select-box / drag / pan)
└─ onPointerUp   → finalize (complete connection / end drag / end pan)

Native DOM Events (via useEffect addEventListener):
├─ mousemove  → hover detection (node/edge enter/leave/move)
│               SKIPPED during active interactions for performance
├─ wheel      → zoom (or pan if panOnScroll)
├─ touchmove  → pinch-to-zoom (two-finger gesture)
├─ dblclick   → zoom in or fire onNodeDoubleClick/onEdgeDoubleClick
├─ contextmenu → onNodeContextMenu / onEdgeContextMenu / onPaneContextMenu
└─ keydown    → delete selected, multi-select key, pan activation key

Worker → Main Thread:
├─ 'ready'           → hide loading spinner
├─ 'hud'             → update HUD display (throttled 100ms)
└─ 'nodesProcessed'  → callback with node count
```

---

## Performance Summary

| Technique | What It Does | Impact |
|---|---|---|
| OffscreenCanvas Worker | All rendering off main thread | Main thread free for React + events |
| Spatial grids | O(visible) culling, not O(total) | 5000 nodes renders only ~50 visible |
| Batched Path2D | One draw call per edge category | 3 strokes instead of n strokes |
| Grid tile cache | Pattern fill instead of per-line drawing | 1 fill call for entire grid |
| Camera as ref | No React re-render during pan/zoom | 60fps pan with 5000 nodes |
| DOM transform sync | rAF loop reads ref, mutates DOM | Custom nodes move without re-render |
| Hit test skip | No O(n) scans during active drag/pan | Eliminates main-thread bottleneck |
| Node virtualization | Only mount visible React nodes | DOM stays small regardless of total |
| Deferred store sync | queueMicrotask for Zustand setState | Prevents commit-phase infinite loops |
| LOD | Skip shadows/labels/arrows at low zoom | Fewer draw calls when zoomed out |
| Edge adjacency index | Only process edges of visible nodes | Skip thousands of off-screen edges |
| Incremental drag updates | Patch positions, don't replace array | No full node resync during drag |
| Handle caching | Compute handles once per frame per node | Avoid redundant trig during edge render |
