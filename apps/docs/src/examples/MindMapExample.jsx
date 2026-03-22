'use client';
import { useCallback, useRef } from 'react';
import {
  InfiniteCanvas, useNodesState, useEdgesState, addEdge,
  Controls, Background, Handle, Panel,
} from 'react-infinite-canvas';
import 'react-infinite-canvas/styles.css';

const colors = ['#dbeafe', '#dcfce7', '#fef3c7', '#fce7f3', '#e0e7ff'];

function MindMapNode({ data, id }) {
  return (
    <div style={{
      padding: '6px 14px',
      background: data.color || '#fff',
      border: '1px solid #1a192b',
      borderRadius: 20,
      fontSize: 13,
      minWidth: 60,
      textAlign: 'center',
    }}>
      <Handle type="target" position="left" style={{ background: '#555' }} />
      {data.label}
      <Handle type="source" position="right" style={{ background: '#555' }} />
    </div>
  );
}

const nodeTypes = { mindmap: MindMapNode };

const initialNodes = [
  { id: 'root', type: 'mindmap', position: { x: 250, y: 150 }, data: { label: 'Main Idea', color: '#dbeafe' } },
  { id: '1', type: 'mindmap', position: { x: 500, y: 50 }, data: { label: 'Branch 1', color: '#dcfce7' } },
  { id: '2', type: 'mindmap', position: { x: 500, y: 150 }, data: { label: 'Branch 2', color: '#fef3c7' } },
  { id: '3', type: 'mindmap', position: { x: 500, y: 250 }, data: { label: 'Branch 3', color: '#fce7f3' } },
  { id: '1a', type: 'mindmap', position: { x: 720, y: 20 }, data: { label: 'Idea 1a', color: '#e0e7ff' } },
  { id: '1b', type: 'mindmap', position: { x: 720, y: 80 }, data: { label: 'Idea 1b', color: '#e0e7ff' } },
];

const initialEdges = [
  { id: 'e-root-1', source: 'root', target: '1' },
  { id: 'e-root-2', source: 'root', target: '2' },
  { id: 'e-root-3', source: 'root', target: '3' },
  { id: 'e-1-1a', source: '1', target: '1a' },
  { id: 'e-1-1b', source: '1', target: '1b' },
];

let idCounter = 10;

export default function MindMapExample() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

  const addChild = useCallback(() => {
    const selectedNode = nodes.find((n) => n.selected);
    if (!selectedNode) return;

    const newId = `node-${idCounter++}`;
    const color = colors[Math.floor(Math.random() * colors.length)];

    setNodes((nds) => [...nds, {
      id: newId,
      type: 'mindmap',
      position: {
        x: selectedNode.position.x + 220,
        y: selectedNode.position.y + (Math.random() - 0.5) * 100,
      },
      data: { label: 'New idea', color },
    }]);

    setEdges((eds) => [...eds, {
      id: `e-${selectedNode.id}-${newId}`,
      source: selectedNode.id,
      target: newId,
    }]);
  }, [nodes, setNodes, setEdges]);

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
      <Background variant="dots" />
      <Panel position="top-right">
        <button
          onClick={addChild}
          style={{
            padding: '5px 12px', fontSize: 12, borderRadius: 4,
            border: '1px solid #ddd', background: '#fff', cursor: 'pointer',
          }}
        >
          + Add Child (select a node first)
        </button>
      </Panel>
    </InfiniteCanvas>
  );
}
