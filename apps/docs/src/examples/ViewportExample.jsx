'use client';
import {
  InfiniteCanvas, useNodesState, useEdgesState,
  Controls, Background,
} from 'react-infinite-canvas';
import 'react-infinite-canvas/styles.css';

const initialNodes = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'Node 1' } },
  { id: '2', position: { x: 200, y: 100 }, data: { label: 'Node 2' } },
  { id: '3', position: { x: 400, y: 0 }, data: { label: 'Node 3' } },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2' },
  { id: 'e2-3', source: '2', target: '3' },
];

export default function ViewportExample() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <InfiniteCanvas
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      fitView
      zoomMin={0.5}
      zoomMax={3}
      height="350px"
    >
      <Controls />
      <Background variant="dots" />
    </InfiniteCanvas>
  );
}
