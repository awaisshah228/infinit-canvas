# react-infinite-canvas

A high-performance infinite canvas React component powered by **OffscreenCanvas + Web Workers**. Provides a React Flow-compatible API for nodes, edges, and interactions -- but renders everything on a canvas for 10x better performance at scale.

**5000+ nodes at 60fps** vs React Flow's ~500 before lag.

## Install

```bash
npm install react-infinite-canvas
```

## Quick Start

```jsx
import { InfiniteCanvas, useNodesState, useEdgesState, addEdge } from 'react-infinite-canvas';
import 'react-infinite-canvas/styles.css';

const initialNodes = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'Node 1' } },
  { id: '2', position: { x: 250, y: 100 }, data: { label: 'Node 2' } },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', label: 'connected' },
];

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const onConnect = (conn) => setEdges((eds) => addEdge(conn, eds));

  return (
    <InfiniteCanvas
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      height="500px"
    >
      <Controls />
      <MiniMap />
      <Background variant="dots" />
    </InfiniteCanvas>
  );
}
```

## React Flow Compatibility

This package mirrors the React Flow API so migration is straightforward. Here's what's supported, what's different, and what's missing.

### Architecture Difference

| | React Flow | react-infinite-canvas |
|---|---|---|
| Rendering | DOM (React divs + SVG) | OffscreenCanvas + Web Worker |
| Custom nodes | Any React component | Canvas-drawn (no DOM inside nodes) |
| Custom edges | SVG path components | Canvas-drawn curves |
| Max nodes (60fps) | ~500 | 5000+ |
| Main thread | Blocked during render | Always free |
| Store | Zustand | React context + refs |

### What We Have

#### Core Component

```jsx
<InfiniteCanvas
  // Node & edge data (same as React Flow)
  nodes={nodes}
  edges={edges}
  onNodesChange={onNodesChange}
  onEdgesChange={onEdgesChange}
  onConnect={onConnect}

  // Node interaction
  onNodeClick={onNodeClick}
  onNodeDragStart={onNodeDragStart}
  onNodeDrag={onNodeDrag}
  onNodeDragStop={onNodeDragStop}
  onEdgeClick={onEdgeClick}
  onPaneClick={onPaneClick}
  onSelectionChange={onSelectionChange}

  // Behavior
  nodesDraggable={true}
  nodesConnectable={true}
  elementsSelectable={true}
  multiSelectionKeyCode="Shift"
  selectionOnDrag={false}

  // Appearance
  dark={false}
  gridSize={40}
  zoomMin={0.1}
  zoomMax={4}
  initialCamera={{ x: 0, y: 0, zoom: 1 }}
  width="100%"
  height="500px"

  // Legacy card API
  cards={cards}
/>
```

#### Hooks

| Hook | React Flow | Us | Notes |
|---|---|---|---|
| `useNodesState` | Yes | Yes | Same API |
| `useEdgesState` | Yes | Yes | Same API |
| `useReactFlow` | Yes | Yes | `fitView`, `zoomIn/Out/To`, `getNodes/setNodes`, `addNodes/addEdges`, `deleteElements`, `screenToFlowPosition`, `flowToScreenPosition`, `setCenter`, `getViewport/setViewport` |
| `useNodes` | Yes | Yes | Read current nodes |
| `useEdges` | Yes | Yes | Read current edges |
| `useViewport` | Yes | Yes | Read `{ x, y, zoom }` |
| `useConnection` | Yes | Yes | Connection state while dragging |
| `useNodesData` | Yes | Yes | Read data for specific node IDs |
| `useNodeConnections` | Yes | Yes | Edges connected to a node |
| `useHandleConnections` | Yes | Yes | Edges for a specific handle |
| `useOnViewportChange` | Yes | Yes | Subscribe to viewport changes |
| `useOnSelectionChange` | Yes | Yes | Subscribe to selection changes |
| `useKeyPress` | Yes | Yes | Track key state |

#### Utilities

| Utility | React Flow | Us |
|---|---|---|
| `applyNodeChanges` | Yes | Yes |
| `applyEdgeChanges` | Yes | Yes |
| `addEdge` | Yes | Yes |
| `isNode` / `isEdge` | Yes | Yes |
| `getConnectedEdges` | Yes | Yes |
| `getIncomers` / `getOutgoers` | Yes | Yes |
| `getNodesBounds` | Yes | Yes |
| `getViewportForBounds` | Yes | Yes |

#### Components

| Component | React Flow | Us | Notes |
|---|---|---|---|
| `Controls` | Yes | Yes | Zoom in/out + fit view |
| `MiniMap` | Yes | Yes | Overview with viewport indicator |
| `Background` | Yes | Yes | `lines`, `dots`, `cross` variants |
| `Panel` | Yes | Yes | Positioned overlays |

#### Interaction Features

| Feature | React Flow | Us |
|---|---|---|
| Node drag | Yes | Yes |
| Multi-select (Shift+click) | Yes | Yes |
| Selection box (Shift+drag) | Yes | Yes |
| Multi-drag (move all selected) | Yes | Yes |
| Edge click/select | Yes | Yes |
| Delete selected (Delete key) | Yes | Yes |
| Select all (Ctrl+A) | Yes | Yes |
| Connection by handle drag | Yes | Yes |
| Custom handle positions | Yes | Yes (top/bottom/left/right or x,y) |
| Multiple handles per node | Yes | Yes |
| Edge types (bezier/straight/step/smoothstep) | Yes | Yes |
| Animated edges | Yes | Yes |
| Edge labels | Yes | Yes |
| Frustum culling | Yes | Yes (spatial grid) |
| Zoom around cursor | Yes | Yes |

---

### What's Missing (vs React Flow)

#### High Impact -- Architecture Gap

These require a **hybrid DOM + canvas approach** to implement:

| Feature | Description | Why Missing |
|---|---|---|
| **Custom node components** (`nodeTypes`) | Render React inside nodes (buttons, inputs, forms) | Nodes are canvas-drawn, not DOM elements |
| **Custom edge components** (`edgeTypes`) | Render custom SVG/React along edges | Edges are canvas-drawn |
| **`<Handle>` component** | Declarative connection points in custom nodes | Tied to DOM-based custom nodes |
| **`NodeResizer`** | Drag-to-resize nodes | Needs DOM handles |
| **`NodeToolbar`** / **`EdgeToolbar`** | Floating toolbars attached to nodes/edges | Needs DOM overlay positioning |
| **`EdgeLabelRenderer`** | Portal-based edge label rendering | Needs DOM portal |
| **`ViewportPortal`** | Render React elements at viewport coordinates | Needs DOM overlay |

#### Medium Impact -- Missing Features

| Feature | React Flow Prop/API | Status |
|---|---|---|
| Snap to grid | `snapToGrid`, `snapGrid` | Missing |
| Edge reconnect | `edgesReconnectable`, `onReconnect` | Missing |
| Sub-flows / parent nodes | `parentId`, `extent: 'parent'` | Missing |
| Connection validation | `isValidConnection` | Missing |
| Connection mode | `connectionMode` (Strict/Loose) | Missing |
| Click-to-connect | `connectOnClick` | Missing |
| Auto-pan on drag | `autoPanOnNodeDrag`, `autoPanOnConnect` | Missing |
| Pan boundaries | `translateExtent` | Missing |
| Fit view on init | `fitView` prop | Missing (use `useReactFlow().fitView()`) |
| Node extent/constraints | `nodeExtent`, `nodeOrigin` | Missing |
| Selection mode | `selectionMode` (Full/Partial) | Missing |
| Elevate on select | `elevateNodesOnSelect` | Missing |
| Pan activation key | `panActivationKeyCode` (Space) | Missing |
| Zoom on double-click | `zoomOnDoubleClick` | Missing |
| Pinch to zoom | `zoomOnPinch` | Missing |

#### Missing Event Handlers

| Event | Status |
|---|---|
| `onNodeDoubleClick` | Missing |
| `onNodeMouseEnter` / `Move` / `Leave` | Missing |
| `onNodeContextMenu` | Missing |
| `onEdgeDoubleClick` | Missing |
| `onEdgeMouseEnter` / `Move` / `Leave` | Missing |
| `onEdgeContextMenu` | Missing |
| `onConnectStart` / `onConnectEnd` | Missing |
| `onPaneContextMenu` | Missing |
| `onPaneMouseEnter` / `Move` / `Leave` | Missing |
| `onMoveStart` / `onMove` / `onMoveEnd` | Missing |
| `onInit` | Missing |
| `onDelete` / `onBeforeDelete` | Missing |
| `onReconnect` / `onReconnectStart` / `End` | Missing |
| `onError` | Missing |
| `onSelectionDragStart` / `Drag` / `Stop` | Missing |

#### Missing Hooks

| Hook | What it does |
|---|---|
| `useUpdateNodeInternals` | Force recalculate node handles/bounds |
| `useNodesInitialized` | Detect when nodes are measured |
| `useInternalNode` | Access internal node data (absolute position) |
| `useStore` / `useStoreApi` | Direct store access |

#### Missing Utilities

| Utility | What it does |
|---|---|
| `getBezierPath` | Generate SVG path string for bezier edges |
| `getSmoothStepPath` | Generate SVG path for smooth step edges |
| `getStraightPath` | Generate SVG path for straight edges |
| `getSimpleBezierPath` | Simplified bezier path |
| `getEdgeCenter` | Center point of any edge |
| `getNodesInside` | Nodes within a rectangle |
| `snapPosition` | Snap position to grid |
| `clampPosition` | Clamp to extent boundaries |
| `getNodeDimensions` | Get node width/height with fallbacks |

#### Missing Props

| Prop | What it does |
|---|---|
| `connectionRadius` | Hit radius for connection drops |
| `connectionLineType` | Style of connection line |
| `connectionLineComponent` | Custom connection line |
| `deleteKeyCode` | Configurable delete key |
| `noDragClassName` | CSS class to prevent drag |
| `noPanClassName` | CSS class to prevent pan |
| `panOnScroll` / `panOnScrollMode` | Pan instead of zoom on scroll |
| `defaultEdgeOptions` | Default styling for new edges |
| `defaultMarkerColor` | Arrow marker color |
| `colorMode` | Light/dark toggle |

---

## Package Structure

```
src/
  index.js                          # Public API exports
  InfiniteCanvas.jsx                # Main component (context provider + canvas)
  useInfiniteCanvas.js              # Core hook (worker lifecycle, interactions)

  components/
    Background/index.jsx            # Grid variant: lines, dots, cross
    Controls/index.jsx              # Zoom in/out + fit view buttons
    MiniMap/index.jsx               # Overview minimap with viewport rect
    Panel/index.jsx                 # Positioned overlay panel

  context/
    InfiniteCanvasContext.js         # React context for store (used by hooks)

  hooks/
    index.js                        # useReactFlow, useNodes, useEdges,
                                    # useViewport, useConnection, useNodesData,
                                    # useNodeConnections, useHandleConnections,
                                    # useOnViewportChange, useOnSelectionChange,
                                    # useKeyPress
    useNodesState.js                # useState + onNodesChange helper
    useEdgesState.js                # useState + onEdgesChange helper

  utils/
    changes.js                      # applyNodeChanges, applyEdgeChanges, addEdge
    graph.js                        # isNode, isEdge, getConnectedEdges,
                                    # getIncomers, getOutgoers, getNodesBounds,
                                    # getViewportForBounds

  worker/
    canvas.worker.js                # OffscreenCanvas renderer (grid, nodes,
                                    # edges, handles, selection box, connection
                                    # lines, frustum culling, batched rendering)

  styles.css                        # Minimal CSS for wrapper
```

## How It Works

### Architecture

```
Main Thread (React)                    Worker Thread (OffscreenCanvas)
===================                    ================================

User drags/scrolls
        |
Pointer/wheel handlers ──postMessage──> Worker receives update
update camera ref (zero                         |
re-renders) and send                    scheduleRender() coalesces
to worker                               into one rAF
        |                                       |
        |                               render() executes:
        |                                 1. Spatial grid lookup (O(1))
        |                                 2. Frustum cull nodes/edges
        |                                 3. Batched multi-pass drawing
        |                                 4. LOD (skip text/shadows at low zoom)
        |                                       |
onHudUpdate callback  <──postMessage──  HUD data (throttled to 100ms)
```

### Performance Optimizations

- **Spatial grid index** -- O(visible_cells) frustum culling instead of O(n)
- **Batched rendering** -- All node backgrounds in 1 draw call, all borders in 1, all text in 1
- **Level of Detail** -- Skip shadows when >200 visible, skip text at zoom <0.15, skip handles at zoom <0.2
- **Path2D batching** -- Edges batched into 3 Path2D objects (normal/animated/selected) for single stroke calls
- **Worker thread** -- All rendering off main thread via OffscreenCanvas
- **Render coalescing** -- Multiple pointermove events produce 1 render per frame
- **Pre-computed colors** -- Theme colors computed once on change, not per frame

## Development

```bash
yarn install
yarn dev          # Run all apps
yarn dev:react    # React demo at http://localhost:3000
yarn build        # Build everything
```

### Demo Routes

| Route | Description |
|---|---|
| `/` | Nodes & Edges demo (with Controls, MiniMap, Background) |
| `/cards` | Cards demo (legacy API) |
| `/stress` | Stress test -- 2000+ cards |
| `/stress-flow` | Stress test -- 500-5000 nodes with edges |

## License

MIT
