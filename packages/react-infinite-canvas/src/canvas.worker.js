// OffscreenCanvas Web Worker
// All rendering happens here, off the main thread.

console.log('[worker] script loaded and executing');
self.postMessage({ type: 'ping', data: { status: 'alive' } });

let canvas = null;
let ctx = null;
let W = 0;
let H = 0;

let camera = { x: 0, y: 0, zoom: 1 };
let cards = [];
let dark = false;
let gridSize = 40;

let renderScheduled = false;

const CARD_COLORS = ['#534AB7', '#0F6E56', '#993C1D', '#185FA5'];
const CARD_RADIUS = 8;

self.onmessage = (e) => {
  try {
  const { type, data } = e.data;
  console.log('[worker] received message:', type, data);

  switch (type) {
    case 'init':
      canvas = data.canvas;
      ctx = canvas.getContext('2d');
      W = data.width;
      H = data.height;
      canvas.width = W;
      canvas.height = H;
      camera = data.camera;
      cards = data.cards;
      dark = data.dark;
      if (data.gridSize) gridSize = data.gridSize;
      console.log('[worker] init complete — canvas:', W, 'x', H, '| cards:', cards.length, '| dark:', dark);
      render();
      break;

    case 'resize':
      W = data.width;
      H = data.height;
      canvas.width = W;
      canvas.height = H;
      console.log('[worker] resize:', W, 'x', H);
      render();
      break;

    case 'camera':
      camera = data.camera;
      scheduleRender();
      break;

    case 'cards':
      cards = data.cards;
      console.log('[worker] cards updated:', cards.length);
      scheduleRender();
      break;

    case 'theme':
      dark = data.dark;
      console.log('[worker] theme changed — dark:', dark);
      scheduleRender();
      break;
  }
  } catch (err) {
    console.error('[worker] error in onmessage:', err);
  }
};

function scheduleRender() {
  if (renderScheduled) return;
  renderScheduled = true;
  requestAnimationFrame(() => {
    renderScheduled = false;
    render();
  });
}

function render() {
  if (!ctx) {
    console.warn('[worker] render called but ctx is null');
    return;
  }
  console.log('[worker] render — cards:', cards.length, '| canvas:', W, 'x', H, '| camera:', JSON.stringify(camera));

  ctx.clearRect(0, 0, W, H);

  // Grid
  const step = gridSize * camera.zoom;
  const sx = ((camera.x % step) + step) % step;
  const sy = ((camera.y % step) + step) % step;

  ctx.beginPath();
  ctx.strokeStyle = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  ctx.lineWidth = 0.5;

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

  // Origin dot
  ctx.beginPath();
  ctx.arc(camera.x, camera.y, 4 * camera.zoom, 0, Math.PI * 2);
  ctx.fillStyle = dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)';
  ctx.fill();

  // World-space transform
  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.scale(camera.zoom, camera.zoom);

  // Frustum culling bounds
  const worldLeft = -camera.x / camera.zoom;
  const worldTop = -camera.y / camera.zoom;
  const worldRight = worldLeft + W / camera.zoom;
  const worldBottom = worldTop + H / camera.zoom;

  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];

    if (
      c.x + c.w < worldLeft ||
      c.x > worldRight ||
      c.y + c.h < worldTop ||
      c.y > worldBottom
    ) {
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
    ctx.font = '500 11px system-ui, sans-serif';
    ctx.fillText(c.title, c.x + 12, c.y + 19);

    // Body
    ctx.fillStyle = dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)';
    ctx.font = '400 11px system-ui, sans-serif';
    ctx.fillText(c.body, c.x + 12, c.y + 52);

    // Coordinate label
    ctx.fillStyle = dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)';
    ctx.font = '10px monospace';
    ctx.fillText('(' + c.x + ', ' + c.y + ')', c.x + 12, c.y + 75);
  }

  ctx.restore();

  // Send HUD data back to main thread
  const wx = Math.round(-camera.x / camera.zoom);
  const wy = Math.round(-camera.y / camera.zoom);
  self.postMessage({
    type: 'hud',
    data: { wx, wy, zoom: camera.zoom.toFixed(2) },
  });
}
