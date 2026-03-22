// ── Input event handlers ────────────────────────────────────────────
// Pan via pointer drag, zoom via scroll wheel. Both update camera
// state on the main thread and send it to the worker for rendering.

import { camera } from './state.js';
import { sendCamera } from './worker-bridge.js';

export function setupEvents(wrap) {
  let dragging = false;
  let lastPt = null;

  // ── Pan (pointer drag) ────────────────────────────────────────
  wrap.addEventListener('pointerdown', (e) => {
    dragging = true;
    wrap.classList.add('dragging');
    wrap.setPointerCapture(e.pointerId);
    lastPt = { x: e.clientX, y: e.clientY };
  });

  wrap.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    camera.x += e.clientX - lastPt.x;
    camera.y += e.clientY - lastPt.y;
    lastPt = { x: e.clientX, y: e.clientY };
    sendCamera(camera);
  });

  wrap.addEventListener('pointerup', () => {
    dragging = false;
    wrap.classList.remove('dragging');
  });

  // ── Zoom (scroll wheel) ──────────────────────────────────────
  // Scales around cursor position, clamped between 0.1x and 4x
  wrap.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.92 : 1.08;
    const rect = wrap.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    camera.x = mx - (mx - camera.x) * factor;
    camera.y = my - (my - camera.y) * factor;
    camera.zoom = Math.min(4, Math.max(0.1, camera.zoom * factor));
    sendCamera(camera);
  }, { passive: false });
}
