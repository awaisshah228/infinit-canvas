import { useCallback } from 'react';
import {
  InfiniteCanvas, useNodesState, useEdgesState, addEdge,
  Controls, Background,
} from '@infinit-canvas/react';
import '@infinit-canvas/react/styles.css';
import useCopyPaste from './useCopyPaste';

const initialNodes = [
  { id: 'a', data: { label: 'Node A' }, position: { x: 0, y: 0 } },
  { id: 'b', data: { label: 'Node B' }, position: { x: 0, y: 100 } },
  { id: 'c', data: { label: 'Node C' }, position: { x: 0, y: 200 } },
];

const initialEdges = [
  { id: 'a->b', source: 'a', target: 'b' },
  { id: 'b->c', source: 'b', target: 'c' },
];

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { cut, copy, paste, bufferedNodes } = useCopyPaste(
    nodes, edges, setNodes, setEdges,
  );

  const onConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

  const canCopy = nodes.some((n) => n.selected);
  const canPaste = bufferedNodes.length > 0;

  return (
    <InfiniteCanvas
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      fitView
      style={{ width: '100%', height: '100vh' }}
    >
      <Controls />
      <Background />
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, display: 'flex', gap: 6 }}>
        <button onClick={cut} disabled={!canCopy} style={btnStyle}>Cut</button>
        <button onClick={copy} disabled={!canCopy} style={btnStyle}>Copy</button>
        <button onClick={paste} disabled={!canPaste} style={btnStyle}>Paste</button>
      </div>
    </InfiniteCanvas>
  );
}

const btnStyle = {
  padding: '6px 14px',
  fontSize: 13,
  fontWeight: 500,
  border: '1px solid #e9ecef',
  borderRadius: 6,
  background: '#fff',
  cursor: 'pointer',
  pointerEvents: 'all',
};
