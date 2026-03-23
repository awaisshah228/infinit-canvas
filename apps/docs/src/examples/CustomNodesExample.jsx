'use client';
import { useCallback } from 'react';
import {
  InfiniteCanvas, useNodesState, useEdgesState, addEdge,
  Controls, Background, Handle, NodeToolbar,
} from '@infinit-canvas/react';
import '@infinit-canvas/react/styles.css';

function ColorNode({ data, selected }) {
  return (
    <div style={{
      background: data.color || '#f0f9ff',
      border: selected ? '2px solid #3b82f6' : '1px solid #ddd',
      borderRadius: 8,
      padding: '10px 16px',
      minWidth: 140,
      position: 'relative',
    }}>
      <Handle type="target" position="left" />
      <div style={{ fontWeight: 600, fontSize: 13 }}>{data.label}</div>
      {data.description && (
        <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{data.description}</div>
      )}
      <NodeToolbar position="top">
        <div style={{
          background: '#fff', border: '1px solid #ddd',
          borderRadius: 4, padding: '2px 8px', fontSize: 11,
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
  { id: '1', type: 'color', position: { x: 50, y: 50 }, data: { label: 'Input', color: '#dbeafe', description: 'Custom node' } },
  { id: '2', type: 'color', position: { x: 350, y: 30 }, data: { label: 'Process', color: '#dcfce7' } },
  { id: '3', position: { x: 350, y: 180 }, data: { label: 'Output' } },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2' },
  { id: 'e2-3', source: '2', target: '3' },
];

export default function CustomNodesExample() {
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
      height="350px"
    >
      <Controls />
      <Background variant="dots" />
    </InfiniteCanvas>
  );
}
