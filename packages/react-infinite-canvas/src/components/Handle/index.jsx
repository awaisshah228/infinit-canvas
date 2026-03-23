import { useContext, useCallback, useRef, useLayoutEffect, useEffect, memo } from 'react';
import { NodeIdContext } from '../../context/NodeIdContext.js';
import InfiniteCanvasContext from '../../context/InfiniteCanvasContext.js';

// ── Helpers ─────────────────────────────────────────────────────
function getPositionOffset(position, nw, nh) {
  switch (position) {
    case 'top': return { x: nw / 2, y: 0 };
    case 'bottom': return { x: nw / 2, y: nh };
    case 'left': return { x: 0, y: nh / 2 };
    case 'right': return { x: nw, y: nh / 2 };
    default: return { x: nw, y: nh / 2 };
  }
}

function measureHandleOffset(handleEl, zoom) {
  const nodeWrapper = handleEl.closest('.ric-node-wrapper');
  if (!nodeWrapper) return null;
  const nodeRect = nodeWrapper.getBoundingClientRect();
  const handleRect = handleEl.getBoundingClientRect();
  // Bail out if either element has zero dimensions (not laid out yet —
  // happens during React Strict Mode's double-invocation of effects).
  if (!nodeRect.width || !nodeRect.height || !handleRect.width || !handleRect.height) return null;
  const z = zoom || 1;
  return {
    x: ((handleRect.left + handleRect.width / 2) - nodeRect.left) / z,
    y: ((handleRect.top + handleRect.height / 2) - nodeRect.top) / z,
  };
}

// ── Batched worker sync ─────────────────────────────────────────
// Coalesce all handle changes into a single worker sync per frame
let syncScheduled = false;
let syncStore = null;

function scheduleSyncToWorker(store) {
  syncStore = store;
  if (syncScheduled) return;
  syncScheduled = true;
  requestAnimationFrame(() => {
    syncScheduled = false;
    syncStore?.syncNodesToWorker?.();
    syncStore = null;
  });
}

// ── Shared ResizeObserver ───────────────────────────────────────
const observedWrappers = new WeakMap();
let sharedRO = null;

function getSharedResizeObserver() {
  if (sharedRO) return sharedRO;
  sharedRO = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const info = observedWrappers.get(entry.target);
      if (!info) continue;
      const { width, height } = entry.contentRect;
      if (!width || !height) continue;
      const s = info.getStore();
      const registry = s.handleRegistryRef?.current;
      if (!registry) continue;
      const zoom = s.cameraRef?.current?.zoom;
      for (const [key, h] of registry) {
        if (h.nodeId === info.nodeId) {
          let offset;
          if (h.el) {
            offset = measureHandleOffset(h.el, zoom);
          }
          if (!offset) {
            offset = getPositionOffset(h.position, width, height);
          }
          h.x = offset.x;
          h.y = offset.y;
          registry.set(key, h);
        }
      }
      scheduleSyncToWorker(s);
    }
  });
  return sharedRO;
}

// ── Handle Component ────────────────────────────────────────────
function Handle({
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
  const ctx = useContext(InfiniteCanvasContext);
  const handleRef = useRef(null);
  const getStore = useCallback(
    () => (typeof ctx.getState === 'function' ? ctx.getState() : ctx),
    [ctx]
  );
  const getStoreRef = useRef(getStore);
  getStoreRef.current = getStore;

  // Register handle position in registry
  useLayoutEffect(() => {
    if (!nodeId) return;
    const s = getStoreRef.current();
    const registry = s.handleRegistryRef?.current;
    if (!registry) return;

    const key = `${nodeId}__${id || `${type}_${position}`}`;
    const node = s.nodesRef?.current?.find((n) => n.id === nodeId);
    const nw = node?.width || node?.measured?.width;
    const nh = node?.height || node?.measured?.height;

    // If a valid cached position already exists (from initial mount at zoom=1),
    // skip DOM re-measurement — at low zoom, sub-pixel handles produce imprecise
    // getBoundingClientRect values that corrupt the cached offset when divided by zoom.
    const existing = registry.get(key);
    if (existing && existing.x !== undefined && existing.y !== undefined) {
      existing.el = handleRef.current;
      // Still update sourcePosition/targetPosition on the node
      if (node) {
        if (type === 'source') node.sourcePosition = position;
        if (type === 'target') node.targetPosition = position;
      }
      return;
    }

    let offset;
    if (handleRef.current) {
      offset = measureHandleOffset(handleRef.current, s.cameraRef?.current?.zoom);
    }
    if (!offset) {
      offset = getPositionOffset(position, nw || 160, nh || 60);
    }

    registry.set(key, { nodeId, id: id || null, type, position, x: offset.x, y: offset.y, el: handleRef.current });

    // Also set sourcePosition/targetPosition on the node in nodesRef directly.
    // This ensures the worker has correct handle directions on the very first frame,
    // before the async registry sync fires.
    if (node) {
      if (type === 'source') node.sourcePosition = position;
      if (type === 'target') node.targetPosition = position;
    }
  }, [nodeId, id, type, position]);

  // Register shared ResizeObserver + schedule initial sync
  useEffect(() => {
    if (!nodeId) return;
    const s = getStoreRef.current();
    scheduleSyncToWorker(s);

    const el = handleRef.current;
    const nodeWrapper = el?.closest('.ric-node-wrapper');
    if (nodeWrapper && !observedWrappers.has(nodeWrapper)) {
      observedWrappers.set(nodeWrapper, { nodeId, getStore: getStoreRef.current });
      getSharedResizeObserver().observe(nodeWrapper);
    }

    return () => {
      // When a Handle unmounts (e.g. node demoted during virtualization),
      // preserve the cached x/y in the registry so edges still resolve
      // correct positions. Only clear the stale DOM element reference.
      const st = getStoreRef.current();
      const registry = st.handleRegistryRef?.current;
      const key = `${nodeId}__${id || `${type}_${position}`}`;
      const entry = registry?.get(key);
      if (entry) {
        entry.el = null;
      }
    };
  }, [nodeId, id, type, position]);

  const getHandleWorldPos = useCallback(() => {
    const s = getStoreRef.current();
    const node = s.nodesRef.current.find((n) => n.id === nodeId);
    if (!node) return null;
    const nodePos = node._absolutePosition || node.position;
    const registry = s.handleRegistryRef?.current;
    const key = `${nodeId}__${id || `${type}_${position}`}`;
    const registered = registry?.get(key);
    if (registered && registered.x !== undefined && registered.y !== undefined) {
      return { x: nodePos.x + registered.x, y: nodePos.y + registered.y };
    }
    const nw = node.width || 160;
    const nh = node.height || 60;
    switch (position) {
      case 'top': return { x: nodePos.x + nw / 2, y: nodePos.y };
      case 'bottom': return { x: nodePos.x + nw / 2, y: nodePos.y + nh };
      case 'left': return { x: nodePos.x, y: nodePos.y + nh / 2 };
      default: return { x: nodePos.x + nw, y: nodePos.y + nh / 2 };
    }
  }, [nodeId, id, type, position]);

  const onPointerDown = useCallback((e) => {
    if (!isConnectable || !isConnectableStart) return;
    e.stopPropagation();
    e.preventDefault();

    const s = getStoreRef.current();
    const cam = s.cameraRef.current;
    const wrap = s.wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const handlePos = getHandleWorldPos();
    if (!handlePos) return;
    const hx = handlePos.x;
    const hy = handlePos.y;

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
      const wx = (ev.clientX - rect.left - cam.x) / cam.zoom;
      const wy = (ev.clientY - rect.top - cam.y) / cam.zoom;
      const hitRadius = Math.max(20 / cam.zoom, 10);
      let targetNode = null;
      let targetHandleId = null;
      const registry = s.handleRegistryRef?.current;
      for (const n of s.nodesRef.current) {
        if (n.id === nodeId || n.hidden) continue;
        const tp = n._absolutePosition || n.position;
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
        const isStrict = s.connectionMode === 'strict';
        const expectedType = type === 'source' ? 'target' : 'source';
        for (const h of handles) {
          if (isStrict && h.type !== expectedType) continue;
          let thx, thy;
          if (h.x !== undefined && h.y !== undefined) {
            thx = tp.x + h.x; thy = tp.y + h.y;
          } else {
            const tnw = n.width || 160;
            const tnh = n.height || 60;
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

export default memo(Handle);
