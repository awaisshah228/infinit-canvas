import { useCallback } from 'react';
import {
  InfiniteCanvas, useNodesState, useEdgesState, addEdge,
  Controls, Background,
} from '@infinit-canvas/react';
import '@infinit-canvas/react/styles.css';
import { DiamondNode, CircleNode, RectNode, HexagonNode } from './ShapeNodes';

const nodeTypes = {
  diamond: DiamondNode,
  circle: CircleNode,
  rect: RectNode,
  hexagon: HexagonNode,
};

const initialNodes = [
  { id: '1', type: 'circle', position: { x: 200, y: 0 }, data: { label: 'Start', color: '#4ecdc4' } },
  { id: '2', type: 'diamond', position: { x: 200, y: 120 }, data: { label: 'Check?', color: '#ff6b6b' } },
  { id: '3', type: 'rect', position: { x: 50, y: 260 }, data: { label: 'Process A', color: '#45b7d1' } },
  { id: '4', type: 'rect', position: { x: 350, y: 260 }, data: { label: 'Process B', color: '#f7b731' } },
  { id: '5', type: 'hexagon', position: { x: 190, y: 400 }, data: { label: 'Result', color: '#a855f7' } },
  { id: '6', type: 'circle', position: { x: 200, y: 530 }, data: { label: 'End', color: '#22c55e' } },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2' },
  { id: 'e2-3', source: '2', target: '3', label: 'Yes' },
  { id: 'e2-4', source: '2', target: '4', label: 'No' },
  { id: 'e3-5', source: '3', target: '5' },
  { id: 'e4-5', source: '4', target: '5' },
  { id: 'e5-6', source: '5', target: '6' },
];

export default function App() {
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
      nodeTypes={nodeTypes}
      fitView
      style={{ width: '100%', height: '100vh' }}
    >
      <Controls />
      <Background variant="dots" />
    </InfiniteCanvas>
  );
}
