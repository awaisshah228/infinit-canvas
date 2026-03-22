/**
 * useInfiniteCanvas — Core hook that manages the infinite canvas lifecycle.
 *
 * Supports:
 * - cards (legacy): Array of { x, y, w, h, title, body }
 * - nodes: Array of { id, position, data, width?, height?, handles?, selected? }
 * - edges: Array of { id, source, target, type?, animated?, label?, selected? }
 * - Node dragging, multi-select (shift+click), selection box
 * - Edge click/select
 * - Connection creation (drag handle-to-handle)
 * - Context store for child hooks (useReactFlow, useNodes, etc.)
 */
import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { snapPosition as snapPos, clampPosition, getNodesBounds, getViewportForBounds } from './utils/graph.js';
import { computeRoutedEdges } from './utils/edgeRouter.js';

const canvasWorkerMap = new WeakMap();

function getOrCreateWorker(canvas, initData) {
  if (canvasWorkerMap.has(canvas)) {
    return canvasWorkerMap.get(canvas);
  }
  const offscreen = canvas.transferControlToOffscreen();
  const worker = new Worker(new URL('./worker/canvas.worker.js', import.meta.url));
  worker.onerror = (e) => console.error('[infinite-canvas] worker error:', e.message, e);
  worker.postMessage({ type: 'init', data: { ...initData, canvas: offscreen } }, [offscreen]);
  const entry = { worker };
  canvasWorkerMap.set(canvas, entry);
  return entry;
}

let edgeRouterWorker = null;
let edgeRouterReqId = 0;
function getEdgeRouterWorker() {
  if (!edgeRouterWorker) {
    edgeRouterWorker = new Worker(new URL('./worker/edgeRouter.worker.js', import.meta.url));
    edgeRouterWorker.onerror = (e) => console.error('[edge-router] worker error:', e.message, e);
  }
  return edgeRouterWorker;
}

const DEFAULT_NODE_WIDTH = 160;
const DEFAULT_NODE_HEIGHT = 60;
const HANDLE_RADIUS = 10;

export default function useInfiniteCanvas({
  cards = [],
  nodes = [],
  edges = [],
  onHudUpdate,
  onNodesProcessed,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onNodeDragStart,
  onNodeDrag,
  onNodeDragStop,
  onEdgeClick,
  onEdgeDoubleClick,
  onEdgeMouseEnter,
  onEdgeMouseMove,
  onEdgeMouseLeave,
  onEdgeContextMenu,
  onNodeDoubleClick,
  onNodeMouseEnter,
  onNodeMouseMove,
  onNodeMouseLeave,
  onNodeContextMenu,
  onPaneClick,
  onPaneContextMenu,
  onPaneMouseEnter,
  onPaneMouseMove,
  onPaneMouseLeave,
  onSelectionChange,
  onConnectStart,
  onConnectEnd,
  onInit,
  onMoveStart,
  onMove,
  onMoveEnd,
  onDelete,
  onBeforeDelete,
  onError,
  isValidConnection,
  dark,
  gridSize = 40,
  zoomMin = 0.1,
  zoomMax = 4,
  initialCamera = { x: 0, y: 0, zoom: 1 },
  fitView: fitViewOnInit = false,
  fitViewOptions,
  nodesDraggable = true,
  nodesConnectable = true,
  elementsSelectable = true,
  multiSelectionKeyCode = 'Shift',
  selectionOnDrag = false,
  selectionMode = 'partial',
  connectionMode = 'loose',
  connectionRadius = 20,
  connectOnClick = false,
  snapToGrid = false,
  snapGrid = [15, 15],
  deleteKeyCode = ['Delete', 'Backspace'],
  panActivationKeyCode = ' ',
  panOnScroll = false,
  panOnScrollMode = 'free',
  panOnScrollSpeed = 0.5,
  zoomOnScroll = true,
  zoomOnDoubleClick = true,
  zoomOnPinch = true,
  preventScrolling = true,
  translateExtent,
  nodeExtent,
  defaultEdgeOptions = {},
  autoPanOnNodeDrag = true,
  autoPanOnConnect = true,
  autoPanSpeed = 5,
  edgesReconnectable = false,
  elevateNodesOnSelect = false,
  edgeRouting = true,
} = {}) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const workerRef = useRef(null);
  const cameraRef = useRef({ ...initialCamera });
  const cardsRef = useRef([...cards]);
  const nodesRef = useRef([...nodes]);
  const edgesRef = useRef([...edges]);
  const draggingRef = useRef(false);
  const lastPtRef = useRef(null);
  const [canvasReady, setCanvasReady] = useState(false);

  // Node interaction state
  const dragNodeRef = useRef(null);
  const connectingRef = useRef(null);
  const connectEndRef = useRef(null);

  // Selection box state
  const selectionBoxRef = useRef(null); // { startWorld, endWorld }
  const multiKeyRef = useRef(false);
  // Click-to-connect state
  const clickConnectRef = useRef(null); // { nodeId, handleId, handleType }

  // Viewport and connection state for hooks
  const [viewport, setViewport] = useState({ x: initialCamera.x, y: initialCamera.y, zoom: initialCamera.zoom });
  const [connection, setConnection] = useState(null);

  // Listeners for viewport/selection change hooks
  const viewportListeners = useMemo(() => new Set(), []);
  const selectionListeners = useMemo(() => new Set(), []);

  // Pan activation key
  const panKeyRef = useRef(false);

  // Callback refs — stable references to latest callback props
  const refs = useRef({});
  refs.current = {
    onHudUpdate, onNodesProcessed, onNodesChange, onEdgesChange, onConnect, onNodeClick,
    onNodeDragStart, onNodeDrag, onNodeDragStop, onEdgeClick,
    onEdgeDoubleClick, onEdgeMouseEnter, onEdgeMouseMove, onEdgeMouseLeave, onEdgeContextMenu,
    onNodeDoubleClick, onNodeMouseEnter, onNodeMouseMove, onNodeMouseLeave, onNodeContextMenu,
    onPaneClick, onPaneContextMenu, onPaneMouseEnter, onPaneMouseMove, onPaneMouseLeave,
    onSelectionChange, onConnectStart, onConnectEnd,
    onInit, onMoveStart, onMove, onMoveEnd, onDelete, onBeforeDelete, onError,
    isValidConnection,
  };
  // Shorthand accessors (keeps rest of code cleaner)
  const onNodesChangeRef = { get current() { return refs.current.onNodesChange; } };
  const onEdgesChangeRef = { get current() { return refs.current.onEdgesChange; } };
  const onConnectRef = { get current() { return refs.current.onConnect; } };
  const onNodeClickRef = { get current() { return refs.current.onNodeClick; } };
  const onNodeDragStartRef = { get current() { return refs.current.onNodeDragStart; } };
  const onNodeDragRef = { get current() { return refs.current.onNodeDrag; } };
  const onNodeDragStopRef = { get current() { return refs.current.onNodeDragStop; } };
  const onEdgeClickRef = { get current() { return refs.current.onEdgeClick; } };
  const onPaneClickRef = { get current() { return refs.current.onPaneClick; } };
  const onSelectionChangeRef = { get current() { return refs.current.onSelectionChange; } };
  const onHudUpdateRef = { get current() { return refs.current.onHudUpdate; } };
  const onNodesProcessedRef = { get current() { return refs.current.onNodesProcessed; } };

  // Track multi-select key and pan activation key
  useEffect(() => {
    const down = (e) => {
      if (e.key === multiSelectionKeyCode) multiKeyRef.current = true;
      if (e.key === panActivationKeyCode) panKeyRef.current = true;
    };
    const up = (e) => {
      if (e.key === multiSelectionKeyCode) multiKeyRef.current = false;
      if (e.key === panActivationKeyCode) panKeyRef.current = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [multiSelectionKeyCode, panActivationKeyCode]);

  // Notify selection change listeners
  const notifySelectionChange = useCallback(() => {
    const selectedNodes = nodesRef.current.filter((n) => n.selected);
    const selectedEdges = edgesRef.current.filter((e) => e.selected);
    const data = { nodes: selectedNodes, edges: selectedEdges };
    onSelectionChangeRef.current?.(data);
    for (const cb of selectionListeners) cb(data);
  }, [selectionListeners]);

  // Sync to worker
  useEffect(() => {
    cardsRef.current = [...cards];
    workerRef.current?.postMessage({ type: 'cards', data: { cards: [...cards] } });
  }, [cards]);

  // Resolve absolute positions for nodes with parentId
  const resolveAbsolutePositions = useCallback((nds) => {
    const lookup = {};
    for (const n of nds) lookup[n.id] = n;
    return nds.map((n) => {
      if (!n.parentId) return n;
      const parent = lookup[n.parentId];
      if (!parent) return n;
      // Recursively resolve parent positions
      let absX = n.position.x;
      let absY = n.position.y;
      let p = parent;
      while (p) {
        absX += p.position.x;
        absY += p.position.y;
        p = p.parentId ? lookup[p.parentId] : null;
      }
      return { ...n, _absolutePosition: { x: absX, y: absY } };
    });
  }, []);

  // Ref to hold last resolved nodes for routing
  const resolvedNodesRef = useRef([]);
  const edgeRouterRef = useRef(null);
  const routeReqIdRef = useRef(0);
  const routeDebounceRef = useRef(null);
  const lastRoutedPositionsRef = useRef('');

  // Send edges to the edge router worker for off-thread routing.
  // The worker posts back routed edges which we forward to the canvas worker.
  const routeEdgesInWorker = useCallback((resolvedNodes, edgeList) => {
    const router = getEdgeRouterWorker();
    // Set up listener if not yet done
    if (!edgeRouterRef.current) {
      edgeRouterRef.current = true;
      router.onmessage = (ev) => {
        const msg = ev.data;
        if (msg.type === 'routed') {
          // Only apply if this is the latest request (skip stale results)
          if (msg.id === routeReqIdRef.current) {
            workerRef.current?.postMessage({ type: 'edges', data: { edges: msg.edges } });
          }
        } else if (msg.type === 'routedSingle') {
          if (msg.id === routeReqIdRef.current) {
            const c = connectingRef.current;
            const end = connectEndRef.current;
            if (c && end) {
              workerRef.current?.postMessage({ type: 'connecting', data: { from: c.startPos, to: end, _routedPoints: msg.points } });
            }
          }
        }
      };
    }
    const id = ++edgeRouterReqId;
    routeReqIdRef.current = id;
    // Strip heavy/non-serializable fields — send only what the router needs
    const lightNodes = resolvedNodes.map(n => ({
      id: n.id, position: n.position, _absolutePosition: n._absolutePosition,
      width: n.width, height: n.height, measured: n.measured,
      handles: n.handles, hidden: n.hidden,
    }));
    const lightEdges = edgeList.map(e => ({
      id: e.id, source: e.source, target: e.target,
      sourceHandle: e.sourceHandle, targetHandle: e.targetHandle,
      type: e.type, animated: e.animated, label: e.label,
      selected: e.selected, data: e.data, style: e.style,
    }));
    router.postMessage({ type: 'route', id, nodes: lightNodes, edges: lightEdges });
  }, []);

  useEffect(() => {
    nodesRef.current = [...nodes];
    const resolved = resolveAbsolutePositions(nodes);
    resolvedNodesRef.current = resolved;
    workerRef.current?.postMessage({ type: 'nodes', data: { nodes: resolved } });
    // Re-route edges only when node positions/dimensions actually changed
    // (skip rerouting for selection-only or data-only changes)
    if (edgeRouting && edgesRef.current.length > 0) {
      // Build a lightweight fingerprint of positions + dimensions
      let posKey = '';
      for (let i = 0; i < resolved.length; i++) {
        const n = resolved[i];
        const p = n._absolutePosition || n.position;
        posKey += n.id + ':' + p.x + ',' + p.y + ',' + (n.width || 0) + ',' + (n.height || 0) + ';';
      }
      if (posKey !== lastRoutedPositionsRef.current) {
        lastRoutedPositionsRef.current = posKey;
        // Debounce routing to avoid flooding the worker during rapid drags
        if (routeDebounceRef.current) clearTimeout(routeDebounceRef.current);
        routeDebounceRef.current = setTimeout(() => {
          routeEdgesInWorker(resolvedNodesRef.current, edgesRef.current);
        }, 16);
      }
    }
  }, [nodes, resolveAbsolutePositions, edgeRouting, routeEdgesInWorker]);

  const lastRoutedEdgeKeyRef = useRef('');
  useEffect(() => {
    edgesRef.current = [...edges];
    if (edgeRouting && resolvedNodesRef.current.length > 0) {
      // Build fingerprint of edge connections (skip re-routing for selection-only changes)
      let edgeKey = '';
      for (let i = 0; i < edges.length; i++) {
        const e = edges[i];
        edgeKey += e.id + ':' + e.source + '>' + e.target + ';';
      }
      if (edgeKey !== lastRoutedEdgeKeyRef.current) {
        lastRoutedEdgeKeyRef.current = edgeKey;
        if (routeDebounceRef.current) clearTimeout(routeDebounceRef.current);
        routeDebounceRef.current = setTimeout(() => {
          routeEdgesInWorker(resolvedNodesRef.current, edgesRef.current);
        }, 16);
      } else {
        // Edges changed (e.g. selection) but connections are the same — just forward to canvas worker
        workerRef.current?.postMessage({ type: 'edges', data: { edges: [...edges] } });
      }
    } else {
      workerRef.current?.postMessage({ type: 'edges', data: { edges: [...edges] } });
    }
  }, [edges, edgeRouting, routeEdgesInWorker]);

  // Helpers
  const screenToWorld = useCallback((clientX, clientY) => {
    const wrap = wrapRef.current;
    if (!wrap) return { x: 0, y: 0 };
    const rect = wrap.getBoundingClientRect();
    const cam = cameraRef.current;
    return {
      x: (clientX - rect.left - cam.x) / cam.zoom,
      y: (clientY - rect.top - cam.y) / cam.zoom,
    };
  }, []);

  const findNodeAt = useCallback((wx, wy) => {
    const nds = nodesRef.current;
    for (let i = nds.length - 1; i >= 0; i--) {
      const n = nds[i];
      if (n.hidden) continue;
      const nw = n.width || DEFAULT_NODE_WIDTH;
      const nh = n.height || DEFAULT_NODE_HEIGHT;
      if (wx >= n.position.x && wx <= n.position.x + nw &&
          wy >= n.position.y && wy <= n.position.y + nh) return n;
    }
    return null;
  }, []);

  const resolveHandlePos = useCallback((handle, node) => {
    const nw = node.width || DEFAULT_NODE_WIDTH;
    const nh = node.height || DEFAULT_NODE_HEIGHT;
    if (handle.x !== undefined && handle.y !== undefined) {
      return { x: node.position.x + handle.x, y: node.position.y + handle.y };
    }
    const pos = handle.position || (handle.type === 'source' ? 'right' : 'left');
    switch (pos) {
      case 'top': return { x: node.position.x + nw / 2, y: node.position.y };
      case 'bottom': return { x: node.position.x + nw / 2, y: node.position.y + nh };
      case 'left': return { x: node.position.x, y: node.position.y + nh / 2 };
      case 'right': return { x: node.position.x + nw, y: node.position.y + nh / 2 };
      default: return { x: node.position.x + nw, y: node.position.y + nh / 2 };
    }
  }, []);

  const getNodeHandles = useCallback((node) => {
    const nw = node.width || DEFAULT_NODE_WIDTH;
    const nh = node.height || DEFAULT_NODE_HEIGHT;
    if (node.handles && node.handles.length > 0) {
      return node.handles.map((h) => {
        const pos = resolveHandlePos(h, node);
        return { id: h.id || null, type: h.type, x: pos.x, y: pos.y };
      });
    }
    return [
      { id: null, type: 'target', x: node.position.x, y: node.position.y + nh / 2 },
      { id: null, type: 'source', x: node.position.x + nw, y: node.position.y + nh / 2 },
    ];
  }, [resolveHandlePos]);

  const findHandleAt = useCallback((wx, wy) => {
    const nds = nodesRef.current;
    const cam = cameraRef.current;
    const hitRadius = Math.max(HANDLE_RADIUS, connectionRadius) / cam.zoom;
    for (let i = nds.length - 1; i >= 0; i--) {
      const n = nds[i];
      if (n.hidden) continue;
      const handles = getNodeHandles(n);
      for (const handle of handles) {
        if (Math.abs(wx - handle.x) < hitRadius && Math.abs(wy - handle.y) < hitRadius) {
          return { nodeId: n.id, handleId: handle.id, type: handle.type, x: handle.x, y: handle.y };
        }
      }
    }
    return null;
  }, [getNodeHandles]);

  // Find edge near a world point (for edge click/select)
  const findEdgeAt = useCallback((wx, wy) => {
    const cam = cameraRef.current;
    const hitDist = 8 / cam.zoom; // 8 screen pixels
    for (let i = edgesRef.current.length - 1; i >= 0; i--) {
      const edge = edgesRef.current[i];
      const srcNode = nodesRef.current.find((n) => n.id === edge.source);
      const tgtNode = nodesRef.current.find((n) => n.id === edge.target);
      if (!srcNode || !tgtNode) continue;

      const srcW = srcNode.width || DEFAULT_NODE_WIDTH;
      const srcH = srcNode.height || DEFAULT_NODE_HEIGHT;
      const tgtH = tgtNode.height || DEFAULT_NODE_HEIGHT;
      const x1 = srcNode.position.x + srcW;
      const y1 = srcNode.position.y + srcH / 2;
      const x2 = tgtNode.position.x;
      const y2 = tgtNode.position.y + tgtH / 2;

      // Simple distance to line segment
      const dist = distToSegment(wx, wy, x1, y1, x2, y2);
      if (dist < hitDist) return edge;
    }
    return null;
  }, []);

  // Initialize worker
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const rect = wrap.getBoundingClientRect();
    const resolvedDark = dark !== undefined ? dark : matchMedia('(prefers-color-scheme: dark)').matches;

    const initNodes = resolveAbsolutePositions(nodesRef.current);
    const initEdges = edgeRouting && initNodes.length > 0 && edgesRef.current.length > 0
      ? computeRoutedEdges(initNodes, edgesRef.current)
      : edgesRef.current;
    resolvedNodesRef.current = initNodes;

    const { worker } = getOrCreateWorker(canvas, {
      width: rect.width, height: rect.height,
      camera: cameraRef.current, cards: cardsRef.current,
      nodes: initNodes, edges: initEdges,
      dark: resolvedDark, gridSize,
    });

    worker.onmessage = (e) => {
      if (e.data.type === 'hud') onHudUpdateRef.current?.(e.data.data);
      if (e.data.type === 'ready') setCanvasReady(true);
      if (e.data.type === 'nodesProcessed') onNodesProcessedRef.current?.(e.data.data);
    };

    workerRef.current = worker;

    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      worker.postMessage({ type: 'resize', data: { width, height } });
    });
    ro.observe(wrap);

    let mq, onThemeChange;
    if (dark === undefined) {
      mq = matchMedia('(prefers-color-scheme: dark)');
      onThemeChange = (e) => worker.postMessage({ type: 'theme', data: { dark: e.matches } });
      mq.addEventListener('change', onThemeChange);
    }

    return () => {
      ro.disconnect();
      if (mq && onThemeChange) mq.removeEventListener('change', onThemeChange);
      workerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (dark !== undefined) workerRef.current?.postMessage({ type: 'theme', data: { dark } });
  }, [dark]);

  const sendCamera = useCallback((moveEvent = null) => {
    const cam = cameraRef.current;
    // Clamp to translateExtent if set
    if (translateExtent) {
      const wrap = wrapRef.current;
      if (wrap) {
        const rect = wrap.getBoundingClientRect();
        const minX = -translateExtent[1][0] * cam.zoom + rect.width;
        const minY = -translateExtent[1][1] * cam.zoom + rect.height;
        const maxX = -translateExtent[0][0] * cam.zoom;
        const maxY = -translateExtent[0][1] * cam.zoom;
        cam.x = Math.min(maxX, Math.max(minX, cam.x));
        cam.y = Math.min(maxY, Math.max(minY, cam.y));
      }
    }
    workerRef.current?.postMessage({ type: 'camera', data: { camera: { ...cam } } });
    const vp = { x: cam.x, y: cam.y, zoom: cam.zoom };
    setViewport(vp);
    refs.current.onMove?.(moveEvent, vp);
    for (const cb of viewportListeners) cb(vp);
  }, [viewportListeners, translateExtent]);

  const sendConnecting = useCallback(() => {
    const c = connectingRef.current;
    const end = connectEndRef.current;
    if (c && end) {
      if (edgeRouting) {
        // Route connection line in worker
        const router = getEdgeRouterWorker();
        const id = ++edgeRouterReqId;
        routeReqIdRef.current = id;
        const lightNodes = resolvedNodesRef.current.map(n => ({
          id: n.id, position: n.position, _absolutePosition: n._absolutePosition,
          width: n.width, height: n.height, measured: n.measured,
          handles: n.handles, hidden: n.hidden,
        }));
        router.postMessage({
          type: 'routeSingle', id,
          fromX: c.startPos.x, fromY: c.startPos.y,
          toX: end.x, toY: end.y,
          fromDir: c.sourceType === 'source' ? 'right' : 'left',
          toDir: 'left',
          nodes: lightNodes,
          excludeNodeIds: [c.sourceId],
        });
        // Also send unrouted immediately so the line shows without waiting
        workerRef.current?.postMessage({ type: 'connecting', data: { from: c.startPos, to: end, _routedPoints: null } });
      } else {
        workerRef.current?.postMessage({ type: 'connecting', data: { from: c.startPos, to: end, _routedPoints: null } });
      }
      setConnection({ source: c.sourceId, sourceHandle: c.sourceHandle, target: null, targetHandle: null });
    } else {
      workerRef.current?.postMessage({ type: 'connecting', data: null });
      setConnection(null);
    }
  }, [edgeRouting]);

  const sendSelectionBox = useCallback(() => {
    const box = selectionBoxRef.current;
    if (box) {
      workerRef.current?.postMessage({ type: 'selectionBox', data: box });
    } else {
      workerRef.current?.postMessage({ type: 'selectionBox', data: null });
    }
  }, []);

  // ── Pointer events ─────────────────────────────────────────────
  const onPointerDown = useCallback((e) => {
    const hasNodes = nodesRef.current.length > 0;
    const world = screenToWorld(e.clientX, e.clientY);
    const isMulti = multiKeyRef.current;

    // Handle hit (connection)
    if (hasNodes && nodesConnectable) {
      const handle = findHandleAt(world.x, world.y);
      // Click-to-connect: if we already have a pending click connection, try to complete it
      if (connectOnClick && clickConnectRef.current && handle) {
        const start = clickConnectRef.current;
        if (handle.nodeId !== start.nodeId) {
          const startedFromTarget = start.handleType === 'target';
          const conn = startedFromTarget
            ? { source: handle.nodeId, target: start.nodeId, sourceHandle: handle.handleId || null, targetHandle: start.handleId }
            : { source: start.nodeId, target: handle.nodeId, sourceHandle: start.handleId, targetHandle: handle.handleId || null };
          const valid = refs.current.isValidConnection ? refs.current.isValidConnection(conn) : true;
          if (valid) onConnectRef.current?.({ ...conn, ...defaultEdgeOptions });
        }
        clickConnectRef.current = null;
        return;
      }

      // In strict mode: only source handles can start connections
      // In loose mode: any handle can start a connection
      const canStartConnection = connectionMode === 'strict'
        ? handle && handle.type === 'source'
        : handle != null;
      if (canStartConnection) {
        // Click-to-connect mode: just store the handle, don't start drag
        if (connectOnClick) {
          clickConnectRef.current = { nodeId: handle.nodeId, handleId: handle.handleId || null, handleType: handle.type };
          refs.current.onConnectStart?.(e, { nodeId: handle.nodeId, handleId: handle.handleId, handleType: handle.type });
          return;
        }
        connectingRef.current = {
          sourceId: handle.nodeId,
          sourceHandle: handle.handleId || null,
          sourceType: handle.type,
          startPos: { x: handle.x, y: handle.y },
        };
        connectEndRef.current = { x: world.x, y: world.y };
        wrapRef.current?.setPointerCapture(e.pointerId);
        refs.current.onConnectStart?.(e, { nodeId: handle.nodeId, handleId: handle.handleId, handleType: handle.type });
        sendConnecting();
        return;
      }
    }

    // Node hit
    if (hasNodes) {
      const node = findNodeAt(world.x, world.y);
      if (node) {
        // Selection logic
        if (onNodesChangeRef.current && elementsSelectable) {
          const changes = [];
          if (isMulti) {
            // Toggle this node
            changes.push({ id: node.id, type: 'select', selected: !node.selected });
          } else {
            if (!node.selected) {
              // Select only this, deselect others
              for (const n of nodesRef.current) {
                if (n.id === node.id) changes.push({ id: n.id, type: 'select', selected: true });
                else if (n.selected) changes.push({ id: n.id, type: 'select', selected: false });
              }
              // Deselect edges
              if (onEdgesChangeRef.current) {
                const edgeChanges = edgesRef.current.filter((e) => e.selected).map((e) => ({ id: e.id, type: 'select', selected: false }));
                if (edgeChanges.length) onEdgesChangeRef.current(edgeChanges);
              }
            }
          }
          if (changes.length) {
            onNodesChangeRef.current(changes);
            // Elevate selected node to top z-index by moving to end of array
            if (elevateNodesOnSelect && !isMulti) {
              const idx = nodesRef.current.findIndex((n) => n.id === node.id);
              if (idx >= 0 && idx < nodesRef.current.length - 1) {
                onNodesChangeRef.current([
                  { id: node.id, type: 'remove' },
                  { type: 'add', item: { ...nodesRef.current[idx], selected: true } },
                ]);
              }
            }
            notifySelectionChange();
          }
        }

        onNodeClickRef.current?.(e, node);

        // Start drag (drag all selected if this node is selected)
        if (nodesDraggable) {
          // Only multi-drag when Shift is held AND node was already selected
          // (nodesRef is stale after onNodesChange — can't trust .selected on other nodes)
          const isMultiDrag = isMulti && node.selected;
          dragNodeRef.current = {
            id: node.id,
            startPos: { ...node.position },
            startMouse: { x: world.x, y: world.y },
            selectedStarts: isMultiDrag
              ? nodesRef.current.filter((n) => n.selected && n.id !== node.id)
                  .map((n) => ({ id: n.id, startPos: { ...n.position } }))
              : [],
          };
          wrapRef.current?.setPointerCapture(e.pointerId);
          onNodeDragStartRef.current?.(e, node);
          if (onNodesChangeRef.current) {
            const dragChanges = [{ id: node.id, type: 'position', dragging: true }];
            for (const s of dragNodeRef.current.selectedStarts) {
              dragChanges.push({ id: s.id, type: 'position', dragging: true });
            }
            onNodesChangeRef.current(dragChanges);
          }
        }
        return;
      }
    }

    // Edge hit
    if (edgesRef.current.length > 0 && elementsSelectable) {
      const edge = findEdgeAt(world.x, world.y);
      if (edge) {
        if (onEdgesChangeRef.current) {
          const changes = [];
          if (isMulti) {
            changes.push({ id: edge.id, type: 'select', selected: !edge.selected });
          } else {
            for (const e of edgesRef.current) {
              if (e.id === edge.id) changes.push({ id: e.id, type: 'select', selected: true });
              else if (e.selected) changes.push({ id: e.id, type: 'select', selected: false });
            }
            // Deselect nodes
            if (onNodesChangeRef.current) {
              const nodeChanges = nodesRef.current.filter((n) => n.selected).map((n) => ({ id: n.id, type: 'select', selected: false }));
              if (nodeChanges.length) onNodesChangeRef.current(nodeChanges);
            }
          }
          if (changes.length) {
            onEdgesChangeRef.current(changes);
            notifySelectionChange();
          }
        }
        onEdgeClickRef.current?.(e, edge);
        return;
      }
    }

    // Background click — deselect all or start selection box
    if (!isMulti) {
      const nodeChanges = nodesRef.current.filter((n) => n.selected).map((n) => ({ id: n.id, type: 'select', selected: false }));
      const edgeChanges = edgesRef.current.filter((e) => e.selected).map((e) => ({ id: e.id, type: 'select', selected: false }));
      if (nodeChanges.length && onNodesChangeRef.current) onNodesChangeRef.current(nodeChanges);
      if (edgeChanges.length && onEdgesChangeRef.current) onEdgesChangeRef.current(edgeChanges);
      if (nodeChanges.length || edgeChanges.length) notifySelectionChange();
    }

    onPaneClickRef.current?.(e);

    if (selectionOnDrag || isMulti) {
      // Start selection box
      selectionBoxRef.current = { startWorld: { ...world }, endWorld: { ...world } };
      wrapRef.current?.setPointerCapture(e.pointerId);
      sendSelectionBox();
      return;
    }

    // Canvas pan
    draggingRef.current = true;
    lastPtRef.current = { x: e.clientX, y: e.clientY };
    wrapRef.current?.classList.add('dragging');
    wrapRef.current?.setPointerCapture(e.pointerId);
  }, [screenToWorld, findNodeAt, findHandleAt, findEdgeAt, nodesDraggable, nodesConnectable, elementsSelectable, selectionOnDrag, sendConnecting, sendSelectionBox, notifySelectionChange]);

  const onPointerMove = useCallback((e) => {
    // Connection drag
    if (connectingRef.current) {
      connectEndRef.current = screenToWorld(e.clientX, e.clientY);
      sendConnecting();
      // Auto-pan when connecting near canvas edge
      if (autoPanOnConnect) {
        const wrap = wrapRef.current;
        if (wrap) {
          const rect = wrap.getBoundingClientRect();
          const edgeZone = 40;
          const mx = e.clientX - rect.left;
          const my = e.clientY - rect.top;
          let panX = 0, panY = 0;
          if (mx < edgeZone) panX = autoPanSpeed;
          else if (mx > rect.width - edgeZone) panX = -autoPanSpeed;
          if (my < edgeZone) panY = autoPanSpeed;
          else if (my > rect.height - edgeZone) panY = -autoPanSpeed;
          if (panX || panY) {
            cameraRef.current.x += panX;
            cameraRef.current.y += panY;
            sendCamera(e);
          }
        }
      }
      return;
    }

    // Selection box drag
    if (selectionBoxRef.current) {
      selectionBoxRef.current.endWorld = screenToWorld(e.clientX, e.clientY);
      sendSelectionBox();

      // Select nodes inside box
      const box = selectionBoxRef.current;
      const minX = Math.min(box.startWorld.x, box.endWorld.x);
      const minY = Math.min(box.startWorld.y, box.endWorld.y);
      const maxX = Math.max(box.startWorld.x, box.endWorld.x);
      const maxY = Math.max(box.startWorld.y, box.endWorld.y);

      if (onNodesChangeRef.current) {
        const changes = [];
        for (const n of nodesRef.current) {
          if (n.hidden) continue;
          const nw = n.width || DEFAULT_NODE_WIDTH;
          const nh = n.height || DEFAULT_NODE_HEIGHT;
          const inside = selectionMode === 'full'
            ? (n.position.x >= minX && n.position.x + nw <= maxX &&
               n.position.y >= minY && n.position.y + nh <= maxY)
            : (n.position.x + nw > minX && n.position.x < maxX &&
               n.position.y + nh > minY && n.position.y < maxY);
          if (inside !== !!n.selected) {
            changes.push({ id: n.id, type: 'select', selected: inside });
          }
        }
        if (changes.length) onNodesChangeRef.current(changes);
      }
      return;
    }

    // Node drag (multi-drag support + snap-to-grid + nodeExtent clamping)
    if (dragNodeRef.current) {
      const world = screenToWorld(e.clientX, e.clientY);
      const drag = dragNodeRef.current;
      const dx = world.x - drag.startMouse.x;
      const dy = world.y - drag.startMouse.y;

      let pos = { x: drag.startPos.x + dx, y: drag.startPos.y + dy };
      if (snapToGrid) pos = snapPos(pos, snapGrid);
      if (nodeExtent) pos = clampPosition(pos, nodeExtent);

      // Build position updates for dragged nodes
      const posUpdates = [{ id: drag.id, position: pos }];
      for (const s of drag.selectedStarts) {
        let sPos = { x: s.startPos.x + dx, y: s.startPos.y + dy };
        if (snapToGrid) sPos = snapPos(sPos, snapGrid);
        if (nodeExtent) sPos = clampPosition(sPos, nodeExtent);
        posUpdates.push({ id: s.id, position: sPos });
      }

      // Update nodesRef in-place (no React state update — avoids 5000-node reconciliation)
      const workerUpdates = [];
      for (const u of posUpdates) {
        const n = nodesRef.current.find(nd => nd.id === u.id);
        if (n) {
          n.position = u.position;
          n.dragging = true;
          workerUpdates.push({
            id: u.id,
            position: u.position,
            _absolutePosition: u.position,
            width: n.width,
            height: n.height,
            dragging: true,
            selected: n.selected,
          });
        }
      }

      // Send only changed positions to canvas worker
      workerRef.current?.postMessage({ type: 'nodePositions', data: { updates: workerUpdates } });

      // Auto-pan when dragging near canvas edge
      if (autoPanOnNodeDrag) {
        const wrap = wrapRef.current;
        if (wrap) {
          const rect = wrap.getBoundingClientRect();
          const edgeZone = 40;
          const mx = e.clientX - rect.left;
          const my = e.clientY - rect.top;
          let panX = 0, panY = 0;
          if (mx < edgeZone) panX = autoPanSpeed;
          else if (mx > rect.width - edgeZone) panX = -autoPanSpeed;
          if (my < edgeZone) panY = autoPanSpeed;
          else if (my > rect.height - edgeZone) panY = -autoPanSpeed;
          if (panX || panY) {
            cameraRef.current.x += panX;
            cameraRef.current.y += panY;
            sendCamera(e);
          }
        }
      }

      const node = nodesRef.current.find((n) => n.id === drag.id);
      if (node) onNodeDragRef.current?.(e, node);
      return;
    }

    // Canvas pan
    if (!draggingRef.current) return;
    const cam = cameraRef.current;
    cam.x += e.clientX - lastPtRef.current.x;
    cam.y += e.clientY - lastPtRef.current.y;
    lastPtRef.current = { x: e.clientX, y: e.clientY };
    sendCamera();
  }, [sendCamera, screenToWorld, sendConnecting, sendSelectionBox]);

  const onPointerUp = useCallback((e) => {
    // Connection end
    if (connectingRef.current) {
      const world = screenToWorld(e.clientX, e.clientY);
      const handle = findHandleAt(world.x, world.y);
      // In loose mode, allow connecting to any handle on a different node
      // In strict mode, only target handles can receive connections
      const canEnd = handle && handle.nodeId !== connectingRef.current.sourceId &&
        (connectionMode === 'loose' || handle.type === 'target');
      if (canEnd) {
        // If source started from a target handle (loose mode), swap
        const startedFromTarget = connectingRef.current.sourceType === 'target';
        const conn = startedFromTarget
          ? {
              source: handle.nodeId,
              target: connectingRef.current.sourceId,
              sourceHandle: handle.handleId || null,
              targetHandle: connectingRef.current.sourceHandle,
            }
          : {
              source: connectingRef.current.sourceId,
              target: handle.nodeId,
              sourceHandle: connectingRef.current.sourceHandle,
              targetHandle: handle.handleId || null,
            };
        // Validate connection
        const valid = refs.current.isValidConnection ? refs.current.isValidConnection(conn) : true;
        if (valid) {
          onConnectRef.current?.({ ...conn, ...defaultEdgeOptions });
        }
      }
      refs.current.onConnectEnd?.(e.nativeEvent || e);
      connectingRef.current = null;
      connectEndRef.current = null;
      sendConnecting();
      return;
    }

    // Selection box end
    if (selectionBoxRef.current) {
      selectionBoxRef.current = null;
      sendSelectionBox();
      notifySelectionChange();
      return;
    }

    // Node drag end — commit final positions to React state
    if (dragNodeRef.current) {
      const drag = dragNodeRef.current;
      dragNodeRef.current = null;
      if (onNodesChangeRef.current) {
        // Send final positions from nodesRef (updated in-place during drag)
        const dragNode = nodesRef.current.find(n => n.id === drag.id);
        const changes = [{
          id: drag.id,
          type: 'position',
          position: dragNode ? { ...dragNode.position } : undefined,
          dragging: false,
        }];
        for (const s of drag.selectedStarts) {
          const sn = nodesRef.current.find(n => n.id === s.id);
          changes.push({
            id: s.id,
            type: 'position',
            position: sn ? { ...sn.position } : undefined,
            dragging: false,
          });
        }
        onNodesChangeRef.current(changes);
      }
      const node = nodesRef.current.find((n) => n.id === drag.id);
      if (node) onNodeDragStopRef.current?.(e, node);
      return;
    }

    // Canvas pan end
    draggingRef.current = false;
    wrapRef.current?.classList.remove('dragging');
  }, [screenToWorld, findHandleAt, sendConnecting, sendSelectionBox, notifySelectionChange]);

  // Wheel: zoom or pan-on-scroll
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const onWheel = (e) => {
      if (preventScrolling) e.preventDefault();
      const cam = cameraRef.current;

      if (panOnScroll || panKeyRef.current) {
        // Pan mode
        const speed = panOnScrollSpeed;
        if (panOnScrollMode === 'horizontal') {
          cam.x -= e.deltaY * speed;
        } else if (panOnScrollMode === 'vertical') {
          cam.y -= e.deltaY * speed;
        } else {
          cam.x -= e.deltaX * speed;
          cam.y -= e.deltaY * speed;
        }
        sendCamera(e);
        return;
      }

      if (!zoomOnScroll) return;

      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      const rect = wrap.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      cam.x = mx - (mx - cam.x) * factor;
      cam.y = my - (my - cam.y) * factor;
      cam.zoom = Math.min(zoomMax, Math.max(zoomMin, cam.zoom * factor));
      sendCamera(e);
    };
    wrap.addEventListener('wheel', onWheel, { passive: !preventScrolling });
    return () => wrap.removeEventListener('wheel', onWheel);
  }, [sendCamera, zoomMin, zoomMax, panOnScroll, panOnScrollMode, panOnScrollSpeed, zoomOnScroll, preventScrolling]);

  // Pinch-to-zoom (touch)
  useEffect(() => {
    if (!zoomOnPinch) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    let lastPinchDist = 0;
    let pinchCenter = null;

    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastPinchDist = Math.hypot(dx, dy);
        const rect = wrap.getBoundingClientRect();
        pinchCenter = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top,
        };
        e.preventDefault();
      }
    };
    const onTouchMove = (e) => {
      if (e.touches.length === 2 && lastPinchDist > 0) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const factor = dist / lastPinchDist;
        lastPinchDist = dist;

        const cam = cameraRef.current;
        const mx = pinchCenter.x;
        const my = pinchCenter.y;
        cam.x = mx - (mx - cam.x) * factor;
        cam.y = my - (my - cam.y) * factor;
        cam.zoom = Math.min(zoomMax, Math.max(zoomMin, cam.zoom * factor));
        sendCamera(e);
      }
    };
    const onTouchEnd = () => { lastPinchDist = 0; pinchCenter = null; };

    wrap.addEventListener('touchstart', onTouchStart, { passive: false });
    wrap.addEventListener('touchmove', onTouchMove, { passive: false });
    wrap.addEventListener('touchend', onTouchEnd);
    return () => {
      wrap.removeEventListener('touchstart', onTouchStart);
      wrap.removeEventListener('touchmove', onTouchMove);
      wrap.removeEventListener('touchend', onTouchEnd);
    };
  }, [zoomOnPinch, sendCamera, zoomMin, zoomMax]);

  // Double-click to zoom
  useEffect(() => {
    if (!zoomOnDoubleClick) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const onDblClick = (e) => {
      // Don't zoom if clicking on a node area — check if any node is under cursor
      const world = screenToWorld(e.clientX, e.clientY);
      if (findNodeAt(world.x, world.y)) {
        refs.current.onNodeDoubleClick?.(e, findNodeAt(world.x, world.y));
        return;
      }
      const edge = findEdgeAt(world.x, world.y);
      if (edge) {
        refs.current.onEdgeDoubleClick?.(e, edge);
        return;
      }
      const factor = 1.5;
      const rect = wrap.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const cam = cameraRef.current;
      cam.x = mx - (mx - cam.x) * factor;
      cam.y = my - (my - cam.y) * factor;
      cam.zoom = Math.min(zoomMax, Math.max(zoomMin, cam.zoom * factor));
      sendCamera(e);
    };
    wrap.addEventListener('dblclick', onDblClick);
    return () => wrap.removeEventListener('dblclick', onDblClick);
  }, [zoomOnDoubleClick, sendCamera, zoomMin, zoomMax, screenToWorld, findNodeAt, findEdgeAt]);

  // Context menu
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const onCtxMenu = (e) => {
      const world = screenToWorld(e.clientX, e.clientY);
      const node = findNodeAt(world.x, world.y);
      if (node) {
        refs.current.onNodeContextMenu?.(e, node);
        return;
      }
      const edge = findEdgeAt(world.x, world.y);
      if (edge) {
        refs.current.onEdgeContextMenu?.(e, edge);
        return;
      }
      refs.current.onPaneContextMenu?.(e);
    };
    wrap.addEventListener('contextmenu', onCtxMenu);
    return () => wrap.removeEventListener('contextmenu', onCtxMenu);
  }, [screenToWorld, findNodeAt, findEdgeAt]);

  // Mouse enter/move/leave on wrapper (for pane events + node/edge hover)
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    let lastHoverNode = null;
    let lastHoverEdge = null;

    const onMouseMove = (e) => {
      refs.current.onPaneMouseMove?.(e);
      const world = screenToWorld(e.clientX, e.clientY);
      const node = findNodeAt(world.x, world.y);
      if (node !== lastHoverNode) {
        if (lastHoverNode) refs.current.onNodeMouseLeave?.(e, lastHoverNode);
        if (node) refs.current.onNodeMouseEnter?.(e, node);
        lastHoverNode = node;
      }
      if (node) refs.current.onNodeMouseMove?.(e, node);

      if (!node) {
        const edge = findEdgeAt(world.x, world.y);
        if (edge !== lastHoverEdge) {
          if (lastHoverEdge) refs.current.onEdgeMouseLeave?.(e, lastHoverEdge);
          if (edge) refs.current.onEdgeMouseEnter?.(e, edge);
          lastHoverEdge = edge;
        }
        if (edge) refs.current.onEdgeMouseMove?.(e, edge);
      }
    };
    const onMouseEnter = (e) => refs.current.onPaneMouseEnter?.(e);
    const onMouseLeave = (e) => {
      refs.current.onPaneMouseLeave?.(e);
      if (lastHoverNode) { refs.current.onNodeMouseLeave?.(e, lastHoverNode); lastHoverNode = null; }
      if (lastHoverEdge) { refs.current.onEdgeMouseLeave?.(e, lastHoverEdge); lastHoverEdge = null; }
    };

    wrap.addEventListener('mousemove', onMouseMove);
    wrap.addEventListener('mouseenter', onMouseEnter);
    wrap.addEventListener('mouseleave', onMouseLeave);
    return () => {
      wrap.removeEventListener('mousemove', onMouseMove);
      wrap.removeEventListener('mouseenter', onMouseEnter);
      wrap.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [screenToWorld, findNodeAt, findEdgeAt]);

  // Delete key (configurable)
  useEffect(() => {
    const delKeys = Array.isArray(deleteKeyCode) ? deleteKeyCode : [deleteKeyCode];
    const onKeyDown = async (e) => {
      if (delKeys.includes(e.key)) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
        const selectedNodes = nodesRef.current.filter((n) => n.selected);
        const selectedEdges = edgesRef.current.filter((ed) => ed.selected);
        if (!selectedNodes.length && !selectedEdges.length) return;

        // onBeforeDelete can cancel
        if (refs.current.onBeforeDelete) {
          const ok = await refs.current.onBeforeDelete({ nodes: selectedNodes, edges: selectedEdges });
          if (!ok) return;
        }

        const selectedNodeIds = new Set(selectedNodes.map((n) => n.id));
        if (selectedNodes.length && onNodesChangeRef.current) {
          onNodesChangeRef.current(selectedNodes.map((n) => ({ id: n.id, type: 'remove' })));
          if (onEdgesChangeRef.current) {
            const connected = edgesRef.current.filter((ed) => selectedNodeIds.has(ed.source) || selectedNodeIds.has(ed.target));
            if (connected.length) onEdgesChangeRef.current(connected.map((ed) => ({ id: ed.id, type: 'remove' })));
          }
        }
        if (selectedEdges.length && onEdgesChangeRef.current) {
          onEdgesChangeRef.current(selectedEdges.map((ed) => ({ id: ed.id, type: 'remove' })));
        }

        refs.current.onDelete?.({ nodes: selectedNodes, edges: selectedEdges });
      }
      // Select all with Ctrl/Cmd+A
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        if (onNodesChangeRef.current) {
          const changes = nodesRef.current.filter((n) => !n.selected).map((n) => ({ id: n.id, type: 'select', selected: true }));
          if (changes.length) onNodesChangeRef.current(changes);
        }
        if (onEdgesChangeRef.current) {
          const changes = edgesRef.current.filter((ed) => !ed.selected).map((ed) => ({ id: ed.id, type: 'select', selected: true }));
          if (changes.length) onEdgesChangeRef.current(changes);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [deleteKeyCode]);

  // fitView on init + onInit callback
  const initCalledRef = useRef(false);
  useEffect(() => {
    if (initCalledRef.current) return;
    if (!workerRef.current) return;
    initCalledRef.current = true;

    if (fitViewOnInit && nodesRef.current.length > 0) {
      const wrap = wrapRef.current;
      if (wrap) {
        const rect = wrap.getBoundingClientRect();
        const padding = fitViewOptions?.padding ?? 0.1;
        const bounds = getNodesBounds(nodesRef.current);
        const vp = getViewportForBounds(bounds, rect.width, rect.height, padding);
        if (fitViewOptions?.maxZoom) vp.zoom = Math.min(vp.zoom, fitViewOptions.maxZoom);
        if (fitViewOptions?.minZoom) vp.zoom = Math.max(vp.zoom, fitViewOptions.minZoom);
        cameraRef.current = vp;
        sendCamera();
      }
    }

    refs.current.onInit?.({
      getNodes: () => [...nodesRef.current],
      getEdges: () => [...edgesRef.current],
      getViewport: () => ({ ...cameraRef.current }),
      fitView: (opts = {}) => {
        const wrap = wrapRef.current;
        if (!wrap || !nodesRef.current.length) return;
        const rect = wrap.getBoundingClientRect();
        const bounds = getNodesBounds(nodesRef.current);
        const vp = getViewportForBounds(bounds, rect.width, rect.height, opts.padding ?? 0.1);
        cameraRef.current = vp;
        sendCamera();
      },
    });
  });

  // Public methods
  const resetView = useCallback(() => {
    cameraRef.current = { ...initialCamera };
    sendCamera();
  }, [sendCamera, initialCamera]);

  const addCard = useCallback((card) => {
    if (card) {
      cardsRef.current.push(card);
    } else {
      const cam = cameraRef.current;
      const wrap = wrapRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      const wx = Math.round(-cam.x / cam.zoom + rect.width / 2 / cam.zoom);
      const wy = Math.round(-cam.y / cam.zoom + rect.height / 2 / cam.zoom);
      cardsRef.current.push({
        x: wx - 80, y: wy - 45, w: 160, h: 90,
        title: 'Note ' + (cardsRef.current.length + 1),
        body: 'Added at viewport center',
      });
    }
    workerRef.current?.postMessage({ type: 'cards', data: { cards: [...cardsRef.current] } });
  }, []);

  const addNode = useCallback((node) => {
    if (!node.id) node.id = 'node-' + Date.now();
    if (!node.position) {
      const cam = cameraRef.current;
      const wrap = wrapRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      node.position = {
        x: Math.round(-cam.x / cam.zoom + rect.width / 2 / cam.zoom) - DEFAULT_NODE_WIDTH / 2,
        y: Math.round(-cam.y / cam.zoom + rect.height / 2 / cam.zoom) - DEFAULT_NODE_HEIGHT / 2,
      };
    }
    if (!node.data) node.data = { label: node.id };
    if (onNodesChangeRef.current) onNodesChangeRef.current([{ type: 'add', item: node }]);
  }, []);

  const getCamera = useCallback(() => ({ ...cameraRef.current }), []);

  const setCamera = useCallback((cam) => {
    cameraRef.current = { ...cameraRef.current, ...cam };
    sendCamera();
  }, [sendCamera]);

  const screenToFlowPosition = useCallback((clientPos) => screenToWorld(clientPos.x, clientPos.y), [screenToWorld]);

  // Compute routed edges for React-rendered custom edge components.
  // This still runs on main thread (needed synchronously for React render)
  // but skips during drag — canvas worker handles visual updates via the
  // off-thread edge router. React edges catch up when drag ends.
  const routedEdgesCache = useRef(edges);
  const routedEdgesForReact = useMemo(() => {
    if (!edgeRouting || !nodes.length || !edges.length) return edges;
    const isDragging = nodes.some(n => n.dragging);
    if (isDragging) return routedEdgesCache.current;
    const resolved = resolveAbsolutePositions(nodes);
    const routed = computeRoutedEdges(resolved, edges);
    routedEdgesCache.current = routed;
    return routed;
  }, [nodes, edges, edgeRouting, resolveAbsolutePositions]);

  // Store object shared via context
  const store = useMemo(() => ({
    wrapRef, canvasRef, workerRef, cameraRef, nodesRef, edgesRef,
    onNodesChangeRef, onEdgesChangeRef,
    sendCamera, screenToWorld,
    viewportListeners, selectionListeners,
    zoomMin, zoomMax, snapToGrid, snapGrid, nodeExtent,
    defaultEdgeOptions, edgeRouting, resolvedNodesRef,
    get nodes() { return nodes; },
    get edges() { return edges; },
    get routedEdges() { return routedEdgesForReact; },
    get viewport() { return viewport; },
    get connection() { return connection; },
  }), [nodes, edges, routedEdgesForReact, viewport, connection, sendCamera, screenToWorld, viewportListeners, selectionListeners, zoomMin, zoomMax, snapToGrid, snapGrid, nodeExtent, defaultEdgeOptions, edgeRouting]);

  return {
    wrapRef, canvasRef, canvasReady,
    onPointerDown, onPointerMove, onPointerUp,
    resetView, addCard, addNode,
    getCamera, setCamera, screenToFlowPosition,
    store,
  };
}

// Distance from point to line segment
function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}
