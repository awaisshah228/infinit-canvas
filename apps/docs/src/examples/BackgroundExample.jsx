'use client';
import {
  InfiniteCanvas, useNodesState, useEdgesState,
  Controls, Background,
} from 'react-infinite-canvas';
import 'react-infinite-canvas/styles.css';

const initialNodes = [
  { id: '1', position: { x: 50, y: 50 }, data: { label: 'Drag me around' } },
  { id: '2', position: { x: 300, y: 100 }, data: { label: 'Check the background' } },
];

const initialEdges = [{ id: 'e1-2', source: '1', target: '2' }];

export default function BackgroundExample() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <InfiniteCanvas
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      fitView
      height="350px"
    >
      <Controls />
      <Background variant="dots" gap={20} />
    </InfiniteCanvas>
  );
}
