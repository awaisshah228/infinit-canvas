import { useRef, useEffect, useCallback } from 'react';
import WORKER_CODE from './workerCode.js';

// Persist worker across React StrictMode double-mount.
// transferControlToOffscreen() can only be called once per <canvas>,
// so we store the worker+offscreen keyed by the canvas element.
const canvasWorkerMap = new WeakMap();

function getOrCreateWorker(canvas, initData) {
  if (canvasWorkerMap.has(canvas)) {
    console.log('[infinite-canvas] reusing existing worker (StrictMode re-mount)');
    return canvasWorkerMap.get(canvas);
  }

  const offscreen = canvas.transferControlToOffscreen();
  const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
  const blobUrl = URL.createObjectURL(blob);
  const worker = new Worker(blobUrl);

  console.log('[infinite-canvas] worker created');

  worker.onerror = (e) => {
    console.error('[infinite-canvas] worker error:', e.message, e);
  };

  worker.postMessage(
    { type: 'init', data: { ...initData, canvas: offscreen } },
    [offscreen]
  );
  console.log('[infinite-canvas] init sent — canvas:', initData.width, 'x', initData.height, '| cards:', initData.cards.length);

  const entry = { worker, blobUrl };
  canvasWorkerMap.set(canvas, entry);
  return entry;
}

export default function useInfiniteCanvas({
  cards = [],
  onHudUpdate,
  dark,
  gridSize = 40,
  zoomMin = 0.1,
  zoomMax = 4,
  initialCamera = { x: 0, y: 0, zoom: 1 },
} = {}) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const workerRef = useRef(null);
  const cameraRef = useRef({ ...initialCamera });
  const cardsRef = useRef([...cards]);
  const draggingRef = useRef(false);
  const lastPtRef = useRef(null);
  const onHudUpdateRef = useRef(onHudUpdate);

  // Keep callback ref in sync
  useEffect(() => {
    onHudUpdateRef.current = onHudUpdate;
  }, [onHudUpdate]);

  // Keep cardsRef in sync with prop changes
  useEffect(() => {
    cardsRef.current = [...cards];
    workerRef.current?.postMessage({
      type: 'cards',
      data: { cards: [...cards] },
    });
  }, [cards]);

  // Initialize worker + OffscreenCanvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const rect = wrap.getBoundingClientRect();

    const resolvedDark =
      dark !== undefined
        ? dark
        : matchMedia('(prefers-color-scheme: dark)').matches;

    const { worker } = getOrCreateWorker(canvas, {
      width: rect.width,
      height: rect.height,
      camera: cameraRef.current,
      cards: cardsRef.current,
      dark: resolvedDark,
      gridSize,
    });

    worker.onmessage = (e) => {
      if (e.data.type === 'hud') {
        onHudUpdateRef.current?.(e.data.data);
      } else if (e.data.type === 'ping') {
        console.log('[infinite-canvas] worker is alive');
      }
    };

    workerRef.current = worker;

    // ResizeObserver
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      const { width, height } = entry.contentRect;
      worker.postMessage({ type: 'resize', data: { width, height } });
    });
    ro.observe(wrap);

    // Theme change listener (only if dark is not explicitly controlled)
    let mq;
    let onThemeChange;
    if (dark === undefined) {
      mq = matchMedia('(prefers-color-scheme: dark)');
      onThemeChange = (e) => {
        worker.postMessage({ type: 'theme', data: { dark: e.matches } });
      };
      mq.addEventListener('change', onThemeChange);
    }

    return () => {
      ro.disconnect();
      if (mq && onThemeChange) {
        mq.removeEventListener('change', onThemeChange);
      }
      // Do NOT terminate the worker here — StrictMode will re-mount
      // and we need the worker to survive. The WeakMap will GC it
      // when the canvas element is removed from the DOM.
      workerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync controlled dark prop to worker
  useEffect(() => {
    if (dark !== undefined) {
      workerRef.current?.postMessage({ type: 'theme', data: { dark } });
    }
  }, [dark]);

  // Send camera update to worker
  const sendCamera = useCallback(() => {
    workerRef.current?.postMessage({
      type: 'camera',
      data: { camera: { ...cameraRef.current } },
    });
  }, []);

  // Pointer events for panning
  const onPointerDown = useCallback((e) => {
    draggingRef.current = true;
    lastPtRef.current = { x: e.clientX, y: e.clientY };
    wrapRef.current?.classList.add('dragging');
    wrapRef.current?.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e) => {
      if (!draggingRef.current) return;
      const cam = cameraRef.current;
      cam.x += e.clientX - lastPtRef.current.x;
      cam.y += e.clientY - lastPtRef.current.y;
      lastPtRef.current = { x: e.clientX, y: e.clientY };
      sendCamera();
    },
    [sendCamera]
  );

  const onPointerUp = useCallback(() => {
    draggingRef.current = false;
    wrapRef.current?.classList.remove('dragging');
  }, []);

  // Wheel event for zooming (passive: false)
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

  // Public methods
  const resetView = useCallback(() => {
    cameraRef.current = { ...initialCamera };
    sendCamera();
  }, [sendCamera, initialCamera]);

  const addCard = useCallback(
    (card) => {
      if (card) {
        cardsRef.current.push(card);
      } else {
        const cam = cameraRef.current;
        const wrap = wrapRef.current;
        if (!wrap) return;
        const rect = wrap.getBoundingClientRect();
        const wx = Math.round(
          -cam.x / cam.zoom + rect.width / 2 / cam.zoom
        );
        const wy = Math.round(
          -cam.y / cam.zoom + rect.height / 2 / cam.zoom
        );
        cardsRef.current.push({
          x: wx - 80,
          y: wy - 45,
          w: 160,
          h: 90,
          title: 'Note ' + (cardsRef.current.length + 1),
          body: 'Added at viewport center',
        });
      }
      workerRef.current?.postMessage({
        type: 'cards',
        data: { cards: [...cardsRef.current] },
      });
    },
    []
  );

  const getCamera = useCallback(() => ({ ...cameraRef.current }), []);

  const setCamera = useCallback(
    (cam) => {
      cameraRef.current = { ...cameraRef.current, ...cam };
      sendCamera();
    },
    [sendCamera]
  );

  return {
    wrapRef,
    canvasRef,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    resetView,
    addCard,
    getCamera,
    setCamera,
  };
}
