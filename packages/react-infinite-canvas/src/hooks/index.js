import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useCanvasStore, useCanvasStoreApi } from '../context/InfiniteCanvasContext.js';
import { getNodesBounds, getViewportForBounds, getConnectedEdges } from '../utils/graph.js';

// ── useReactFlow ─────────────────────────────────────────────────
// Imperative API similar to xyflow's useReactFlow
export function useReactFlow() {
  const store = useCanvasStore();

  const getNodes = useCallback(() => [...store.nodesRef.current], [store]);
  const getEdges = useCallback(() => [...store.edgesRef.current], [store]);
  const getNode = useCallback((id) => store.nodesRef.current.find((n) => n.id === id), [store]);
  const getEdge = useCallback((id) => store.edgesRef.current.find((e) => e.id === id), [store]);

  const setNodes = useCallback((nodesOrUpdater) => {
    if (typeof nodesOrUpdater === 'function') {
      const next = nodesOrUpdater(store.nodesRef.current);
      store.onNodesChangeRef.current?.([
        ...store.nodesRef.current.map((n) => ({ id: n.id, type: 'remove' })),
        ...next.map((item) => ({ type: 'add', item })),
      ]);
    } else {
      store.onNodesChangeRef.current?.([
        ...store.nodesRef.current.map((n) => ({ id: n.id, type: 'remove' })),
        ...nodesOrUpdater.map((item) => ({ type: 'add', item })),
      ]);
    }
  }, [store]);

  const setEdges = useCallback((edgesOrUpdater) => {
    if (typeof edgesOrUpdater === 'function') {
      const next = edgesOrUpdater(store.edgesRef.current);
      store.onEdgesChangeRef.current?.([
        ...store.edgesRef.current.map((e) => ({ id: e.id, type: 'remove' })),
        ...next.map((item) => ({ type: 'add', item })),
      ]);
    } else {
      store.onEdgesChangeRef.current?.([
        ...store.edgesRef.current.map((e) => ({ id: e.id, type: 'remove' })),
        ...edgesOrUpdater.map((item) => ({ type: 'add', item })),
      ]);
    }
  }, [store]);

  const addNodes = useCallback((newNodes) => {
    const arr = Array.isArray(newNodes) ? newNodes : [newNodes];
    store.onNodesChangeRef.current?.(arr.map((item) => ({ type: 'add', item })));
  }, [store]);

  const addEdges = useCallback((newEdges) => {
    const arr = Array.isArray(newEdges) ? newEdges : [newEdges];
    store.onEdgesChangeRef.current?.(arr.map((item) => ({ type: 'add', item })));
  }, [store]);

  const deleteElements = useCallback(({ nodes: delNodes = [], edges: delEdges = [] }) => {
    if (delNodes.length && store.onNodesChangeRef.current) {
      store.onNodesChangeRef.current(delNodes.map((n) => ({ id: n.id, type: 'remove' })));
      // Also remove connected edges
      const connectedEdges = getConnectedEdges(delNodes, store.edgesRef.current);
      if (connectedEdges.length && store.onEdgesChangeRef.current) {
        store.onEdgesChangeRef.current(connectedEdges.map((e) => ({ id: e.id, type: 'remove' })));
      }
    }
    if (delEdges.length && store.onEdgesChangeRef.current) {
      store.onEdgesChangeRef.current(delEdges.map((e) => ({ id: e.id, type: 'remove' })));
    }
  }, [store]);

  const getViewport = useCallback(() => {
    const cam = store.cameraRef.current;
    return { x: cam.x, y: cam.y, zoom: cam.zoom };
  }, [store]);

  // ── Animated transition helper ──
  const animateRef = useRef(null);
  const animateTo = useCallback((target, duration) => {
    if (animateRef.current) cancelAnimationFrame(animateRef.current);
    if (!duration || duration <= 0) {
      store.cameraRef.current = { ...target };
      store.sendCamera();
      return;
    }
    const start = { ...store.cameraRef.current };
    const t0 = performance.now();
    const tick = (now) => {
      const elapsed = now - t0;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const t = 1 - Math.pow(1 - progress, 3);
      store.cameraRef.current = {
        x: start.x + (target.x - start.x) * t,
        y: start.y + (target.y - start.y) * t,
        zoom: start.zoom + (target.zoom - start.zoom) * t,
      };
      store.sendCamera();
      if (progress < 1) animateRef.current = requestAnimationFrame(tick);
    };
    animateRef.current = requestAnimationFrame(tick);
  }, [store]);

  const setViewport = useCallback((viewport, options) => {
    const target = {
      x: viewport.x ?? store.cameraRef.current.x,
      y: viewport.y ?? store.cameraRef.current.y,
      zoom: viewport.zoom ?? store.cameraRef.current.zoom,
    };
    animateTo(target, options?.duration);
  }, [store, animateTo]);

  const getZoom = useCallback(() => store.cameraRef.current.zoom, [store]);

  const zoomIn = useCallback((options) => {
    const cam = store.cameraRef.current;
    const wrap = store.wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const mx = rect.width / 2;
    const my = rect.height / 2;
    const factor = 1.2;
    const target = {
      x: mx - (mx - cam.x) * factor,
      y: my - (my - cam.y) * factor,
      zoom: Math.min(store.zoomMax, cam.zoom * factor),
    };
    animateTo(target, options?.duration);
  }, [store, animateTo]);

  const zoomOut = useCallback((options) => {
    const cam = store.cameraRef.current;
    const wrap = store.wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const mx = rect.width / 2;
    const my = rect.height / 2;
    const factor = 1 / 1.2;
    const target = {
      x: mx - (mx - cam.x) * factor,
      y: my - (my - cam.y) * factor,
      zoom: Math.max(store.zoomMin, cam.zoom * factor),
    };
    animateTo(target, options?.duration);
  }, [store, animateTo]);

  const zoomTo = useCallback((zoom, options) => {
    const cam = store.cameraRef.current;
    const wrap = store.wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const mx = rect.width / 2;
    const my = rect.height / 2;
    const newZoom = Math.min(store.zoomMax, Math.max(store.zoomMin, zoom));
    const factor = newZoom / cam.zoom;
    const target = {
      x: mx - (mx - cam.x) * factor,
      y: my - (my - cam.y) * factor,
      zoom: newZoom,
    };
    animateTo(target, options?.duration);
  }, [store, animateTo]);

  const fitView = useCallback((options = {}) => {
    const nodes = store.nodesRef.current;
    if (!nodes.length) return;
    const wrap = store.wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const padding = options.padding ?? 0.1;
    const filteredNodes = options.nodes
      ? nodes.filter((n) => options.nodes.some((fn) => fn.id === n.id))
      : nodes;
    if (!filteredNodes.length) return;
    const bounds = getNodesBounds(filteredNodes);
    const vp = getViewportForBounds(bounds, rect.width, rect.height, padding);
    if (options.maxZoom) vp.zoom = Math.min(vp.zoom, options.maxZoom);
    if (options.minZoom) vp.zoom = Math.max(vp.zoom, options.minZoom);
    animateTo(vp, options.duration);
  }, [store, animateTo]);

  const fitBounds = useCallback((bounds, options = {}) => {
    const wrap = store.wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const padding = options.padding ?? 0.1;
    const vp = getViewportForBounds(bounds, rect.width, rect.height, padding);
    if (options.maxZoom) vp.zoom = Math.min(vp.zoom, options.maxZoom);
    if (options.minZoom) vp.zoom = Math.max(vp.zoom, options.minZoom);
    animateTo(vp, options.duration);
  }, [store, animateTo]);

  const setCenter = useCallback((x, y, options = {}) => {
    const wrap = store.wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const zoom = options.zoom ?? store.cameraRef.current.zoom;
    const target = {
      x: rect.width / 2 - x * zoom,
      y: rect.height / 2 - y * zoom,
      zoom,
    };
    animateTo(target, options.duration);
  }, [store, animateTo]);

  const toObject = useCallback(() => {
    return {
      nodes: [...store.nodesRef.current],
      edges: [...store.edgesRef.current],
      viewport: { ...store.cameraRef.current },
    };
  }, [store]);

  const screenToFlowPosition = useCallback((clientPos) => {
    return store.screenToWorld(clientPos.x, clientPos.y);
  }, [store]);

  const flowToScreenPosition = useCallback((flowPos) => {
    const cam = store.cameraRef.current;
    const wrap = store.wrapRef.current;
    if (!wrap) return { x: 0, y: 0 };
    const rect = wrap.getBoundingClientRect();
    return {
      x: flowPos.x * cam.zoom + cam.x + rect.left,
      y: flowPos.y * cam.zoom + cam.y + rect.top,
    };
  }, [store]);

  const updateNodeData = useCallback((nodeId, dataUpdate) => {
    const node = store.nodesRef.current.find((n) => n.id === nodeId);
    if (!node) return;
    const newData = typeof dataUpdate === 'function' ? dataUpdate(node.data) : { ...node.data, ...dataUpdate };
    store.onNodesChangeRef.current?.([{ id: nodeId, type: 'replace', item: { ...node, data: newData } }]);
  }, [store]);

  return {
    getNodes, getEdges, getNode, getEdge,
    setNodes, setEdges, addNodes, addEdges, deleteElements,
    getViewport, setViewport, getZoom, zoomIn, zoomOut, zoomTo,
    fitView, fitBounds, setCenter,
    screenToFlowPosition, flowToScreenPosition,
    updateNodeData, toObject,
  };
}

// ── useNodes ─────────────────────────────────────────────────────
export function useNodes() {
  const store = useCanvasStore();
  return store.nodes;
}

// ── useEdges ─────────────────────────────────────────────────────
export function useEdges() {
  const store = useCanvasStore();
  return store.edges;
}

// ── useViewport ──────────────────────────────────────────────────
export function useViewport() {
  const store = useCanvasStore();
  return store.viewport;
}

// ── useConnection ────────────────────────────────────────────────
// Returns the current connection state while a user is dragging a connection line
export function useConnection() {
  const store = useCanvasStore();
  return store.connection;
}

// ── useNodesData ─────────────────────────────────────────────────
// Returns the data for specific node IDs
export function useNodesData(nodeIds) {
  const store = useCanvasStore();
  const ids = Array.isArray(nodeIds) ? nodeIds : [nodeIds];
  return useMemo(() => {
    return ids
      .map((id) => {
        const node = store.nodes.find((n) => n.id === id);
        return node ? { id: node.id, type: node.type, data: node.data } : null;
      })
      .filter(Boolean);
  }, [store.nodes, ...ids]); // eslint-disable-line react-hooks/exhaustive-deps
}

// ── useNodeConnections ───────────────────────────────────────────
// Returns edges connected to a given node
export function useNodeConnections(nodeId) {
  const store = useCanvasStore();
  return useMemo(() => {
    return store.edges.filter((e) => e.source === nodeId || e.target === nodeId);
  }, [store.edges, nodeId]);
}

// ── useHandleConnections ─────────────────────────────────────────
// Returns edges connected to a specific handle on a node
export function useHandleConnections({ nodeId, type, handleId }) {
  const store = useCanvasStore();
  return useMemo(() => {
    return store.edges.filter((e) => {
      if (type === 'source') {
        return e.source === nodeId && (handleId ? e.sourceHandle === handleId : true);
      }
      return e.target === nodeId && (handleId ? e.targetHandle === handleId : true);
    });
  }, [store.edges, nodeId, type, handleId]);
}

// ── useOnViewportChange ──────────────────────────────────────────
export function useOnViewportChange({ onChange, onStart, onEnd }) {
  const store = useCanvasStore();
  const onChangeRef = useRef(onChange);
  const onStartRef = useRef(onStart);
  const onEndRef = useRef(onEnd);

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { onStartRef.current = onStart; }, [onStart]);
  useEffect(() => { onEndRef.current = onEnd; }, [onEnd]);

  useEffect(() => {
    const cb = (data) => {
      onChangeRef.current?.({ x: data.x, y: data.y, zoom: data.zoom });
    };
    store.viewportListeners.add(cb);
    return () => store.viewportListeners.delete(cb);
  }, [store]);
}

// ── useOnSelectionChange ─────────────────────────────────────────
export function useOnSelectionChange({ onChange }) {
  const store = useCanvasStore();
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    const cb = (data) => { onChangeRef.current?.(data); };
    store.selectionListeners.add(cb);
    return () => store.selectionListeners.delete(cb);
  }, [store]);
}

// ── useKeyPress ──────────────────────────────────────────────────
export function useKeyPress(keyOrKeys) {
  const [pressed, setPressed] = useState(false);
  const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];

  useEffect(() => {
    const down = (e) => { if (keys.includes(e.key)) setPressed(true); };
    const up = (e) => { if (keys.includes(e.key)) setPressed(false); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [keys.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  return pressed;
}

// ── useUpdateNodeInternals ───────────────────────────────────────
// Force recalculate node internals (handles, bounds)
export function useUpdateNodeInternals() {
  const store = useCanvasStore();
  return useCallback((nodeIds) => {
    // In our canvas-based approach, re-syncing nodes to worker triggers re-render
    const ids = Array.isArray(nodeIds) ? nodeIds : [nodeIds];
    // Simply re-post current nodes to worker to force re-render
    store.workerRef.current?.postMessage({
      type: 'nodes',
      data: { nodes: [...store.nodesRef.current] },
    });
  }, [store]);
}

// ── useNodesInitialized ──────────────────────────────────────────
// Returns true when all nodes have been rendered at least once
export function useNodesInitialized(options = {}) {
  const store = useCanvasStore();
  // In canvas-based rendering, nodes are "initialized" as soon as they're synced to worker
  return store.nodes.length > 0;
}

// ── useInternalNode ──────────────────────────────────────────────
// Access internal node data (with position)
export function useInternalNode(nodeId) {
  const store = useCanvasStore();
  return useMemo(() => {
    return store.nodes.find((n) => n.id === nodeId) || undefined;
  }, [store.nodes, nodeId]);
}

// ── useStore ─────────────────────────────────────────────────────
// Direct access to the canvas store (selector pattern — powered by Zustand)
export function useStore(selector) {
  return useCanvasStore(selector);
}

// ── useStoreApi ──────────────────────────────────────────────────
// Returns the raw Zustand store for imperative access { getState, setState, subscribe }
export function useStoreApi() {
  return useCanvasStoreApi();
}

// ── useNodeId ────────────────────────────────────────────────────
// Returns the current node ID inside a custom node component.
export { useNodeId } from '../context/NodeIdContext.js';

// ── useUndoRedo ─────────────────────────────────────────────────
// History management for nodes and edges with configurable max stack size.
export function useUndoRedo({ maxHistorySize = 100 } = {}) {
  const store = useCanvasStore();
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const [, forceUpdate] = useState(0);
  const lastSnapshot = useRef(null);

  // Take a snapshot of current state
  const takeSnapshot = useCallback(() => {
    const snapshot = {
      nodes: store.nodesRef.current.map((n) => ({ ...n, data: { ...n.data } })),
      edges: store.edgesRef.current.map((e) => ({ ...e })),
    };
    // Avoid duplicate consecutive snapshots
    if (lastSnapshot.current &&
        JSON.stringify(lastSnapshot.current.nodes.map((n) => n.id)) === JSON.stringify(snapshot.nodes.map((n) => n.id)) &&
        JSON.stringify(lastSnapshot.current.edges.map((e) => e.id)) === JSON.stringify(snapshot.edges.map((e) => e.id))) {
      return;
    }
    undoStack.current.push(snapshot);
    if (undoStack.current.length > maxHistorySize) undoStack.current.shift();
    redoStack.current = [];
    lastSnapshot.current = snapshot;
    forceUpdate((c) => c + 1);
  }, [store, maxHistorySize]);

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    // Save current state to redo stack
    redoStack.current.push({
      nodes: store.nodesRef.current.map((n) => ({ ...n, data: { ...n.data } })),
      edges: store.edgesRef.current.map((e) => ({ ...e })),
    });
    // Restore
    store.onNodesChangeRef.current?.([
      ...store.nodesRef.current.map((n) => ({ id: n.id, type: 'remove' })),
      ...prev.nodes.map((item) => ({ type: 'add', item })),
    ]);
    store.onEdgesChangeRef.current?.([
      ...store.edgesRef.current.map((e) => ({ id: e.id, type: 'remove' })),
      ...prev.edges.map((item) => ({ type: 'add', item })),
    ]);
    lastSnapshot.current = prev;
    forceUpdate((c) => c + 1);
  }, [store]);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next) return;
    // Save current to undo stack
    undoStack.current.push({
      nodes: store.nodesRef.current.map((n) => ({ ...n, data: { ...n.data } })),
      edges: store.edgesRef.current.map((e) => ({ ...e })),
    });
    // Restore
    store.onNodesChangeRef.current?.([
      ...store.nodesRef.current.map((n) => ({ id: n.id, type: 'remove' })),
      ...next.nodes.map((item) => ({ type: 'add', item })),
    ]);
    store.onEdgesChangeRef.current?.([
      ...store.edgesRef.current.map((e) => ({ id: e.id, type: 'remove' })),
      ...next.edges.map((item) => ({ type: 'add', item })),
    ]);
    lastSnapshot.current = next;
    forceUpdate((c) => c + 1);
  }, [store]);

  return {
    undo,
    redo,
    takeSnapshot,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
  };
}

// ── useOnNodesChangeMiddleware ──────────────────────────────────
// Intercept and transform node changes before they reach the user's onNodesChange.
// Returns a wrapped onNodesChange handler.
export function useOnNodesChangeMiddleware(middleware) {
  const middlewareRef = useRef(middleware);
  useEffect(() => { middlewareRef.current = middleware; }, [middleware]);

  return useCallback((originalOnNodesChange) => {
    return (changes) => {
      const transformed = middlewareRef.current(changes);
      if (transformed !== false && transformed != null) {
        originalOnNodesChange(Array.isArray(transformed) ? transformed : changes);
      }
      // If middleware returns false, changes are swallowed
    };
  }, []);
}

// ── useOnEdgesChangeMiddleware ──────────────────────────────────
// Intercept and transform edge changes before they reach the user's onEdgesChange.
export function useOnEdgesChangeMiddleware(middleware) {
  const middlewareRef = useRef(middleware);
  useEffect(() => { middlewareRef.current = middleware; }, [middleware]);

  return useCallback((originalOnEdgesChange) => {
    return (changes) => {
      const transformed = middlewareRef.current(changes);
      if (transformed !== false && transformed != null) {
        originalOnEdgesChange(Array.isArray(transformed) ? transformed : changes);
      }
    };
  }, []);
}
