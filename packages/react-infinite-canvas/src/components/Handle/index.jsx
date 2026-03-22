import { useContext, useCallback, useRef, useEffect, useLayoutEffect } from 'react';
import { NodeIdContext } from '../../context/NodeIdContext.js';
import { useCanvasStore } from '../../context/InfiniteCanvasContext.js';

// Flush handle bounds for a node: collect from registry, update React state + worker
function flushHandleBounds(store, nodeId) {
  const registry = store.handleRegistryRef?.current;
  if (!registry) return;
  const handleBounds = { source: [], target: [] };
  for (const [, h] of registry) {
    if (h.nodeId === nodeId) {
      const entry = { id: h.id, type: h.type, position: h.position, x: h.x, y: h.y, width: 8, height: 8 };
      if (h.type === 'source') handleBounds.source.push(entry);
      else handleBounds.target.push(entry);
    }
  }
  store.onNodesChangeRef.current?.([
    { id: nodeId, type: 'dimensions', handleBounds, setAttributes: false },
  ]);
  store.syncNodesToWorker?.();
}

// Debounce handle bounds updates per-node — many handles mount at once
const pendingNodeUpdates = new Set();
function scheduleHandleBoundsUpdate(store, nodeId) {
  if (pendingNodeUpdates.has(nodeId)) return;
  pendingNodeUpdates.add(nodeId);
  queueMicrotask(() => {
    pendingNodeUpdates.delete(nodeId);
    flushHandleBounds(store, nodeId);
  });
}

// Measure handle's offset (x, y) relative to the node wrapper element
// Returns world-space offsets (divided by zoom since getBoundingClientRect is in screen pixels)
function measureHandleOffset(handleEl, zoom) {
  const nodeWrapper = handleEl.closest('.ric-node-wrapper');
  if (!nodeWrapper) return null;
  const nodeRect = nodeWrapper.getBoundingClientRect();
  const handleRect = handleEl.getBoundingClientRect();
  const z = zoom || 1;
  return {
    x: ((handleRect.left + handleRect.width / 2) - nodeRect.left) / z,
    y: ((handleRect.top + handleRect.height / 2) - nodeRect.top) / z,
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
  // Keep store in a ref so measure/effects don't re-run when store object is recreated
  const storeRef = useRef(store);
  storeRef.current = store;

  // Measure and register handle position into the store registry
  const measure = useCallback(() => {
    const el = handleRef.current;
    if (!el || !nodeId) return;
    const s = storeRef.current;
    const registry = s.handleRegistryRef?.current;
    if (!registry) return;
    const key = `${nodeId}__${id || type}`;
    const zoom = s.cameraRef?.current?.zoom;
    const offset = measureHandleOffset(el, zoom);
    if (offset) {
      const handleData = { nodeId, id: id || null, type, position, x: offset.x, y: offset.y };
      registry.set(key, handleData);
    }
  }, [nodeId, id, type, position]);

  // Measure synchronously after DOM commit so registry is populated
  // before the parent nodes effect sends data to the worker
  useLayoutEffect(() => {
    measure();
  }, [measure]);

  // Flush bounds + sync to worker after all handles in this render batch have measured
  useEffect(() => {
    if (!nodeId) return;
    const s = storeRef.current;
    scheduleHandleBoundsUpdate(s, nodeId);

    // Re-measure on resize
    const el = handleRef.current;
    const nodeWrapper = el?.closest('.ric-node-wrapper');
    const ro = new ResizeObserver(() => {
      measure();
      scheduleHandleBoundsUpdate(storeRef.current, nodeId);
    });
    if (nodeWrapper) ro.observe(nodeWrapper);

    return () => {
      ro.disconnect();
      const st = storeRef.current;
      const registry = st.handleRegistryRef?.current;
      const key = `${nodeId}__${id || type}`;
      registry?.delete(key);
      flushHandleBounds(st, nodeId);
    };
  }, [nodeId, id, type, position, measure]);

  // Get this handle's world position using measured offset or fallback
  const getHandleWorldPos = useCallback(() => {
    const s = storeRef.current;
    const node = s.nodesRef.current.find((n) => n.id === nodeId);
    if (!node) return null;
    const nodePos = node._absolutePosition || node.position;

    // Try measured position from registry
    const registry = s.handleRegistryRef?.current;
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
  }, [nodeId, id, type, position]);

  // Handle pointer down — start connection drag
  const onPointerDown = useCallback((e) => {
    if (!isConnectable || !isConnectableStart) return;
    e.stopPropagation(); // Don't trigger node drag
    e.preventDefault();

    const s = storeRef.current;
    const cam = s.cameraRef.current;
    const wrap = s.wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();

    const handlePos = getHandleWorldPos();
    if (!handlePos) return;
    const hx = handlePos.x;
    const hy = handlePos.y;

    // Send connecting state to worker
    s.workerRef.current?.postMessage({
      type: 'connecting',
      data: { from: { x: hx, y: hy }, to: { x: hx, y: hy } },
    });

    wrap.setPointerCapture(e.pointerId);

    const onMove = (ev) => {
      const wx = (ev.clientX - rect.left - cam.x) / cam.zoom;
      const wy = (ev.clientY - rect.top - cam.y) / cam.zoom;
      s.workerRef.current?.postMessage({
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
      const registry = s.handleRegistryRef?.current;
      for (const n of s.nodesRef.current) {
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
        s.onEdgesChangeRef?.current?.([{ type: 'add', item: { id: `e-${conn.source}-${conn.target}`, ...conn } }]);
      }

      s.workerRef.current?.postMessage({ type: 'connecting', data: null });
      wrap.removeEventListener('pointermove', onMove);
      wrap.removeEventListener('pointerup', onUp);
    };

    wrap.addEventListener('pointermove', onMove);
    wrap.addEventListener('pointerup', onUp);
  }, [nodeId, id, type, position, isConnectable, isConnectableStart, getHandleWorldPos]);

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
