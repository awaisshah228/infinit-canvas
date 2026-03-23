import { useState, useCallback, useEffect } from 'react';

export default function useCopyPaste(nodes, edges, setNodes, setEdges) {
  const [bufferedNodes, setBufferedNodes] = useState([]);
  const [bufferedEdges, setBufferedEdges] = useState([]);

  const copy = useCallback(() => {
    const selected = nodes.filter((n) => n.selected);
    const selectedIds = new Set(selected.map((n) => n.id));
    const connectedEdges = edges.filter(
      (e) => selectedIds.has(e.source) && selectedIds.has(e.target),
    );
    setBufferedNodes(selected);
    setBufferedEdges(connectedEdges);
  }, [nodes, edges]);

  const cut = useCallback(() => {
    copy();
    const selectedIds = new Set(nodes.filter((n) => n.selected).map((n) => n.id));
    setNodes((nds) => nds.filter((n) => !n.selected));
    setEdges((eds) =>
      eds.filter((e) => !selectedIds.has(e.source) && !selectedIds.has(e.target)),
    );
  }, [copy, nodes, setNodes, setEdges]);

  const paste = useCallback(() => {
    const now = Date.now();
    const newNodes = bufferedNodes.map((n) => ({
      ...n,
      id: `${n.id}-${now}`,
      position: { x: n.position.x + 50, y: n.position.y + 50 },
      selected: false,
    }));
    const newEdges = bufferedEdges.map((e) => ({
      ...e,
      id: `${e.id}-${now}`,
      source: `${e.source}-${now}`,
      target: `${e.target}-${now}`,
    }));
    setNodes((nds) => [
      ...nds.map((n) => ({ ...n, selected: false })),
      ...newNodes,
    ]);
    setEdges((eds) => [...eds, ...newEdges]);
  }, [bufferedNodes, bufferedEdges, setNodes, setEdges]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'c') { e.preventDefault(); copy(); }
      if (mod && e.key === 'x') { e.preventDefault(); cut(); }
      if (mod && e.key === 'v') { e.preventDefault(); paste(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [copy, cut, paste]);

  return { cut, copy, paste, bufferedNodes, bufferedEdges };
}
