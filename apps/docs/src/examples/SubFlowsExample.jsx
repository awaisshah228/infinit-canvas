'use client';
import { useCallback } from 'react';
import {
  InfiniteCanvas, useNodesState, useEdgesState, addEdge,
  Controls, Background,
} from 'react-infinite-canvas';
import 'react-infinite-canvas/styles.css';

const initialNodes = [
  {
    id: 'group-1',
    type: 'group',
    position: { x: 0, y: 0 },
    data: { label: 'Group A' },
    width: 350,
    height: 180,
  },
  {
    id: 'child-1',
    position: { x: 20, y: 40 },
    data: { label: 'Child 1' },
    parentId: 'group-1',
    extent: 'parent',
  },
  {
    id: 'child-2',
    position: { x: 180, y: 40 },
    data: { label: 'Child 2' },
    parentId: 'group-1',
    extent: 'parent',
  },
  {
    id: 'outside',
    position: { x: 450, y: 50 },
    data: { label: 'Outside Node' },
    type: 'output',
  },
];

const initialEdges = [
  { id: 'e-c1-c2', source: 'child-1', target: 'child-2' },
  { id: 'e-c2-out', source: 'child-2', target: 'outside' },
];

export default function SubFlowsExample() {
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
