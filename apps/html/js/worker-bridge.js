// ── Web Worker bridge ───────────────────────────────────────────────
// Sets up the OffscreenCanvas worker and provides a function to send
// camera updates. All rendering happens in the worker thread.

import { camera, cards } from './state.js';

let worker = null;

// Initialize the worker with the OffscreenCanvas and initial state
export function initWorker(canvas, wrap, infoEl) {
  const offscreen = canvas.transferControlToOffscreen();
  worker = new Worker('canvas.worker.js');

  const rect = wrap.getBoundingClientRect();
  worker.postMessage(
    {
      type: 'init',
      data: {
        canvas: offscreen,
        width: rect.width,
        height: rect.height,
        camera,
        cards,
        dark: matchMedia('(prefers-color-scheme: dark)').matches,
      },
    },
    [offscreen]
  );

  // Receive HUD updates from worker and display in the DOM
  worker.onmessage = (e) => {
    if (e.data.type === 'hud') {
      const { wx, wy, zoom } = e.data.data;
      infoEl.textContent = `world: (${wx}, ${wy})   zoom: ${zoom}x`;
    }
  };

  // Forward resize events to the worker
  new ResizeObserver((entries) => {
    const { width, height } = entries[0].contentRect;
    worker.postMessage({ type: 'resize', data: { width, height } });
  }).observe(wrap);

  // Forward theme changes to the worker
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    worker.postMessage({ type: 'theme', data: { dark: e.matches } });
  });
}

// Send current camera state to the worker for re-render
export function sendCamera(cam) {
  worker?.postMessage({ type: 'camera', data: { camera: { ...cam } } });
}

// Send updated cards list to the worker
export function sendCards(cardsList) {
  worker?.postMessage({ type: 'cards', data: { cards: [...cardsList] } });
}
