'use client';
import { useState, useCallback } from 'react';
import {
  InfiniteCanvas, useNodesState, useEdgesState, addEdge,
  Controls, Background, Panel,
} from '@infinit-canvas/react';
import '@infinit-canvas/react/styles.css';

const initialNodes = [
  { id: '1', type: 'input', position: { x: 0, y: 0 }, data: { label: 'Drag me' } },
  { id: '2', position: { x: 200, y: 100 }, data: { label: 'Connect me' } },
  { id: '3', type: 'output', position: { x: 400, y: 0 }, data: { label: 'Select me' } },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2' },
];

export default function InteractivityExample() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [draggable, setDraggable] = useState(true);
  const [connectable, setConnectable] = useState(true);
  const [selectable, setSelectable] = useState(true);

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
      nodesDraggable={draggable}
      nodesConnectable={connectable}
      elementsSelectable={selectable}
      fitView
      height="350px"
    >
      <Controls />
      <Background variant="dots" />
      <Panel position="top-right">
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 4,
          background: '#fff', border: '1px solid #ddd', borderRadius: 4,
          padding: 8, fontSize: 12,
        }}>
          <label><input type="checkbox" checked={draggable} onChange={(e) => setDraggable(e.target.checked)} /> Draggable</label>
          <label><input type="checkbox" checked={connectable} onChange={(e) => setConnectable(e.target.checked)} /> Connectable</label>
          <label><input type="checkbox" checked={selectable} onChange={(e) => setSelectable(e.target.checked)} /> Selectable</label>
        </div>
      </Panel>
    </InfiniteCanvas>
  );
}
