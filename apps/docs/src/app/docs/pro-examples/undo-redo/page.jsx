'use client';
import ProExampleBlock from '../../../../components/ProExampleBlock';

const files = [
  {
    name: 'App.jsx',
    code: `import { useCallback } from 'react';
import {
  InfiniteCanvas, useNodesState, useEdgesState, addEdge,
  Controls, Background,
} from '@infinit-canvas/react';
import useUndoRedo from './useUndoRedo';

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { undo, redo, canUndo, canRedo, takeSnapshot } = useUndoRedo(
    nodes, edges, setNodes, setEdges
  );

  const onConnect = useCallback((connection) => {
    takeSnapshot();
    setEdges((eds) => addEdge(connection, eds));
  }, [setEdges, takeSnapshot]);

  const onPaneClick = useCallback((e) => {
    takeSnapshot();
    setNodes((nds) => [
      ...nds,
      {
        id: String(Date.now()),
        data: { label: 'New Node' },
        position: { x: Math.random() * 400, y: Math.random() * 400 },
      },
    ]);
  }, [takeSnapshot, setNodes]);

  const onNodeDragStart = useCallback(() => {
    takeSnapshot();
  }, [takeSnapshot]);

  return (
    <InfiniteCanvas
      nodes={nodes} edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onPaneClick={onPaneClick}
      onNodeDragStart={onNodeDragStart}
      fitView
    >
      <Controls />
      <Background />
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10 }}>
        <button onClick={undo} disabled={!canUndo}>Undo</button>
        <button onClick={redo} disabled={!canRedo}>Redo</button>
      </div>
    </InfiniteCanvas>
  );
}`,
  },
  {
    name: 'useUndoRedo.js',
    code: `import { useCallback, useEffect, useRef, useState } from 'react';

export default function useUndoRedo(
  nodes, edges, setNodes, setEdges,
  { maxHistorySize = 100 } = {}
) {
  const pastRef = useRef([]);
  const futureRef = useRef([]);
  const [, forceUpdate] = useState(0);

  const takeSnapshot = useCallback(() => {
    pastRef.current = [
      ...pastRef.current.slice(-(maxHistorySize - 1)),
      { nodes: [...nodes], edges: [...edges] },
    ];
    futureRef.current = [];
    forceUpdate((n) => n + 1);
  }, [nodes, edges, maxHistorySize]);

  const undo = useCallback(() => {
    const past = pastRef.current;
    const lastState = past[past.length - 1];
    if (!lastState) return;

    pastRef.current = past.slice(0, -1);
    futureRef.current = [...futureRef.current, { nodes, edges }];
    setNodes(lastState.nodes);
    setEdges(lastState.edges);
    forceUpdate((n) => n + 1);
  }, [nodes, edges, setNodes, setEdges]);

  const redo = useCallback(() => {
    const future = futureRef.current;
    const nextState = future[future.length - 1];
    if (!nextState) return;

    futureRef.current = future.slice(0, -1);
    pastRef.current = [...pastRef.current, { nodes, edges }];
    setNodes(nextState.nodes);
    setEdges(nextState.edges);
    forceUpdate((n) => n + 1);
  }, [nodes, edges, setNodes, setEdges]);

  // Keyboard shortcuts: Ctrl+Z / Ctrl+Shift+Z
  useEffect(() => {
    const handler = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        redo();
      } else if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [undo, redo]);

  return {
    undo,
    redo,
    takeSnapshot,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
  };
}`,
  },
];

export default function UndoRedoPage() {
  return (
    <div className="page-content">
      <ProExampleBlock
        title="Undo & Redo"
        description="Snapshot-based undo/redo with Ctrl+Z and Ctrl+Shift+Z keyboard support. Click on the canvas to add nodes, then undo/redo your actions."
        files={files}
        readme={`
          <h2>How it works</h2>
          <p>This example implements undo/redo using a snapshot-based approach. Before any state-changing action, a snapshot of the current nodes and edges is saved to a history stack.</p>
          <h3>Core concept</h3>
          <p>Follows the <a href="https://redux.js.org/usage/implementing-undo-history">Redux undo pattern</a>: maintain two arrays (past and future). On undo, pop from past and push current state to future. On redo, the reverse.</p>
          <h3>What triggers snapshots</h3>
          <ul>
            <li>Adding a node (clicking the canvas)</li>
            <li>Connecting edges</li>
            <li>Starting a node drag</li>
            <li>Deleting nodes or edges</li>
          </ul>
          <h3>Key design decisions</h3>
          <ul>
            <li>Snapshots are taken <strong>before</strong> the action, not after</li>
            <li>History is capped at 100 entries to prevent memory issues</li>
            <li>Taking a new snapshot clears the redo stack</li>
          </ul>
        `}
      />
    </div>
  );
}
