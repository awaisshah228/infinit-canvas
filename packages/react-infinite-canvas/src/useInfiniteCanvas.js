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

const DEFAULT_NODE_WIDTH = 160;
const DEFAULT_NODE_HEIGHT = 60;
const HANDLE_RADIUS = 10;

export default function useInfiniteCanvas({
  cards = [],
  nodes = [],
  edges = [],
  onHudUpdate,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onNodeDragStart,
  onNodeDrag,
  onNodeDragStop,
  onEdgeClick,
  onPaneClick,
  onSelectionChange,
  dark,
  gridSize = 40,
  zoomMin = 0.1,
  zoomMax = 4,
  initialCamera = { x: 0, y: 0, zoom: 1 },
  nodesDraggable = true,
  nodesConnectable = true,
  elementsSelectable = true,
  multiSelectionKeyCode = 'Shift',
  selectionOnDrag = false,
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
  const onHudUpdateRef = useRef(onHudUpdate);

  // Node interaction state
  const dragNodeRef = useRef(null);
  const connectingRef = useRef(null);
  const connectEndRef = useRef(null);

  // Selection box state
  const selectionBoxRef = useRef(null); // { startWorld, endWorld }
  const multiKeyRef = useRef(false);

  // Viewport and connection state for hooks
  const [viewport, setViewport] = useState({ x: initialCamera.x, y: initialCamera.y, zoom: initialCamera.zoom });
  const [connection, setConnection] = useState(null);

  // Listeners for viewport/selection change hooks
  const viewportListeners = useMemo(() => new Set(), []);
  const selectionListeners = useMemo(() => new Set(), []);

  // Callback refs
  const onNodesChangeRef = useRef(onNodesChange);
  const onEdgesChangeRef = useRef(onEdgesChange);
  const onConnectRef = useRef(onConnect);
  const onNodeClickRef = useRef(onNodeClick);
  const onNodeDragStartRef = useRef(onNodeDragStart);
  const onNodeDragRef = useRef(onNodeDrag);
  const onNodeDragStopRef = useRef(onNodeDragStop);
  const onEdgeClickRef = useRef(onEdgeClick);
  const onPaneClickRef = useRef(onPaneClick);
  const onSelectionChangeRef = useRef(onSelectionChange);

  useEffect(() => { onHudUpdateRef.current = onHudUpdate; }, [onHudUpdate]);
  useEffect(() => { onNodesChangeRef.current = onNodesChange; }, [onNodesChange]);
  useEffect(() => { onEdgesChangeRef.current = onEdgesChange; }, [onEdgesChange]);
  useEffect(() => { onConnectRef.current = onConnect; }, [onConnect]);
  useEffect(() => { onNodeClickRef.current = onNodeClick; }, [onNodeClick]);
  useEffect(() => { onNodeDragStartRef.current = onNodeDragStart; }, [onNodeDragStart]);
  useEffect(() => { onNodeDragRef.current = onNodeDrag; }, [onNodeDrag]);
  useEffect(() => { onNodeDragStopRef.current = onNodeDragStop; }, [onNodeDragStop]);
  useEffect(() => { onEdgeClickRef.current = onEdgeClick; }, [onEdgeClick]);
  useEffect(() => { onPaneClickRef.current = onPaneClick; }, [onPaneClick]);
  useEffect(() => { onSelectionChangeRef.current = onSelectionChange; }, [onSelectionChange]);

  // Track multi-select key
  useEffect(() => {
    const down = (e) => { if (e.key === multiSelectionKeyCode) multiKeyRef.current = true; };
    const up = (e) => { if (e.key === multiSelectionKeyCode) multiKeyRef.current = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [multiSelectionKeyCode]);

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

  useEffect(() => {
    nodesRef.current = [...nodes];
    workerRef.current?.postMessage({ type: 'nodes', data: { nodes: [...nodes] } });
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = [...edges];
    workerRef.current?.postMessage({ type: 'edges', data: { edges: [...edges] } });
  }, [edges]);

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
    const hitRadius = HANDLE_RADIUS / cam.zoom;
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

    const { worker } = getOrCreateWorker(canvas, {
      width: rect.width, height: rect.height,
      camera: cameraRef.current, cards: cardsRef.current,
      nodes: nodesRef.current, edges: edgesRef.current,
      dark: resolvedDark, gridSize,
    });

    worker.onmessage = (e) => {
      if (e.data.type === 'hud') onHudUpdateRef.current?.(e.data.data);
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

  const sendCamera = useCallback(() => {
    const cam = cameraRef.current;
    workerRef.current?.postMessage({ type: 'camera', data: { camera: { ...cam } } });
    const vp = { x: cam.x, y: cam.y, zoom: cam.zoom };
    setViewport(vp);
    for (const cb of viewportListeners) cb(vp);
  }, [viewportListeners]);

  const sendConnecting = useCallback(() => {
    const c = connectingRef.current;
    const end = connectEndRef.current;
    if (c && end) {
      workerRef.current?.postMessage({ type: 'connecting', data: { from: c.startPos, to: end } });
      setConnection({ source: c.sourceId, sourceHandle: c.sourceHandle, target: null, targetHandle: null });
    } else {
      workerRef.current?.postMessage({ type: 'connecting', data: null });
      setConnection(null);
    }
  }, []);

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
      if (handle && handle.type === 'source') {
        connectingRef.current = {
          sourceId: handle.nodeId,
          sourceHandle: handle.handleId || null,
          startPos: { x: handle.x, y: handle.y },
        };
        connectEndRef.current = { x: world.x, y: world.y };
        wrapRef.current?.setPointerCapture(e.pointerId);
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
            notifySelectionChange();
          }
        }

        onNodeClickRef.current?.(e, node);

        // Start drag (drag all selected if this node is selected)
        if (nodesDraggable) {
          dragNodeRef.current = {
            id: node.id,
            startPos: { ...node.position },
            startMouse: { x: world.x, y: world.y },
            // Store start positions of all selected nodes for multi-drag
            selectedStarts: nodesRef.current.filter((n) => n.selected && n.id !== node.id)
              .map((n) => ({ id: n.id, startPos: { ...n.position } })),
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
          const inside = n.position.x + nw > minX && n.position.x < maxX &&
                         n.position.y + nh > minY && n.position.y < maxY;
          if (inside !== !!n.selected) {
            changes.push({ id: n.id, type: 'select', selected: inside });
          }
        }
        if (changes.length) onNodesChangeRef.current(changes);
      }
      return;
    }

    // Node drag (multi-drag support)
    if (dragNodeRef.current) {
      const world = screenToWorld(e.clientX, e.clientY);
      const drag = dragNodeRef.current;
      const dx = world.x - drag.startMouse.x;
      const dy = world.y - drag.startMouse.y;

      if (onNodesChangeRef.current) {
        const changes = [
          { id: drag.id, type: 'position', position: { x: drag.startPos.x + dx, y: drag.startPos.y + dy }, dragging: true },
        ];
        for (const s of drag.selectedStarts) {
          changes.push({ id: s.id, type: 'position', position: { x: s.startPos.x + dx, y: s.startPos.y + dy }, dragging: true });
        }
        onNodesChangeRef.current(changes);
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
      if (handle && handle.type === 'target' && handle.nodeId !== connectingRef.current.sourceId) {
        onConnectRef.current?.({
          source: connectingRef.current.sourceId,
          target: handle.nodeId,
          sourceHandle: connectingRef.current.sourceHandle,
          targetHandle: handle.handleId || null,
        });
      }
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

    // Node drag end
    if (dragNodeRef.current) {
      const drag = dragNodeRef.current;
      dragNodeRef.current = null;
      if (onNodesChangeRef.current) {
        const changes = [{ id: drag.id, type: 'position', dragging: false }];
        for (const s of drag.selectedStarts) {
          changes.push({ id: s.id, type: 'position', dragging: false });
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

  // Zoom
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const onWheel = (e) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      const rect = wrap.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const cam = cameraRef.current;
      cam.x = mx - (mx - cam.x) * factor;
      cam.y = my - (my - cam.y) * factor;
      cam.zoom = Math.min(zoomMax, Math.max(zoomMin, cam.zoom * factor));
      sendCamera();
    };
    wrap.addEventListener('wheel', onWheel, { passive: false });
    return () => wrap.removeEventListener('wheel', onWheel);
  }, [sendCamera, zoomMin, zoomMax]);

  // Delete key
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
        const selectedNodes = nodesRef.current.filter((n) => n.selected);
        const selectedNodeIds = new Set(selectedNodes.map((n) => n.id));
        if (selectedNodes.length && onNodesChangeRef.current) {
          onNodesChangeRef.current(selectedNodes.map((n) => ({ id: n.id, type: 'remove' })));
          if (onEdgesChangeRef.current) {
            const connected = edgesRef.current.filter((e) => selectedNodeIds.has(e.source) || selectedNodeIds.has(e.target));
            if (connected.length) onEdgesChangeRef.current(connected.map((e) => ({ id: e.id, type: 'remove' })));
          }
        }
        const selectedEdges = edgesRef.current.filter((e) => e.selected);
        if (selectedEdges.length && onEdgesChangeRef.current) {
          onEdgesChangeRef.current(selectedEdges.map((e) => ({ id: e.id, type: 'remove' })));
        }
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
          const changes = edgesRef.current.filter((e) => !e.selected).map((e) => ({ id: e.id, type: 'select', selected: true }));
          if (changes.length) onEdgesChangeRef.current(changes);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

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

  // Store object shared via context
  const store = useMemo(() => ({
    wrapRef, canvasRef, workerRef, cameraRef, nodesRef, edgesRef,
    onNodesChangeRef, onEdgesChangeRef,
    sendCamera, screenToWorld,
    viewportListeners, selectionListeners,
    zoomMin, zoomMax,
    get nodes() { return nodes; },
    get edges() { return edges; },
    get viewport() { return viewport; },
    get connection() { return connection; },
  }), [nodes, edges, viewport, connection, sendCamera, screenToWorld, viewportListeners, selectionListeners, zoomMin, zoomMax]);

  return {
    wrapRef, canvasRef,
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
