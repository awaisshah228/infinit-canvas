'use client';
import { useCallback } from 'react';
import {
  InfiniteCanvas, useNodesState, useEdgesState, addEdge,
  Controls, Background,
} from 'react-infinite-canvas';
import 'react-infinite-canvas/styles.css';

const initialNodes = [
  { id: '1', type: 'input', position: { x: 0, y: 0 }, data: { label: 'Start' } },
  { id: '2', position: { x: 250, y: 0 }, data: { label: 'Process' } },
  { id: '3', type: 'output', position: { x: 500, y: 0 }, data: { label: 'End' } },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', label: 'validates' },
  { id: 'e2-3', source: '2', target: '3', label: 'transforms', animated: true },
];

export default function EdgeLabelsExample() {
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
