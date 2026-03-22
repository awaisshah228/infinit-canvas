import { useContext, useCallback, useRef, useEffect } from 'react';
import { NodeIdContext } from '../../context/NodeIdContext.js';
import { useCanvasStore } from '../../context/InfiniteCanvasContext.js';

// Measure handle's offset (x, y) relative to the node wrapper element
function measureHandleOffset(handleEl) {
  const nodeWrapper = handleEl.closest('.ric-node-wrapper');
  if (!nodeWrapper) return null;
  const nodeRect = nodeWrapper.getBoundingClientRect();
  const handleRect = handleEl.getBoundingClientRect();
  return {
    x: (handleRect.left + handleRect.width / 2) - nodeRect.left,
    y: (handleRect.top + handleRect.height / 2) - nodeRect.top,
  };
}

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
  const handleRef = useRef(null);

  // Register this handle's measured position into the store registry
  useEffect(() => {
    const el = handleRef.current;
    if (!el || !nodeId) return;
    const registry = store.handleRegistryRef?.current;
    if (!registry) return;

    const key = `${nodeId}__${id || type}`;

    const measure = () => {
      const offset = measureHandleOffset(el);
      if (offset) {
        registry.set(key, { nodeId, id: id || null, type, position, x: offset.x, y: offset.y });
        // Re-sync nodes to worker so it knows about the new handle positions
        store.syncNodesToWorker?.();
      }
    };

    // Measure after layout
    requestAnimationFrame(measure);

    // Re-measure on resize
    const ro = new ResizeObserver(() => requestAnimationFrame(measure));
    const nodeWrapper = el.closest('.ric-node-wrapper');
    if (nodeWrapper) ro.observe(nodeWrapper);

    return () => {
      ro.disconnect();
      registry.delete(key);
      store.syncNodesToWorker?.();
    };
  }, [nodeId, id, type, position, store]);

  // Get this handle's world position using measured offset or fallback
  const getHandleWorldPos = useCallback(() => {
    const node = store.nodesRef.current.find((n) => n.id === nodeId);
    if (!node) return null;
    const nodePos = node._absolutePosition || node.position;

    // Try measured position from registry
    const registry = store.handleRegistryRef?.current;
    const key = `${nodeId}__${id || type}`;
    const registered = registry?.get(key);
    if (registered && registered.x !== undefined && registered.y !== undefined) {
      return { x: nodePos.x + registered.x, y: nodePos.y + registered.y };
    }

    // Fallback to position-based calculation
    const nw = node.width || 160;
    const nh = node.height || 60;
    switch (position) {
      case 'top': return { x: nodePos.x + nw / 2, y: nodePos.y };
      case 'bottom': return { x: nodePos.x + nw / 2, y: nodePos.y + nh };
      case 'left': return { x: nodePos.x, y: nodePos.y + nh / 2 };
      default: return { x: nodePos.x + nw, y: nodePos.y + nh / 2 };
    }
  }, [nodeId, id, type, position, store]);

  // Handle pointer down — start connection drag
  const onPointerDown = useCallback((e) => {
    if (!isConnectable || !isConnectableStart) return;
    e.stopPropagation(); // Don't trigger node drag
    e.preventDefault();

    const cam = store.cameraRef.current;
    const wrap = store.wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();

    const handlePos = getHandleWorldPos();
    if (!handlePos) return;
    const hx = handlePos.x;
    const hy = handlePos.y;

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
      const registry = store.handleRegistryRef?.current;
      for (const n of store.nodesRef.current) {
        if (n.id === nodeId || n.hidden) continue;
        const tnw = n.width || 160;
        const tnh = n.height || 60;
        const tp = n._absolutePosition || n.position;
        // Build handle list: use registry entries for this node, fall back to node.handles or defaults
        const registeredHandles = [];
        if (registry) {
          for (const [, h] of registry) {
            if (h.nodeId === n.id) registeredHandles.push(h);
          }
        }
        const handles = registeredHandles.length > 0 ? registeredHandles : (n.handles || [
          { type: 'target', position: 'left' },
          { type: 'source', position: 'right' },
        ]);
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
  }, [nodeId, id, type, position, isConnectable, isConnectableStart, store, getHandleWorldPos]);

  const posStyle = {
    top: { top: 0, left: '50%', transform: 'translate(-50%, -50%)' },
    bottom: { bottom: 0, left: '50%', transform: 'translate(-50%, 50%)' },
    left: { top: '50%', left: 0, transform: 'translate(-50%, -50%)' },
    right: { top: '50%', right: 0, transform: 'translate(50%, -50%)' },
  }[position] || {};

  return (
    <div
      ref={handleRef}
      className={`ric-handle ric-handle-${position} ric-handle-${type} ${className}`}
      data-handleid={id || null}
      data-nodeid={nodeId}
      data-handlepos={position}
      data-handletype={type}
      onPointerDown={onPointerDown}
      style={{
        position: 'absolute',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: '#1a192b',
        border: 'none',
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
