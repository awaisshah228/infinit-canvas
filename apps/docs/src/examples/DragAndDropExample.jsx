'use client';
import { useState, useCallback, useRef } from 'react';
import {
  InfiniteCanvas, useNodesState, useEdgesState, addEdge,
  Controls, Background, Panel,
} from 'react-infinite-canvas';
import 'react-infinite-canvas/styles.css';

const initialNodes = [
  { id: '1', type: 'input', position: { x: 50, y: 50 }, data: { label: 'Start here' } },
];

let id = 1;
const getId = () => `dnd_${id++}`;

export default function DragAndDropExample() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [dragType, setDragType] = useState(null);

  const onConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

  const onDragStart = (event, type) => {
    setDragType(type);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event) => {
    event.preventDefault();
    if (!dragType) return;

    const newNode = {
      id: getId(),
      type: dragType,
      position: { x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY },
      data: { label: `${dragType} node` },
    };

    setNodes((nds) => [...nds, newNode]);
    setDragType(null);
  }, [dragType, setNodes]);

  return (
    <InfiniteCanvas
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      fitView
      height="350px"
    >
      <Controls />
      <Background variant="dots" />
      <Panel position="top-right">
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 6,
          background: '#fff', border: '1px solid #ddd', borderRadius: 4,
          padding: 8, fontSize: 12,
        }}>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>Drag to canvas:</div>
          <div
            onDragStart={(e) => onDragStart(e, 'input')}
            draggable
            style={{ padding: '4px 8px', border: '1px solid #0041d0', borderRadius: 3, cursor: 'grab', textAlign: 'center' }}
          >
            Input Node
          </div>
          <div
            onDragStart={(e) => onDragStart(e, 'default')}
            draggable
            style={{ padding: '4px 8px', border: '1px solid #1a192b', borderRadius: 3, cursor: 'grab', textAlign: 'center' }}
          >
            Default Node
          </div>
          <div
            onDragStart={(e) => onDragStart(e, 'output')}
            draggable
            style={{ padding: '4px 8px', border: '1px solid #ff0072', borderRadius: 3, cursor: 'grab', textAlign: 'center' }}
          >
            Output Node
          </div>
        </div>
      </Panel>
    </InfiniteCanvas>
  );
}
