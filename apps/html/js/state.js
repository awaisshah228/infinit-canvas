// ── Application state ───────────────────────────────────────────────
// Camera holds the current pan offset (x, y) and zoom level.
// Main thread owns the camera; worker only receives copies for rendering.
export let camera = { x: 0, y: 0, zoom: 1 };

// Note cards positioned in world coordinates
export const cards = [
  { x: 60, y: 80, w: 160, h: 90, title: 'Note A', body: 'Pan and zoom me!' },
  { x: 320, y: 140, w: 160, h: 90, title: 'Note B', body: 'I live in world space' },
  { x: -160, y: 200, w: 160, h: 90, title: 'Note C', body: 'Scroll to find me' },
  { x: 500, y: -60, w: 160, h: 90, title: 'Note D', body: 'Try zooming out!' },
];

export let cardCount = 4;

export function resetCamera() {
  camera = { x: 0, y: 0, zoom: 1 };
}

export function incrementCardCount() {
  return ++cardCount;
}
