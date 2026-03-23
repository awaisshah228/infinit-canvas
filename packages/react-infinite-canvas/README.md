# @infinit-canvas/react

[![npm version](https://img.shields.io/npm/v/@infinit-canvas/react.svg)](https://www.npmjs.com/package/@infinit-canvas/react)
[![license](https://img.shields.io/npm/l/@infinit-canvas/react.svg)](https://github.com/awaisshah228/infinit-canvas/blob/main/LICENSE)

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
| Custom nodes | React components | Hybrid: canvas + DOM overlay |
| API | React Flow API | Same API (drop-in compatible) |

## Features

- **Full React Flow API** — nodes, edges, handles, connections, selection, drag, zoom, pan
- **Custom node & edge types** — use any React component
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
- **Error handling** — onError callback
- **noDragClassName / noPanClassName** — prevent drag/pan on specific elements
- **Elevate on select** — bring nodes/edges to front on selection
- **Node virtualization** — only visible custom nodes are mounted in DOM
- **Frustum culling** — spatial grid index for O(visible) rendering

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
  nodeTypes={nodeTypes}
  edgeTypes={edgeTypes}

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

## License

[MIT](./LICENSE)
