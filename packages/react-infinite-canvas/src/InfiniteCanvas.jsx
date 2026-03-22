import { useState, useCallback } from 'react';
import useInfiniteCanvas from './useInfiniteCanvas.js';

export default function InfiniteCanvas({
  cards = [],
  dark,
  gridSize = 40,
  zoomMin = 0.1,
  zoomMax = 4,
  initialCamera = { x: 0, y: 0, zoom: 1 },
  onHudUpdate,
  showHud = true,
  showHint = true,
  hintText = 'Drag to pan \u00b7 Scroll to zoom',
  width = '100%',
  height = '420px',
  className = '',
  style = {},
  children,
}) {
  const [hud, setHud] = useState({ wx: 0, wy: 0, zoom: '1.00' });

  const handleHudUpdate = useCallback(
    (data) => {
      setHud(data);
      onHudUpdate?.(data);
    },
    [onHudUpdate]
  );

  const {
    wrapRef,
    canvasRef,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    resetView,
    addCard,
    getCamera,
    setCamera,
  } = useInfiniteCanvas({
    cards,
    dark,
    gridSize,
    zoomMin,
    zoomMax,
    initialCamera,
    onHudUpdate: handleHudUpdate,
  });

  return (
    <div
      ref={wrapRef}
      className={`ric-wrap ${className}`}
      style={{ width, height, ...style }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <canvas ref={canvasRef} className="ric-canvas" />
      {showHint && <div className="ric-hint">{hintText}</div>}
      {showHud && (
        <div className="ric-info">
          world: ({hud.wx}, {hud.wy}) &nbsp; zoom: {hud.zoom}x
        </div>
      )}
      {children}
    </div>
  );
}
