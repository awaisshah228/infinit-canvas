import { useState, useCallback } from 'react';
import useInfiniteCanvas from './useInfiniteCanvas.js';
import InfiniteCanvasContext from './context/InfiniteCanvasContext.js';

export default function InfiniteCanvas({
  // Data
  cards, nodes, edges,

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

  // HUD
  onHudUpdate, showHud = true, showHint = true,
  hintText = 'Drag to pan \u00b7 Scroll to zoom',

  children,
  ...rest
}) {
  const [hud, setHud] = useState({ wx: 0, wy: 0, zoom: '1.00' });

  const handleHudUpdate = useCallback(
    (data) => { setHud(data); onHudUpdate?.(data); },
    [onHudUpdate]
  );

  // Pass ALL props through to the hook
  const {
    wrapRef, canvasRef,
    onPointerDown, onPointerMove, onPointerUp,
    store,
  } = useInfiniteCanvas({
    cards, nodes, edges, dark, gridSize, zoomMin, zoomMax, initialCamera,
    fitView: fitViewOnInit, fitViewOptions,
    onHudUpdate: handleHudUpdate,
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
  });

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
        <canvas ref={canvasRef} className="ric-canvas" />
        {showHint && <div className="ric-hint">{hintText}</div>}
        {showHud && (
          <div className="ric-info">
            world: ({hud.wx}, {hud.wy}) &nbsp; zoom: {hud.zoom}x
            {hud.nodeCount > 0 && <> &nbsp; nodes: {hud.nodeCount}</>}
            {hud.edgeCount > 0 && <> &nbsp; edges: {hud.edgeCount}</>}
          </div>
        )}
        {children}
      </div>
    </InfiniteCanvasContext.Provider>
  );
}

export function InfiniteCanvasProvider({ children }) {
  return children;
}
