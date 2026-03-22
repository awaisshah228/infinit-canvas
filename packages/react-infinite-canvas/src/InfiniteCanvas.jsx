/**
 * InfiniteCanvas — A ready-to-use React component that renders an infinite
 * pannable/zoomable canvas with card elements.
 *
 * This component wraps the useInfiniteCanvas hook and provides:
 * - A container div with pointer event handlers for pan/drag
 * - A <canvas> element whose rendering is offloaded to a Web Worker
 * - Optional HUD overlay showing world coordinates and zoom level
 * - Optional hint text overlay
 * - Support for custom children rendered inside the canvas wrapper
 *
 * All rendering happens off the main thread via OffscreenCanvas + Web Worker.
 * The main thread only handles input events and React state updates.
 */
import { useState, useCallback } from 'react';
import useInfiniteCanvas from './useInfiniteCanvas.js';

export default function InfiniteCanvas({
  // ── Card data ──────────────────────────────────────────────────
  cards = [],           // Array of { x, y, w, h, title, body } in world coords

  // ── Appearance ─────────────────────────────────────────────────
  dark,                 // Force dark/light mode (undefined = auto-detect)
  gridSize = 40,        // Background grid cell size in pixels
  width = '100%',       // CSS width of the container
  height = '420px',     // CSS height of the container
  className = '',       // Additional CSS class on wrapper div
  style = {},           // Additional inline styles on wrapper div

  // ── Zoom limits ────────────────────────────────────────────────
  zoomMin = 0.1,        // Minimum zoom level (0.1 = 10%)
  zoomMax = 4,          // Maximum zoom level (4 = 400%)

  // ── Camera ─────────────────────────────────────────────────────
  initialCamera = { x: 0, y: 0, zoom: 1 },  // Starting camera state

  // ── Callbacks ──────────────────────────────────────────────────
  onHudUpdate,          // Called with { wx, wy, zoom, renderMs, fps, visible }

  // ── UI toggles ─────────────────────────────────────────────────
  showHud = true,       // Show world coordinates + zoom overlay
  showHint = true,      // Show "Drag to pan" hint at top
  hintText = 'Drag to pan \u00b7 Scroll to zoom',

  // ── Children ───────────────────────────────────────────────────
  children,             // Arbitrary React elements rendered inside wrapper
}) {
  // Internal HUD state — updated by worker messages via the hook
  const [hud, setHud] = useState({ wx: 0, wy: 0, zoom: '1.00' });

  // Merge internal state update with optional external callback.
  // useCallback ensures stable reference to avoid re-creating the hook's
  // onHudUpdate ref on every render.
  const handleHudUpdate = useCallback(
    (data) => {
      setHud(data);              // Update internal HUD display
      onHudUpdate?.(data);       // Forward to consumer if provided
    },
    [onHudUpdate]
  );

  // Get all refs and handlers from the core hook.
  // The hook manages:
  //   - Worker creation and lifecycle (via WeakMap for StrictMode safety)
  //   - OffscreenCanvas transfer
  //   - Pointer event handling for pan
  //   - Wheel event handling for zoom
  //   - ResizeObserver for responsive canvas sizing
  //   - Theme change detection
  const {
    wrapRef,          // Ref for the wrapper div (ResizeObserver + pointer capture)
    canvasRef,        // Ref for the <canvas> element (transferred to worker)
    onPointerDown,    // Start drag: capture pointer, record start position
    onPointerMove,    // During drag: accumulate delta into camera offset
    onPointerUp,      // End drag: release pointer capture
    resetView,        // Reset camera to initialCamera
    addCard,          // Add a card (at given position or viewport center)
    getCamera,        // Get current { x, y, zoom } snapshot
    setCamera,        // Set camera imperatively { x?, y?, zoom? }
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
      // Pointer events are attached here (not on canvas) because the canvas
      // has pointer-events: none in CSS — the wrapper handles all input.
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* The canvas element fills the wrapper via CSS (position: absolute).
          Its pixel buffer is owned by the worker — React never draws on it. */}
      <canvas ref={canvasRef} className="ric-canvas" />

      {/* Hint overlay — centered at top, pointer-events: none */}
      {showHint && <div className="ric-hint">{hintText}</div>}

      {/* HUD overlay — bottom-left, shows world coords + zoom level */}
      {showHud && (
        <div className="ric-info">
          world: ({hud.wx}, {hud.wy}) &nbsp; zoom: {hud.zoom}x
        </div>
      )}

      {/* Consumer can render arbitrary children inside the wrapper
          (e.g., floating controls, context menus, selection overlay) */}
      {children}
    </div>
  );
}
