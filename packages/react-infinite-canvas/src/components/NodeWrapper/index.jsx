import { memo, useRef, useEffect, useCallback } from 'react';
import { NodeIdContext } from '../../context/NodeIdContext.js';
import { useCanvasStore } from '../../context/InfiniteCanvasContext.js';

function NodeWrapper({ node, nodeType: NodeComponent }) {
  const store = useCanvasStore();
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
        const cur = store.nodesRef.current.find((n) => n.id === node.id);
        const curW = cur?.width || cur?.measured?.width;
        const curH = cur?.height || cur?.measured?.height;
        if (Math.abs((curW || 0) - width) > 1 || Math.abs((curH || 0) - height) > 1) {
          store.onNodesChangeRef.current?.([
            { id: node.id, type: 'dimensions', dimensions: { width, height }, setAttributes: true },
          ]);
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [node.id, store]);

  // Handle pointer events directly on the custom node DOM
  // This prevents the event from bubbling to the canvas wrapper
  // and causing incorrect hit-testing
  const onPointerDown = useCallback((e) => {
    e.stopPropagation(); // Don't let wrapper handle this

    // Select this node
    if (store.onNodesChangeRef.current) {
      const changes = [];
      const isMulti = e.shiftKey;
      if (isMulti) {
        changes.push({ id: node.id, type: 'select', selected: !node.selected });
      } else {
        for (const n of store.nodesRef.current) {
          if (n.id === node.id && !n.selected) {
            changes.push({ id: n.id, type: 'select', selected: true });
          } else if (n.id !== node.id && n.selected) {
            changes.push({ id: n.id, type: 'select', selected: false });
          }
        }
      }
      if (changes.length) store.onNodesChangeRef.current(changes);
    }

    // Start drag
    const cam = store.cameraRef.current;
    const wrap = store.wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const worldX = (e.clientX - rect.left - cam.x) / cam.zoom;
    const worldY = (e.clientY - rect.top - cam.y) / cam.zoom;

    // Collect selected nodes for multi-drag
    // Important: use the INTENDED selection state, not the stale ref
    // (React state update from selection changes hasn't applied yet)
    const isMultiDrag = e.shiftKey && node.selected;
    const selectedStarts = isMultiDrag
      ? store.nodesRef.current
          .filter((n) => n.selected && n.id !== node.id)
          .map((n) => ({ id: n.id, startPos: { ...n.position } }))
      : []; // Single click = only drag this node, no others

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
    store.onNodesChangeRef.current?.(dragChanges);

    // Capture pointer on the wrapper so moves work everywhere
    wrap.setPointerCapture(e.pointerId);

    const onMove = (ev) => {
      if (!dragRef.current) return;
      const cam = store.cameraRef.current;
      const rect = wrap.getBoundingClientRect();
      const wx = (ev.clientX - rect.left - cam.x) / cam.zoom;
      const wy = (ev.clientY - rect.top - cam.y) / cam.zoom;
      const dx = wx - dragRef.current.startMouse.x;
      const dy = wy - dragRef.current.startMouse.y;

      let newPos = { x: dragRef.current.startPos.x + dx, y: dragRef.current.startPos.y + dy };
      // Snap to grid if enabled
      if (store.snapToGrid && store.snapGrid) {
        newPos = {
          x: store.snapGrid[0] * Math.round(newPos.x / store.snapGrid[0]),
          y: store.snapGrid[1] * Math.round(newPos.y / store.snapGrid[1]),
        };
      }
      // Clamp to parent boundary if extent === 'parent'
      if (node.parentId && node.extent === 'parent') {
        const parent = store.nodesRef.current.find((n) => n.id === node.parentId);
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

      const changes = [{ id: node.id, type: 'position', position: newPos, dragging: true }];
      for (const s of dragRef.current.selectedStarts) {
        let sPos = { x: s.startPos.x + dx, y: s.startPos.y + dy };
        if (store.snapToGrid && store.snapGrid) {
          sPos = {
            x: store.snapGrid[0] * Math.round(sPos.x / store.snapGrid[0]),
            y: store.snapGrid[1] * Math.round(sPos.y / store.snapGrid[1]),
          };
        }
        changes.push({ id: s.id, type: 'position', position: sPos, dragging: true });
      }
      store.onNodesChangeRef.current?.(changes);
    };

    const onUp = (ev) => {
      if (!dragRef.current) return;
      const changes = [{ id: node.id, type: 'position', dragging: false }];
      for (const s of dragRef.current.selectedStarts) {
        changes.push({ id: s.id, type: 'position', dragging: false });
      }
      store.onNodesChangeRef.current?.(changes);
      dragRef.current = null;
      wrap.removeEventListener('pointermove', onMove);
      wrap.removeEventListener('pointerup', onUp);
    };

    wrap.addEventListener('pointermove', onMove);
    wrap.addEventListener('pointerup', onUp);
  }, [node, store]);

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
        store.onNodesChangeRef.current?.([{ id: node.id, type: 'select', selected: false }]);
        return;
      case 'Delete':
      case 'Backspace':
        if (node.deletable !== false) {
          store.onNodesChangeRef.current?.([{ id: node.id, type: 'remove' }]);
        }
        return;
      default: return;
    }
    e.preventDefault();
    const newPos = { x: node.position.x + dx, y: node.position.y + dy };
    const changes = [{ id: node.id, type: 'position', position: newPos }];
    // Move all selected nodes together
    for (const n of store.nodesRef.current) {
      if (n.selected && n.id !== node.id) {
        changes.push({ id: n.id, type: 'position', position: { x: n.position.x + dx, y: n.position.y + dy } });
      }
    }
    store.onNodesChangeRef.current?.(changes);
  }, [node, store]);

  const nw = node.width || node.measured?.width;
  const nh = node.height || node.measured?.height;

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
          cursor: node.dragging ? 'grabbing' : 'grab',
          userSelect: 'none',
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
      </div>
    </NodeIdContext.Provider>
  );
}

export default memo(NodeWrapper);
