import { useContext } from 'react';
import { NodeIdContext } from '../../context/NodeIdContext.js';
import { useCanvasStore } from '../../context/InfiniteCanvasContext.js';

export default function NodeToolbar({
  isVisible,
  position = 'top',
  offset = 10,
  align = 'center',
  children,
  style = {},
  className = '',
}) {
  const nodeId = useContext(NodeIdContext);
  const store = useCanvasStore();

  // Auto-show when node is selected if isVisible not explicitly set
  const node = store.nodes.find((n) => n.id === nodeId);
  const visible = isVisible !== undefined ? isVisible : node?.selected;
  if (!visible) return null;

  const posStyle = {
    top: { bottom: '100%', left: align === 'start' ? 0 : align === 'end' ? undefined : '50%', right: align === 'end' ? 0 : undefined, transform: align === 'center' ? 'translateX(-50%)' : undefined, marginBottom: offset },
    bottom: { top: '100%', left: align === 'start' ? 0 : align === 'end' ? undefined : '50%', right: align === 'end' ? 0 : undefined, transform: align === 'center' ? 'translateX(-50%)' : undefined, marginTop: offset },
    left: { right: '100%', top: align === 'start' ? 0 : align === 'end' ? undefined : '50%', bottom: align === 'end' ? 0 : undefined, transform: align === 'center' ? 'translateY(-50%)' : undefined, marginRight: offset },
    right: { left: '100%', top: align === 'start' ? 0 : align === 'end' ? undefined : '50%', bottom: align === 'end' ? 0 : undefined, transform: align === 'center' ? 'translateY(-50%)' : undefined, marginLeft: offset },
  }[position] || {};

  return (
    <div
      className={`ric-node-toolbar ${className}`}
      style={{
        position: 'absolute',
        zIndex: 1000,
        pointerEvents: 'all',
        ...posStyle,
        ...style,
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}
