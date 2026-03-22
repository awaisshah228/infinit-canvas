// ── OffscreenCanvas Web Worker ───────────────────────────────────────
// All rendering happens here, off the main thread, so pointer/wheel
// events on the main thread are never blocked by draw calls.

let canvas = null;
let ctx = null;
let W = 0;
let H = 0;

// State received from main thread
let camera = { x: 0, y: 0, zoom: 1 };
let cards = [];
let dark = false;

// Render scheduling — coalesce multiple state updates per frame
let renderScheduled = false;

const CARD_COLORS = ['#534AB7', '#0F6E56', '#993C1D', '#185FA5'];
const CARD_RADIUS = 8;

// ── Receive messages from main thread ───────────────────────────────
self.onmessage = (e) => {
  const { type, data } = e.data;

  switch (type) {
    // Initial setup: receive the OffscreenCanvas
    case 'init':
      canvas = data.canvas;
      ctx = canvas.getContext('2d');
      W = data.width;
      H = data.height;
      camera = data.camera;
      cards = data.cards;
      dark = data.dark;
      render();
      break;

    // Resize the canvas dimensions
    case 'resize':
      W = data.width;
      H = data.height;
      canvas.width = W;
      canvas.height = H;
      render();
      break;

    // Camera update (pan/zoom) — schedule a render
    case 'camera':
      camera = data.camera;
      scheduleRender();
      break;

    // Cards list updated (add card)
    case 'cards':
      cards = data.cards;
      scheduleRender();
      break;

    // Theme changed
    case 'theme':
      dark = data.dark;
      scheduleRender();
      break;
  }
};

// ── Batched rendering via rAF ───────────────────────────────────────
// Multiple camera updates between frames are coalesced into one paint.
function scheduleRender() {
  if (renderScheduled) return;
  renderScheduled = true;
  requestAnimationFrame(() => {
    renderScheduled = false;
    render();
  });
}

// ── Main render function ────────────────────────────────────────────
function render() {
  if (!ctx) return;

  ctx.clearRect(0, 0, W, H);

  // ── Grid ──────────────────────────────────────────────────────
  // Modulo-based tiling: only visible grid lines are drawn
  const step = 40 * camera.zoom;
  const sx = ((camera.x % step) + step) % step;
  const sy = ((camera.y % step) + step) % step;

  ctx.beginPath();
  ctx.strokeStyle = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  ctx.lineWidth = 0.5;

  // Snap to pixel grid for crisp lines
  for (let x = sx; x < W; x += step) {
    const snapped = Math.round(x) + 0.5;
    ctx.moveTo(snapped, 0);
    ctx.lineTo(snapped, H);
  }
  for (let y = sy; y < H; y += step) {
    const snapped = Math.round(y) + 0.5;
    ctx.moveTo(0, snapped);
    ctx.lineTo(W, snapped);
  }
  ctx.stroke();

  // ── Origin dot ────────────────────────────────────────────────
  ctx.beginPath();
  ctx.arc(camera.x, camera.y, 4 * camera.zoom, 0, Math.PI * 2);
  ctx.fillStyle = dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)';
  ctx.fill();

  // ── World-space transform ─────────────────────────────────────
  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.scale(camera.zoom, camera.zoom);

  // ── Frustum culling bounds ────────────────────────────────────
  const worldLeft   = -camera.x / camera.zoom;
  const worldTop    = -camera.y / camera.zoom;
  const worldRight  = worldLeft + W / camera.zoom;
  const worldBottom = worldTop + H / camera.zoom;

  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];

    // Skip off-screen cards
    if (c.x + c.w < worldLeft || c.x > worldRight ||
        c.y + c.h < worldTop  || c.y > worldBottom) {
      continue;
    }

    // Shadow
    ctx.shadowColor = dark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.08)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;

    // Card background
    ctx.beginPath();
    ctx.roundRect(c.x, c.y, c.w, c.h, CARD_RADIUS);
    ctx.fillStyle = dark ? '#2a2a28' : '#ffffff';
    ctx.fill();
    ctx.shadowColor = 'transparent';

    // Border
    ctx.strokeStyle = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Header strip
    ctx.beginPath();
    ctx.roundRect(c.x, c.y, c.w, 30, [CARD_RADIUS, CARD_RADIUS, 0, 0]);
    ctx.fillStyle = CARD_COLORS[i % CARD_COLORS.length];
    ctx.fill();

    // Title
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '500 11px "Anthropic Sans", system-ui, sans-serif';
    ctx.fillText(c.title, c.x + 12, c.y + 19);

    // Body
    ctx.fillStyle = dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)';
    ctx.font = '400 11px "Anthropic Sans", system-ui, sans-serif';
    ctx.fillText(c.body, c.x + 12, c.y + 52);

    // Coordinate label
    ctx.fillStyle = dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)';
    ctx.font = '10px monospace';
    ctx.fillText(`(${c.x}, ${c.y})`, c.x + 12, c.y + 75);
  }

  ctx.restore();

  // ── Send HUD data back to main thread ─────────────────────────
  const wx = Math.round(-camera.x / camera.zoom);
  const wy = Math.round(-camera.y / camera.zoom);
  self.postMessage({
    type: 'hud',
    data: { wx, wy, zoom: camera.zoom.toFixed(2) },
  });
}
