import { useCallback } from 'react';
import {
  InfiniteCanvas, useNodesState, useEdgesState, addEdge,
  Controls, Background,
} from '@infinit-canvas/react';
import '@infinit-canvas/react/styles.css';
import useUndoRedo from './useUndoRedo';

const nodeLabels = ['Wire', 'your', 'ideas', 'with', 'Infinite', 'Canvas', '!'];
let labelIndex = 0;

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { undo, redo, canUndo, canRedo, takeSnapshot } = useUndoRedo(
    nodes, edges, setNodes, setEdges,
  );

  const onConnect = useCallback((connection) => {
    takeSnapshot();
    setEdges((eds) => addEdge(connection, eds));
  }, [setEdges, takeSnapshot]);

  const onPaneClick = useCallback(() => {
    takeSnapshot();
    const label = nodeLabels[labelIndex % nodeLabels.length];
    labelIndex++;
    setNodes((nds) => [
      ...nds,
      {
        id: `${Date.now()}`,
        data: { label },
        position: { x: Math.random() * 400, y: Math.random() * 400 },
      },
    ]);
  }, [takeSnapshot, setNodes]);

  const onNodeDragStart = useCallback(() => {
    takeSnapshot();
  }, [takeSnapshot]);

  return (
    <InfiniteCanvas
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onPaneClick={onPaneClick}
      onNodeDragStart={onNodeDragStart}
      fitView
      style={{ width: '100%', height: '100vh' }}
    >
      <Controls />
      <Background />
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, display: 'flex', gap: 6 }}>
        <button onClick={undo} disabled={!canUndo} style={btnStyle}>Undo</button>
        <button onClick={redo} disabled={!canRedo} style={btnStyle}>Redo</button>
      </div>
      {!nodes.length && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#6c757d', fontSize: 18, fontWeight: 500, pointerEvents: 'none' }}>
          Click anywhere to add nodes
        </div>
      )}
    </InfiniteCanvas>
  );
}

const btnStyle = {
  padding: '6px 14px',
  fontSize: 13,
  fontWeight: 500,
  border: '1px solid #e9ecef',
  borderRadius: 6,
  background: '#fff',
  cursor: 'pointer',
  pointerEvents: 'all',
};
