import { memo, useRef, useEffect, useCallback } from 'react';
import { NodeIdContext } from '../../context/NodeIdContext.js';
import { useCanvasStore } from '../../context/InfiniteCanvasContext.js';

function NodeWrapper({ node, nodeType: NodeComponent }) {
  const store = useCanvasStore();
  const storeRef = useRef(store);
  storeRef.current = store;
  const wrapperRef = useRef(null);
  const pos = node._absolutePosition || node.position;
  const dragRef = useRef(null);

  // Measure DOM dimensions and sync back to node
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        const s = storeRef.current;
        const cur = s.nodesRef.current.find((n) => n.id === node.id);
        const curW = cur?.width || cur?.measured?.width;
        const curH = cur?.height || cur?.measured?.height;
        if (Math.abs((curW || 0) - width) > 1 || Math.abs((curH || 0) - height) > 1) {
          s.onNodesChangeRef.current?.([
            { id: node.id, type: 'dimensions', dimensions: { width, height }, setAttributes: true },
          ]);
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [node.id]);

  // Handle pointer events directly on the custom node DOM
  // This prevents the event from bubbling to the canvas wrapper
  // and causing incorrect hit-testing
  const onPointerDown = useCallback((e) => {
    e.stopPropagation(); // Always prevent canvas pan/zoom from triggering

    // Skip node drag for interactive elements and elements with 'nodrag' class
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON' ||
        tag === 'A' || tag === 'LABEL' || e.target.isContentEditable) return;
    const noDragCls = storeRef.current.noDragClassName || 'nodrag';
    const noPanCls = storeRef.current.noPanClassName || 'nopan';
    let target = e.target;
    while (target && target !== wrapperRef.current) {
      if (target.classList?.contains(noDragCls) || target.classList?.contains(noPanCls)) return;
      target = target.parentElement;
    }

    // Select this node
    if (storeRef.current.onNodesChangeRef.current) {
      const changes = [];
      const isMulti = e.shiftKey;
      if (isMulti) {
        changes.push({ id: node.id, type: 'select', selected: !node.selected });
      } else {
        for (const n of storeRef.current.nodesRef.current) {
          if (n.id === node.id && !n.selected) {
            changes.push({ id: n.id, type: 'select', selected: true });
          } else if (n.id !== node.id && n.selected) {
            changes.push({ id: n.id, type: 'select', selected: false });
          }
        }
      }
      if (changes.length) storeRef.current.onNodesChangeRef.current(changes);
    }

    // Start drag
    const cam = storeRef.current.cameraRef.current;
    const wrap = storeRef.current.wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const worldX = (e.clientX - rect.left - cam.x) / cam.zoom;
    const worldY = (e.clientY - rect.top - cam.y) / cam.zoom;

    // Collect selected nodes for multi-drag
    // Important: use the INTENDED selection state, not the stale ref
    // (React state update from selection changes hasn't applied yet)
    // Multi-drag when the clicked node is already selected (drag all selected together).
    // Works for both Shift+drag and clicking an already-selected node (e.g. after Ctrl+A).
    const isMultiDrag = node.selected;
    const selectedStarts = isMultiDrag
      ? storeRef.current.nodesRef.current
          .filter((n) => n.selected && n.id !== node.id)
          .map((n) => ({ id: n.id, startPos: { ...n.position } }))
      : [];

    dragRef.current = {
      startPos: { ...node.position },
      startMouse: { x: worldX, y: worldY },
      selectedStarts,
    };

    // Mark as dragging
    const dragChanges = [{ id: node.id, type: 'position', dragging: true }];
    for (const s of selectedStarts) {
      dragChanges.push({ id: s.id, type: 'position', dragging: true });
    }
    storeRef.current.onNodesChangeRef.current?.(dragChanges);

    // Capture pointer on the node wrapper element (not the canvas wrap)
    // so pointer events don't trigger canvas pan/zoom handlers
    const el = wrapperRef.current;
    if (el) el.setPointerCapture(e.pointerId);

    // During drag: update DOM directly + send lightweight position to worker.
    // NO React state updates until drag ends — avoids 5000-node recomputation per frame.
    let latestPositions = null; // for final commit

    const onMove = (ev) => {
      if (!dragRef.current) return;
      const cam = storeRef.current.cameraRef.current;
      const rect = wrap.getBoundingClientRect();
      const wx = (ev.clientX - rect.left - cam.x) / cam.zoom;
      const wy = (ev.clientY - rect.top - cam.y) / cam.zoom;
      const dx = wx - dragRef.current.startMouse.x;
      const dy = wy - dragRef.current.startMouse.y;

      let newPos = { x: dragRef.current.startPos.x + dx, y: dragRef.current.startPos.y + dy };
      // Snap to grid if enabled
      if (storeRef.current.snapToGrid && storeRef.current.snapGrid) {
        newPos = {
          x: storeRef.current.snapGrid[0] * Math.round(newPos.x / storeRef.current.snapGrid[0]),
          y: storeRef.current.snapGrid[1] * Math.round(newPos.y / storeRef.current.snapGrid[1]),
        };
      }
      // Clamp to parent boundary if extent === 'parent'
      if (node.parentId && node.extent === 'parent') {
        const parent = storeRef.current.nodesRef.current.find((n) => n.id === node.parentId);
        if (parent) {
          const pw = parent.width || 160;
          const ph = parent.height || 60;
          const cw = node.width || node.measured?.width || 160;
          const ch = node.height || node.measured?.height || 60;
          newPos = {
            x: Math.max(0, Math.min(newPos.x, pw - cw)),
            y: Math.max(0, Math.min(newPos.y, ph - ch)),
          };
        }
      }

      // Immediately update DOM position (bypass React for smooth dragging)
      if (el) {
        el.style.left = newPos.x + 'px';
        el.style.top = newPos.y + 'px';
      }

      // Build positions for worker + other selected nodes
      const updates = [{ id: node.id, position: newPos, _absolutePosition: newPos, dragging: true }];
      for (const s of dragRef.current.selectedStarts) {
        let sPos = { x: s.startPos.x + dx, y: s.startPos.y + dy };
        if (storeRef.current.snapToGrid && storeRef.current.snapGrid) {
          sPos = {
            x: storeRef.current.snapGrid[0] * Math.round(sPos.x / storeRef.current.snapGrid[0]),
            y: storeRef.current.snapGrid[1] * Math.round(sPos.y / storeRef.current.snapGrid[1]),
          };
        }
        const sEl = wrap.querySelector(`[data-nodeid="${s.id}"]`);
        if (sEl) {
          sEl.style.left = sPos.x + 'px';
          sEl.style.top = sPos.y + 'px';
        }
        updates.push({ id: s.id, position: sPos, _absolutePosition: sPos, dragging: true });
      }

      // Send lightweight position update directly to worker (no React, no 5000-node rebuild)
      storeRef.current.workerRef?.current?.postMessage({
        type: 'nodePositions',
        data: { updates },
      });

      // Also update nodesRef so other code sees current positions.
      // Clone the node objects to avoid mutating the immutable store state.
      for (const u of updates) {
        const idx = storeRef.current.nodesRef.current.findIndex((nd) => nd.id === u.id);
        if (idx >= 0) {
          storeRef.current.nodesRef.current[idx] = { ...storeRef.current.nodesRef.current[idx], position: u.position };
        }
      }

      latestPositions = updates;
    };

    const onUp = (ev) => {
      if (!dragRef.current) return;

      // Immediately tell worker drag ended (resets activeDragCount → config rendering resumes)
      const dragEndUpdates = [{ id: node.id, position: node.position, dragging: false }];
      for (const s of dragRef.current.selectedStarts) {
        dragEndUpdates.push({ id: s.id, position: s.startPos, dragging: false });
      }
      // Use final positions if available
      if (latestPositions) {
        for (let i = 0; i < latestPositions.length; i++) {
          dragEndUpdates[i] = { id: latestPositions[i].id, position: latestPositions[i].position, dragging: false };
        }
      }
      storeRef.current.workerRef?.current?.postMessage({
        type: 'nodePositions',
        data: { updates: dragEndUpdates },
      });

      // Commit final positions to React state (single update, not per-frame)
      const changes = [];
      for (const u of dragEndUpdates) {
        changes.push({ id: u.id, type: 'position', position: u.position, dragging: false });
      }
      storeRef.current.onNodesChangeRef.current?.(changes);
      dragRef.current = null;
      latestPositions = null;
      if (el) el.releasePointerCapture(ev.pointerId);
      el?.removeEventListener('pointermove', onMove);
      el?.removeEventListener('pointerup', onUp);
    };

    el?.addEventListener('pointermove', onMove);
    el?.addEventListener('pointerup', onUp);
  }, [node]);

  // Keyboard navigation — arrow keys move selected nodes
  const onKeyDown = useCallback((e) => {
    if (!node.selected) return;
    const step = e.shiftKey ? 10 : 1;
    let dx = 0, dy = 0;
    switch (e.key) {
      case 'ArrowUp': dy = -step; break;
      case 'ArrowDown': dy = step; break;
      case 'ArrowLeft': dx = -step; break;
      case 'ArrowRight': dx = step; break;
      case 'Escape':
        // Deselect on Escape
        storeRef.current.onNodesChangeRef.current?.([{ id: node.id, type: 'select', selected: false }]);
        return;
      case 'Delete':
      case 'Backspace':
        if (node.deletable !== false) {
          storeRef.current.onNodesChangeRef.current?.([{ id: node.id, type: 'remove' }]);
        }
        return;
      default: return;
    }
    e.preventDefault();
    const newPos = { x: node.position.x + dx, y: node.position.y + dy };
    const changes = [{ id: node.id, type: 'position', position: newPos }];
    // Move all selected nodes together
    for (const n of storeRef.current.nodesRef.current) {
      if (n.selected && n.id !== node.id) {
        changes.push({ id: n.id, type: 'position', position: { x: n.position.x + dx, y: n.position.y + dy } });
      }
    }
    storeRef.current.onNodesChangeRef.current?.(changes);
  }, [node]);

  const nw = node.width || node.measured?.width;
  const nh = node.height || node.measured?.height;
  const hasDimensions = !!(nw && nh);

  const isPinned = store.pinnedNodeIds?.has(node.id);
  const onTogglePin = useCallback((e) => {
    e.stopPropagation();
    storeRef.current.togglePinNode?.(node.id);
  }, [node.id]);

  return (
    <NodeIdContext.Provider value={node.id}>
      <div
        ref={wrapperRef}
        className={`ric-node-wrapper ${node.selected ? 'selected' : ''} ${node.dragging ? 'dragging' : ''}`}
        style={{
          position: 'absolute',
          left: pos.x,
          top: pos.y,
          zIndex: node.type === 'group' ? 0 : (node.zIndex || 1),
          pointerEvents: node.type === 'group' ? 'none' : 'all',
          visibility: hasDimensions ? 'visible' : 'hidden',
          outline: 'none',
        }}
        data-nodeid={node.id}
        tabIndex={node.selectable !== false ? 0 : undefined}
        role="button"
        aria-label={`Node ${node.data?.label || node.id}`}
        aria-selected={!!node.selected}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
      >
        <NodeComponent
          id={node.id}
          data={node.data}
          type={node.type}
          selected={!!node.selected}
          dragging={!!node.dragging}
          draggable={node.draggable !== false}
          selectable={node.selectable !== false}
          deletable={node.deletable !== false}
          isConnectable={node.connectable !== false}
          zIndex={node.zIndex || 0}
          positionAbsoluteX={pos.x}
          positionAbsoluteY={pos.y}
          width={nw}
          height={nh}
          sourcePosition={node.sourcePosition}
          targetPosition={node.targetPosition}
          parentId={node.parentId}
          dragHandle={node.dragHandle}
        />
        {/* Pin button — keeps this node in DOM even when deselected */}
        {store.togglePinNode && (
          <button
            className="ric-pin-btn nodrag"
            onClick={onTogglePin}
            title={isPinned ? 'Unpin from DOM' : 'Pin to DOM'}
            style={{
              position: 'absolute',
              top: -8,
              left: -8,
              width: 20,
              height: 20,
              borderRadius: '50%',
              border: '1.5px solid ' + (isPinned ? '#3b82f6' : '#ccc'),
              background: isPinned ? '#3b82f6' : '#fff',
              color: isPinned ? '#fff' : '#999',
              fontSize: 10,
              lineHeight: '16px',
              textAlign: 'center',
              cursor: 'pointer',
              padding: 0,
              zIndex: 10,
              pointerEvents: 'all',
              boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
            }}
          >
            {isPinned ? '📌' : '📌'}
          </button>
        )}
      </div>
    </NodeIdContext.Provider>
  );
}

export default memo(NodeWrapper);
