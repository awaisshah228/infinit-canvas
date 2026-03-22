import { useCallback, useRef, useContext } from 'react';
import { NodeIdContext } from '../../context/NodeIdContext.js';
import { useCanvasStore } from '../../context/InfiniteCanvasContext.js';

export default function NodeResizer({
  minWidth = 10,
  minHeight = 10,
  maxWidth = Infinity,
  maxHeight = Infinity,
  isVisible = true,
  handleStyle = {},
  lineStyle = {},
  color = '#3b82f6',
  onResizeStart,
  onResize,
  onResizeEnd,
}) {
  const nodeId = useContext(NodeIdContext);
  const store = useCanvasStore();
  const startRef = useRef(null);

  const onPointerDown = useCallback((e, direction) => {
    e.stopPropagation();
    e.preventDefault();
    const node = store.nodesRef.current.find((n) => n.id === nodeId);
    if (!node) return;

    startRef.current = {
      direction,
      startX: e.clientX,
      startY: e.clientY,
      width: node.width || 160,
      height: node.height || 60,
    };

    onResizeStart?.(e, { width: startRef.current.width, height: startRef.current.height });

    const onMove = (ev) => {
      if (!startRef.current) return;
      const s = startRef.current;
      const cam = store.cameraRef.current;
      const dx = (ev.clientX - s.startX) / cam.zoom;
      const dy = (ev.clientY - s.startY) / cam.zoom;

      let newW = s.width;
      let newH = s.height;
      if (s.direction.includes('e')) newW = Math.min(maxWidth, Math.max(minWidth, s.width + dx));
      if (s.direction.includes('w')) newW = Math.min(maxWidth, Math.max(minWidth, s.width - dx));
      if (s.direction.includes('s')) newH = Math.min(maxHeight, Math.max(minHeight, s.height + dy));
      if (s.direction.includes('n')) newH = Math.min(maxHeight, Math.max(minHeight, s.height - dy));

      store.onNodesChangeRef.current?.([
        { id: nodeId, type: 'dimensions', dimensions: { width: newW, height: newH }, setAttributes: true },
      ]);
      onResize?.(ev, { width: newW, height: newH });
    };

    const onUp = (ev) => {
      startRef.current = null;
      onResizeEnd?.(ev, {});
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [nodeId, store, minWidth, minHeight, maxWidth, maxHeight, onResizeStart, onResize, onResizeEnd]);

  if (!isVisible) return null;

  const handleSize = 8;
  const hs = {
    position: 'absolute',
    width: handleSize,
    height: handleSize,
    background: color,
    border: '1px solid #fff',
    borderRadius: 2,
    zIndex: 20,
    ...handleStyle,
  };

  return (
    <>
      {/* Corner handles */}
      <div style={{ ...hs, bottom: -handleSize/2, right: -handleSize/2, cursor: 'nwse-resize' }}
        onPointerDown={(e) => onPointerDown(e, 'se')} />
      <div style={{ ...hs, bottom: -handleSize/2, left: -handleSize/2, cursor: 'nesw-resize' }}
        onPointerDown={(e) => onPointerDown(e, 'sw')} />
      <div style={{ ...hs, top: -handleSize/2, right: -handleSize/2, cursor: 'nesw-resize' }}
        onPointerDown={(e) => onPointerDown(e, 'ne')} />
      <div style={{ ...hs, top: -handleSize/2, left: -handleSize/2, cursor: 'nwse-resize' }}
        onPointerDown={(e) => onPointerDown(e, 'nw')} />
      {/* Edge handles */}
      <div style={{ ...hs, top: '50%', right: -handleSize/2, cursor: 'ew-resize', transform: 'translateY(-50%)' }}
        onPointerDown={(e) => onPointerDown(e, 'e')} />
      <div style={{ ...hs, top: '50%', left: -handleSize/2, cursor: 'ew-resize', transform: 'translateY(-50%)' }}
        onPointerDown={(e) => onPointerDown(e, 'w')} />
      <div style={{ ...hs, left: '50%', top: -handleSize/2, cursor: 'ns-resize', transform: 'translateX(-50%)' }}
        onPointerDown={(e) => onPointerDown(e, 'n')} />
      <div style={{ ...hs, left: '50%', bottom: -handleSize/2, cursor: 'ns-resize', transform: 'translateX(-50%)' }}
        onPointerDown={(e) => onPointerDown(e, 's')} />
    </>
  );
}
