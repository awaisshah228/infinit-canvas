import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useCanvasStore } from '../context/InfiniteCanvasContext.js';
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

  const setViewport = useCallback((viewport, options) => {
    store.cameraRef.current = {
      x: viewport.x ?? store.cameraRef.current.x,
      y: viewport.y ?? store.cameraRef.current.y,
      zoom: viewport.zoom ?? store.cameraRef.current.zoom,
    };
    store.sendCamera();
  }, [store]);

  const getZoom = useCallback(() => store.cameraRef.current.zoom, [store]);

  const zoomIn = useCallback((options) => {
    const cam = store.cameraRef.current;
    const wrap = store.wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const mx = rect.width / 2;
    const my = rect.height / 2;
    const factor = 1.2;
    cam.x = mx - (mx - cam.x) * factor;
    cam.y = my - (my - cam.y) * factor;
    cam.zoom = Math.min(store.zoomMax, cam.zoom * factor);
    store.sendCamera();
  }, [store]);

  const zoomOut = useCallback((options) => {
    const cam = store.cameraRef.current;
    const wrap = store.wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const mx = rect.width / 2;
    const my = rect.height / 2;
    const factor = 1 / 1.2;
    cam.x = mx - (mx - cam.x) * factor;
    cam.y = my - (my - cam.y) * factor;
    cam.zoom = Math.max(store.zoomMin, cam.zoom * factor);
    store.sendCamera();
  }, [store]);

  const zoomTo = useCallback((zoom) => {
    const cam = store.cameraRef.current;
    const wrap = store.wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const mx = rect.width / 2;
    const my = rect.height / 2;
    const factor = zoom / cam.zoom;
    cam.x = mx - (mx - cam.x) * factor;
    cam.y = my - (my - cam.y) * factor;
    cam.zoom = Math.min(store.zoomMax, Math.max(store.zoomMin, zoom));
    store.sendCamera();
  }, [store]);

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
    store.cameraRef.current = vp;
    store.sendCamera();
  }, [store]);

  const setCenter = useCallback((x, y, options = {}) => {
    const wrap = store.wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const zoom = options.zoom ?? store.cameraRef.current.zoom;
    store.cameraRef.current = {
      x: rect.width / 2 - x * zoom,
      y: rect.height / 2 - y * zoom,
      zoom,
    };
    store.sendCamera();
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

  return {
    getNodes, getEdges, getNode, getEdge,
    setNodes, setEdges, addNodes, addEdges, deleteElements,
    getViewport, setViewport, getZoom, zoomIn, zoomOut, zoomTo,
    fitView, setCenter,
    screenToFlowPosition, flowToScreenPosition,
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
