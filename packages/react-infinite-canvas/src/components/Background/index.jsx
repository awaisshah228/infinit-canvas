import { useCanvasStore } from '../../context/InfiniteCanvasContext.js';

// Background component — rendered as an overlay hint, actual grid is drawn by the worker.
// This component lets users switch background variant or color by sending a message to the worker.
// For now it's mainly a passthrough that configures the worker's grid.
// Variant: 'lines' (default), 'dots', 'cross'

export default function Background({
  variant = 'lines',
  gap = 40,
  size = 1,
  color,
  style = {},
  className = '',
}) {
  const store = useCanvasStore();

  // Send background config to worker
  if (store.workerRef.current) {
    store.workerRef.current.postMessage({
      type: 'background',
      data: { variant, gap, size, color },
    });
  }

  // The component itself doesn't render visible DOM — the worker draws the background
  return null;
}
