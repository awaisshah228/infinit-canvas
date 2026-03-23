# react-infinite-canvas

[![npm version](https://img.shields.io/npm/v/@infinit-canvas/react.svg)](https://www.npmjs.com/package/@infinit-canvas/react)
[![license](https://img.shields.io/npm/l/@infinit-canvas/react.svg)](https://github.com/awaisshah228/infinit-canvas/blob/main/LICENSE)

A high-performance infinite canvas React component powered by **OffscreenCanvas + Web Workers**. Provides a React Flow-compatible API for nodes, edges, and interactions -- but renders everything on a canvas for 10x better performance at scale.

**5000+ nodes at 60fps** vs React Flow's ~500 before lag.

**npm:** [https://www.npmjs.com/package/@infinit-canvas/react](https://www.npmjs.com/package/@infinit-canvas/react)

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

This package mirrors the React Flow API so migration is straightforward. Here's what's supported and what's different.

### Architecture Difference

| | React Flow | react-infinite-canvas |
|---|---|---|
| Rendering | DOM (React divs + SVG) | OffscreenCanvas + Web Worker |
| Custom nodes | Any React component | Hybrid: canvas-drawn + DOM overlay for custom `nodeTypes` |
| Custom edges | SVG path components | Hybrid: canvas-drawn + SVG overlay for custom `edgeTypes` |
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

  // Node types & edge types (custom React components)
  nodeTypes={nodeTypes}
  edgeTypes={edgeTypes}

  // Node interaction
  onNodeClick={onNodeClick}
  onNodeDoubleClick={onNodeDoubleClick}
  onNodeContextMenu={onNodeContextMenu}
  onNodeDragStart={onNodeDragStart}
  onNodeDrag={onNodeDrag}
  onNodeDragStop={onNodeDragStop}
  onEdgeClick={onEdgeClick}
  onEdgeDoubleClick={onEdgeDoubleClick}
  onPaneClick={onPaneClick}
  onSelectionChange={onSelectionChange}

  // Connection events
  onConnectStart={onConnectStart}
  onConnectEnd={onConnectEnd}
  isValidConnection={isValidConnection}

  // Viewport events
  onMoveStart={onMoveStart}
  onMove={onMove}
  onMoveEnd={onMoveEnd}
  onInit={onInit}

  // Delete
  onDelete={onDelete}
  onBeforeDelete={onBeforeDelete}
  onError={onError}

  // Selection drag events
  onSelectionDragStart={onSelectionDragStart}
  onSelectionDrag={onSelectionDrag}
  onSelectionDragStop={onSelectionDragStop}

  // Behavior
  nodesDraggable={true}
  nodesConnectable={true}
  elementsSelectable={true}
  multiSelectionKeyCode="Shift"
  selectionOnDrag={false}
  selectionMode="full"
  snapToGrid={false}
  edgesReconnectable={true}
  autoPanOnNodeDrag={true}
  panOnScroll={false}
  panActivationKeyCode="Space"
  zoomOnDoubleClick={true}
  zoomOnPinch={true}
  fitView={false}
  translateExtent={[[-Infinity, -Infinity], [Infinity, Infinity]]}
  deleteKeyCode="Delete"
  connectionRadius={20}
  connectionMode="loose"
  connectOnClick={false}
  connectionLineType="bezier"
  defaultEdgeOptions={{}}
  colorMode="light"
  nodeOrigin={[0, 0]}
  elevateNodesOnSelect={false}
  elevateEdgesOnSelect={false}
  noDragClassName="nodrag"
  noPanClassName="nopan"

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
| `useReactFlow` | Yes | Yes | `fitView`, `fitBounds`, `zoomIn/Out/To`, `getNodes/setNodes`, `getNode/getEdge`, `addNodes/addEdges`, `deleteElements`, `updateNodeData`, `screenToFlowPosition`, `flowToScreenPosition`, `setCenter`, `getViewport/setViewport`, `toObject` |
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
| `useUpdateNodeInternals` | Yes | Yes | Force recalculate node handles/bounds |
| `useNodesInitialized` | Yes | Yes | Detect when nodes are measured |
| `useInternalNode` | Yes | Yes | Access internal node data |
| `useStore` / `useStoreApi` | Yes | Yes | Direct store access (selector pattern) |
| `useNodeId` | Yes | Yes | Current node ID inside custom node component |
| `useUndoRedo` | No | Yes | Undo/redo history management |
| `useOnNodesChangeMiddleware` | No | Yes | Intercept & transform node changes |
| `useOnEdgesChangeMiddleware` | No | Yes | Intercept & transform edge changes |

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
| `getBezierPath` | Yes | Yes |
| `getSmoothStepPath` | Yes | Yes |
| `getStraightPath` | Yes | Yes |
| `getSimpleBezierPath` | Yes | Yes |
| `getEdgeCenter` / `getBezierEdgeCenter` | Yes | Yes |
| `getNodesInside` | Yes | Yes |
| `snapPosition` | Yes | Yes |
| `clampPosition` | Yes | Yes |
| `getNodeDimensions` | Yes | Yes |
| `reconnectEdge` | Yes | Yes |
| `computeRoutedEdges` | No | Yes |
| `routeSinglePath` | No | Yes |
| `buildObstacles` | No | Yes |

#### Components

| Component | React Flow | Us | Notes |
|---|---|---|---|
| `Controls` | Yes | Yes | Zoom in/out + fit view |
| `MiniMap` | Yes | Yes | Overview with viewport indicator |
| `Background` | Yes | Yes | `lines`, `dots`, `cross` variants |
| `Panel` | Yes | Yes | Positioned overlays |
| `Handle` | Yes | Yes | Declarative connection points in custom nodes |
| `NodeResizer` | Yes | Yes | Drag-to-resize nodes |
| `NodeToolbar` | Yes | Yes | Floating toolbar attached to nodes |
| `EdgeToolbar` | Yes | Yes | Floating toolbar attached to edges |
| `EdgeLabelRenderer` | Yes | Yes | Portal-based edge label rendering |
| `ViewportPortal` | Yes | Yes | Render React elements at viewport coordinates |
| `ConnectionLine` | Yes | Yes | Connection line during handle drag |
| `SelectionBox` | Yes | Yes | Selection rectangle UI |

#### Built-in Edge Components

| Component | React Flow | Us |
|---|---|---|
| `BaseEdge` | Yes | Yes |
| `BezierEdge` | Yes | Yes |
| `StraightEdge` | Yes | Yes |
| `SmoothStepEdge` | Yes | Yes |
| `StepEdge` | Yes | Yes |
| `SimpleBezierEdge` | Yes | Yes |
| `EdgeText` | Yes | Yes |

#### Built-in Node Components

| Component | React Flow | Us |
|---|---|---|
| `DefaultNode` | Yes | Yes |
| `InputNode` | Yes | Yes |
| `OutputNode` | Yes | Yes |
| `GroupNode` | Yes | Yes |

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
| Connection validation | Yes | Yes |
| Custom handle positions | Yes | Yes |
| Multiple handles per node | Yes | Yes |
| Edge types (bezier/straight/step/smoothstep) | Yes | Yes |
| Edge reconnect | Yes | Yes |
| Animated edges | Yes | Yes |
| Edge labels | Yes | Yes |
| Edge routing (obstacle avoidance) | No | Yes |
| Frustum culling | Yes | Yes (spatial grid) |
| Zoom around cursor | Yes | Yes |
| Zoom on double-click | Yes | Yes |
| Pinch to zoom | Yes | Yes |
| Snap to grid | Yes | Yes |
| Auto-pan on drag | Yes | Yes |
| Pan boundaries | Yes | Yes |
| Fit view on init | Yes | Yes |
| Pan on scroll | Yes | Yes |
| Selection mode (Full/Partial) | Yes | Yes |
| Undo/redo | No | Yes |
| `noDragClassName` | Yes | Yes |
| `noPanClassName` | Yes | Yes |
| Sub-flows / parent nodes (`parentId`, `extent: 'parent'`) | Yes | Yes |
| Click-to-connect (`connectOnClick`) | Yes | Yes |
| Connection mode (Strict/Loose) | Yes | Yes |
| Elevate nodes on select | Yes | Yes |
| Elevate edges on select | Yes | Yes |
| `onBeforeDelete` (pre-delete validation) | Yes | Yes |
| `onError` (error boundary callback) | Yes | Yes |
| Selection drag events (`onSelectionDragStart/Drag/Stop`) | Yes | Yes |

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
    Handle/index.jsx                # Connection handle component
    NodeResizer/index.jsx           # Drag-to-resize component
    NodeToolbar/index.jsx           # Floating node toolbar
    EdgeToolbar/index.jsx           # Floating edge toolbar
    EdgeLabelRenderer/index.jsx     # Portal-based edge labels
    ViewportPortal/index.jsx        # Viewport-positioned React elements
    ConnectionLine/index.jsx        # Connection line during drag
    SelectionBox/index.jsx          # Selection rectangle
    Nodes/                          # DefaultNode, InputNode, OutputNode, GroupNode
    Edges/                          # BezierEdge, StraightEdge, SmoothStepEdge, StepEdge, etc.
    NodeWrapper/index.jsx           # Wraps custom node components
    EdgeWrapper/index.jsx           # Wraps custom edge components

  context/
    InfiniteCanvasContext.js         # React context for store (used by hooks)
    NodeIdContext.js                 # Node ID context for custom nodes

  hooks/
    index.js                        # useReactFlow, useNodes, useEdges,
                                    # useViewport, useConnection, useNodesData,
                                    # useNodeConnections, useHandleConnections,
                                    # useOnViewportChange, useOnSelectionChange,
                                    # useKeyPress, useUpdateNodeInternals,
                                    # useNodesInitialized, useInternalNode,
                                    # useStore, useStoreApi, useNodeId,
                                    # useUndoRedo, useOnNodesChangeMiddleware,
                                    # useOnEdgesChangeMiddleware
    useNodesState.js                # useState + onNodesChange helper
    useEdgesState.js                # useState + onEdgesChange helper

  utils/
    changes.js                      # applyNodeChanges, applyEdgeChanges, addEdge
    graph.js                        # isNode, isEdge, getConnectedEdges,
                                    # getIncomers, getOutgoers, getNodesBounds,
                                    # getViewportForBounds, getNodesInside,
                                    # snapPosition, clampPosition, getNodeDimensions
    paths.js                        # getBezierPath, getSmoothStepPath,
                                    # getStraightPath, getSimpleBezierPath,
                                    # getEdgeCenter, reconnectEdge
    edgeRouter.js                   # computeRoutedEdges, routeSinglePath,
                                    # buildObstacles (obstacle avoidance)

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
- **Node virtualization** -- Only visible custom nodes are mounted in React DOM
- **Edge adjacency index** -- Only process edges connected to visible nodes
- **Handle caching** -- Compute handle positions once per frame per node

## Development

```bash
yarn install
yarn dev          # Run all apps
yarn dev:react    # React demo at http://localhost:3001
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
