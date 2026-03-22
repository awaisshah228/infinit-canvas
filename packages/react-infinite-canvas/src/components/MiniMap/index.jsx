import { useRef, useEffect, useCallback } from 'react';
import { useCanvasStore } from '../../context/InfiniteCanvasContext.js';

const DEFAULT_NODE_WIDTH = 160;
const DEFAULT_NODE_HEIGHT = 60;

export default function MiniMap({
  width = 200,
  height = 150,
  nodeColor = '#3b82f6',
  nodeStrokeColor = '#fff',
  maskColor = 'rgba(0,0,0,0.1)',
  style = {},
  className = '',
}) {
  const store = useCanvasStore();
  const canvasRef = useRef(null);
  const frameRef = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const nodes = store.nodesRef.current;
    if (!nodes.length) return;

    // Compute bounds of all nodes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
      const nw = n.width || DEFAULT_NODE_WIDTH;
      const nh = n.height || DEFAULT_NODE_HEIGHT;
      if (n.position.x < minX) minX = n.position.x;
      if (n.position.y < minY) minY = n.position.y;
      if (n.position.x + nw > maxX) maxX = n.position.x + nw;
      if (n.position.y + nh > maxY) maxY = n.position.y + nh;
    }

    const padding = 40;
    minX -= padding; minY -= padding; maxX += padding; maxY += padding;
    const bw = maxX - minX;
    const bh = maxY - minY;
    const scale = Math.min(width / bw, height / bh);
    const offX = (width - bw * scale) / 2;
    const offY = (height - bh * scale) / 2;

    // Draw nodes
    for (const n of nodes) {
      if (n.hidden) continue;
      const nw = n.width || DEFAULT_NODE_WIDTH;
      const nh = n.height || DEFAULT_NODE_HEIGHT;
      const x = (n.position.x - minX) * scale + offX;
      const y = (n.position.y - minY) * scale + offY;
      const w = nw * scale;
      const h = nh * scale;

      ctx.fillStyle = n.selected ? '#f59e0b' : (typeof nodeColor === 'function' ? nodeColor(n) : nodeColor);
      ctx.fillRect(x, y, Math.max(w, 2), Math.max(h, 2));
    }

    // Draw viewport rectangle
    const cam = store.cameraRef.current;
    const wrap = store.wrapRef.current;
    if (wrap) {
      const rect = wrap.getBoundingClientRect();
      const vpLeft = -cam.x / cam.zoom;
      const vpTop = -cam.y / cam.zoom;
      const vpWidth = rect.width / cam.zoom;
      const vpHeight = rect.height / cam.zoom;

      // Mask area outside viewport
      ctx.fillStyle = maskColor;
      ctx.fillRect(0, 0, width, height);
      const vx = (vpLeft - minX) * scale + offX;
      const vy = (vpTop - minY) * scale + offY;
      const vw = vpWidth * scale;
      const vh = vpHeight * scale;
      ctx.clearRect(vx, vy, vw, vh);

      // Re-draw nodes on top of mask
      for (const n of nodes) {
        if (n.hidden) continue;
        const nw = n.width || DEFAULT_NODE_WIDTH;
        const nh = n.height || DEFAULT_NODE_HEIGHT;
        const x = (n.position.x - minX) * scale + offX;
        const y = (n.position.y - minY) * scale + offY;
        ctx.fillStyle = n.selected ? '#f59e0b' : (typeof nodeColor === 'function' ? nodeColor(n) : nodeColor);
        ctx.fillRect(x, y, Math.max(nw * scale, 2), Math.max(nh * scale, 2));
      }

      // Viewport border
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(vx, vy, vw, vh);
    }
  }, [store, width, height, nodeColor, nodeStrokeColor, maskColor]);

  useEffect(() => {
    let running = true;
    function loop() {
      if (!running) return;
      draw();
      frameRef.current = requestAnimationFrame(loop);
    }
    // Throttle to ~15fps to avoid perf hit
    const interval = setInterval(() => {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(loop);
    }, 66);
    draw();
    return () => { running = false; clearInterval(interval); cancelAnimationFrame(frameRef.current); };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className={`ric-minimap ${className}`}
      style={{
        position: 'absolute',
        bottom: 30,
        right: 10,
        width,
        height,
        borderRadius: 4,
        border: '1px solid rgba(0,0,0,0.1)',
        background: 'rgba(255,255,255,0.9)',
        pointerEvents: 'none',
        ...style,
      }}
    />
  );
}
