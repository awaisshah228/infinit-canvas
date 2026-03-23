'use client';
import { useCallback } from 'react';
import {
  InfiniteCanvas, useNodesState, useEdgesState, addEdge,
  Controls, Background,
} from '@infinit-canvas/react';
import '@infinit-canvas/react/styles.css';

const initialNodes = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'Node A' } },
  { id: '2', position: { x: 250, y: 0 }, data: { label: 'Node B' } },
  { id: '3', position: { x: 0, y: 150 }, data: { label: 'Node C' } },
  { id: '4', position: { x: 250, y: 150 }, data: { label: 'Node D' } },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', label: 'default' },
  { id: 'e3-4', source: '3', target: '4', type: 'smoothstep', label: 'smoothstep' },
  { id: 'e1-3', source: '1', target: '3', animated: true, label: 'animated' },
];

export default function EdgesExample() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

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
    </InfiniteCanvas>
  );
}
