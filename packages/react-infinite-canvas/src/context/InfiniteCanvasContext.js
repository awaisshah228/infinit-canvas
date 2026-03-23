import { createContext, useContext, useRef, useCallback } from 'react';
import { createStore, useStore as useZustandStore } from 'zustand';

const InfiniteCanvasContext = createContext(null);

// Zustand store for InfiniteCanvasProvider — enables subscription-based
// updates so hooks like useStore/useAutoLayout re-render when data changes.
export function createCanvasStore(initialState = {}) {
  return createStore((_set, get) => ({
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    connection: null,
    minZoom: 0.1,
    maxZoom: 5,
    width: 0,
    height: 0,
    domNode: null,
    nodesRef: { current: [] },
    edgesRef: { current: [] },
    cameraRef: { current: { x: 0, y: 0, zoom: 1 } },
    wrapRef: { current: null },
    workerRef: { current: null },
    onNodesChangeRef: { current: null },
    onEdgesChangeRef: { current: null },
    viewportListeners: new Set(),
    selectionListeners: new Set(),
    edgeLabelContainerRef: { current: null },
    viewportPortalRef: { current: null },
    screenToWorld: (x, y) => {
      const cam = get().cameraRef.current;
      return { x: (x - cam.x) / cam.zoom, y: (y - cam.y) / cam.zoom };
    },
    sendCamera: () => {
      const state = get();
      state.workerRef.current?.postMessage({ type: 'camera', data: { camera: { ...state.cameraRef.current } } });
    },
    ...initialState,
  }));
}

/**
 * useCanvasStore — works with both:
 *   - Zustand stores (from InfiniteCanvasProvider) → useSyncExternalStore with cached selectors
 *   - Plain objects (from InfiniteCanvas context)  → direct selector call with caching
 *
 * The cached selector wraps the user's selector so that structurally-equal results
 * (per equalityFn) return the same reference, preventing useSyncExternalStore from
 * seeing different snapshots and causing infinite re-renders.
 */
export function useCanvasStore(selector, equalityFn) {
  const ctx = useContext(InfiniteCanvasContext);
  if (!ctx) {
    throw new Error('useCanvasStore must be used within <InfiniteCanvas> or <InfiniteCanvasProvider>');
  }

  const isZustand = typeof ctx.getState === 'function' && typeof ctx.subscribe === 'function';

  // Keep latest selector/equalityFn in refs for the stable callback
  const selectorRef = useRef(selector);
  const equalityFnRef = useRef(equalityFn);
  const cacheRef = useRef(undefined);
  selectorRef.current = selector;
  equalityFnRef.current = equalityFn;

  // Stable selector that caches results using the equality function.
  // This prevents useSyncExternalStore infinite loops when selectors
  // return new objects that are structurally equal.
  const cachedSelector = useCallback((state) => {
    const sel = selectorRef.current;
    if (!sel) return state;
    const next = sel(state);
    const eq = equalityFnRef.current || Object.is;
    if (cacheRef.current !== undefined && eq(cacheRef.current, next)) {
      return cacheRef.current;
    }
    cacheRef.current = next;
    return next;
  }, []);

  if (isZustand) {
    return useZustandStore(ctx, selector ? cachedSelector : undefined);
  }

  // Plain object context path
  if (!selector) return ctx;
  return cachedSelector(ctx);
}

export function useCanvasStoreApi() {
  const ctx = useContext(InfiniteCanvasContext);
  if (!ctx) {
    throw new Error('useCanvasStoreApi must be used within <InfiniteCanvas> or <InfiniteCanvasProvider>');
  }
  if (typeof ctx.getState === 'function') return ctx;
  return { getState: () => ctx, setState: () => {}, subscribe: () => () => {} };
}

export default InfiniteCanvasContext;
