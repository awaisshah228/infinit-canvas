/**
 * useInfiniteCanvas — Core hook that manages the infinite canvas lifecycle.
 *
 * Responsibilities:
 * 1. Creates a Web Worker with the rendering code
 * 2. Transfers OffscreenCanvas to the worker (one-time, irreversible)
 * 3. Handles pointer events for panning (drag to move camera)
 * 4. Handles wheel events for zooming (scroll to zoom around cursor)
 * 5. Observes container resize and notifies worker
 * 6. Syncs cards, theme, and camera state to the worker via postMessage
 * 7. Receives HUD data (coords, fps, render time) from worker
 *
 * Key design decisions:
 * - Worker persists across React StrictMode double-mounts via WeakMap
 * - Callback ref pattern (onHudUpdateRef) avoids effect dependency issues
 * - Camera state lives in a ref (not React state) for zero-latency updates
 * - Wheel listener attached via useEffect with { passive: false } to allow preventDefault
 */
import { useRef, useEffect, useCallback } from 'react';

// ── WeakMap: persist worker across React StrictMode re-mounts ────────
// transferControlToOffscreen() can only be called ONCE per <canvas> element.
// React StrictMode in dev mode unmounts then remounts — if we create a new
// worker on remount, transferControlToOffscreen() throws. Instead, we cache
// the worker keyed by the canvas DOM element. On remount, we reuse it.
// WeakMap allows GC when the canvas element is removed from the DOM.
const canvasWorkerMap = new WeakMap();

/**
 * Creates a worker (or returns existing one) for the given canvas element.
 * The worker receives the OffscreenCanvas via postMessage with zero-copy transfer.
 */
function getOrCreateWorker(canvas, initData) {
  // StrictMode re-mount: reuse existing worker instead of crashing
  if (canvasWorkerMap.has(canvas)) {
    console.log('[infinite-canvas] reusing existing worker (StrictMode re-mount)');
    return canvasWorkerMap.get(canvas);
  }

  // First mount: transfer canvas to offscreen (irreversible — main thread loses access)
  const offscreen = canvas.transferControlToOffscreen();

  // Create worker from the canvas.worker.js file via Vite's URL resolution
  const worker = new Worker(
    new URL('./canvas.worker.js', import.meta.url)
  );
  const blobUrl = null;

  console.log('[infinite-canvas] worker created');

  // Log worker errors (script load failures, runtime exceptions)
  worker.onerror = (e) => {
    console.error('[infinite-canvas] worker error:', e.message, e);
  };

  // Send init message with OffscreenCanvas as a transferable object.
  // The [offscreen] array means zero-copy transfer — the main thread
  // can no longer access this canvas after this call.
  worker.postMessage(
    { type: 'init', data: { ...initData, canvas: offscreen } },
    [offscreen]
  );
  console.log('[infinite-canvas] init sent — canvas:', initData.width, 'x', initData.height, '| cards:', initData.cards.length);

  // Cache in WeakMap so StrictMode re-mount can reuse
  const entry = { worker, blobUrl };
  canvasWorkerMap.set(canvas, entry);
  return entry;
}

export default function useInfiniteCanvas({
  cards = [],                              // Card objects: { x, y, w, h, title, body }
  onHudUpdate,                             // Callback: receives { wx, wy, zoom, fps, renderMs }
  dark,                                    // Force theme: true/false/undefined (auto-detect)
  gridSize = 40,                           // Background grid spacing in world pixels
  zoomMin = 0.1,                           // Minimum zoom level clamp
  zoomMax = 4,                             // Maximum zoom level clamp
  initialCamera = { x: 0, y: 0, zoom: 1 }, // Starting camera state
} = {}) {
  // ── Refs (not React state — avoids re-renders on every frame) ─────
  const wrapRef = useRef(null);            // Wrapper div DOM element
  const canvasRef = useRef(null);          // Canvas DOM element
  const workerRef = useRef(null);          // Current Worker instance
  const cameraRef = useRef({ ...initialCamera }); // Camera: { x, y, zoom } in screen space
  const cardsRef = useRef([...cards]);     // Mirror of cards prop for sync
  const draggingRef = useRef(false);       // Is user currently dragging?
  const lastPtRef = useRef(null);          // Last pointer position for delta calc
  const onHudUpdateRef = useRef(onHudUpdate); // Stable callback ref

  // ── Keep callback ref in sync with latest prop ────────────────────
  // Using a ref avoids putting onHudUpdate in the init effect's deps,
  // which would cause the effect to re-run and break the WeakMap pattern.
  useEffect(() => {
    onHudUpdateRef.current = onHudUpdate;
  }, [onHudUpdate]);

  // ── Sync cards prop to worker ─────────────────────────────────────
  // When parent passes a new cards array, forward it to the worker.
  // The worker marks its spatial grid as dirty and rebuilds on next render.
  useEffect(() => {
    cardsRef.current = [...cards];
    workerRef.current?.postMessage({
      type: 'cards',
      data: { cards: [...cards] },
    });
  }, [cards]);

  // ── Initialize worker + OffscreenCanvas (runs once on mount) ──────
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    // Measure container for initial canvas pixel dimensions
    const rect = wrap.getBoundingClientRect();

    // Resolve dark mode: use explicit prop or detect system preference
    const resolvedDark =
      dark !== undefined
        ? dark
        : matchMedia('(prefers-color-scheme: dark)').matches;

    // Create or reuse worker (WeakMap handles StrictMode double-mount)
    const { worker } = getOrCreateWorker(canvas, {
      width: rect.width,
      height: rect.height,
      camera: cameraRef.current,
      cards: cardsRef.current,
      dark: resolvedDark,
      gridSize,
    });

    // ── Listen for messages from worker ──────────────────────────────
    worker.onmessage = (e) => {
      if (e.data.type === 'hud') {
        // Worker sends HUD data every ~100ms: { wx, wy, zoom, fps, renderMs, visible }
        onHudUpdateRef.current?.(e.data.data);
      } else if (e.data.type === 'ping') {
        // Worker sends ping on script load to confirm it's alive
        console.log('[infinite-canvas] worker is alive');
      }
    };

    workerRef.current = worker;

    // ── ResizeObserver: auto-resize canvas when container changes ────
    // Worker needs pixel dimensions for canvas.width/height and frustum bounds
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      const { width, height } = entry.contentRect;
      worker.postMessage({ type: 'resize', data: { width, height } });
    });
    ro.observe(wrap);

    // ── Theme change listener (auto-detect mode only) ───────────────
    // If dark prop is explicitly set, we sync via the dark useEffect below.
    // If undefined (auto), listen for system preference changes.
    let mq;
    let onThemeChange;
    if (dark === undefined) {
      mq = matchMedia('(prefers-color-scheme: dark)');
      onThemeChange = (e) => {
        worker.postMessage({ type: 'theme', data: { dark: e.matches } });
      };
      mq.addEventListener('change', onThemeChange);
    }

    // ── Cleanup ─────────────────────────────────────────────────────
    return () => {
      ro.disconnect();
      if (mq && onThemeChange) {
        mq.removeEventListener('change', onThemeChange);
      }
      // IMPORTANT: Do NOT terminate the worker here.
      // React StrictMode calls cleanup then immediately re-mounts.
      // If we terminate, the re-mount can't create a new worker because
      // transferControlToOffscreen() was already called on this canvas.
      // The WeakMap lets the worker be GC'd when the canvas element is removed.
      workerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps — runs once (worker persists via WeakMap)

  // ── Sync controlled dark prop to worker ───────────────────────────
  useEffect(() => {
    if (dark !== undefined) {
      workerRef.current?.postMessage({ type: 'theme', data: { dark } });
    }
  }, [dark]);

  // ── Send camera state to worker ───────────────────────────────────
  // Copies cameraRef and posts to worker. Called by pan/zoom handlers.
  const sendCamera = useCallback(() => {
    workerRef.current?.postMessage({
      type: 'camera',
      data: { camera: { ...cameraRef.current } },
    });
  }, []);

  // ── PANNING: Pointer event handlers ───────────────────────────────

  // pointerdown: Start drag. Capture pointer so events continue even
  // if cursor leaves the canvas bounds (important for edge-dragging).
  const onPointerDown = useCallback((e) => {
    draggingRef.current = true;
    lastPtRef.current = { x: e.clientX, y: e.clientY };
    wrapRef.current?.classList.add('dragging');       // CSS cursor: grabbing
    wrapRef.current?.setPointerCapture(e.pointerId);  // Keep events flowing
  }, []);

  // pointermove: During drag, accumulate cursor delta into camera offset.
  // camera.x/y are in screen pixels — delta maps 1:1 regardless of zoom.
  const onPointerMove = useCallback(
    (e) => {
      if (!draggingRef.current) return;
      const cam = cameraRef.current;
      cam.x += e.clientX - lastPtRef.current.x;  // Horizontal pan
      cam.y += e.clientY - lastPtRef.current.y;  // Vertical pan
      lastPtRef.current = { x: e.clientX, y: e.clientY };
      sendCamera(); // Notify worker → scheduleRender()
    },
    [sendCamera]
  );

  // pointerup: End drag, restore grab cursor.
  const onPointerUp = useCallback(() => {
    draggingRef.current = false;
    wrapRef.current?.classList.remove('dragging');
  }, []);

  // ── ZOOMING: Wheel event handler ──────────────────────────────────
  // Attached via useEffect (not JSX onWheel) because we need
  // { passive: false } to call e.preventDefault() and stop page scroll.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const onWheel = (e) => {
      e.preventDefault(); // Stop page from scrolling

      // Zoom factor: scroll down = zoom out (0.92), scroll up = zoom in (1.08)
      const factor = e.deltaY > 0 ? 0.92 : 1.08;

      // Cursor position relative to canvas top-left (screen space)
      const rect = wrap.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const cam = cameraRef.current;

      // ── Zoom around cursor math ───────────────────────────────────
      // Goal: the world point under the cursor should not move.
      //
      // Before zoom, the world coordinate under cursor is:
      //   worldX = (mx - cam.x) / cam.zoom
      //
      // After zoom (new zoom = cam.zoom * factor), we want the same
      // world point to still be at screen position mx:
      //   mx = worldX * newZoom + newCamX
      //   newCamX = mx - worldX * newZoom
      //   newCamX = mx - ((mx - cam.x) / cam.zoom) * cam.zoom * factor
      //   newCamX = mx - (mx - cam.x) * factor
      cam.x = mx - (mx - cam.x) * factor;
      cam.y = my - (my - cam.y) * factor;

      // Clamp zoom to configured [zoomMin, zoomMax] range
      cam.zoom = Math.min(zoomMax, Math.max(zoomMin, cam.zoom * factor));

      sendCamera();
    };

    wrap.addEventListener('wheel', onWheel, { passive: false });
    return () => wrap.removeEventListener('wheel', onWheel);
  }, [sendCamera, zoomMin, zoomMax]);

  // ── PUBLIC METHODS ────────────────────────────────────────────────

  // Reset camera to the initial position and zoom level
  const resetView = useCallback(() => {
    cameraRef.current = { ...initialCamera };
    sendCamera();
  }, [sendCamera, initialCamera]);

  // Add a card. Pass a card object { x, y, w, h, title, body } or
  // call with no args to create a default card at the viewport center.
  const addCard = useCallback(
    (card) => {
      if (card) {
        cardsRef.current.push(card);
      } else {
        // Calculate world-space center of the current viewport:
        //   worldX = (screenCenterX - cam.x) / cam.zoom
        const cam = cameraRef.current;
        const wrap = wrapRef.current;
        if (!wrap) return;
        const rect = wrap.getBoundingClientRect();
        const wx = Math.round(-cam.x / cam.zoom + rect.width / 2 / cam.zoom);
        const wy = Math.round(-cam.y / cam.zoom + rect.height / 2 / cam.zoom);
        cardsRef.current.push({
          x: wx - 80,   // Center the 160px-wide card horizontally
          y: wy - 45,   // Center the 90px-tall card vertically
          w: 160,
          h: 90,
          title: 'Note ' + (cardsRef.current.length + 1),
          body: 'Added at viewport center',
        });
      }
      // Send full cards array to worker — it rebuilds the spatial grid
      workerRef.current?.postMessage({
        type: 'cards',
        data: { cards: [...cardsRef.current] },
      });
    },
    []
  );

  // Get a read-only snapshot of the current camera state
  const getCamera = useCallback(() => ({ ...cameraRef.current }), []);

  // Imperatively update the camera (supports partial updates)
  const setCamera = useCallback(
    (cam) => {
      cameraRef.current = { ...cameraRef.current, ...cam };
      sendCamera();
    },
    [sendCamera]
  );

  return {
    wrapRef,        // Attach to wrapper div
    canvasRef,      // Attach to <canvas> element
    onPointerDown,  // Attach to wrapper's onPointerDown
    onPointerMove,  // Attach to wrapper's onPointerMove
    onPointerUp,    // Attach to wrapper's onPointerUp
    resetView,      // Reset camera to initial state
    addCard,        // Add a card at position or viewport center
    getCamera,      // Get { x, y, zoom } snapshot
    setCamera,      // Set { x?, y?, zoom? } imperatively
  };
}
