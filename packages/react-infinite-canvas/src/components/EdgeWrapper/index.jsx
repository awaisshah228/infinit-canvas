import { memo, useCallback, useState, useContext, useRef } from 'react';
import InfiniteCanvasContext from '../../context/InfiniteCanvasContext.js';

const DEFAULT_NODE_WIDTH = 160;
const DEFAULT_NODE_HEIGHT = 60;

function resolveHandlePosition(node, handleType, handleId, handleRegistry) {
  const nw = node.width || node.measured?.width || DEFAULT_NODE_WIDTH;
  const nh = node.height || node.measured?.height || DEFAULT_NODE_HEIGHT;
  const pos = node._absolutePosition || node.position;

  // 1. Check node.handleBounds first (populated by Handle component, triggers re-render)
  if (node.handleBounds) {
    const bounds = node.handleBounds[handleType] || [];
    const handle = handleId ? bounds.find((h) => h.id === handleId) : bounds[0];
    if (handle && handle.x !== undefined && handle.y !== undefined) {
      const p = handle.position || (handleType === 'source' ? 'right' : 'left');
      return { x: pos.x + handle.x, y: pos.y + handle.y, position: p };
    }
  }

  // 2. Fallback to handle registry (mutable Map, always current)
  if (handleRegistry) {
    const key = `${node.id}__${handleId || handleType}`;
    const registered = handleRegistry.get(key);
    if (registered && registered.x !== undefined && registered.y !== undefined) {
      return { x: pos.x + registered.x, y: pos.y + registered.y, position: registered.position || (handleType === 'source' ? 'right' : 'left') };
    }
  }

  // 3. Fallback to node.handles array (static definitions)
  if (node.handles && node.handles.length) {
    for (const h of node.handles) {
      if (h.type === handleType && (!handleId || h.id === handleId)) {
        if (h.x !== undefined && h.y !== undefined) {
          return { x: pos.x + h.x, y: pos.y + h.y, position: h.position || (handleType === 'source' ? 'right' : 'left') };
        }
        const p = h.position || (handleType === 'source' ? 'right' : 'left');
        switch (p) {
          case 'top': return { x: pos.x + nw / 2, y: pos.y, position: p };
          case 'bottom': return { x: pos.x + nw / 2, y: pos.y + nh, position: p };
          case 'left': return { x: pos.x, y: pos.y + nh / 2, position: p };
          default: return { x: pos.x + nw, y: pos.y + nh / 2, position: p };
        }
      }
    }
  }

  // 4. Final fallback
  if (handleType === 'source') return { x: pos.x + nw, y: pos.y + nh / 2, position: 'right' };
  return { x: pos.x, y: pos.y + nh / 2, position: 'left' };
}

function shiftPos(val, shift, position) {
  if (position === 'left') return val - shift;
  if (position === 'right') return val + shift;
  return val;
}

function shiftPosY(val, shift, position) {
  if (position === 'top') return val - shift;
  if (position === 'bottom') return val + shift;
  return val;
}

function EdgeAnchor({ x, y, position, type, onPointerDown }) {
  const radius = 10;
  return (
    <circle
      className={`ric-edge-anchor ric-edge-anchor-${type}`}
      cx={shiftPos(x, radius, position)}
      cy={shiftPosY(y, radius, position)}
      r={radius}
      stroke="transparent"
      fill="transparent"
      style={{ cursor: 'move', pointerEvents: 'stroke' }}
      onPointerDown={onPointerDown}
    />
  );
}

function EdgeWrapper({ edge, edgeType: EdgeComponent, nodes, reconnectable }) {
  // Read context directly — avoid useCanvasStore() which re-renders on viewport changes.
  const ctx = useContext(InfiniteCanvasContext);
  const storeRef = useRef(typeof ctx.getState === 'function' ? ctx.getState() : ctx);
  storeRef.current = typeof ctx.getState === 'function' ? ctx.getState() : ctx;

  const [hovering, setHovering] = useState(null);

  const handleReconnect = useCallback((anchorType, e, src, tgt) => {
    e.stopPropagation();
    e.preventDefault();

    const s = storeRef.current;
    const wrap = s.wrapRef.current;
    if (!wrap) return;

    const fixedEnd = anchorType === 'source' ? tgt : src;
    const fixedNodeId = anchorType === 'source' ? edge.target : edge.source;

    s.workerRef.current?.postMessage({
      type: 'connecting',
      data: { from: { x: fixedEnd.x, y: fixedEnd.y }, to: { x: fixedEnd.x, y: fixedEnd.y } },
    });

    const rect = wrap.getBoundingClientRect();

    const onMove = (ev) => {
      const cam = s.cameraRef.current;
      const wx = (ev.clientX - rect.left - cam.x) / cam.zoom;
      const wy = (ev.clientY - rect.top - cam.y) / cam.zoom;
      s.workerRef.current?.postMessage({
        type: 'connecting',
        data: { from: { x: fixedEnd.x, y: fixedEnd.y }, to: { x: wx, y: wy } },
      });
    };

    const onUp = (ev) => {
      const cam = s.cameraRef.current;
      const wx = (ev.clientX - rect.left - cam.x) / cam.zoom;
      const wy = (ev.clientY - rect.top - cam.y) / cam.zoom;

      const hitRadius = 20 / cam.zoom;
      let targetNode = null;
      let targetHandleId = null;
      const registry = s.handleRegistryRef?.current;
      for (const n of s.nodesRef.current) {
        if (n.hidden) continue;
        const tnw = n.width || DEFAULT_NODE_WIDTH;
        const tnh = n.height || DEFAULT_NODE_HEIGHT;
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
        const newConn = anchorType === 'source'
          ? { source: targetNode.id, target: fixedNodeId, sourceHandle: targetHandleId, targetHandle: edge.targetHandle }
          : { source: fixedNodeId, target: targetNode.id, sourceHandle: edge.sourceHandle, targetHandle: targetHandleId };

        s.onEdgesChangeRef.current?.([
          { id: edge.id, type: 'remove' },
          { type: 'add', item: { id: edge.id, ...newConn } },
        ]);
      }

      s.workerRef.current?.postMessage({ type: 'connecting', data: null });
      wrap.removeEventListener('pointermove', onMove);
      wrap.removeEventListener('pointerup', onUp);
    };

    wrap.addEventListener('pointermove', onMove);
    wrap.addEventListener('pointerup', onUp);
  }, [edge]);

  // Look up only the two nodes this edge connects to
  const srcNode = nodes.find((n) => n.id === edge.source);
  const tgtNode = nodes.find((n) => n.id === edge.target);

  const srcReady = srcNode && !!(srcNode.width || srcNode.measured?.width);
  const tgtReady = tgtNode && !!(tgtNode.width || tgtNode.measured?.width);

  // Always prefer the mutable handle registry for latest positions
  const s = storeRef.current;
  const handleRegistry = s.handleRegistryRef?.current;
  const src = srcReady ? resolveHandlePosition(srcNode, 'source', edge.sourceHandle, handleRegistry) : null;
  const tgt = tgtReady ? resolveHandlePosition(tgtNode, 'target', edge.targetHandle, handleRegistry) : null;

  const isBezier = edge.type === 'bezier' || edge.type === 'simplebezier' || edge.type === 'default';
  const routedEdges = s.routedEdges || s.edges;
  const routedEdge = routedEdges?.find((e) => e.id === edge.id);
  const routedPoints = isBezier ? null : (routedEdge?._routedPoints || edge._routedPoints || null);

  const isReconnectable = reconnectable !== false && edge.reconnectable !== false;

  if (!src || !tgt) return null;

  return (
    <g
      className={`ric-edge-wrapper ${edge.selected ? 'selected' : ''}`}
      data-edgeid={edge.id}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <EdgeComponent
        id={edge.id}
        source={edge.source}
        target={edge.target}
        sourceX={src.x}
        sourceY={src.y}
        targetX={tgt.x}
        targetY={tgt.y}
        sourcePosition={src.position}
        targetPosition={tgt.position}
        sourceHandleId={edge.sourceHandle}
        targetHandleId={edge.targetHandle}
        data={edge.data}
        type={edge.type}
        selected={!!edge.selected}
        animated={!!edge.animated}
        label={edge.label}
        style={edge.style}
        selectable={edge.selectable !== false}
        deletable={edge.deletable !== false}
        routedPoints={routedPoints}
      />
      {isReconnectable && (hovering || edge.selected) && (
        <>
          <EdgeAnchor
            x={src.x}
            y={src.y}
            position={src.position}
            type="source"
            onPointerDown={(e) => handleReconnect('source', e, src, tgt)}
          />
          <EdgeAnchor
            x={tgt.x}
            y={tgt.y}
            position={tgt.position}
            type="target"
            onPointerDown={(e) => handleReconnect('target', e, src, tgt)}
          />
        </>
      )}
    </g>
  );
}

export default memo(EdgeWrapper);
