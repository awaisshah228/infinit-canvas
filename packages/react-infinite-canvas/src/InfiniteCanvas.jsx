import { useState, useCallback, useRef, useMemo, useEffect, useContext } from 'react';
import useInfiniteCanvas from './useInfiniteCanvas.js';
import InfiniteCanvasContext, { createCanvasStore } from './context/InfiniteCanvasContext.js';
import NodeWrapper from './components/NodeWrapper/index.jsx';
import EdgeWrapper from './components/EdgeWrapper/index.jsx';
import SelectionBox from './components/SelectionBox/index.jsx';
import { DefaultNode } from './components/Nodes/DefaultNode.jsx';
import { InputNode } from './components/Nodes/InputNode.jsx';
import { OutputNode } from './components/Nodes/OutputNode.jsx';
import { GroupNode } from './components/Nodes/GroupNode.jsx';
import { BezierEdge } from './components/Edges/BezierEdge.jsx';
import { StraightEdge } from './components/Edges/StraightEdge.jsx';
import { SmoothStepEdge } from './components/Edges/SmoothStepEdge.jsx';
import { StepEdge } from './components/Edges/StepEdge.jsx';
import { SimpleBezierEdge } from './components/Edges/SimpleBezierEdge.jsx';

// Built-in types that users can opt into by setting node.type / edge.type.
// NOT auto-applied to nodes/edges without a type — those stay canvas-rendered.
const builtInNodeTypes = {
  input: InputNode,
  output: OutputNode,
  group: GroupNode,
};

const builtInEdgeTypes = {
  // smoothstep/step are handled by the canvas worker directly (not React SVG)
  bezier: BezierEdge,
  straight: StraightEdge,
  simplebezier: SimpleBezierEdge,
};

const DEFAULT_NODE_WIDTH = 160;
const DEFAULT_NODE_HEIGHT = 60;

// Ensure every node has `measured` dimensions so layout algorithms (dagre, elk, etc.)
// that rely on node.measured.width/height work correctly with canvas-rendered nodes.
// Skips allocation when all nodes already have measured — O(n) check only.
function ensureMeasured(nodeList) {
  let needsPatch = false;
  for (let i = 0; i < nodeList.length; i++) {
    const n = nodeList[i];
    if (!n.measured || n.measured.width == null || n.measured.height == null) {
      needsPatch = true;
      break;
    }
  }
  if (!needsPatch) return nodeList;
  return nodeList.map((n) => {
    if (n.measured?.width != null && n.measured?.height != null) return n;
    return { ...n, measured: { width: n.width || DEFAULT_NODE_WIDTH, height: n.height || DEFAULT_NODE_HEIGHT } };
  });
}

export default function InfiniteCanvas({
  // Data
  cards, nodes = [], edges = [],

  // Custom types
  nodeTypes,
  edgeTypes,
  // Canvas-rendered custom node bitmaps/configs
  canvasNodeTypes,
  // Max number of custom nodes rendered as full DOM elements (spatial + pinned + selected).
  // Remaining custom nodes render on canvas. Set 0 to disable DOM promotion entirely.
  domNodeLimit = 50,

  // Appearance
  dark, gridSize, width = '100%', height = '420px',
  className = '', style = {},

  // Zoom/Camera
  zoomMin, zoomMax, initialCamera,
  fitView: fitViewOnInit, fitViewOptions,

  // Node/Edge callbacks
  onNodesChange, onEdgesChange, onConnect,
  onConnectStart, onConnectEnd,
  onNodeClick, onNodeDoubleClick,
  onNodeMouseEnter, onNodeMouseMove, onNodeMouseLeave, onNodeContextMenu,
  onNodeDragStart, onNodeDrag, onNodeDragStop,
  onEdgeClick, onEdgeDoubleClick,
  onEdgeMouseEnter, onEdgeMouseMove, onEdgeMouseLeave, onEdgeContextMenu,
  onPaneClick, onPaneContextMenu,
  onPaneMouseEnter, onPaneMouseMove, onPaneMouseLeave,
  onSelectionChange,
  onInit, onMoveStart, onMove, onMoveEnd,
  onDelete, onBeforeDelete, onError,

  // Drag and drop
  onDragOver, onDrop, onDragEnter, onDragLeave,

  // Behavior

  nodesDraggable, nodesConnectable, elementsSelectable,
  multiSelectionKeyCode, selectionOnDrag, selectionMode,
  connectionMode, connectionRadius, connectOnClick,
  isValidConnection, defaultEdgeOptions,
  snapToGrid, snapGrid,
  deleteKeyCode, panActivationKeyCode,
  panOnScroll, panOnScrollMode, panOnScrollSpeed,
  zoomOnScroll, zoomOnDoubleClick, zoomOnPinch,
  preventScrolling, translateExtent, nodeExtent,
  autoPanOnNodeDrag, autoPanOnConnect, autoPanSpeed,
  edgesReconnectable, elevateNodesOnSelect, elevateEdgesOnSelect,
  noDragClassName, noPanClassName,

  // Selection drag events
  onSelectionDragStart, onSelectionDrag, onSelectionDragStop,

  // Edge routing (obstacle avoidance)
  edgeRouting = true,

  // HUD
  onHudUpdate, onNodesProcessed, showHud = true, showHint = true,
  hintText = 'Drag to pan \u00b7 Scroll to zoom',

  children,
  ...rest
}) {
  const [hud, setHud] = useState({ wx: 0, wy: 0, zoom: '1.00' });
  const edgeLabelContainerRef = useRef(null);
  const viewportPortalRef = useRef(null);

  const handleHudUpdate = useCallback(
    (data) => { setHud(data); onHudUpdate?.(data); },
    [onHudUpdate]
  );

  // Merge built-in types with user-provided types (user types override built-ins)
  const customNodeTypes = useMemo(() => ({ ...builtInNodeTypes, ...nodeTypes }), [nodeTypes]);
  const customEdgeTypes = useMemo(() => ({ ...builtInEdgeTypes, ...edgeTypes }), [edgeTypes]);

  // Nodes with guaranteed `measured` dimensions for layout algorithms
  const measuredNodes = useMemo(() => ensureMeasured(nodes), [nodes]);

  // ── Spatial DOM promotion ──────────────────────────────────────
  // Up to `domNodeLimit` custom nodes get full React DOM rendering.
  // Priority: pinned nodes > selected/dragging > nearest visible nodes.
  // Everything else renders on canvas (declarative config / bitmap / default box).
  const [pinnedNodeIds, setPinnedNodeIds] = useState(() => new Set());
  const pinnedRef = useRef(pinnedNodeIds);
  pinnedRef.current = pinnedNodeIds;

  const pinNode = useCallback((id) => {
    setPinnedNodeIds((prev) => { const next = new Set(prev); next.add(id); return next; });
  }, []);
  const unpinNode = useCallback((id) => {
    setPinnedNodeIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
  }, []);
  const togglePinNode = useCallback((id) => {
    setPinnedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // All custom-typed nodes (candidates for promotion)
  const allCustomNodes = useMemo(() => {
    return measuredNodes.filter((n) => n.type && customNodeTypes[n.type]);
  }, [measuredNodes, customNodeTypes]);

  const customEdges = useMemo(() => {
    return edges.filter((e) => e.type && customEdgeTypes[e.type]);
  }, [edges, customEdgeTypes]);

  // Immediate promoted set: pinned + selected (no spatial — baseStore not available yet).
  // Spatial promotion is added via RAF effect after baseStore is initialized.
  const [spatialIds, setSpatialIds] = useState(() => new Set());
  const prevPromotedRef = useRef(new Set());
  const prevSelDragRef = useRef(new Set());
  const initialPromotedRef = useRef(true);
  const immediatePromotedIds = useMemo(() => {
    const ids = new Set(spatialIds);
    for (const id of pinnedNodeIds) ids.add(id);
    // On initial render (spatialIds empty), promote all custom nodes so Handle
    // components mount and register handle positions before the first worker frame.
    // After spatial viewport check populates spatialIds, this falls back to normal.
    if (initialPromotedRef.current && spatialIds.size === 0) {
      for (const n of allCustomNodes) ids.add(n.id);
    } else {
      initialPromotedRef.current = false;
    }
    const selDrag = new Set();
    for (const n of allCustomNodes) {
      if (n.selected || n.dragging) {
        ids.add(n.id);
        selDrag.add(n.id);
      }
    }
    // Retain nodes that were promoted via selection/dragging in the previous
    // render for one extra cycle.  This prevents unmount/remount jitter when a
    // node is deselected — the spatial useEffect gets a chance to re-add the
    // node to spatialIds before the NodeWrapper is removed from the tree.
    for (const id of prevSelDragRef.current) {
      ids.add(id);
    }
    prevSelDragRef.current = selDrag;
    // Stabilize: return previous reference if contents haven't changed
    const prev = prevPromotedRef.current;
    if (prev.size === ids.size) {
      let same = true;
      for (const id of ids) { if (!prev.has(id)) { same = false; break; } }
      if (same) return prev;
    }
    prevPromotedRef.current = ids;
    return ids;
  }, [allCustomNodes, pinnedNodeIds, spatialIds]);

  const promotedNodes = useMemo(() => {
    if (domNodeLimit === 0) return [];
    const filtered = measuredNodes.filter((n) => immediatePromotedIds.has(n.id));
    return filtered.sort((a, b) => {
      const aIsGroup = a.type === 'group' || (!a.parentId && filtered.some((n) => n.parentId === a.id));
      const bIsGroup = b.type === 'group' || (!b.parentId && filtered.some((n) => n.parentId === b.id));
      if (aIsGroup && !bIsGroup) return -1;
      if (!aIsGroup && bIsGroup) return 1;
      return 0;
    });
  }, [measuredNodes, immediatePromotedIds, domNodeLimit]);

  // Worker nodes: mark promoted nodes so worker skips them
  const workerNodes = useMemo(() => {
    return nodes.map((n) => {
      if (immediatePromotedIds.has(n.id)) {
        return { ...n, _customRendered: true };
      }
      return n;
    });
  }, [nodes, immediatePromotedIds]);

  const workerEdges = useMemo(() => {
    return edges.map((e) => {
      if (e.type && customEdgeTypes[e.type]) {
        return { ...e, _customRendered: true };
      }
      return e;
    });
  }, [edges, customEdgeTypes]);

  // Pass ALL nodes/edges to the hook (worker gets positions for edge resolution)
  const {
    wrapRef, canvasRef, canvasReady,
    onPointerDown, onPointerMove, onPointerUp,
    store: baseStore,
  } = useInfiniteCanvas({
    cards, nodes: workerNodes, edges: workerEdges, dark, gridSize, zoomMin, zoomMax, initialCamera,
    fitView: fitViewOnInit, fitViewOptions,
    onHudUpdate: handleHudUpdate,
    onNodesProcessed,
    onNodesChange, onEdgesChange, onConnect, onConnectStart, onConnectEnd,
    onNodeClick, onNodeDoubleClick,
    onNodeMouseEnter, onNodeMouseMove, onNodeMouseLeave, onNodeContextMenu,
    onNodeDragStart, onNodeDrag, onNodeDragStop,
    onEdgeClick, onEdgeDoubleClick,
    onEdgeMouseEnter, onEdgeMouseMove, onEdgeMouseLeave, onEdgeContextMenu,
    onPaneClick, onPaneContextMenu,
    onPaneMouseEnter, onPaneMouseMove, onPaneMouseLeave,
    onSelectionChange,
    onInit, onMoveStart, onMove, onMoveEnd,
    onDelete, onBeforeDelete, onError,
    nodesDraggable, nodesConnectable, elementsSelectable,
    multiSelectionKeyCode, selectionOnDrag, selectionMode,
    connectionMode, connectionRadius, connectOnClick,
    isValidConnection, defaultEdgeOptions,
    snapToGrid, snapGrid,
    deleteKeyCode, panActivationKeyCode,
    panOnScroll, panOnScrollMode, panOnScrollSpeed,
    zoomOnScroll, zoomOnDoubleClick, zoomOnPinch,
    preventScrolling, translateExtent, nodeExtent,
    autoPanOnNodeDrag, autoPanOnConnect, autoPanSpeed,
    edgesReconnectable, elevateNodesOnSelect, elevateEdgesOnSelect,
    noDragClassName, noPanClassName,
    onSelectionDragStart, onSelectionDrag, onSelectionDragStop,
    edgeRouting,
  });

  // ── Spatial DOM promotion: fill remaining domNodeLimit slots with nearest visible nodes ──
  // Throttled to every 500ms. Uses refs to avoid re-running the effect on every render.
  const allCustomNodesRef = useRef(allCustomNodes);
  allCustomNodesRef.current = allCustomNodes;
  const domNodeLimitRef = useRef(domNodeLimit);
  domNodeLimitRef.current = domNodeLimit;

  const runSpatialUpdate = useCallback(() => {
    const customNodes = allCustomNodesRef.current;
    const limit = domNodeLimitRef.current;
    if (limit === 0 || !customNodes.length) return;

    const cam = baseStore.cameraRef.current;
    const wrap = baseStore.wrapRef.current;
    if (!wrap) return;
    const ww = wrap.clientWidth;
    const wh = wrap.clientHeight;
    const cx = (-cam.x + ww / 2) / cam.zoom;
    const cy = (-cam.y + wh / 2) / cam.zoom;
    const pinned = pinnedRef.current;

    // Count slots already taken by pinned + selected
    let taken = pinned.size;
    for (const n of customNodes) {
      if (n.selected || n.dragging) taken++;
    }
    const remaining = Math.max(0, limit - taken);

    if (remaining === 0) {
      setSpatialIds((prev) => prev.size === 0 ? prev : new Set());
    } else {
      const takenIds = new Set(pinned);
      for (const n of customNodes) {
        if (n.selected || n.dragging) takenIds.add(n.id);
      }
      const scored = [];
      for (let i = 0; i < customNodes.length; i++) {
        const n = customNodes[i];
        if (takenIds.has(n.id)) continue;
        const pos = n._absolutePosition || n.position;
        const dx = pos.x + (n.width || 160) / 2 - cx;
        const dy = pos.y + (n.height || 60) / 2 - cy;
        scored.push({ id: n.id, dist: dx * dx + dy * dy });
      }
      scored.sort((a, b) => a.dist - b.dist);

      const ids = new Set();
      for (let i = 0; i < Math.min(remaining, scored.length); i++) {
        ids.add(scored[i].id);
      }
      setSpatialIds((prev) => {
        if (prev.size !== ids.size) return ids;
        for (const id of ids) { if (!prev.has(id)) return ids; }
        return prev;
      });
    }
  }, [baseStore.cameraRef, baseStore.wrapRef]);

  useEffect(() => {
    const initialTimer = setTimeout(runSpatialUpdate, 100);
    const timer = setInterval(runSpatialUpdate, 500);
    return () => { clearTimeout(initialTimer); clearInterval(timer); };
  }, [runSpatialUpdate]);

  // Run spatial check immediately when selection changes so deselected nodes
  // get re-promoted via spatialIds before their NodeWrapper unmounts.
  useEffect(() => {
    runSpatialUpdate();
  }, [allCustomNodes, runSpatialUpdate]);

  // Convert canvasNodeTypes to ImageBitmaps and send to worker.
  // Supports static values (string, Image, Canvas, ImageBitmap) and
  // functions (data) => svgString for per-node bitmaps with caching.
  const sentBitmapHashesRef = useRef(new Set());
  useEffect(() => {
    if (!canvasNodeTypes || !baseStore.workerRef.current) return;
    let cancelled = false;

    async function svgStringToBitmap(svgStr) {
      const blob = new Blob([svgStr], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.src = url;
      await img.decode();
      URL.revokeObjectURL(url);
      return createImageBitmap(img);
    }

    async function convertAndSend() {
      const staticBitmaps = {};
      const staticTransfer = [];
      const fnTypes = {}; // type → function

      const configTypes = {}; // type → config object (declarative)

      // Separate static vs function vs config entries
      for (const [type, src] of Object.entries(canvasNodeTypes)) {
        if (typeof src === 'function') {
          fnTypes[type] = src;
          continue;
        }
        // Plain config object (has 'fill' or 'stroke' — declarative style)
        if (typeof src === 'object' && src !== null && !(src instanceof ImageBitmap)
            && !(src instanceof HTMLImageElement) && !(src instanceof HTMLCanvasElement)
            && ('fill' in src || 'stroke' in src || 'title' in src || 'accent' in src)) {
          configTypes[type] = src;
          continue;
        }
        try {
          let bitmap;
          if (src instanceof ImageBitmap) bitmap = src;
          else if (typeof src === 'string') bitmap = await svgStringToBitmap(src);
          else if (src instanceof HTMLImageElement) bitmap = await createImageBitmap(src);
          else if (src instanceof HTMLCanvasElement) bitmap = await createImageBitmap(src);
          if (bitmap && !cancelled) {
            staticBitmaps[type] = bitmap;
            staticTransfer.push(bitmap);
          }
        } catch (e) {
          console.warn(`[InfiniteCanvas] Failed to convert canvasNodeType "${type}":`, e);
        }
      }

      // Send static per-type bitmaps
      if (!cancelled && Object.keys(staticBitmaps).length > 0) {
        baseStore.workerRef.current?.postMessage(
          { type: 'nodeTypeBitmaps', data: { bitmaps: staticBitmaps } },
          staticTransfer
        );
      }

      // Send declarative config types
      if (!cancelled && Object.keys(configTypes).length > 0) {
        baseStore.workerRef.current?.postMessage(
          { type: 'nodeTypeConfigs', data: { configs: configTypes } }
        );
      }

      // Process function types: generate per-node bitmaps, deduplicated by SVG content
      if (!cancelled && Object.keys(fnTypes).length > 0) {
        const svgMap = new Map(); // svgString → hash
        const newCache = {};     // hash → ImageBitmap (only new ones)
        const keys = {};         // nodeId → hash
        const transfer = [];
        let hashCounter = sentBitmapHashesRef.current.size;

        for (const node of nodes) {
          const fn = fnTypes[node.type];
          if (!fn) continue;
          try {
            const svgStr = fn(node.data);
            if (!svgStr) continue;

            let hash = svgMap.get(svgStr);
            if (!hash) {
              hash = 'bmp_' + hashCounter++;
              svgMap.set(svgStr, hash);
              // Only create bitmap if we haven't sent this exact SVG before
              if (!sentBitmapHashesRef.current.has(svgStr)) {
                const bitmap = await svgStringToBitmap(svgStr);
                if (cancelled) return;
                newCache[hash] = bitmap;
                transfer.push(bitmap);
                sentBitmapHashesRef.current.add(svgStr);
              }
            }
            keys[node.id] = hash;
          } catch (e) {
            console.warn(`[InfiniteCanvas] canvasNodeType fn error for node "${node.id}":`, e);
          }
        }

        if (!cancelled) {
          baseStore.workerRef.current?.postMessage(
            { type: 'nodeBitmaps', data: { cache: newCache, keys } },
            transfer
          );
        }
      }
    }

    convertAndSend();
    return () => { cancelled = true; };
  }, [canvasNodeTypes, nodes, baseStore.workerRef]);

  // If a parent InfiniteCanvasProvider exists (Zustand store), sync data into it
  // so hooks called above <InfiniteCanvas> (e.g. useAutoLayout, useReactFlow) see current data.
  const parentCtx = useContext(InfiniteCanvasContext);
  const isParentZustand = parentCtx && typeof parentCtx.getState === 'function';
  useEffect(() => {
    if (!isParentZustand) return;
    // Defer setState to avoid triggering Zustand subscribers synchronously
    // during React's commit phase, which causes infinite update loops.
    queueMicrotask(() => {
      parentCtx.setState({
        nodes: measuredNodes,
        edges,
        nodesRef: baseStore.nodesRef,
        edgesRef: baseStore.edgesRef,
        onNodesChangeRef: baseStore.onNodesChangeRef,
        onEdgesChangeRef: baseStore.onEdgesChangeRef,
        cameraRef: baseStore.cameraRef,
        wrapRef: baseStore.wrapRef,
        workerRef: baseStore.workerRef,
      });
    });
  }, [isParentZustand, measuredNodes, edges, baseStore, parentCtx]);

  // Extend store with portal refs and full nodes/edges (including custom).
  // This is a plain object (not Zustand) — avoids infinite loops from setState.
  const store = useMemo(() => ({
    ...baseStore,
    edgeLabelContainerRef,
    viewportPortalRef,
    pinNode, unpinNode, togglePinNode,
    get pinnedNodeIds() { return pinnedRef.current; },
    get nodes() { return measuredNodes; },
    get edges() { return edges; },
    get viewport() { return baseStore.cameraRef.current; },
    get minZoom() { return baseStore.zoomMin || 0.1; },
    get maxZoom() { return baseStore.zoomMax || 5; },
    get domNode() { return baseStore.wrapRef.current; },
    get width() { return baseStore.wrapRef.current?.clientWidth || 0; },
    get height() { return baseStore.wrapRef.current?.clientHeight || 0; },
  }), [baseStore, measuredNodes, edges, pinNode, unpinNode, togglePinNode]);


  // Refs for direct DOM transform updates (bypass React re-renders during pan/zoom)
  const nodesOverlayRef = useRef(null);
  const edgesOverlayRef = useRef(null);
  const edgeLabelOverlayRef = useRef(null);
  const viewportPortalOverlayRef = useRef(null);

  // Sync overlay transforms directly from cameraRef on every animation frame.
  // Also applies LOD CSS classes based on zoom level — hides handles at low zoom
  // to reduce DOM complexity during pan/zoom with many custom nodes.
  const lastZoomTierRef = useRef(null);
  useEffect(() => {
    let rafId;
    const sync = () => {
      const cam = baseStore.cameraRef.current;
      const css = `translate(${cam.x}px, ${cam.y}px) scale(${cam.zoom})`;
      const svg = `translate(${cam.x}, ${cam.y}) scale(${cam.zoom})`;
      if (nodesOverlayRef.current) nodesOverlayRef.current.style.transform = css;
      if (edgesOverlayRef.current) edgesOverlayRef.current.setAttribute('transform', svg);
      if (edgeLabelOverlayRef.current) edgeLabelOverlayRef.current.style.transform = css;
      if (viewportPortalOverlayRef.current) viewportPortalOverlayRef.current.style.transform = css;
      // LOD: toggle CSS class to hide handles and simplify nodes at low zoom
      const wrap = wrapRef.current;
      if (wrap) {
        const tier = cam.zoom < 0.15 ? 'lod-minimal' : cam.zoom < 0.35 ? 'lod-reduced' : null;
        if (tier !== lastZoomTierRef.current) {
          wrap.classList.remove('lod-minimal', 'lod-reduced');
          if (tier) wrap.classList.add(tier);
          lastZoomTierRef.current = tier;
        }
      }
      rafId = requestAnimationFrame(sync);
    };
    rafId = requestAnimationFrame(sync);
    return () => cancelAnimationFrame(rafId);
  }, [baseStore]);

  // ── Node virtualization: only mount nodes visible in viewport ──
  const [visibleNodeIds, setVisibleNodeIds] = useState(null); // null = show all (before first cull)
  useEffect(() => {
    if (!promotedNodes.length) return;
    let rafId;
    const cull = () => {
      const cam = baseStore.cameraRef.current;
      const wrap = baseStore.wrapRef.current;
      if (!wrap) { rafId = requestAnimationFrame(cull); return; }
      const rect = wrap.getBoundingClientRect();
      // Viewport bounds in world space (with generous margin for off-screen nodes about to scroll in)
      const margin = 200; // px in world space
      const vLeft = (-cam.x / cam.zoom) - margin;
      const vTop = (-cam.y / cam.zoom) - margin;
      const vRight = (rect.width - cam.x) / cam.zoom + margin;
      const vBottom = (rect.height - cam.y) / cam.zoom + margin;

      const ids = new Set();
      for (const node of promotedNodes) {
        const pos = node._absolutePosition || node.position;
        const w = node.width || node.measured?.width || 200;
        const h = node.height || node.measured?.height || 100;
        if (pos.x + w >= vLeft && pos.x <= vRight && pos.y + h >= vTop && pos.y <= vBottom) {
          ids.add(node.id);
        }
      }
      setVisibleNodeIds((prev) => {
        if (!prev || prev.size !== ids.size) return ids;
        for (const id of ids) { if (!prev.has(id)) return ids; }
        return prev; // no change
      });
      rafId = requestAnimationFrame(cull);
    };
    rafId = requestAnimationFrame(cull);
    return () => cancelAnimationFrame(rafId);
  }, [promotedNodes, baseStore]);

  const virtualizedNodes = useMemo(() => {
    if (!visibleNodeIds) return promotedNodes; // show all until first cull
    return promotedNodes.filter((n) => visibleNodeIds.has(n.id));
  }, [promotedNodes, visibleNodeIds]);

  const hasCustomNodes = promotedNodes.length > 0;
  const hasCustomEdges = customEdges.length > 0;

  return (
    <InfiniteCanvasContext.Provider value={store}>
      <div
        ref={wrapRef}
        className={`ric-wrap ${className}`}
        style={{ width, height, ...style }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        tabIndex={0}
      >
        {/* Canvas layer — grid, default nodes/edges, handles, selection */}
        <canvas ref={canvasRef} className="ric-canvas" />

        {/* Loading overlay — shown until worker renders first frame */}
        {!canvasReady && <div className="ric-loader"><div className="ric-spinner" /></div>}

        {/* SVG overlay — custom edge components */}
        {hasCustomEdges && (
          <svg
            className="ric-edges-overlay"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              overflow: 'visible',
            }}
          >
            <g ref={edgesOverlayRef}>
              {customEdges.map((edge) => (
                <EdgeWrapper
                  key={edge.id}
                  edge={edge}
                  edgeType={customEdgeTypes[edge.type]}
                  nodes={nodes}
                  reconnectable={edgesReconnectable}
                />
              ))}
            </g>
          </svg>
        )}

        {/* DOM overlay — custom node components (transforms with camera) */}
        {hasCustomNodes && (
          <div
            ref={nodesOverlayRef}
            className="ric-nodes-overlay"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 0,
              height: 0,
              transformOrigin: '0 0',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            {virtualizedNodes.map((node) => (
              <NodeWrapper
                key={node.id}
                node={node}
                nodeType={customNodeTypes[node.type]}
              />
            ))}
          </div>
        )}

        {/* Edge label container — EdgeLabelRenderer portals into this */}
        <div
          ref={(el) => { edgeLabelContainerRef.current = el; edgeLabelOverlayRef.current = el; }}
          className="ric-edge-labels"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 0,
            height: 0,
            transformOrigin: '0 0',
            pointerEvents: 'none',
            zIndex: 5,
          }}
        />

        {/* Viewport portal container */}
        <div
          ref={(el) => { viewportPortalRef.current = el; viewportPortalOverlayRef.current = el; }}
          className="ric-viewport-portal"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 0,
            height: 0,
            transformOrigin: '0 0',
            pointerEvents: 'none',
            zIndex: 6,
          }}
        />

        {showHint && <div className="ric-hint">{hintText}</div>}
        {showHud && (
          <div className="ric-info">
            world: ({hud.wx}, {hud.wy}) &nbsp; zoom: {hud.zoom}x
            {hud.nodeCount > 0 && <> &nbsp; nodes: {hud.nodeCount}</>}
            {hud.edgeCount > 0 && <> &nbsp; edges: {hud.edgeCount}</>}
          </div>
        )}
        <SelectionBox
          selectionKeyCode={multiSelectionKeyCode || 'Shift'}
          selectionMode={selectionMode || 'partial'}
        />
        {children}
      </div>
    </InfiniteCanvasContext.Provider>
  );
}

export function InfiniteCanvasProvider({ children }) {
  const storeRef = useRef(null);
  if (!storeRef.current) {
    storeRef.current = createCanvasStore();
  }

  return (
    <InfiniteCanvasContext.Provider value={storeRef.current}>
      {children}
    </InfiniteCanvasContext.Provider>
  );
}
