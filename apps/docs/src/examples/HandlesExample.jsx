'use client';
import { useCallback } from 'react';
import {
  InfiniteCanvas, useNodesState, useEdgesState, addEdge,
  Controls, Background, Handle,
} from 'react-infinite-canvas';
import 'react-infinite-canvas/styles.css';

function MultiHandleNode({ data }) {
  return (
    <div style={{
      padding: 10,
      border: '1px solid #1a192b',
      borderRadius: 3,
      background: '#fff',
      minWidth: 120,
      fontSize: 12,
    }}>
      <Handle type="target" position="left" id="input-a" style={{ top: '30%' }} />
      <Handle type="target" position="left" id="input-b" style={{ top: '70%' }} />
      <div>{data.label}</div>
      <Handle type="source" position="right" id="output" />
    </div>
  );
}

const nodeTypes = { multiHandle: MultiHandleNode };

const initialNodes = [
  { id: '1', type: 'input', position: { x: 0, y: 0 }, data: { label: 'Source A' } },
  { id: '2', type: 'input', position: { x: 0, y: 120 }, data: { label: 'Source B' } },
  { id: '3', type: 'multiHandle', position: { x: 250, y: 40 }, data: { label: 'Multi Handle' } },
  { id: '4', type: 'output', position: { x: 500, y: 50 }, data: { label: 'Output' } },
];

const initialEdges = [
  { id: 'e1-3a', source: '1', target: '3', targetHandle: 'input-a' },
  { id: 'e2-3b', source: '2', target: '3', targetHandle: 'input-b' },
  { id: 'e3-4', source: '3', target: '4', sourceHandle: 'output' },
];

export default function HandlesExample() {
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
