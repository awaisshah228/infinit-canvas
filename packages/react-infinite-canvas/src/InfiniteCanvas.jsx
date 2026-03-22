import { useState, useCallback } from 'react';
import useInfiniteCanvas from './useInfiniteCanvas.js';
import InfiniteCanvasContext from './context/InfiniteCanvasContext.js';

export default function InfiniteCanvas({
  cards = [],
  nodes = [],
  edges = [],
  dark,
  gridSize = 40,
  width = '100%',
  height = '420px',
  className = '',
  style = {},
  zoomMin = 0.1,
  zoomMax = 4,
  initialCamera = { x: 0, y: 0, zoom: 1 },
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
  nodesDraggable = true,
  nodesConnectable = true,
  elementsSelectable = true,
  multiSelectionKeyCode = 'Shift',
  selectionOnDrag = false,
  onHudUpdate,
  showHud = true,
  showHint = true,
  hintText = 'Drag to pan \u00b7 Scroll to zoom',
  children,
}) {
  const [hud, setHud] = useState({ wx: 0, wy: 0, zoom: '1.00' });

  const handleHudUpdate = useCallback(
    (data) => { setHud(data); onHudUpdate?.(data); },
    [onHudUpdate]
  );

  const {
    wrapRef, canvasRef,
    onPointerDown, onPointerMove, onPointerUp,
    store,
  } = useInfiniteCanvas({
    cards, nodes, edges, dark, gridSize, zoomMin, zoomMax, initialCamera,
    onHudUpdate: handleHudUpdate,
    onNodesChange, onEdgesChange, onConnect,
    onNodeClick, onNodeDragStart, onNodeDrag, onNodeDragStop,
    onEdgeClick, onPaneClick, onSelectionChange,
    nodesDraggable, nodesConnectable, elementsSelectable,
    multiSelectionKeyCode, selectionOnDrag,
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

// Provider for using hooks outside of InfiniteCanvas
export function InfiniteCanvasProvider({ children }) {
  return children;
}
