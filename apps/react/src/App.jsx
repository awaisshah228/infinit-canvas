import { useCallback } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import {
  InfiniteCanvas, useNodesState, useEdgesState, addEdge,
  Controls, MiniMap, Background,
  Handle, NodeToolbar, NodeResizer, getBezierPath,
} from '@infinit-canvas/react';
import '@infinit-canvas/react/styles.css';
import CodeTabs from './components/CodeTabs';
import StressTest from './StressTest';
import StressTestFlow from './StressTestFlow';
import StressTestCustom from './StressTestCustom';
import './App.css';

const INITIAL_CARDS = [
  { x: 60, y: 80, w: 160, h: 90, title: 'Note A', body: 'Pan and zoom me!' },
  { x: 320, y: 140, w: 160, h: 90, title: 'Note B', body: 'I live in world space' },
  { x: -160, y: 200, w: 160, h: 90, title: 'Note C', body: 'Scroll to find me' },
  { x: 500, y: -60, w: 160, h: 90, title: 'Note D', body: 'Try zooming out!' },
];

const INITIAL_NODES = [
  { id: '1', position: { x: 50, y: 50 }, data: { label: 'Start' } },
  { id: '2', position: { x: 300, y: 50 }, data: { label: 'Process' } },
  { id: '3', position: { x: 300, y: 200 }, data: { label: 'Decision' } },
  {
    id: '4',
    position: { x: 550, y: 120 },
    data: { label: 'End' },
    handles: [
      { type: 'target', position: 'top' },
      { type: 'source', position: 'bottom' },
    ],
  },
];

const INITIAL_EDGES = [
  { id: 'e1-2', source: '1', target: '2', label: 'next' },
  { id: 'e2-3', source: '2', target: '3', type: 'smoothstep' },
  { id: 'e3-4', source: '3', target: '4', animated: true },
];

// ─── Custom Node Components ──────────────────────────────────────

function ColorNode({ data, selected }) {
  return (
    <div style={{
      background: data.color || '#f0f9ff',
      border: selected ? '2px solid #3b82f6' : '1px solid #ddd',
      borderRadius: 8,
      padding: '10px 16px',
      minWidth: 140,
      position: 'relative',
    }}>
      <Handle type="target" position="left" />
      <div style={{ fontWeight: 600, fontSize: 13 }}>{data.label}</div>
      {data.description && <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{data.description}</div>}
      <NodeToolbar position="top">
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 4, padding: '2px 8px', fontSize: 11 }}>
          Edit
        </div>
      </NodeToolbar>
      <Handle type="source" position="right" />
    </div>
  );
}

function ResizableNode({ data, selected, width, height }) {
  return (
    <div style={{
      background: '#fefce8',
      border: selected ? '2px solid #eab308' : '1px solid #e5e7eb',
      borderRadius: 8,
      padding: 12,
      width: width || 180,
      height: height || 80,
      position: 'relative',
      overflow: 'visible',
    }}>
      <Handle type="target" position="top" />
      <div style={{ fontWeight: 600, fontSize: 13 }}>{data.label}</div>
      <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Drag corners to resize</div>
      {selected && <NodeResizer color="#eab308" minWidth={100} minHeight={50} />}
      <Handle type="source" position="bottom" />
    </div>
  );
}

// ─── Custom Edge Component ───────────────────────────────────────

function DashedEdge({ sourceX, sourceY, targetX, targetY, data, selected }) {
  const [path] = getBezierPath({ sourceX, sourceY, targetX, targetY });
  return (
    <path
      d={path}
      fill="none"
      stroke={selected ? '#3b82f6' : (data?.color || '#f97316')}
      strokeWidth={selected ? 3 : 2}
      strokeDasharray="8,4"
    />
  );
}

const CUSTOM_NODE_TYPES = { color: ColorNode, resizable: ResizableNode };
const CUSTOM_EDGE_TYPES = { dashed: DashedEdge };

const CUSTOM_NODES = [
  { id: 'c1', type: 'color', position: { x: 50, y: 50 }, data: { label: 'Input', color: '#dbeafe', description: 'Custom React node' } },
  { id: 'c2', type: 'color', position: { x: 350, y: 30 }, data: { label: 'Process', color: '#dcfce7' } },
  { id: 'c3', type: 'resizable', position: { x: 350, y: 180 }, data: { label: 'Resizable' }, width: 180, height: 80 },
  { id: 'c4', position: { x: 600, y: 80 }, data: { label: 'Default Node' } }, // canvas-rendered (no type match)
];

const CUSTOM_EDGES = [
  { id: 'ce1', source: 'c1', target: 'c2', type: 'dashed', data: { color: '#f97316' } },
  { id: 'ce2', source: 'c2', target: 'c3' }, // default canvas edge
  { id: 'ce3', source: 'c2', target: 'c4', label: 'default' },
];

function Nav({ current }) {
  const links = [
    { to: '/', label: 'Nodes & Edges', key: 'flow' },
    { to: '/custom', label: 'Custom Nodes', key: 'custom' },
    { to: '/cards', label: 'Cards', key: 'cards' },
    { to: '/stress', label: 'Stress (Cards)', key: 'stress' },
    { to: '/stress-flow', label: 'Stress (Nodes)', key: 'stress-flow' },
    { to: '/stress-custom', label: 'Stress (Custom)', key: 'stress-custom' },
  ];
  return (
    <nav style={{
      display: 'flex', gap: 12, padding: '10px 12px', fontSize: 13,
      overflowX: 'auto', WebkitOverflowScrolling: 'touch',
      whiteSpace: 'nowrap', scrollbarWidth: 'none',
    }}>
      {links.map((l) => (
        <Link
          key={l.key}
          to={l.to}
          style={{
            color: current === l.key ? '#3b82f6' : '#888',
            fontWeight: current === l.key ? 600 : 400,
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

function FlowDemo() {
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);

  const onConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  const addNewNode = () => {
    const id = `node-${Date.now()}`;
    setNodes((nds) => [
      ...nds,
      {
        id,
        position: { x: 100 + Math.random() * 300, y: 100 + Math.random() * 200 },
        data: { label: `Node ${nds.length + 1}` },
      },
    ]);
  };

  return (
    <div className="app">
      <Nav current="flow" />
      <p style={{ padding: '0 12px', margin: '0 0 8px', fontSize: 12, color: '#888', lineHeight: 1.5 }}>
        Drag nodes to move &middot; Drag from a <strong>handle</strong> to connect &middot; Click to select &middot; <kbd>Delete</kbd> to remove
      </p>
      <InfiniteCanvas
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        height="clamp(300px, 60vh, 600px)"
        initialCamera={{ x: 100, y: 80, zoom: 1 }}
      >
        <Controls />
        <MiniMap />
        <Background variant="dots" />
      </InfiniteCanvas>
      <div id="ic-controls" style={{ marginTop: 4, padding: '4px 0', flexWrap: 'wrap' }}>
        <button onClick={addNewNode} style={{ fontSize: 13, padding: '8px 14px', cursor: 'pointer', borderRadius: 6, border: '0.5px solid #ccc', background: '#fff' }}>
          + Add Node
        </button>
        <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>
          {nodes.length} nodes &middot; {edges.length} edges
        </span>
      </div>
    </div>
  );
}

function CardsPage() {
  return (
    <div className="app">
      <Nav current="cards" />
      <InfiniteCanvas cards={INITIAL_CARDS} height="clamp(300px, 60vh, 600px)" />
      <div id="ic-controls">
        <span className="ic-hint-text">
          Try panning &amp; zooming — grid extends forever
        </span>
      </div>
      <CodeTabs />
    </div>
  );
}

function CustomNodesDemo() {
  const [nodes, setNodes, onNodesChange] = useNodesState(CUSTOM_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(CUSTOM_EDGES);

  const onConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  return (
    <div className="app">
      <Nav current="custom" />
      <p style={{ padding: '0 12px', margin: '0 0 8px', fontSize: 12, color: '#888', lineHeight: 1.5 }}>
        Custom React nodes + custom SVG edges + canvas defaults — all in one canvas.
      </p>
      <InfiniteCanvas
        nodes={nodes}
        edges={edges}
        nodeTypes={CUSTOM_NODE_TYPES}
        edgeTypes={CUSTOM_EDGE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        height="clamp(300px, 60vh, 600px)"
        initialCamera={{ x: 80, y: 60, zoom: 1 }}
      >
        <Controls />
        <MiniMap />
        <Background variant="dots" />
      </InfiniteCanvas>
    </div>
  );
}

function StressPage() {
  return (
    <div>
      <Nav current="stress" />
      <StressTest />
    </div>
  );
}

function StressFlowPage() {
  return (
    <div>
      <Nav current="stress-flow" />
      <StressTestFlow />
    </div>
  );
}

function StressCustomPage() {
  return (
    <div>
      <Nav current="stress-custom" />
      <StressTestCustom />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<FlowDemo />} />
      <Route path="/custom" element={<CustomNodesDemo />} />
      <Route path="/cards" element={<CardsPage />} />
      <Route path="/stress" element={<StressPage />} />
      <Route path="/stress-flow" element={<StressFlowPage />} />
      <Route path="/stress-custom" element={<StressCustomPage />} />
    </Routes>
  );
}
