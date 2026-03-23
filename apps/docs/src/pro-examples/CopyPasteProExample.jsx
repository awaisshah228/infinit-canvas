'use client';
import { useCallback, useState, useEffect, useRef } from 'react';
import {
  InfiniteCanvas, useNodesState, useEdgesState, addEdge,
  Controls, Background,
} from '@infinit-canvas/react';
import '@infinit-canvas/react/styles.css';

const initialNodes = [
  { id: 'a', data: { label: 'Node A' }, position: { x: 0, y: 0 } },
  { id: 'b', data: { label: 'Node B' }, position: { x: 0, y: 100 } },
  { id: 'c', data: { label: 'Node C' }, position: { x: 0, y: 200 } },
];

const initialEdges = [
  { id: 'a->b', source: 'a', target: 'b' },
  { id: 'b->c', source: 'b', target: 'c' },
];

export default function CopyPasteProExample() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [buffer, setBuffer] = useState({ nodes: [], edges: [] });

  const onConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

  const copy = useCallback(() => {
    const selectedNodes = nodes.filter((n) => n.selected);
    const selectedNodeIds = new Set(selectedNodes.map((n) => n.id));
    const selectedEdges = edges.filter(
      (e) => selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target),
    );
    setBuffer({ nodes: selectedNodes, edges: selectedEdges });
  }, [nodes, edges]);

  const cut = useCallback(() => {
    copy();
    setNodes((nds) => nds.filter((n) => !n.selected));
    setEdges((eds) => {
      const selectedIds = new Set(nodes.filter((n) => n.selected).map((n) => n.id));
      return eds.filter((e) => !selectedIds.has(e.source) && !selectedIds.has(e.target));
    });
  }, [copy, nodes, setNodes, setEdges]);

  const paste = useCallback(() => {
    const now = Date.now();
    const newNodes = buffer.nodes.map((n) => ({
      ...n,
      id: `${n.id}-${now}`,
      position: { x: n.position.x + 50, y: n.position.y + 50 },
      selected: false,
    }));
    const newEdges = buffer.edges.map((e) => ({
      ...e,
      id: `${e.id}-${now}`,
      source: `${e.source}-${now}`,
      target: `${e.target}-${now}`,
    }));
    setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), ...newNodes]);
    setEdges((eds) => [...eds, ...newEdges]);
  }, [buffer, setNodes, setEdges]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') { e.preventDefault(); copy(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'x') { e.preventDefault(); cut(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') { e.preventDefault(); paste(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [copy, cut, paste]);

  const canCopy = nodes.some((n) => n.selected);
  const canPaste = buffer.nodes.length > 0;

  return (
    <InfiniteCanvas
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      fitView
      height="500px"
    >
      <Controls />
      <Background />
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, display: 'flex', gap: 6 }}>
        <button onClick={cut} disabled={!canCopy} style={btnStyle}>Cut</button>
        <button onClick={copy} disabled={!canCopy} style={btnStyle}>Copy</button>
        <button onClick={paste} disabled={!canPaste} style={btnStyle}>Paste</button>
      </div>
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
