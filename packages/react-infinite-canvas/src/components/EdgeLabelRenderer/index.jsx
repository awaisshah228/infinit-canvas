import { createPortal } from 'react-dom';
import { useCanvasStore } from '../../context/InfiniteCanvasContext.js';

// Renders children into the edge label layer (positioned in viewport coordinates)
// Use this inside custom edge components to render labels with full React support.
export default function EdgeLabelRenderer({ children }) {
  const store = useCanvasStore();
  const container = store.edgeLabelContainerRef?.current;
  if (!container) return null;
  return createPortal(children, container);
}
