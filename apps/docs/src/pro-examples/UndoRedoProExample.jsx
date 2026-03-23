'use client';
import { useCallback, useState, useEffect, useRef } from 'react';
import {
  InfiniteCanvas, useNodesState, useEdgesState, addEdge,
  Controls, Background,
} from '@infinit-canvas/react';
import '@infinit-canvas/react/styles.css';

const nodeLabels = ['Wire', 'your', 'ideas', 'with', 'Infinite', 'Canvas', '!'];
let labelIndex = 0;

export default function UndoRedoProExample() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const pastRef = useRef([]);
  const futureRef = useRef([]);
  const [, forceUpdate] = useState(0);

  const takeSnapshot = useCallback(() => {
    pastRef.current = [
      ...pastRef.current.slice(-99),
      { nodes: [...nodes], edges: [...edges] },
    ];
    futureRef.current = [];
    forceUpdate((n) => n + 1);
  }, [nodes, edges]);

  const undo = useCallback(() => {
    const pastState = pastRef.current[pastRef.current.length - 1];
    if (!pastState) return;
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [...futureRef.current, { nodes, edges }];
    setNodes(pastState.nodes);
    setEdges(pastState.edges);
    forceUpdate((n) => n + 1);
  }, [nodes, edges, setNodes, setEdges]);

  const redo = useCallback(() => {
    const futureState = futureRef.current[futureRef.current.length - 1];
    if (!futureState) return;
    futureRef.current = futureRef.current.slice(0, -1);
    pastRef.current = [...pastRef.current, { nodes, edges }];
    setNodes(futureState.nodes);
    setEdges(futureState.edges);
    forceUpdate((n) => n + 1);
  }, [nodes, edges, setNodes, setEdges]);

  const onConnect = useCallback((connection) => {
    takeSnapshot();
    setEdges((eds) => addEdge(connection, eds));
  }, [setEdges, takeSnapshot]);

  const onPaneClick = useCallback((e) => {
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

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        redo();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [undo, redo]);

  const canUndo = pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;

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
      height="500px"
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
