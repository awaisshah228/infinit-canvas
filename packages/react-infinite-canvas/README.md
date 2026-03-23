# @infinit-canvas/react

[![npm version](https://img.shields.io/npm/v/@infinit-canvas/react.svg)](https://www.npmjs.com/package/@infinit-canvas/react)
[![license](https://img.shields.io/npm/l/@infinit-canvas/react.svg)](https://github.com/awaisshah228/infinit-canvas/blob/main/LICENSE)
[![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4-pink?logo=github)](https://github.com/sponsors/awaisshah228)

A high-performance infinite canvas React component powered by **OffscreenCanvas + Web Workers**. Drop-in React Flow compatible API — but renders on a canvas for **10x better performance** at scale.

**5,000+ nodes at 60fps** vs React Flow's ~500 before lag.

**npm:** [https://www.npmjs.com/package/@infinit-canvas/react](https://www.npmjs.com/package/@infinit-canvas/react)
**GitHub:** [https://github.com/awaisshah228/infinit-canvas](https://github.com/awaisshah228/infinit-canvas)

## Install

```bash
npm install @infinit-canvas/react
```

## Quick Start

```jsx
import { InfiniteCanvas, useNodesState, useEdgesState, addEdge, Controls, MiniMap, Background } from '@infinit-canvas/react';
import '@infinit-canvas/react/styles.css';

const initialNodes = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'Node 1' } },
  { id: '2', position: { x: 250, y: 100 }, data: { label: 'Node 2' } },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2' },
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

## Why This?

| | React Flow | @infinit-canvas/react |
|---|---|---|
| Rendering | DOM (React divs + SVG) | OffscreenCanvas + Web Worker |
| Max nodes (60fps) | ~500 | 5,000+ |
| Main thread | Blocked during render | Always free |
| Custom nodes | React components (all DOM) | Hybrid: canvas + spatial DOM |
| API | React Flow API | Same API (drop-in compatible) |

## Architecture

```
                    ┌─────────────────────────────────┐
                    │        Your React App            │
                    └──────────┬──────────────────────┘
                               │
                    ┌──────────▼──────────────────────┐
                    │      <InfiniteCanvas>            │
                    │                                  │
                    │  ┌────────────┐  ┌────────────┐  │
                    │  │  Canvas    │  │  DOM        │  │
                    │  │  Worker    │  │  Overlay    │  │
                    │  │            │  │             │  │
                    │  │ All nodes  │  │ Nearest 50  │  │
                    │  │ as styled  │  │ nodes as    │  │
                    │  │ canvas     │  │ full React  │  │
                    │  │ primitives │  │ components  │  │
                    │  └────────────┘  └────────────┘  │
                    └──────────────────────────────────┘
```

**The key insight:** Most nodes don't need to be DOM elements. Only the ones near your viewport get promoted to real React components. The rest render as styled canvas primitives via a Web Worker — zero DOM cost.

## Spatial DOM Promotion

By default, up to **50 custom nodes** nearest to your viewport center are rendered as full React components. Everything else renders on canvas. This gives you rich interactivity where you need it and canvas performance everywhere else.

```jsx
<InfiniteCanvas
  nodes={nodes}
  edges={edges}
  nodeTypes={{ workflow: WorkflowNode }}
  domNodeLimit={50}           // Max DOM nodes (default: 50, 0 = pure canvas)
  canvasNodeTypes={{           // How non-DOM nodes look on canvas
    workflow: {
      fill: '#f0f9ff',
      stroke: '#c7d8f0',
      radius: 10,
      accent: { side: 'left', width: 5, color: '#3b82f6' },
      icon: { dataField: 'icon', x: 20, size: 18 },
      title: { dataField: 'label', x: 40, y: 16 },
      subtitle: { dataField: 'description', x: 40, y: 36 },
      badge: { dataField: 'badge', bg: '#3b82f6' },
    }
  }}
/>
```

### Promotion rules (priority order):
1. **Pinned nodes** — user clicked the pin button, stays DOM forever
2. **Selected/dragging nodes** — always promoted while interacting
3. **Nearest visible nodes** — fills remaining `domNodeLimit` slots by distance to viewport center

### Pin nodes to DOM

Every DOM-promoted node shows a pin button on hover. Click it to keep that node as a full React component even when you scroll away. Useful for nodes with live data, inputs, or interactive content.

## Canvas Node Types

Three ways to define how nodes look when rendered on canvas (non-DOM):

### 1. Declarative Config (recommended)

Define node appearance with a config object. The worker draws shapes, text, icons, and badges per node — reading from `node.data` for dynamic content.

```jsx
canvasNodeTypes={{
  workflow: {
    fill: '#f0f9ff',
    stroke: '#c7d8f0',
    strokeWidth: 1,
    radius: 10,
    accent: { side: 'left', width: 5, color: '#3b82f6' },
    icon: { dataField: 'icon', x: 20, size: 18 },
    title: { dataField: 'label', x: 40, y: 16, font: '600 13px system-ui', color: '#1e293b' },
    subtitle: { dataField: 'description', x: 40, y: 36, font: '11px system-ui', color: '#64748b' },
    badge: { dataField: 'badge', bg: '#3b82f6', color: '#fff' },
  }
}}
```

### 2. SVG String

Provide an SVG string — converted to `ImageBitmap` and drawn via `drawImage`. Good for static visual shells (the worker still draws `node.data.label` on top).

```jsx
canvasNodeTypes={{
  workflow: `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="70">
    <rect x="1" y="1" width="158" height="68" rx="10" fill="#f0f9ff" stroke="#c7d8f0"/>
    <rect x="1" y="1" width="6" height="68" rx="3" fill="#3b82f6"/>
  </svg>`
}}
```

### 3. Function (per-node variation)

Provide a function `(data) => svgString` for per-node bitmaps. Results are deduplicated and cached — if 5000 nodes share 8 color variants, only 8 bitmaps are created.

```jsx
canvasNodeTypes={{
  workflow: (data) => `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="70">
    <rect x="1" y="1" width="158" height="68" rx="10" fill="${data.color}" stroke="#ccc"/>
  </svg>`
}}
```

## Features

- **Full React Flow API** — nodes, edges, handles, connections, selection, drag, zoom, pan
- **Custom node & edge types** — use any React component
- **Spatial DOM virtualization** — only nearest N nodes are real DOM elements
- **Canvas node rendering** — declarative config, SVG bitmap, or per-node functions
- **Node pinning** — keep specific nodes as DOM permanently
- **Built-in components** — Controls, MiniMap, Background, Panel, Handle, NodeResizer, NodeToolbar, EdgeLabelRenderer, ViewportPortal
- **All hooks** — useReactFlow, useNodes, useEdges, useViewport, useConnection, useNodesData, useOnViewportChange, useOnSelectionChange, useKeyPress, useStore, useStoreApi, + more
- **Sub-flows** — parentId, extent: 'parent'
- **Connection modes** — strict/loose, click-to-connect, validation
- **Selection** — click, Shift+click multi-select, Ctrl+A, selection box, selection drag events
- **Edge types** — bezier, straight, step, smoothstep, animated, labels
- **Edge routing** — automatic obstacle avoidance
- **Snap to grid** — configurable grid snapping
- **Undo/redo** — built-in history management
- **Delete validation** — onBeforeDelete async callback
- **Frustum culling** — spatial grid index for O(visible) rendering
- **LOD rendering** — handles and text hidden at low zoom for performance
- **noDragClassName / noPanClassName** — prevent drag/pan on specific elements
- **Elevate on select** — bring nodes/edges to front on selection

## Props

```jsx
<InfiniteCanvas
  // Data
  nodes={nodes}
  edges={edges}
  onNodesChange={onNodesChange}
  onEdgesChange={onEdgesChange}
  onConnect={onConnect}

  // Types
  nodeTypes={nodeTypes}         // React components for custom nodes
  edgeTypes={edgeTypes}         // React components for custom edges
  canvasNodeTypes={configs}     // Canvas rendering: config | SVG | function
  domNodeLimit={50}             // Max DOM nodes (0 = pure canvas)

  // Events
  onNodeClick onNodeDoubleClick onNodeContextMenu
  onNodeDragStart onNodeDrag onNodeDragStop
  onEdgeClick onEdgeDoubleClick
  onPaneClick onPaneContextMenu
  onSelectionChange
  onSelectionDragStart onSelectionDrag onSelectionDragStop
  onConnectStart onConnectEnd
  onMoveStart onMove onMoveEnd
  onInit onDelete onBeforeDelete onError

  // Behavior
  nodesDraggable nodesConnectable elementsSelectable
  connectionMode="loose" connectOnClick={false}
  snapToGrid snapGrid={[15, 15]}
  elevateNodesOnSelect elevateEdgesOnSelect
  noDragClassName="nodrag" noPanClassName="nopan"
  deleteKeyCode="Delete"
  isValidConnection={fn}
  edgeRouting={true}

  // Viewport
  fitView initialCamera={{ x: 0, y: 0, zoom: 1 }}
  zoomMin={0.1} zoomMax={4}
  panOnScroll zoomOnScroll zoomOnPinch zoomOnDoubleClick
  translateExtent autoPanOnNodeDrag

  // Appearance
  dark gridSize={40} width="100%" height="500px"
/>
```

## Hooks

| Hook | Description |
|---|---|
| `useNodesState` | useState + applyNodeChanges |
| `useEdgesState` | useState + applyEdgeChanges |
| `useReactFlow` | Imperative API (fitView, zoomIn, getNodes, setNodes, etc.) |
| `useNodes` / `useEdges` | Read current nodes/edges |
| `useViewport` | Read { x, y, zoom } |
| `useConnection` | Connection state while dragging |
| `useOnViewportChange` | Subscribe to viewport changes |
| `useOnSelectionChange` | Subscribe to selection changes |
| `useKeyPress` | Track key state |
| `useStore` / `useStoreApi` | Direct store access |
| `useUndoRedo` | Undo/redo history |

## Utilities

`applyNodeChanges` · `applyEdgeChanges` · `addEdge` · `isNode` · `isEdge` · `getConnectedEdges` · `getIncomers` · `getOutgoers` · `getNodesBounds` · `getBezierPath` · `getSmoothStepPath` · `getStraightPath` · `getSimpleBezierPath` · `snapPosition` · `reconnectEdge`

## Migration from React Flow

1. Replace `reactflow` with `@infinit-canvas/react` in your imports
2. Replace `reactflow/dist/style.css` with `@infinit-canvas/react/styles.css`
3. That's it — same API, same hooks, same components

For large node counts, add `canvasNodeTypes` to define how nodes look on canvas and set `domNodeLimit` to control the DOM budget.

## Sponsor

If this package saves you time, consider supporting its development:

[![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4-pink?logo=github)](https://github.com/sponsors/awaisshah228)

**USDC (Solana):** `59FhVxK3uxABiJ9VzXtCoyCxqq4nhoZDBtUV3gEkiexo`

<img src="https://raw.githubusercontent.com/awaisshah228/react-flow-avoid-nodes-routing/turbo-package/assets/solana-donate-qr.png" width="200" alt="Solana USDC QR Code" />

## License

[MIT](./LICENSE)
