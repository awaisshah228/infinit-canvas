import { memo, useCallback, useRef, useState, useEffect } from 'react';
import { useCanvasStore } from '../../context/InfiniteCanvasContext.js';

function SelectionBox({ selectionKeyCode = 'Shift', selectionMode = 'partial' }) {
  const store = useCanvasStore();
  const [box, setBox] = useState(null); // { startX, startY, endX, endY } in world coords
  const boxRef = useRef(null);

  useEffect(() => {
    const wrap = store.wrapRef.current;
    if (!wrap) return;

    let isSelecting = false;
    let startWorld = null;
    let keyDown = false;

    const onKeyDown = (e) => {
      if (e.key === selectionKeyCode) keyDown = true;
    };
    const onKeyUp = (e) => {
      if (e.key === selectionKeyCode) keyDown = false;
    };

    const onPointerDown = (e) => {
      // Only start selection if key is held and clicking on the pane (not a node)
      if (!keyDown) return;
      const target = e.target;
      if (target.closest('.ric-node-wrapper') || target.closest('.ric-handle')) return;

      isSelecting = true;
      const cam = store.cameraRef.current;
      const rect = wrap.getBoundingClientRect();
      const wx = (e.clientX - rect.left - cam.x) / cam.zoom;
      const wy = (e.clientY - rect.top - cam.y) / cam.zoom;
      startWorld = { x: wx, y: wy };
      setBox({ startX: wx, startY: wy, endX: wx, endY: wy });
      e.stopPropagation();
    };

    const onPointerMove = (e) => {
      if (!isSelecting || !startWorld) return;
      const cam = store.cameraRef.current;
      const rect = wrap.getBoundingClientRect();
      const wx = (e.clientX - rect.left - cam.x) / cam.zoom;
      const wy = (e.clientY - rect.top - cam.y) / cam.zoom;
      setBox({ startX: startWorld.x, startY: startWorld.y, endX: wx, endY: wy });
    };

    const onPointerUp = (e) => {
      if (!isSelecting || !startWorld) return;
      isSelecting = false;

      const cam = store.cameraRef.current;
      const rect = wrap.getBoundingClientRect();
      const wx = (e.clientX - rect.left - cam.x) / cam.zoom;
      const wy = (e.clientY - rect.top - cam.y) / cam.zoom;

      // Calculate selection rect in world coords
      const selRect = {
        x: Math.min(startWorld.x, wx),
        y: Math.min(startWorld.y, wy),
        width: Math.abs(wx - startWorld.x),
        height: Math.abs(wy - startWorld.y),
      };

      // Select nodes inside the rect
      const changes = [];
      for (const node of store.nodesRef.current) {
        const pos = node._absolutePosition || node.position;
        const nw = node.width || 160;
        const nh = node.height || 60;

        let inside;
        if (selectionMode === 'full') {
          // Node must be fully inside
          inside = pos.x >= selRect.x && pos.y >= selRect.y &&
            pos.x + nw <= selRect.x + selRect.width && pos.y + nh <= selRect.y + selRect.height;
        } else {
          // Partial overlap
          inside = pos.x + nw > selRect.x && pos.x < selRect.x + selRect.width &&
            pos.y + nh > selRect.y && pos.y < selRect.y + selRect.height;
        }

        changes.push({ id: node.id, type: 'select', selected: inside });
      }

      if (changes.length) {
        store.onNodesChangeRef.current?.(changes);
      }

      startWorld = null;
      setBox(null);
    };

    wrap.addEventListener('pointerdown', onPointerDown, true);
    wrap.addEventListener('pointermove', onPointerMove);
    wrap.addEventListener('pointerup', onPointerUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      wrap.removeEventListener('pointerdown', onPointerDown, true);
      wrap.removeEventListener('pointermove', onPointerMove);
      wrap.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [store, selectionKeyCode, selectionMode]);

  if (!box) return null;

  const cam = store.cameraRef?.current || { x: 0, y: 0, zoom: 1 };
  const x = Math.min(box.startX, box.endX);
  const y = Math.min(box.startY, box.endY);
  const w = Math.abs(box.endX - box.startX);
  const h = Math.abs(box.endY - box.startY);

  // Convert world coords to screen coords
  const screenX = x * cam.zoom + cam.x;
  const screenY = y * cam.zoom + cam.y;
  const screenW = w * cam.zoom;
  const screenH = h * cam.zoom;

  return (
    <div
      ref={boxRef}
      className="ric-selection-box"
      style={{
        position: 'absolute',
        left: screenX,
        top: screenY,
        width: screenW,
        height: screenH,
        border: '1px dashed #3b82f6',
        background: 'rgba(59, 130, 246, 0.08)',
        pointerEvents: 'none',
        zIndex: 100,
      }}
    />
  );
}

SelectionBox.displayName = 'SelectionBox';

export default memo(SelectionBox);
