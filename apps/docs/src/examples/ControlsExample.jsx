'use client';
import {
  InfiniteCanvas, useNodesState, useEdgesState,
  Controls, MiniMap, Background,
} from 'react-infinite-canvas';
import 'react-infinite-canvas/styles.css';

const initialNodes = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'Node 1' } },
  { id: '2', position: { x: 200, y: 100 }, data: { label: 'Node 2' } },
  { id: '3', position: { x: 400, y: 50 }, data: { label: 'Node 3' } },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2' },
  { id: 'e2-3', source: '2', target: '3' },
];

export default function ControlsExample() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <InfiniteCanvas
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      height="350px"
    >
      <Controls />
      <MiniMap />
      <Background variant="dots" />
    </InfiniteCanvas>
  );
}
