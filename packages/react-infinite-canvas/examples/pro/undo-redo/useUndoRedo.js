import { useCallback, useEffect, useRef, useState } from 'react';

export default function useUndoRedo(
  nodes, edges, setNodes, setEdges,
  { maxHistorySize = 100 } = {},
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
}
