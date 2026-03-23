# @infinit-canvas/react

A high-performance infinite canvas for React. Pan, zoom, drag nodes, draw edges — all rendered on a background Web Worker so your UI never freezes, even with 5000+ nodes.

**Drop-in compatible with React Flow API** — same props, hooks, and patterns. If you know React Flow, you already know this.

---

## Table of Contents

- [Key Concepts (Glossary)](#key-concepts-glossary)
- [Install](#install)
- [Quick Start](#quick-start)
- [Nodes](#nodes)
- [Edges](#edges)
- [Handles](#handles)
- [Custom Nodes](#custom-nodes)
- [Custom Edges](#custom-edges)
- [State Management](#state-management)
- [Hooks](#hooks)
- [Viewport & Camera](#viewport--camera)
- [Interactions](#interactions)
- [Styling & Appearance](#styling--appearance)
- [Components](#components)
- [Utilities](#utilities)
- [Performance](#performance)
- [Full Props Reference](#full-props-reference)

---

## Key Concepts (Glossary)

If you're new to canvas/graph libraries, here's what each term means:

### Canvas

The drawing surface. Think of it as an infinite whiteboard you can pan around and zoom into. Under the hood, this uses an HTML `<canvas>` element transferred to a **Web Worker** so all drawing happens off the main thread.

### Node

A box/card on the canvas. Each node has a position (x, y), dimensions (width, height), and data (any info you want to store). Nodes are the "things" on your canvas — could be workflow steps, diagram boxes, sticky notes, etc.

### Edge

A line connecting two nodes. An edge goes **from** a source node **to** a target node. Edges can be straight lines, curves (bezier), or right-angle paths (smoothstep/step).

### Handle

A connection point on a node. By default every node has two handles: a **source** handle (right side, where edges come out) and a **target** handle (left side, where edges go in). You can customize handle positions and add multiple handles.

### Viewport / Camera

The visible area of the canvas. When you pan or zoom, you're moving the camera. The viewport is defined by three values: `x` (horizontal offset), `y` (vertical offset), and `zoom` (scale level).

### World Space vs Screen Space

- **World space**: The coordinate system of the canvas. A node at position `{x: 500, y: 300}` is always at that world position, no matter where you've panned or zoomed.
- **Screen space**: Pixel coordinates on your monitor. Where something appears on screen depends on the camera position and zoom level.

### Panning

Click-and-drag on empty canvas space to move around. The camera position changes, but nodes stay at their world positions.

### Zooming

Scroll wheel, pinch gesture, or double-click to zoom in/out. Zooming scales everything relative to the cursor position.

### Frustum Culling

A performance technique: only draw what's visible on screen. If you have 5000 nodes but only 50 are visible in the viewport, only those 50 get rendered. The canvas uses a **spatial grid** to find visible nodes in O(1) time instead of checking all 5000.

### Web Worker / OffscreenCanvas

JavaScript normally runs on a single thread — the "main thread." Heavy canvas drawing on the main thread blocks React updates and user input. This library moves ALL canvas rendering to a **Web Worker** (a separate thread) using **OffscreenCanvas**, so your UI stays responsive.

### Level of Detail (LOD)

When zoomed far out, small details like text labels and shadows are invisible anyway. LOD skips rendering these at low zoom levels to save drawing time.

### Spatial Grid / Spatial Index

A data structure that divides the world into grid cells. Each cell knows which nodes are inside it. To find visible nodes, you only check cells that overlap the viewport — much faster than checking every node individually.

### Edge Routing

Smart edge paths that go around obstacles. Instead of drawing a straight line through other nodes, the edge routing system computes right-angle paths that avoid overlapping with nodes.

### Batching

Instead of drawing each node/edge one at a time (thousands of draw calls), the renderer groups them and draws all at once (3-10 draw calls total). Fewer draw calls = faster rendering.

### Zustand Store

A lightweight state manager used internally. When you wrap your app in `<InfiniteCanvasProvider>`, it creates a Zustand store that hooks like `useNodes()`, `useStore()`, and `useReactFlow()` subscribe to.

---

## Install

```bash
npm install @infinit-canvas/react
```

---

## Quick Start

### Simplest example — just nodes and edges

```jsx
import { useState, useCallback } from 'react';
import {
  InfiniteCanvas,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from '@infinit-canvas/react';
import '@infinit-canvas/react/styles.css';

// Define your nodes — each needs a unique id and a position
const initialNodes = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'Start' } },
  { id: '2', position: { x: 200, y: 100 }, data: { label: 'End' } },
];

// Define your edges — each connects a source node to a target node
const initialEdges = [
  { id: 'e1-2', source: '1', target: '2' },
];

function App() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  // Called when nodes are dragged, selected, or removed
  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  // Called when edges are selected or removed
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  // Called when user drags from one handle to another
  const onConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    []
  );

  return (
    <InfiniteCanvas
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      fitView                     // auto-zoom to fit all nodes on mount
      height="100vh"
    />
  );
}
```

### Even simpler — with helper hooks

```jsx
import {
  InfiniteCanvas,
  useNodesState,
  useEdgesState,
  addEdge,
} from '@infinit-canvas/react';
import '@infinit-canvas/react/styles.css';

const initialNodes = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'Hello' } },
  { id: '2', position: { x: 250, y: 100 }, data: { label: 'World' } },
];

const initialEdges = [{ id: 'e1-2', source: '1', target: '2' }];

function App() {
  // useNodesState/useEdgesState handle the onChange boilerplate for you
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  return (
    <InfiniteCanvas
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={(conn) => setEdges((eds) => addEdge(conn, eds))}
      fitView
      height="100vh"
    />
  );
}
```

---

## Nodes

A node represents an item on the canvas.

```js
{
  id: 'node-1',              // Required. Unique identifier.
  position: { x: 100, y: 50 }, // Required. World-space coordinates.
  data: { label: 'My Node' },  // Required. Your custom data — passed to custom node components.
  type: 'default',            // Optional. Which node component to render (see Custom Nodes).
  width: 160,                 // Optional. Width in pixels (default: 160).
  height: 60,                 // Optional. Height in pixels (default: 60).
  selected: false,            // Optional. Is this node selected?
  hidden: false,              // Optional. Hide this node entirely.
  draggable: true,            // Optional. Can the user drag this node?
  parentId: 'group-1',        // Optional. Makes this a child of another node (sub-flows).
  handles: [                  // Optional. Custom connection handles.
    { type: 'source', position: 'bottom' },
    { type: 'target', position: 'top' },
  ],
  style: { background: 'red' }, // Optional. CSS styles (only for custom-rendered nodes).
}
```

### Node Types

- **No type / `'default'`** — Rendered by the canvas worker (fast, drawn as a rounded rectangle with label)
- **`'input'`** — Built-in node with only a source handle (output only)
- **`'output'`** — Built-in node with only a target handle (input only)
- **`'group'`** — Container node that can hold child nodes (set `parentId` on children)
- **Custom type** — Your own React component (see [Custom Nodes](#custom-nodes))

---

## Edges

An edge is a visual connection between two nodes.

```js
{
  id: 'edge-1',        // Required. Unique identifier.
  source: 'node-1',    // Required. ID of the source node (where the edge starts).
  target: 'node-2',    // Required. ID of the target node (where the edge ends).
  type: 'default',     // Optional. Edge style: 'default' | 'straight' | 'smoothstep' | 'step' | 'bezier'
  label: 'connects',   // Optional. Text label shown at the edge midpoint.
  animated: true,       // Optional. Dashed line animation (marching ants).
  selected: false,      // Optional. Is this edge selected?
  sourceHandle: 'a',   // Optional. Which handle on the source node (if it has multiple).
  targetHandle: 'b',   // Optional. Which handle on the target node.
  style: {},           // Optional. CSS styles (only for custom-rendered edges).
}
```

### Edge Types

| Type | Description |
|------|-------------|
| `'default'` / `'bezier'` | Smooth curved line (cubic bezier). Good for most use cases. |
| `'straight'` | Direct straight line between handles. |
| `'smoothstep'` | Right-angle path with rounded corners. Great for flowcharts. Supports edge routing (obstacle avoidance). |
| `'step'` | Right-angle path with sharp corners. Like smoothstep but without the rounded bends. |

---

## Handles

Handles are the connection points on nodes — the dots you drag from/to to create edges.

```jsx
import { Handle, Position } from '@infinit-canvas/react';

function MyNode({ data }) {
  return (
    <div style={{ padding: 10, border: '1px solid #ccc' }}>
      {/* Target handle on top — edges can connect TO this */}
      <Handle type="target" position={Position.Top} />

      <span>{data.label}</span>

      {/* Source handle on bottom — edges can start FROM this */}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
```

### Handle positions

- `Position.Top` — Top center of the node
- `Position.Bottom` — Bottom center
- `Position.Left` — Left center
- `Position.Right` — Right center (default for source handles)

### Multiple handles

Add an `id` to distinguish them:

```jsx
<Handle type="source" position={Position.Right} id="output-a" />
<Handle type="source" position={Position.Bottom} id="output-b" />
```

Then in edges: `{ source: 'node-1', sourceHandle: 'output-a', target: 'node-2' }`

---

## Custom Nodes

By default, nodes are drawn by the canvas worker (fast rectangles with text). For rich UI (buttons, inputs, images), register a custom React component:

```jsx
// 1. Define your component — receives node props
function ColorPickerNode({ data, selected }) {
  return (
    <div style={{
      padding: 10,
      background: data.color,
      border: selected ? '2px solid blue' : '1px solid #ccc',
      borderRadius: 8,
    }}>
      <Handle type="target" position={Position.Left} />
      <span>{data.label}</span>
      <input
        type="color"
        value={data.color}
        onChange={(e) => data.onChange?.(e.target.value)}
        style={{ pointerEvents: 'all' }}  // Important! Nodes overlay has pointerEvents: none
      />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

// 2. Register it in nodeTypes (must be defined OUTSIDE the component, or memoized)
const nodeTypes = { colorPicker: ColorPickerNode };

// 3. Use it
const nodes = [
  {
    id: '1',
    type: 'colorPicker',  // matches the key in nodeTypes
    position: { x: 0, y: 0 },
    data: { label: 'Pick a color', color: '#ff6600' },
  },
];

function App() {
  return (
    <InfiniteCanvas nodes={nodes} nodeTypes={nodeTypes} ... />
  );
}
```

**Important**: Nodes without a `type` (or with `type: 'default'`) are rendered by the canvas worker, NOT as React components. Only nodes with a `type` that matches a key in `nodeTypes` become React components.

---

## Custom Edges

Same pattern as custom nodes:

```jsx
import { EdgeLabelRenderer } from '@infinit-canvas/react';

function CustomEdge({ id, sourceX, sourceY, targetX, targetY, label, style }) {
  // Draw your own SVG path
  const path = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;

  return (
    <>
      <path d={path} stroke="#ff0000" strokeWidth={2} fill="none" style={style} />
      {label && (
        <EdgeLabelRenderer>
          <div style={{
            position: 'absolute',
            transform: `translate(${(sourceX + targetX) / 2}px, ${(sourceY + targetY) / 2}px)`,
            pointerEvents: 'all',
          }}>
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const edgeTypes = { custom: CustomEdge };
// Then use: { id: 'e1', source: '1', target: '2', type: 'custom' }
```

---

## State Management

### How data flows

```
Your component (owns nodes/edges state)
  │
  ├── passes nodes, edges as props ──→ <InfiniteCanvas>
  │
  ├── onNodesChange callback ◄──────── user drags/selects/deletes a node
  │     └── you call applyNodeChanges() to update your state
  │
  ├── onEdgesChange callback ◄──────── user selects/deletes an edge
  │     └── you call applyEdgeChanges() to update your state
  │
  └── onConnect callback ◄──────────── user drags handle-to-handle
        └── you call addEdge() to add the new edge
```

**You own the data.** The canvas tells you what changed via callbacks, and you decide whether to apply those changes. This is the "controlled component" pattern — same as a React `<input>` with `value` and `onChange`.

### useNodesState / useEdgesState

Convenience hooks that set up `useState` + the `onChange` handler for you:

```jsx
const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
```

Equivalent to manually writing:

```jsx
const [nodes, setNodes] = useState(initialNodes);
const onNodesChange = useCallback(
  (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
  []
);
```

### InfiniteCanvasProvider

Wrap your tree in `<InfiniteCanvasProvider>` when you need hooks ABOVE the `<InfiniteCanvas>` component (e.g., for auto-layout, or accessing `useReactFlow()` from a sibling component):

```jsx
import { InfiniteCanvasProvider, InfiniteCanvas, useReactFlow } from '@infinit-canvas/react';

function Toolbar() {
  // This works because InfiniteCanvasProvider is above us
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  return (
    <div>
      <button onClick={() => zoomIn()}>+</button>
      <button onClick={() => zoomOut()}>-</button>
      <button onClick={() => fitView()}>Fit</button>
    </div>
  );
}

function App() {
  return (
    <InfiniteCanvasProvider>
      <Toolbar />
      <InfiniteCanvas nodes={nodes} edges={edges} ... />
    </InfiniteCanvasProvider>
  );
}
```

---

## Hooks

### useReactFlow()

Imperative API to control the canvas programmatically. Does NOT cause re-renders — uses refs internally.

```jsx
const {
  // Read
  getNodes,           // () => Node[]
  getEdges,           // () => Edge[]
  getNode,            // (id) => Node | undefined
  getEdge,            // (id) => Edge | undefined
  getViewport,        // () => { x, y, zoom }
  getZoom,            // () => number

  // Write
  setNodes,           // (nodes | updaterFn) => void
  setEdges,           // (edges | updaterFn) => void
  addNodes,           // (node | nodes) => void
  addEdges,           // (edge | edges) => void
  deleteElements,     // ({ nodes?, edges? }) => void
  updateNodeData,     // (nodeId, dataUpdate) => void

  // Camera
  setViewport,        // ({ x?, y?, zoom? }, { duration? }) => void
  zoomIn,             // ({ duration? }) => void
  zoomOut,            // ({ duration? }) => void
  zoomTo,             // (zoom, { duration? }) => void
  fitView,            // ({ padding?, duration?, nodes? }) => void
  fitBounds,          // (bounds, { padding?, duration? }) => void
  setCenter,          // (x, y, { zoom?, duration? }) => void

  // Coordinate conversion
  screenToFlowPosition, // ({ x, y }) => { x, y }  (screen pixels → world coords)
  flowToScreenPosition, // ({ x, y }) => { x, y }  (world coords → screen pixels)

  // Serialize
  toObject,           // () => { nodes, edges, viewport }
} = useReactFlow();
```

### useNodes() / useEdges()

Subscribe to nodes/edges — re-renders when they change.

```jsx
const nodes = useNodes();
const edges = useEdges();
```

### useStore(selector, equalityFn?)

Subscribe to specific slices of the internal store. Use a **selector** to pick only what you need (avoids unnecessary re-renders):

```jsx
// Only re-renders when the node count changes
const nodeCount = useStore((state) => state.nodes.length);

// With custom equality function
const nodeIds = useStore(
  (state) => state.nodes.map(n => n.id),
  (a, b) => a.length === b.length && a.every((id, i) => id === b[i])
);
```

### useViewport()

Subscribe to viewport changes. Re-renders on every camera update.

```jsx
const { x, y, zoom } = useViewport();
```

### useOnViewportChange({ onChange, onStart, onEnd })

Listen to viewport changes without re-rendering your component:

```jsx
useOnViewportChange({
  onChange: (viewport) => console.log('Moving:', viewport),
  onStart: (viewport) => console.log('Pan/zoom started'),
  onEnd: (viewport) => console.log('Pan/zoom ended'),
});
```

### useOnSelectionChange({ onChange })

```jsx
useOnSelectionChange({
  onChange: ({ nodes, edges }) => {
    console.log('Selected nodes:', nodes);
    console.log('Selected edges:', edges);
  },
});
```

### useNodesData(nodeIds)

Get just the `data` for specific nodes:

```jsx
const data = useNodesData(['node-1', 'node-2']);
// [{ id: 'node-1', type: 'default', data: { label: '...' } }, ...]
```

### useNodeConnections(nodeId)

Get all edges connected to a node:

```jsx
const connections = useNodeConnections('node-1');
// Edge[]
```

### useHandleConnections({ nodeId, type, handleId? })

Get edges connected to a specific handle:

```jsx
const incoming = useHandleConnections({ nodeId: 'node-1', type: 'target' });
```

### useKeyPress(key)

```jsx
const shiftPressed = useKeyPress('Shift');
```

### useUndoRedo({ maxHistorySize? })

```jsx
const { undo, redo, takeSnapshot, canUndo, canRedo } = useUndoRedo();

// Call takeSnapshot() before making changes
function onNodeDragStop() {
  takeSnapshot();
}
```

### useNodeId()

Inside a custom node component, get the current node's ID:

```jsx
function MyNode({ data }) {
  const nodeId = useNodeId();
  return <div>I am {nodeId}</div>;
}
```

---

## Viewport & Camera

### Initial camera position

```jsx
<InfiniteCanvas initialCamera={{ x: 100, y: 50, zoom: 1.5 }} />
```

### Fit all nodes on mount

```jsx
<InfiniteCanvas fitView />
<InfiniteCanvas fitView fitViewOptions={{ padding: 0.2, maxZoom: 2 }} />
```

### Zoom limits

```jsx
<InfiniteCanvas zoomMin={0.1} zoomMax={5} />
```

### Lock the camera to an area

```jsx
// User can't pan beyond these world coordinates
<InfiniteCanvas translateExtent={[[-1000, -1000], [1000, 1000]]} />
```

### Programmatic camera control

```jsx
const { setViewport, fitView, zoomTo, setCenter } = useReactFlow();

// Animated zoom to 2x over 500ms
zoomTo(2, { duration: 500 });

// Center on a specific world coordinate
setCenter(500, 300, { zoom: 1.5, duration: 300 });

// Fit all nodes with padding
fitView({ padding: 0.2, duration: 400 });
```

---

## Interactions

### Panning

| Method | Default |
|--------|---------|
| Click + drag on empty space | Always enabled |
| Scroll wheel | Zooms (set `panOnScroll` to pan instead) |
| Space + drag | Pan with spacebar held (`panActivationKeyCode`) |

```jsx
<InfiniteCanvas
  panOnScroll                    // scroll wheel pans instead of zooming
  panOnScrollMode="horizontal"  // 'free' | 'horizontal' | 'vertical'
  panOnScrollSpeed={0.5}
  panActivationKeyCode=" "      // spacebar activates pan mode
/>
```

### Zooming

```jsx
<InfiniteCanvas
  zoomOnScroll         // default: true
  zoomOnPinch          // default: true (two-finger pinch on trackpad/mobile)
  zoomOnDoubleClick    // default: true
  zoomMin={0.1}
  zoomMax={5}
/>
```

### Node dragging

```jsx
<InfiniteCanvas
  nodesDraggable         // default: true — all nodes can be dragged
  snapToGrid             // snap to grid while dragging
  snapGrid={[25, 25]}    // grid spacing [x, y] in pixels
  nodeExtent={[[-500, -500], [500, 500]]}  // limit where nodes can be dragged
/>
```

### Connecting nodes

```jsx
<InfiniteCanvas
  nodesConnectable        // default: true
  connectionMode="loose"  // 'strict' = only source→target, 'loose' = any handle
  connectionRadius={20}   // snap distance in pixels
  connectOnClick          // click handles instead of dragging
  isValidConnection={(conn) => conn.source !== conn.target}  // validation
  defaultEdgeOptions={{ type: 'smoothstep', animated: true }}  // defaults for new edges
  onConnect={(connection) => ...}
/>
```

### Selection

```jsx
<InfiniteCanvas
  elementsSelectable              // default: true
  multiSelectionKeyCode="Shift"   // hold Shift to select multiple
  selectionOnDrag                 // drag on empty space = selection box
  selectionMode="partial"         // 'partial' = touching box, 'full' = fully inside
  onSelectionChange={({ nodes, edges }) => ...}
/>
```

### Delete

```jsx
<InfiniteCanvas
  deleteKeyCode={['Delete', 'Backspace']}  // keys that delete selected elements
  onDelete={({ nodes, edges }) => console.log('Deleted:', nodes, edges)}
  onBeforeDelete={async ({ nodes, edges }) => {
    return window.confirm('Are you sure?');  // return false to cancel
  }}
/>
```

### Drag & Drop (external)

```jsx
<InfiniteCanvas
  onDragOver={(e) => e.preventDefault()}
  onDrop={(e) => {
    const type = e.dataTransfer.getData('application/reactflow');
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    addNodes({ id: Date.now().toString(), type, position, data: { label: type } });
  }}
/>
```

---

## Styling & Appearance

### CSS

```jsx
import '@infinit-canvas/react/styles.css';  // Required base styles
```

### Dark mode

```jsx
<InfiniteCanvas dark />          // force dark
<InfiniteCanvas dark={false} />  // force light
// omit dark prop → auto-detect from system preference
```

### Background grid

```jsx
import { Background } from '@infinit-canvas/react';

<InfiniteCanvas>
  <Background variant="dots" gap={20} size={1} color="#aaa" />
</InfiniteCanvas>
```

Variants: `'lines'` (default), `'dots'`, `'cross'`

### Container sizing

```jsx
<InfiniteCanvas width="100%" height="100vh" />
<InfiniteCanvas width={800} height={600} />
```

### HUD overlay

```jsx
<InfiniteCanvas
  showHud              // shows world coords + zoom (default: true)
  showHint             // shows "Drag to pan - Scroll to zoom" hint (default: true)
  hintText="Custom hint text"
/>
```

---

## Components

### Controls

Zoom and fit-view buttons:

```jsx
import { Controls } from '@infinit-canvas/react';

<InfiniteCanvas>
  <Controls position="bottom-right" />
</InfiniteCanvas>
```

### MiniMap

Bird's-eye overview:

```jsx
import { MiniMap } from '@infinit-canvas/react';

<InfiniteCanvas>
  <MiniMap
    width={200}
    height={150}
    nodeColor={(node) => node.selected ? '#ff0' : '#eee'}
  />
</InfiniteCanvas>
```

### Panel

Position any content relative to the canvas:

```jsx
import { Panel } from '@infinit-canvas/react';

<InfiniteCanvas>
  <Panel position="top-left">
    <h3>My Flow</h3>
  </Panel>
</InfiniteCanvas>
```

Positions: `'top-left'` | `'top-right'` | `'top-center'` | `'bottom-left'` | `'bottom-right'` | `'bottom-center'`

### NodeResizer

Add resize handles to custom nodes:

```jsx
import { NodeResizer } from '@infinit-canvas/react';

function ResizableNode({ data, selected }) {
  return (
    <>
      <NodeResizer isVisible={selected} minWidth={100} minHeight={50} />
      <div>{data.label}</div>
    </>
  );
}
```

### NodeToolbar

Floating toolbar that follows a node:

```jsx
import { NodeToolbar } from '@infinit-canvas/react';

function MyNode({ data, id }) {
  return (
    <div>
      <NodeToolbar position={Position.Top}>
        <button>Edit</button>
        <button>Delete</button>
      </NodeToolbar>
      {data.label}
    </div>
  );
}
```

### EdgeLabelRenderer

Portal for edge labels (renders in the edge label overlay layer):

```jsx
import { EdgeLabelRenderer } from '@infinit-canvas/react';

function MyEdge({ sourceX, sourceY, targetX, targetY }) {
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;

  return (
    <>
      <path d={`M ${sourceX} ${sourceY} L ${targetX} ${targetY}`} stroke="#333" />
      <EdgeLabelRenderer>
        <div style={{
          position: 'absolute',
          transform: `translate(-50%, -50%) translate(${midX}px, ${midY}px)`,
          pointerEvents: 'all',
        }}>
          Label
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
```

### ViewportPortal

Render any React content that moves with the viewport:

```jsx
import { ViewportPortal } from '@infinit-canvas/react';

<InfiniteCanvas>
  <ViewportPortal>
    <div style={{ position: 'absolute', left: 100, top: 100 }}>
      I'm at world position (100, 100)
    </div>
  </ViewportPortal>
</InfiniteCanvas>
```

---

## Utilities

### applyNodeChanges(changes, nodes) → nodes

Apply an array of changes to your nodes array. Used in `onNodesChange`:

```jsx
const onNodesChange = (changes) => setNodes((nds) => applyNodeChanges(changes, nds));
```

### applyEdgeChanges(changes, edges) → edges

Same for edges:

```jsx
const onEdgesChange = (changes) => setEdges((eds) => applyEdgeChanges(changes, eds));
```

### addEdge(connection, edges) → edges

Add a new edge from a connection event:

```jsx
const onConnect = (connection) => setEdges((eds) => addEdge(connection, eds));
```

### getConnectedEdges(nodes, edges) → edges

Find all edges connected to a set of nodes:

```jsx
const connected = getConnectedEdges(selectedNodes, allEdges);
```

### getIncomers(node, nodes, edges) / getOutgoers(node, nodes, edges)

Find upstream/downstream nodes:

```jsx
const parents = getIncomers(myNode, allNodes, allEdges);
const children = getOutgoers(myNode, allNodes, allEdges);
```

### getNodesBounds(nodes) → { x, y, width, height }

Compute the bounding box of a set of nodes:

```jsx
const bounds = getNodesBounds(selectedNodes);
```

---

## Performance

This library is designed for large graphs (5000+ nodes). Here's how:

| Technique | What it does |
|-----------|-------------|
| **OffscreenCanvas Worker** | All drawing happens on a separate thread. Your React UI and event handlers never wait for rendering. |
| **Spatial grid culling** | Only visible nodes/edges are drawn. 5000 nodes on canvas but only 50 in view = only 50 drawn. |
| **Batched rendering** | All nodes drawn in 2-3 draw calls total (not one per node). Same for edges. |
| **Camera as ref** | Panning/zooming never triggers React re-renders. Camera position is a mutable ref, not React state. |
| **DOM transform sync** | Custom React nodes move via direct `element.style.transform` mutations in a rAF loop — no React reconciliation during pan/zoom. |
| **Hit test skipping** | Mouse hover detection (O(n) scan) is skipped entirely during active pan, drag, connect, or selection. |
| **Node virtualization** | Only visible custom React nodes are mounted in the DOM. Off-screen nodes are unmounted. |
| **Grid tile caching** | Background grid is rendered once to a small canvas tile, then tiled via `createPattern('repeat')`. |
| **Level of Detail** | Text labels, shadows, and arrows are skipped at low zoom levels where they'd be invisible anyway. |
| **Edge routing** | Runs asynchronously after rendering, using spatial grid lookups for nearby obstacle nodes. |
| **Incremental drag** | During drag, only changed node positions are sent to the worker — not the entire node array. |

---

## Full Props Reference

### Data

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `nodes` | `Node[]` | `[]` | Array of nodes to display |
| `edges` | `Edge[]` | `[]` | Array of edges connecting nodes |
| `cards` | `Card[]` | `[]` | Legacy card-based data (simple rectangles) |
| `nodeTypes` | `Record<string, Component>` | built-ins | Map of type name → React component for custom nodes |
| `edgeTypes` | `Record<string, Component>` | built-ins | Map of type name → React component for custom edges |

### Appearance

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `dark` | `boolean` | system | Force dark or light theme |
| `gridSize` | `number` | `40` | Background grid spacing in world pixels |
| `width` | `string \| number` | `'100%'` | Container width |
| `height` | `string \| number` | `'420px'` | Container height |
| `className` | `string` | `''` | CSS class on wrapper div |
| `style` | `CSSProperties` | `{}` | Inline styles on wrapper div |

### Camera

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialCamera` | `{ x, y, zoom }` | `{ x:0, y:0, zoom:1 }` | Starting camera position |
| `fitView` | `boolean` | `false` | Auto-zoom to fit all nodes on mount |
| `fitViewOptions` | `FitViewOptions` | — | Options for fitView (padding, maxZoom, etc.) |
| `zoomMin` | `number` | `0.1` | Minimum zoom level |
| `zoomMax` | `number` | `4` | Maximum zoom level |
| `translateExtent` | `[[x,y],[x,y]]` | — | Camera movement bounds |

### Behavior

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `nodesDraggable` | `boolean` | `true` | Can nodes be dragged? |
| `nodesConnectable` | `boolean` | `true` | Can edges be created by dragging handles? |
| `elementsSelectable` | `boolean` | `true` | Can nodes/edges be clicked to select? |
| `snapToGrid` | `boolean` | `false` | Snap node positions to grid during drag |
| `snapGrid` | `[number, number]` | `[15, 15]` | Grid spacing for snap |
| `connectionMode` | `'strict' \| 'loose'` | `'loose'` | Strict: source→target only. Loose: any handle. |
| `connectionRadius` | `number` | `20` | Snap-to-handle distance in pixels |
| `connectOnClick` | `boolean` | `false` | Click handles to connect (instead of drag) |
| `selectionOnDrag` | `boolean` | `false` | Drag on empty space creates selection box |
| `selectionMode` | `'partial' \| 'full'` | `'partial'` | How selection box selects nodes |
| `multiSelectionKeyCode` | `string` | `'Shift'` | Key to hold for multi-select |
| `deleteKeyCode` | `string \| string[]` | `['Delete', 'Backspace']` | Keys that delete selected elements |
| `panActivationKeyCode` | `string` | `' '` (space) | Key that activates pan mode |
| `panOnScroll` | `boolean` | `false` | Scroll wheel pans instead of zooming |
| `zoomOnScroll` | `boolean` | `true` | Scroll wheel zooms |
| `zoomOnPinch` | `boolean` | `true` | Pinch gesture zooms |
| `zoomOnDoubleClick` | `boolean` | `true` | Double-click zooms in |
| `edgeRouting` | `boolean` | `true` | Smart edge paths that avoid nodes |
| `edgesReconnectable` | `boolean` | `false` | Can existing edges be re-routed to different handles |
| `elevateNodesOnSelect` | `boolean` | `false` | Bring selected nodes to front |
| `autoPanOnNodeDrag` | `boolean` | `true` | Auto-scroll when dragging near edge |
| `autoPanOnConnect` | `boolean` | `true` | Auto-scroll when connecting near edge |
| `nodeExtent` | `[[x,y],[x,y]]` | — | Limit where nodes can be dragged |

### Callbacks

| Prop | Signature | Description |
|------|-----------|-------------|
| `onNodesChange` | `(changes: NodeChange[]) => void` | Node was dragged, selected, added, or removed |
| `onEdgesChange` | `(changes: EdgeChange[]) => void` | Edge was selected, added, or removed |
| `onConnect` | `(connection: Connection) => void` | User connected two handles |
| `onNodeClick` | `(event, node) => void` | Node was clicked |
| `onNodeDoubleClick` | `(event, node) => void` | Node was double-clicked |
| `onNodeDragStart` | `(event, node) => void` | Started dragging a node |
| `onNodeDrag` | `(event, node) => void` | Dragging a node (fires every frame) |
| `onNodeDragStop` | `(event, node) => void` | Finished dragging a node |
| `onEdgeClick` | `(event, edge) => void` | Edge was clicked |
| `onPaneClick` | `(event) => void` | Clicked empty canvas space |
| `onSelectionChange` | `({ nodes, edges }) => void` | Selection changed |
| `onInit` | `(instance) => void` | Canvas initialized (receives ReactFlowInstance) |
| `onMove` | `(event, viewport) => void` | Camera moved (pan/zoom) |
| `onDelete` | `({ nodes, edges }) => void` | Elements were deleted |
| `onBeforeDelete` | `({ nodes, edges }) => Promise<boolean>` | Return false to prevent deletion |
| `onConnect` | `(connection) => void` | New connection created |
| `isValidConnection` | `(connection) => boolean` | Validate before allowing a connection |

---

## License

MIT
