import { useCallback } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { InfiniteCanvas, useNodesState, useEdgesState, addEdge, Controls, MiniMap, Background } from 'react-infinite-canvas';
import 'react-infinite-canvas/styles.css';
import CodeTabs from './components/CodeTabs';
import StressTest from './StressTest';
import StressTestFlow from './StressTestFlow';
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

function Nav({ current }) {
  const links = [
    { to: '/', label: 'Nodes & Edges', key: 'flow' },
    { to: '/cards', label: 'Cards', key: 'cards' },
    { to: '/stress', label: 'Stress (Cards)', key: 'stress' },
    { to: '/stress-flow', label: 'Stress (Nodes)', key: 'stress-flow' },
  ];
  return (
    <nav style={{ display: 'flex', gap: 16, padding: '10px 20px', fontSize: 13 }}>
      {links.map((l) => (
        <Link
          key={l.key}
          to={l.to}
          style={{
            color: current === l.key ? '#3b82f6' : '#888',
            fontWeight: current === l.key ? 600 : 400,
            textDecoration: 'none',
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
      <p style={{ padding: '0 20px', margin: '0 0 12px', fontSize: 13, color: '#888' }}>
        Drag nodes to move &middot; Drag from a <strong>handle</strong> (circle) to another to connect &middot; Click to select &middot; <kbd>Delete</kbd> to remove
      </p>
      <InfiniteCanvas
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        height="500px"
        initialCamera={{ x: 100, y: 80, zoom: 1 }}
      >
        <Controls />
        <MiniMap />
        <Background variant="dots" />
      </InfiniteCanvas>
      <div id="ic-controls" style={{ marginTop: 0 }}>
        <button onClick={addNewNode} style={{ fontSize: 13, padding: '4px 12px', cursor: 'pointer' }}>
          + Add Node
        </button>
        <span style={{ fontSize: 12, color: '#888', marginLeft: 12 }}>
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
      <InfiniteCanvas cards={INITIAL_CARDS} height="420px" />
      <div id="ic-controls">
        <span className="ic-hint-text">
          Try panning &amp; zooming — grid extends forever
        </span>
      </div>
      <CodeTabs />
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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<FlowDemo />} />
      <Route path="/cards" element={<CardsPage />} />
      <Route path="/stress" element={<StressPage />} />
      <Route path="/stress-flow" element={<StressFlowPage />} />
    </Routes>
  );
}
