import { createContext, useContext } from 'react';
import { createStore, useStore as useZustandStore } from 'zustand';

const InfiniteCanvasContext = createContext(null);

// Create a default Zustand store for InfiniteCanvasProvider
export function createCanvasStore(initialState = {}) {
  return createStore((set, get) => ({
    // ── Core state ──
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    connection: null,
    minZoom: 0.1,
    maxZoom: 5,
    width: 0,
    height: 0,
    domNode: null,

    // ── Refs (mutable, not tracked by Zustand) ──
    nodesRef: { current: [] },
    edgesRef: { current: [] },
    cameraRef: { current: { x: 0, y: 0, zoom: 1 } },
    wrapRef: { current: null },
    workerRef: { current: null },
    onNodesChangeRef: { current: null },
    onEdgesChangeRef: { current: null },

    // ── Listener sets ──
    viewportListeners: new Set(),
    selectionListeners: new Set(),

    // ── Portal refs ──
    edgeLabelContainerRef: { current: null },
    viewportPortalRef: { current: null },

    // ── Methods ──
    screenToWorld: (x, y) => {
      const cam = get().cameraRef.current;
      return { x: (x - cam.x) / cam.zoom, y: (y - cam.y) / cam.zoom };
    },
    sendCamera: () => {
      const state = get();
      state.workerRef.current?.postMessage({ type: 'camera', data: state.cameraRef.current });
    },

    // ── Zustand setters ──
    setNodes: (nodes) => set({ nodes }),
    setEdges: (edges) => set({ edges }),
    setViewport: (viewport) => set({ viewport }),

    // Apply overrides from InfiniteCanvas
    ...initialState,
  }));
}

// Use Zustand store with selector support
export function useCanvasStore(selector) {
  const store = useContext(InfiniteCanvasContext);
  if (!store) {
    throw new Error('useCanvasStore must be used within <InfiniteCanvas> or <InfiniteCanvasProvider>');
  }
  // If no selector, return the full store state
  if (!selector) {
    return useZustandStore(store);
  }
  return useZustandStore(store, selector);
}

// Raw store access (for imperative use)
export function useCanvasStoreApi() {
  const store = useContext(InfiniteCanvasContext);
  if (!store) {
    throw new Error('useCanvasStoreApi must be used within <InfiniteCanvas> or <InfiniteCanvasProvider>');
  }
  return store;
}

export default InfiniteCanvasContext;
