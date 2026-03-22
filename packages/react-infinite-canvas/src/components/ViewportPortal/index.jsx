import { createPortal } from 'react-dom';
import { useCanvasStore } from '../../context/InfiniteCanvasContext.js';

// Renders children into the viewport-transformed layer.
// Elements will pan/zoom with the canvas.
export default function ViewportPortal({ children }) {
  const store = useCanvasStore();
  const container = store.viewportPortalRef?.current;
  if (!container) return null;
  return createPortal(children, container);
}
