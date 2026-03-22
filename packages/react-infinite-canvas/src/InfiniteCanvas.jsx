import { useState, useCallback, useRef, useMemo } from 'react';
import useInfiniteCanvas from './useInfiniteCanvas.js';
import InfiniteCanvasContext from './context/InfiniteCanvasContext.js';
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

export default function InfiniteCanvas({
  // Data
  cards, nodes = [], edges = [],

  // Custom types
  nodeTypes,
  edgeTypes,

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

  // Compute which nodes/edges have React renderers
  // Nodes/edges WITHOUT a type stay canvas-rendered (worker handles them)
  const customNodes = useMemo(() => {
    return nodes.filter((n) => n.type && customNodeTypes[n.type]);
  }, [nodes, customNodeTypes]);

  const customEdges = useMemo(() => {
    return edges.filter((e) => e.type && customEdgeTypes[e.type]);
  }, [edges, customEdgeTypes]);

  // Mark React-rendered nodes/edges so worker skips rendering them
  // but still knows their positions for edge resolution
  const workerNodes = useMemo(() => {
    return nodes.map((n) => {
      if (n.type && customNodeTypes[n.type]) {
        return { ...n, _customRendered: true };
      }
      return n;
    });
  }, [nodes, customNodeTypes]);

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
    edgesReconnectable, elevateNodesOnSelect,
    edgeRouting,
  });

  // Extend store with portal refs and full nodes/edges (including custom)
  const store = useMemo(() => ({
    ...baseStore,
    edgeLabelContainerRef,
    viewportPortalRef,
    // Override nodes/edges getters to return ALL nodes (canvas + custom)
    get nodes() { return nodes; },
    get edges() { return edges; },
  }), [baseStore, nodes, edges]);

  // Camera transform for DOM/SVG overlays
  const cam = baseStore.cameraRef.current;
  const transformStyle = `translate(${cam.x}px, ${cam.y}px) scale(${cam.zoom})`;

  const hasCustomNodes = customNodes.length > 0;
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
            <g transform={`translate(${cam.x}, ${cam.y}) scale(${cam.zoom})`}>
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
            className="ric-nodes-overlay"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 0,
              height: 0,
              transformOrigin: '0 0',
              transform: transformStyle,
              pointerEvents: 'none',
            }}
          >
            {customNodes.map((node) => (
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
          ref={edgeLabelContainerRef}
          className="ric-edge-labels"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 0,
            height: 0,
            transformOrigin: '0 0',
            transform: transformStyle,
            pointerEvents: 'none',
            zIndex: 5,
          }}
        />

        {/* Viewport portal container */}
        <div
          ref={viewportPortalRef}
          className="ric-viewport-portal"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 0,
            height: 0,
            transformOrigin: '0 0',
            transform: transformStyle,
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
  return children;
}
