'use client';
import { useCallback } from 'react';
import {
  InfiniteCanvas, useNodesState, useEdgesState, addEdge,
  Controls, Background, Panel,
} from '@infinit-canvas/react';
import '@infinit-canvas/react/styles.css';

const initialNodes = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'Node 1' } },
  { id: '2', position: { x: 200, y: 100 }, data: { label: 'Node 2' } },
  { id: '3', position: { x: 400, y: 50 }, data: { label: 'Node 3' } },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2' },
  { id: 'e2-3', source: '2', target: '3' },
];

export default function PanelExample() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

  const addNode = () => {
    const id = `${nodes.length + 1}`;
    setNodes((nds) => [...nds, {
      id,
      position: { x: Math.random() * 400, y: Math.random() * 200 },
      data: { label: `Node ${id}` },
    }]);
  };

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
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={addNode}
            style={{
              padding: '4px 10px', fontSize: 12, borderRadius: 4,
              border: '1px solid #ddd', background: '#fff', cursor: 'pointer',
            }}
          >
            + Add Node
          </button>
        </div>
      </Panel>
    </InfiniteCanvas>
  );
}
