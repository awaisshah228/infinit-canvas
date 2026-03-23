'use client';
import ProExampleBlock from '../../../../components/ProExampleBlock';

const appCode = [
  'import { useCallback, useState, useEffect } from "react";',
  'import {',
  '  InfiniteCanvas, useNodesState, useEdgesState, addEdge,',
  '  Controls, Background,',
  '} from "react-infinite-canvas";',
  'import useCopyPaste from "./useCopyPaste";',
  '',
  'const initialNodes = [',
  '  { id: "a", data: { label: "Node A" }, position: { x: 0, y: 0 } },',
  '  { id: "b", data: { label: "Node B" }, position: { x: 0, y: 100 } },',
  '  { id: "c", data: { label: "Node C" }, position: { x: 0, y: 200 } },',
  '];',
  '',
  'const initialEdges = [',
  '  { id: "a->b", source: "a", target: "b" },',
  '  { id: "b->c", source: "b", target: "c" },',
  '];',
  '',
  'export default function App() {',
  '  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);',
  '  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);',
  '  const { cut, copy, paste, bufferedNodes } = useCopyPaste(',
  '    nodes, edges, setNodes, setEdges',
  '  );',
  '',
  '  const onConnect = useCallback(',
  '    (conn) => setEdges((eds) => addEdge(conn, eds)),',
  '    [setEdges],',
  '  );',
  '',
  '  const canCopy = nodes.some((n) => n.selected);',
  '  const canPaste = bufferedNodes.length > 0;',
  '',
  '  return (',
  '    <InfiniteCanvas',
  '      nodes={nodes} edges={edges}',
  '      onNodesChange={onNodesChange}',
  '      onEdgesChange={onEdgesChange}',
  '      onConnect={onConnect}',
  '      fitView',
  '    >',
  '      <Controls />',
  '      <Background />',
  '      <div style={{ position: "absolute", top: 10, left: 10, zIndex: 10 }}>',
  '        <button onClick={cut} disabled={!canCopy}>Cut</button>',
  '        <button onClick={copy} disabled={!canCopy}>Copy</button>',
  '        <button onClick={paste} disabled={!canPaste}>Paste</button>',
  '      </div>',
  '    </InfiniteCanvas>',
  '  );',
  '}',
].join('\n');

const hookCode = [
  'import { useState, useCallback, useEffect } from "react";',
  '',
  'export default function useCopyPaste(nodes, edges, setNodes, setEdges) {',
  '  const [bufferedNodes, setBufferedNodes] = useState([]);',
  '  const [bufferedEdges, setBufferedEdges] = useState([]);',
  '',
  '  const copy = useCallback(() => {',
  '    const selected = nodes.filter((n) => n.selected);',
  '    const selectedIds = new Set(selected.map((n) => n.id));',
  '    const connectedEdges = edges.filter(',
  '      (e) => selectedIds.has(e.source) && selectedIds.has(e.target),',
  '    );',
  '    setBufferedNodes(selected);',
  '    setBufferedEdges(connectedEdges);',
  '  }, [nodes, edges]);',
  '',
  '  const cut = useCallback(() => {',
  '    copy();',
  '    const selectedIds = new Set(nodes.filter((n) => n.selected).map((n) => n.id));',
  '    setNodes((nds) => nds.filter((n) => !n.selected));',
  '    setEdges((eds) =>',
  '      eds.filter((e) => !selectedIds.has(e.source) && !selectedIds.has(e.target))',
  '    );',
  '  }, [copy, nodes, setNodes, setEdges]);',
  '',
  '  const paste = useCallback(() => {',
  '    const now = Date.now();',
  '    const newNodes = bufferedNodes.map((n) => ({',
  '      ...n,',
  '      id: `${n.id}-${now}`,',
  '      position: { x: n.position.x + 50, y: n.position.y + 50 },',
  '      selected: false,',
  '    }));',
  '    const newEdges = bufferedEdges.map((e) => ({',
  '      ...e,',
  '      id: `${e.id}-${now}`,',
  '      source: `${e.source}-${now}`,',
  '      target: `${e.target}-${now}`,',
  '    }));',
  '    setNodes((nds) => [',
  '      ...nds.map((n) => ({ ...n, selected: false })),',
  '      ...newNodes,',
  '    ]);',
  '    setEdges((eds) => [...eds, ...newEdges]);',
  '  }, [bufferedNodes, bufferedEdges, setNodes, setEdges]);',
  '',
  '  // Keyboard shortcuts',
  '  useEffect(() => {',
  '    const handler = (e) => {',
  '      const mod = e.metaKey || e.ctrlKey;',
  '      if (mod && e.key === "c") { e.preventDefault(); copy(); }',
  '      if (mod && e.key === "x") { e.preventDefault(); cut(); }',
  '      if (mod && e.key === "v") { e.preventDefault(); paste(); }',
  '    };',
  '    document.addEventListener("keydown", handler);',
  '    return () => document.removeEventListener("keydown", handler);',
  '  }, [copy, cut, paste]);',
  '',
  '  return { cut, copy, paste, bufferedNodes, bufferedEdges };',
  '}',
].join('\n');

const files = [
  { name: 'App.jsx', code: appCode },
  { name: 'useCopyPaste.js', code: hookCode },
];

export default function CopyPastePage() {
  return (
    <div className="page-content">
      <ProExampleBlock
        title="Copy & Paste"
        description="Copy, cut, and paste nodes with keyboard shortcuts (Ctrl+C, Ctrl+X, Ctrl+V). Select nodes first, then use the buttons or shortcuts."
        files={files}
        readme={`
          <h2>How it works</h2>
          <p>This example implements clipboard-like copy, cut, and paste operations for graph nodes and their connected edges.</p>
          <h3>Core concept</h3>
          <p>Selected nodes and their internal edges are stored in a buffer. When pasting, new nodes are created with unique IDs and offset positions. Edges are reconstructed with the new node IDs.</p>
          <h3>Key features</h3>
          <ul>
            <li>Copy selected nodes and their connecting edges</li>
            <li>Cut removes nodes from the graph while buffering them</li>
            <li>Paste creates duplicates with offset positions and new IDs</li>
            <li>Keyboard shortcuts: Ctrl/Cmd + C, X, V</li>
          </ul>
        `}
      />
    </div>
  );
}
