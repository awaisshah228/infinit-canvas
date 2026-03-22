import { createContext, useContext } from 'react';

const InfiniteCanvasContext = createContext(null);

export function useCanvasStore() {
  const ctx = useContext(InfiniteCanvasContext);
  if (!ctx) {
    throw new Error('useCanvasStore must be used within <InfiniteCanvas> or <InfiniteCanvasProvider>');
  }
  return ctx;
}

export default InfiniteCanvasContext;
