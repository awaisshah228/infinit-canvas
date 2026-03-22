import { useRef, useEffect, useCallback } from 'react';

const INITIAL_CARDS = [
  { x: 60, y: 80, w: 160, h: 90, title: 'Note A', body: 'Pan and zoom me!' },
  { x: 320, y: 140, w: 160, h: 90, title: 'Note B', body: 'I live in world space' },
  { x: -160, y: 200, w: 160, h: 90, title: 'Note C', body: 'Scroll to find me' },
  { x: 500, y: -60, w: 160, h: 90, title: 'Note D', body: 'Try zooming out!' },
];

// Guard against React StrictMode double-mount in dev:
// transferControlToOffscreen() can only be called once per <canvas> element
const transferredCanvases = new WeakSet();

export default function useInfiniteCanvas({ onHudUpdate }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const workerRef = useRef(null);
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1 });
  const cardsRef = useRef([...INITIAL_CARDS]);
  const cardCountRef = useRef(4);
  const draggingRef = useRef(false);
  const lastPtRef = useRef(null);

  // ── Initialize worker + OffscreenCanvas ─────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    // Skip if already transferred (StrictMode re-mount)
    if (transferredCanvases.has(canvas)) return;
    transferredCanvases.add(canvas);

    const rect = wrap.getBoundingClientRect();
    const offscreen = canvas.transferControlToOffscreen();

    const worker = new Worker(
      new URL('../workers/canvas.worker.js', import.meta.url),
      { type: 'module' }
    );

    // Transfer the OffscreenCanvas to the worker
    worker.postMessage(
      {
        type: 'init',
        data: {
          canvas: offscreen,
          width: rect.width,
          height: rect.height,
          camera: cameraRef.current,
          cards: cardsRef.current,
          dark: matchMedia('(prefers-color-scheme: dark)').matches,
        },
      },
      [offscreen]
    );

    // Listen for HUD updates from worker
    worker.onmessage = (e) => {
      if (e.data.type === 'hud' && onHudUpdate) {
        onHudUpdate(e.data.data);
      }
    };

    workerRef.current = worker;

    // ── ResizeObserver ────────────────────────────────────────────
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      const { width, height } = entry.contentRect;
      worker.postMessage({ type: 'resize', data: { width, height } });
    });
    ro.observe(wrap);

    // ── Theme change listener ────────────────────────────────────
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const onThemeChange = (e) => {
      worker.postMessage({ type: 'theme', data: { dark: e.matches } });
    };
    mq.addEventListener('change', onThemeChange);

    return () => {
      ro.disconnect();
      mq.removeEventListener('change', onThemeChange);
      worker.terminate();
    };
  }, [onHudUpdate]);

  // ── Send camera update to worker ────────────────────────────────
  const sendCamera = useCallback(() => {
    workerRef.current?.postMessage({
      type: 'camera',
      data: { camera: { ...cameraRef.current } },
    });
  }, []);

  // ── Pointer events for panning ──────────────────────────────────
  const onPointerDown = useCallback((e) => {
    draggingRef.current = true;
    lastPtRef.current = { x: e.clientX, y: e.clientY };
    wrapRef.current?.classList.add('dragging');
    wrapRef.current?.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e) => {
    if (!draggingRef.current) return;
    const cam = cameraRef.current;
    cam.x += e.clientX - lastPtRef.current.x;
    cam.y += e.clientY - lastPtRef.current.y;
    lastPtRef.current = { x: e.clientX, y: e.clientY };
    sendCamera();
  }, [sendCamera]);

  const onPointerUp = useCallback(() => {
    draggingRef.current = false;
    wrapRef.current?.classList.remove('dragging');
  }, []);

  // ── Wheel event for zooming ─────────────────────────────────────
  // Attached via useEffect to use { passive: false }
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
      cam.zoom = Math.min(4, Math.max(0.1, cam.zoom * factor));
      sendCamera();
    };

    wrap.addEventListener('wheel', onWheel, { passive: false });
    return () => wrap.removeEventListener('wheel', onWheel);
  }, [sendCamera]);

  // ── Public methods exposed via ref-based callbacks ──────────────
  const resetView = useCallback(() => {
    cameraRef.current = { x: 0, y: 0, zoom: 1 };
    sendCamera();
  }, [sendCamera]);

  const addCard = useCallback(() => {
    const cam = cameraRef.current;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const wx = Math.round(-cam.x / cam.zoom + (rect.width / 2) / cam.zoom);
    const wy = Math.round(-cam.y / cam.zoom + (rect.height / 2) / cam.zoom);
    cardCountRef.current++;
    cardsRef.current.push({
      x: wx - 80, y: wy - 45, w: 160, h: 90,
      title: `Note ${cardCountRef.current}`,
      body: 'Added at viewport center',
    });
    workerRef.current?.postMessage({
      type: 'cards',
      data: { cards: [...cardsRef.current] },
    });
  }, []);

  return {
    wrapRef,
    canvasRef,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    resetView,
    addCard,
  };
}
