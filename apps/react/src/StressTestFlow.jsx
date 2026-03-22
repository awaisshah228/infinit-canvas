import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { InfiniteCanvas, useNodesState, useEdgesState, addEdge } from 'react-infinite-canvas';
import 'react-infinite-canvas/styles.css';

const COLS = 20;
const NODE_W = 160;
const NODE_H = 60;
const GAP_X = 80;
const GAP_Y = 60;

function generateNodesAndEdges(nodeCount) {
  const nodes = [];
  const edges = [];

  for (let i = 0; i < nodeCount; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    nodes.push({
      id: `n${i}`,
      position: {
        x: col * (NODE_W + GAP_X),
        y: row * (NODE_H + GAP_Y),
      },
      data: { label: `Node ${i + 1}` },
    });

    if (col < COLS - 1 && i + 1 < nodeCount) {
      edges.push({
        id: `e${i}-${i + 1}`,
        source: `n${i}`,
        target: `n${i + 1}`,
      });
    }

    if (col % 5 === 0 && i + COLS < nodeCount) {
      edges.push({
        id: `e${i}-${i + COLS}`,
        source: `n${i}`,
        target: `n${i + COLS}`,
        type: 'smoothstep',
      });
    }
  }

  return { nodes, edges };
}

export default function StressTestFlow() {
  const [count, setCount] = useState(500);
  const [loading, setLoading] = useState(false);
  const [hud, setHud] = useState({ wx: 0, wy: 0, zoom: '1.00', renderMs: '0', fps: 0 });
  const pendingCountRef = useRef(null);

  const generated = useMemo(() => generateNodesAndEdges(count), [count]);
  const [nodes, setNodes, onNodesChange] = useNodesState(generated.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(generated.edges);

  // Re-sync when count changes (useState ignores new initialValue after mount)
  useEffect(() => {
    setNodes(generated.nodes);
    setEdges(generated.edges);
  }, [generated, setNodes, setEdges]);

  const onConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  const addMore = useCallback((n) => {
    setLoading(true);
    // Defer heavy work so the loader paints first
    setTimeout(() => {
      setNodes((prev) => {
        const startIdx = prev.length;
        const newNodes = [];
        const newEdges = [];
        for (let i = 0; i < n; i++) {
          const idx = startIdx + i;
          const col = idx % COLS;
          const row = Math.floor(idx / COLS);
          newNodes.push({
            id: `n${idx}`,
            position: {
              x: col * (NODE_W + GAP_X),
              y: row * (NODE_H + GAP_Y),
            },
            data: { label: `Node ${idx + 1}` },
          });
          if (col < COLS - 1 && idx + 1 <= startIdx + n - 1) {
            newEdges.push({
              id: `e${idx}-${idx + 1}`,
              source: `n${idx}`,
              target: `n${idx + 1}`,
            });
          }
        }
        setEdges((prevEdges) => [...prevEdges, ...newEdges]);
        return [...prev, ...newNodes];
      });
    }, 0);
  }, [setNodes, setEdges]);

  const handleSetCount = useCallback((newCount) => {
    setLoading(true);
    pendingCountRef.current = newCount;
    // Defer so loader renders before heavy generation
    setTimeout(() => {
      setCount(newCount);
    }, 0);
  }, []);

  const onNodesProcessed = useCallback(() => {
    setLoading(false);
    pendingCountRef.current = null;
  }, []);

  const onHudUpdate = useCallback((data) => setHud(data), []);

  return (
    <div style={{ padding: 'max(8px, env(safe-area-inset-left, 8px))' }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
        <button onClick={() => addMore(100)} style={btnStyle} disabled={loading}>+ Add 100</button>
        <span style={{ color: '#ccc' }}>|</span>
        <button onClick={() => handleSetCount(200)} style={btnStyle} disabled={loading}>200</button>
        <button onClick={() => handleSetCount(500)} style={btnStyle} disabled={loading}>500</button>
        <button onClick={() => handleSetCount(1000)} style={btnStyle} disabled={loading}>1000</button>
        <button onClick={() => handleSetCount(2000)} style={btnStyle} disabled={loading}>2000</button>
        <button onClick={() => handleSetCount(5000)} style={btnStyle} disabled={loading}>5000</button>
        <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#888', marginLeft: 8 }}>
          {nodes.length} nodes ({hud.visibleNodes || '?'} visible) | {edges.length} edges | zoom: {hud.zoom}x
          {hud.renderMs ? ' | render: ' + hud.renderMs + 'ms' : ''}
          {hud.fps ? ' | fps: ' + hud.fps : ''}
        </span>
      </div>
      <div style={{ position: 'relative' }}>
        <InfiniteCanvas
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          height="calc(100vh - 100px)"
          zoomMin={0.02}
          edgeRouting={nodes.length < 5000}
          onHudUpdate={onHudUpdate}
          onNodesProcessed={onNodesProcessed}
        />
        {loading && (
          <div style={overlayStyle}>
            <div style={spinnerStyle} />
            <div style={{ color: '#555', fontSize: 14, marginTop: 12 }}>
              Loading {pendingCountRef.current || ''} nodes…
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
