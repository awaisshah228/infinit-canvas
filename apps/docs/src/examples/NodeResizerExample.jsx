'use client';
import { useCallback } from 'react';
import {
  InfiniteCanvas, useNodesState, useEdgesState, addEdge,
  Controls, Background, Handle, NodeResizer,
} from '@infinit-canvas/react';
import '@infinit-canvas/react/styles.css';

function ResizableNode({ data, selected }) {
  return (
    <div style={{
      padding: 10,
      border: '1px solid #1a192b',
      borderRadius: 3,
      background: '#fff',
      width: '100%',
      height: '100%',
      position: 'relative',
      fontSize: 12,
    }}>
      <NodeResizer
        isVisible={selected}
        minWidth={80}
        minHeight={40}
        color="#3b82f6"
      />
      <Handle type="target" position="left" />
      <div>{data.label}</div>
      <Handle type="source" position="right" />
    </div>
  );
}

const nodeTypes = { resizable: ResizableNode };

const initialNodes = [
  { id: '1', type: 'input', position: { x: 0, y: 50 }, data: { label: 'Input' } },
  { id: '2', type: 'resizable', position: { x: 250, y: 30 }, data: { label: 'Resize me! (select first)' }, width: 180, height: 60 },
  { id: '3', type: 'output', position: { x: 500, y: 50 }, data: { label: 'Output' } },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2' },
  { id: 'e2-3', source: '2', target: '3' },
];

export default function NodeResizerExample() {
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
