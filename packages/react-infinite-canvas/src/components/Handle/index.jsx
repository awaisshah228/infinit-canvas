import { useContext, useCallback } from 'react';
import { NodeIdContext } from '../../context/NodeIdContext.js';
import { useCanvasStore } from '../../context/InfiniteCanvasContext.js';

export default function Handle({
  type = 'source',
  position = type === 'source' ? 'right' : 'left',
  id,
  isConnectable = true,
  isConnectableStart = true,
  isConnectableEnd = true,
  children,
  className = '',
  style = {},
  onConnect,
  ...rest
}) {
  const nodeId = useContext(NodeIdContext);
  const store = useCanvasStore();

  // Handle pointer down — start connection drag
  const onPointerDown = useCallback((e) => {
    if (!isConnectable || !isConnectableStart) return;
    e.stopPropagation(); // Don't trigger node drag
    e.preventDefault();

    const cam = store.cameraRef.current;
    const wrap = store.wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();

    // Find this handle's world position
    const node = store.nodesRef.current.find((n) => n.id === nodeId);
    if (!node) return;
    const nw = node.width || 160;
    const nh = node.height || 60;
    const nodePos = node._absolutePosition || node.position;

    let hx, hy;
    switch (position) {
      case 'top': hx = nodePos.x + nw / 2; hy = nodePos.y; break;
      case 'bottom': hx = nodePos.x + nw / 2; hy = nodePos.y + nh; break;
      case 'left': hx = nodePos.x; hy = nodePos.y + nh / 2; break;
      default: hx = nodePos.x + nw; hy = nodePos.y + nh / 2; break;
    }

    // Send connecting state to worker
    store.workerRef.current?.postMessage({
      type: 'connecting',
      data: { from: { x: hx, y: hy }, to: { x: hx, y: hy } },
    });

    wrap.setPointerCapture(e.pointerId);

    const onMove = (ev) => {
      const wx = (ev.clientX - rect.left - cam.x) / cam.zoom;
      const wy = (ev.clientY - rect.top - cam.y) / cam.zoom;
      store.workerRef.current?.postMessage({
        type: 'connecting',
        data: { from: { x: hx, y: hy }, to: { x: wx, y: wy } },
      });
    };

    const onUp = (ev) => {
      // Check if we landed on another handle
      const wx = (ev.clientX - rect.left - cam.x) / cam.zoom;
      const wy = (ev.clientY - rect.top - cam.y) / cam.zoom;

      // Find target handle at drop position
      const hitRadius = 20 / cam.zoom;
      let targetNode = null;
      let targetHandleId = null;
      for (const n of store.nodesRef.current) {
        if (n.id === nodeId || n.hidden) continue;
        const tnw = n.width || 160;
        const tnh = n.height || 60;
        const tp = n._absolutePosition || n.position;
        // Check all 4 handle positions + custom handles
        const handles = n.handles || [
          { type: 'target', position: 'left' },
          { type: 'source', position: 'right' },
        ];
        for (const h of handles) {
          let thx, thy;
          if (h.x !== undefined && h.y !== undefined) {
            thx = tp.x + h.x; thy = tp.y + h.y;
          } else {
            switch (h.position || (h.type === 'source' ? 'right' : 'left')) {
              case 'top': thx = tp.x + tnw / 2; thy = tp.y; break;
              case 'bottom': thx = tp.x + tnw / 2; thy = tp.y + tnh; break;
              case 'left': thx = tp.x; thy = tp.y + tnh / 2; break;
              default: thx = tp.x + tnw; thy = tp.y + tnh / 2; break;
            }
          }
          if (Math.abs(wx - thx) < hitRadius && Math.abs(wy - thy) < hitRadius) {
            targetNode = n;
            targetHandleId = h.id || null;
            break;
          }
        }
        if (targetNode) break;
      }

      if (targetNode) {
        const conn = {
          source: type === 'source' ? nodeId : targetNode.id,
          target: type === 'source' ? targetNode.id : nodeId,
          sourceHandle: type === 'source' ? (id || null) : targetHandleId,
          targetHandle: type === 'source' ? targetHandleId : (id || null),
        };
        // Use the store's onConnect (via the refs)
        store.onEdgesChangeRef?.current?.([{ type: 'add', item: { id: `e-${conn.source}-${conn.target}`, ...conn } }]);
      }

      store.workerRef.current?.postMessage({ type: 'connecting', data: null });
      wrap.removeEventListener('pointermove', onMove);
      wrap.removeEventListener('pointerup', onUp);
    };

    wrap.addEventListener('pointermove', onMove);
    wrap.addEventListener('pointerup', onUp);
  }, [nodeId, id, type, position, isConnectable, isConnectableStart, store]);

  const posStyle = {
    top: { top: 0, left: '50%', transform: 'translate(-50%, -50%)' },
    bottom: { bottom: 0, left: '50%', transform: 'translate(-50%, 50%)' },
    left: { top: '50%', left: 0, transform: 'translate(-50%, -50%)' },
    right: { top: '50%', right: 0, transform: 'translate(50%, -50%)' },
  }[position] || {};

  return (
    <div
      className={`ric-handle ric-handle-${position} ric-handle-${type} ${className}`}
      data-handleid={id || null}
      data-nodeid={nodeId}
      data-handlepos={position}
      data-handletype={type}
      onPointerDown={onPointerDown}
      style={{
        position: 'absolute',
        width: 12,
        height: 12,
        borderRadius: '50%',
        background: '#fff',
        border: '2px solid #3b82f6',
        zIndex: 10,
        cursor: isConnectable ? 'crosshair' : 'default',
        boxSizing: 'border-box',
        ...posStyle,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
