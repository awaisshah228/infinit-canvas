'use client';
import { useCallback } from 'react';
import {
  InfiniteCanvas, useNodesState, useEdgesState, addEdge,
  Controls, MiniMap, Background, Handle, NodeToolbar,
} from '@infinit-canvas/react';
import '@infinit-canvas/react/styles.css';

function ColorNode({ data, selected }) {
  return (
    <div style={{
      background: data.color || '#fff',
      border: '1px solid #1a192b',
      borderRadius: 3,
      padding: 10,
      minWidth: 140,
      fontSize: 12,
      position: 'relative',
      boxShadow: selected ? '0 0 0 0.5px #1a192b' : 'none',
    }}>
      <Handle type="target" position="left" />
      <div style={{ fontWeight: 600 }}>{data.label}</div>
      {data.description && (
        <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{data.description}</div>
      )}
      <NodeToolbar position="top">
        <div style={{
          background: '#fff', border: '1px solid #ddd',
          borderRadius: 4, padding: '2px 8px', fontSize: 11,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          Edit
        </div>
      </NodeToolbar>
      <Handle type="source" position="right" />
    </div>
  );
}

const nodeTypes = { color: ColorNode };

const initialNodes = [
  { id: '1', type: 'input', position: { x: 0, y: 0 }, data: { label: 'Input Node' } },
  { id: '2', type: 'color', position: { x: 250, y: -30 }, data: { label: 'Custom Node', color: '#dbeafe', description: 'With toolbar' } },
  { id: '3', type: 'color', position: { x: 250, y: 100 }, data: { label: 'Process', color: '#dcfce7' } },
  { id: '4', position: { x: 500, y: 0 }, data: { label: 'Default Node' } },
  { id: '5', type: 'output', position: { x: 500, y: 130 }, data: { label: 'Output Node' } },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2' },
  { id: 'e1-3', source: '1', target: '3', animated: true },
  { id: 'e2-4', source: '2', target: '4' },
  { id: 'e3-5', source: '3', target: '5', type: 'smoothstep' },
];

export default function OverviewExample() {
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
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      fitView
      height="400px"
    >
      <Controls />
      <MiniMap />
      <Background variant="dots" />
    </InfiniteCanvas>
  );
}
