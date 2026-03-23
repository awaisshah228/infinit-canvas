import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  InfiniteCanvas, useNodesState, useEdgesState, addEdge,
  Handle, MiniMap, Controls, Background,
} from '@infinit-canvas/react';
import '@infinit-canvas/react/styles.css';

const COLS = 20;
const NODE_W = 160;
const NODE_H = 70;
const GAP_X = 80;
const GAP_Y = 50;

const COLORS = ['#dbeafe', '#dcfce7', '#fef3c7', '#fce7f3', '#e0e7ff', '#f3e8ff', '#ccfbf1', '#fee2e2'];
const ICONS = ['⚡', '🔧', '📊', '🎯', '🚀', '💡', '🔍', '🛠️'];

// ─── Custom Node Component ────────────────────────────────────
function WorkflowNode({ data, selected }) {
  return (
    <div style={{
      background: data.color || '#f0f9ff',
      border: selected ? '2px solid #3b82f6' : '1px solid #e2e8f0',
      borderRadius: 10,
      padding: '8px 14px',
      minWidth: 140,
      boxShadow: selected ? '0 0 0 2px rgba(59,130,246,0.2)' : '0 1px 3px rgba(0,0,0,0.08)',
      position: 'relative',
      transition: 'box-shadow 0.15s',
    }}>
      <Handle type="target" position="left" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}>{data.icon}</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{data.label}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{data.description}</div>
        </div>
      </div>
      {data.badge && (
        <span style={{
          position: 'absolute', top: -6, right: -6,
          background: '#3b82f6', color: '#fff', fontSize: 9, fontWeight: 700,
          padding: '2px 6px', borderRadius: 10,
        }}>{data.badge}</span>
      )}
      <Handle type="source" position="right" />
    </div>
  );
}

const CUSTOM_NODE_TYPES = { workflow: WorkflowNode };

// SVG shell for canvas-rendered workflow nodes (no text — worker draws label on top).
const WORKFLOW_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="70" viewBox="0 0 160 70">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f8faff"/>
      <stop offset="100%" stop-color="#eef4ff"/>
    </linearGradient>
  </defs>
  <rect x="1" y="1" width="158" height="68" rx="10" ry="10"
        fill="url(#bg)" stroke="#c7d8f0" stroke-width="1"/>
  <rect x="1" y="1" width="6" height="68" rx="3" ry="3" fill="#3b82f6"/>
</svg>`;

const CANVAS_NODE_TYPES = { workflow: WORKFLOW_SVG };

function generateNodesAndEdges(nodeCount) {
  const nodes = [];
  const edges = [];

  for (let i = 0; i < nodeCount; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    nodes.push({
      id: `n${i}`,
      type: 'workflow',
      position: {
        x: col * (NODE_W + GAP_X),
        y: row * (NODE_H + GAP_Y),
      },
      data: {
        label: `Step ${i + 1}`,
        description: `Task ${col + 1}.${row + 1}`,
        color: COLORS[i % COLORS.length],
        icon: ICONS[i % ICONS.length],
        badge: i % 7 === 0 ? 'NEW' : null,
      },
    });

    // Horizontal edges
    if (col < COLS - 1 && i + 1 < nodeCount) {
      edges.push({
        id: `e${i}-${i + 1}`,
        source: `n${i}`,
        target: `n${i + 1}`,
      });
    }

    // Vertical edges every 5 columns
    if (col % 5 === 0 && i + COLS < nodeCount) {
      edges.push({
        id: `e${i}-${i + COLS}`,
        source: `n${i}`,
        target: `n${i + COLS}`,
      });
    }
  }

  return { nodes, edges };
}

export default function StressTestCustom() {
  const [count, setCount] = useState(200);
  const [loading, setLoading] = useState(false);
  const [hud, setHud] = useState({ wx: 0, wy: 0, zoom: '1.00', renderMs: '0', fps: 0 });
  const pendingCountRef = useRef(null);

  const generated = useMemo(() => generateNodesAndEdges(count), [count]);
  const [nodes, setNodes, onNodesChange] = useNodesState(generated.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(generated.edges);

  useEffect(() => {
    setNodes(generated.nodes);
    setEdges(generated.edges);
  }, [generated, setNodes, setEdges]);

  const onConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  const handleSetCount = useCallback((newCount) => {
    if (newCount === count) return;
    setLoading(true);
    pendingCountRef.current = newCount;
    setTimeout(() => setCount(newCount), 0);
  }, [count]);

  const onNodesProcessed = useCallback(() => {
    setLoading(false);
    pendingCountRef.current = null;
  }, []);

  const onHudUpdate = useCallback((data) => setHud(data), []);

  return (
    <div style={{ padding: 'max(8px, env(safe-area-inset-left, 8px))' }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
        <button onClick={() => handleSetCount(100)} style={btnStyle} disabled={loading}>100</button>
        <button onClick={() => handleSetCount(200)} style={btnStyle} disabled={loading}>200</button>
        <button onClick={() => handleSetCount(500)} style={btnStyle} disabled={loading}>500</button>
        <button onClick={() => handleSetCount(1000)} style={btnStyle} disabled={loading}>1,000</button>
        <button onClick={() => handleSetCount(2000)} style={btnStyle} disabled={loading}>2,000</button>
        <button onClick={() => handleSetCount(5000)} style={btnStyle} disabled={loading}>5,000</button>
        <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#888', marginLeft: 8 }}>
          {nodes.length} custom nodes ({hud.visibleNodes || '?'} visible) | {edges.length} edges | zoom: {hud.zoom}x
          {hud.renderMs ? ' | render: ' + hud.renderMs + 'ms' : ''}
          {hud.fps ? ' | fps: ' + hud.fps : ''}
          &nbsp;| <span style={{ color: '#3b82f6' }}>Click a node to promote it to a React component</span>
        </span>
      </div>
      <div style={{ position: 'relative' }}>
        <InfiniteCanvas
          nodes={nodes}
          edges={edges}
          nodeTypes={CUSTOM_NODE_TYPES}
          canvasNodeTypes={CANVAS_NODE_TYPES}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          height="calc(100vh - 100px)"
          zoomMin={0.02}
          edgeRouting={false}
          onHudUpdate={onHudUpdate}
          onNodesProcessed={onNodesProcessed}
          showHud={false}
        >
          <MiniMap />
          <Controls />
          <Background variant="dots" />
        </InfiniteCanvas>
        {loading && (
          <div style={overlayStyle}>
            <div style={spinnerStyle} />
            <div style={{ color: '#555', fontSize: 14, marginTop: 12 }}>
              Loading {pendingCountRef.current || ''} custom nodes…
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const btnStyle = {
  fontSize: 12,
  padding: '6px 14px',
  borderRadius: 6,
  border: '0.5px solid #ccc',
  background: '#fff',
  cursor: 'pointer',
  color: '#333',
};

const overlayStyle = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(255, 255, 255, 0.85)',
  zIndex: 100,
  borderRadius: 8,
};

const spinnerStyle = {
  width: 36,
  height: 36,
  border: '3px solid #e5e7eb',
  borderTopColor: '#3b82f6',
  borderRadius: '50%',
  animation: 'ric-spin 0.8s linear infinite',
};
