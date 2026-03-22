import { useState, useCallback, useMemo, useEffect } from 'react';
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
  const [hud, setHud] = useState({ wx: 0, wy: 0, zoom: '1.00', renderMs: '0', fps: 0 });

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
  }, [setEdges]);

  const onHudUpdate = useCallback((data) => setHud(data), []);

  return (
    <div style={{ padding: 20 }}>
      <InfiniteCanvas
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        height="calc(100vh - 100px)"
        zoomMin={0.02}
        onHudUpdate={onHudUpdate}
      />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
        <button onClick={() => addMore(100)} style={btnStyle}>+ Add 100</button>
        <span style={{ color: '#ccc' }}>|</span>
        <button onClick={() => setCount(200)} style={btnStyle}>200</button>
        <button onClick={() => setCount(500)} style={btnStyle}>500</button>
        <button onClick={() => setCount(1000)} style={btnStyle}>1000</button>
        <button onClick={() => setCount(2000)} style={btnStyle}>2000</button>
        <button onClick={() => setCount(5000)} style={btnStyle}>5000</button>
        <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#888', marginLeft: 8 }}>
          {nodes.length} nodes ({hud.visibleNodes || '?'} visible) | {edges.length} edges | zoom: {hud.zoom}x
          {hud.renderMs ? ' | render: ' + hud.renderMs + 'ms' : ''}
          {hud.fps ? ' | fps: ' + hud.fps : ''}
        </span>
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
