'use client';
import { useCallback } from 'react';
import {
  InfiniteCanvas, useNodesState, useEdgesState, addEdge,
  Controls, Background, Panel,
} from 'react-infinite-canvas';
import 'react-infinite-canvas/styles.css';

const STORAGE_KEY = 'ric-save-restore';

const defaultNodes = [
  { id: '1', type: 'input', position: { x: 0, y: 0 }, data: { label: 'Node 1' } },
  { id: '2', position: { x: 200, y: 100 }, data: { label: 'Node 2' } },
  { id: '3', type: 'output', position: { x: 400, y: 0 }, data: { label: 'Node 3' } },
];

const defaultEdges = [
  { id: 'e1-2', source: '1', target: '2' },
  { id: 'e2-3', source: '2', target: '3' },
];

export default function SaveRestoreExample() {
  const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges);

  const onConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

  const onSave = useCallback(() => {
    const flow = { nodes, edges };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(flow));
    alert('Flow saved!');
  }, [nodes, edges]);

  const onRestore = useCallback(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) { alert('No saved flow found'); return; }
    const flow = JSON.parse(raw);
    setNodes(flow.nodes || []);
    setEdges(flow.edges || []);
  }, [setNodes, setEdges]);

  const onClear = useCallback(() => {
    setNodes([]);
    setEdges([]);
  }, [setNodes, setEdges]);

  return (
    <InfiniteCanvas
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      fitView
      height="350px"
    >
      <Controls />
      <Background variant="dots" />
      <Panel position="top-right">
        <div style={{
          display: 'flex', gap: 4,
          background: '#fff', border: '1px solid #ddd', borderRadius: 4,
          padding: 6, fontSize: 12,
        }}>
          <button onClick={onSave} style={btnStyle}>Save</button>
          <button onClick={onRestore} style={btnStyle}>Restore</button>
          <button onClick={onClear} style={{ ...btnStyle, color: '#ef4444' }}>Clear</button>
        </div>
      </Panel>
    </InfiniteCanvas>
  );
}

const btnStyle = {
  padding: '3px 8px', fontSize: 12, borderRadius: 3,
  border: '1px solid #ddd', background: '#fff', cursor: 'pointer',
};
