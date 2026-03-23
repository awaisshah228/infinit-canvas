'use client';
import { useCallback } from 'react';
import {
  InfiniteCanvas, useNodesState, useEdgesState, addEdge,
  Controls, Background, Handle,
} from '@infinit-canvas/react';
import '@infinit-canvas/react/styles.css';

function DiamondNode({ data }) {
  return (
    <div style={{ width: 80, height: 80, position: 'relative' }}>
      <Handle type="target" position="top" style={{ top: -4 }} />
      <svg width="80" height="80" viewBox="0 0 80 80">
        <polygon
          points="40,2 78,40 40,78 2,40"
          fill={data.color || '#ff6b6b'}
          stroke="#333"
          strokeWidth="1.5"
        />
        <text x="40" y="44" textAnchor="middle" fontSize="11" fontWeight="500" fill="#fff">
          {data.label}
        </text>
      </svg>
      <Handle type="source" position="bottom" style={{ bottom: -4 }} />
      <Handle type="source" position="right" id="right" style={{ right: -4, top: '50%' }} />
      <Handle type="target" position="left" id="left" style={{ left: -4, top: '50%' }} />
    </div>
  );
}

function CircleNode({ data }) {
  return (
    <div style={{ width: 80, height: 80, position: 'relative' }}>
      <Handle type="target" position="top" style={{ top: -4 }} />
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="38" fill={data.color || '#4ecdc4'} stroke="#333" strokeWidth="1.5" />
        <text x="40" y="44" textAnchor="middle" fontSize="11" fontWeight="500" fill="#fff">
          {data.label}
        </text>
      </svg>
      <Handle type="source" position="bottom" style={{ bottom: -4 }} />
      <Handle type="source" position="right" id="right" style={{ right: -4, top: '50%' }} />
      <Handle type="target" position="left" id="left" style={{ left: -4, top: '50%' }} />
    </div>
  );
}

function RectNode({ data }) {
  return (
    <div style={{
      padding: '12px 24px',
      background: data.color || '#45b7d1',
      border: '1.5px solid #333',
      borderRadius: 6,
      color: '#fff',
      fontWeight: 500,
      fontSize: 13,
      textAlign: 'center',
      minWidth: 100,
    }}>
      <Handle type="target" position="top" />
      {data.label}
      <Handle type="source" position="bottom" />
      <Handle type="source" position="right" id="right" />
      <Handle type="target" position="left" id="left" />
    </div>
  );
}

function HexagonNode({ data }) {
  return (
    <div style={{ width: 100, height: 86, position: 'relative' }}>
      <Handle type="target" position="top" style={{ top: -4 }} />
      <svg width="100" height="86" viewBox="0 0 100 86">
        <polygon
          points="25,2 75,2 98,43 75,84 25,84 2,43"
          fill={data.color || '#a855f7'}
          stroke="#333"
          strokeWidth="1.5"
        />
        <text x="50" y="47" textAnchor="middle" fontSize="11" fontWeight="500" fill="#fff">
          {data.label}
        </text>
      </svg>
      <Handle type="source" position="bottom" style={{ bottom: -4 }} />
      <Handle type="source" position="right" id="right" style={{ right: -4, top: '50%' }} />
      <Handle type="target" position="left" id="left" style={{ left: -4, top: '50%' }} />
    </div>
  );
}

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
  { id: 'e2-3', source: '2', target: '3', sourceHandle: 'right', targetHandle: 'left', label: 'Yes' },
  { id: 'e2-4', source: '2', target: '4', label: 'No' },
  { id: 'e3-5', source: '3', target: '5' },
  { id: 'e4-5', source: '4', target: '5', sourceHandle: 'right', targetHandle: 'left' },
  { id: 'e5-6', source: '5', target: '6' },
];

export default function ShapesProExample() {
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
      height="500px"
    >
      <Controls />
      <Background variant="dots" />
    </InfiniteCanvas>
  );
}
