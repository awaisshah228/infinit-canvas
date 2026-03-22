// ── OffscreenCanvas Web Worker ───────────────────────────────────────
// Optimized: spatial grid, batched rendering, LOD, throttled HUD

let canvas = null;
let ctx = null;
let W = 0;
let H = 0;

let camera = { x: 0, y: 0, zoom: 1 };
let cards = [];
let dark = false;
let renderScheduled = false;

// ── Pre-computed theme colors ───────────────────────────────────────
let COLORS = {};
function updateColors() {
  COLORS = {
    grid: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
    origin: dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
    cardBg: dark ? '#2a2a28' : '#ffffff',
    cardBorder: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    cardShadow: dark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.06)',
    titleText: 'rgba(255,255,255,0.9)',
    bodyText: dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)',
    coordText: dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)',
  };
}
updateColors();

const CARD_PALETTE = ['#534AB7', '#0F6E56', '#993C1D', '#185FA5'];
const CARD_RADIUS = 8;
const FONT_TITLE = '500 11px system-ui, sans-serif';
const FONT_BODY = '400 11px system-ui, sans-serif';
const FONT_COORD = '10px monospace';

// ── Spatial grid for O(1) frustum culling ───────────────────────────
const CELL_SIZE = 400;
let spatialGrid = {};
let gridDirty = true;

function rebuildSpatialGrid() {
  spatialGrid = {};
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    const minCX = Math.floor(c.x / CELL_SIZE);
    const minCY = Math.floor(c.y / CELL_SIZE);
    const maxCX = Math.floor((c.x + c.w) / CELL_SIZE);
    const maxCY = Math.floor((c.y + c.h) / CELL_SIZE);
    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const key = cx + ',' + cy;
        if (!spatialGrid[key]) spatialGrid[key] = [];
        spatialGrid[key].push(i);
      }
    }
  }
  gridDirty = false;
}

function getVisibleCardIndices(wl, wt, wr, wb) {
  if (gridDirty) rebuildSpatialGrid();
  const seen = new Set();
  const result = [];
  const minCX = Math.floor(wl / CELL_SIZE);
  const minCY = Math.floor(wt / CELL_SIZE);
  const maxCX = Math.floor(wr / CELL_SIZE);
  const maxCY = Math.floor(wb / CELL_SIZE);
  for (let cx = minCX; cx <= maxCX; cx++) {
    for (let cy = minCY; cy <= maxCY; cy++) {
      const bucket = spatialGrid[cx + ',' + cy];
      if (!bucket) continue;
      for (let j = 0; j < bucket.length; j++) {
        if (!seen.has(bucket[j])) {
          seen.add(bucket[j]);
          result.push(bucket[j]);
        }
      }
    }
  }
  return result;
}

// ── FPS tracking ────────────────────────────────────────────────────
let lastFrameTime = 0;
let frameCount = 0;
let fps = 0;
let lastHudTime = 0;

// ── Receive messages from main thread ───────────────────────────────
self.onmessage = (e) => {
  const { type, data } = e.data;

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
      updateColors();
      gridDirty = true;
      render();
      break;

    case 'resize':
      W = data.width;
      H = data.height;
      canvas.width = W;
      canvas.height = H;
      render();
      break;

    case 'camera':
      camera = data.camera;
      scheduleRender();
      break;

    case 'cards':
      cards = data.cards;
      gridDirty = true;
      scheduleRender();
      break;

    case 'theme':
      dark = data.dark;
      updateColors();
      scheduleRender();
      break;
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

// ── Main render function (optimized multi-pass) ─────────────────────
function render() {
  if (!ctx) return;
  const t0 = performance.now();

  ctx.clearRect(0, 0, W, H);

  // ── Grid (skip if too zoomed out) ─────────────────────────────
  const step = 40 * camera.zoom;
  if (step > 2) {
    const sx = ((camera.x % step) + step) % step;
    const sy = ((camera.y % step) + step) % step;
    ctx.beginPath();
    ctx.strokeStyle = COLORS.grid;
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
  }

  // ── Origin dot ────────────────────────────────────────────────
  ctx.beginPath();
  ctx.arc(camera.x, camera.y, 4 * camera.zoom, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.origin;
  ctx.fill();

  // ── World-space transform ─────────────────────────────────────
  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.scale(camera.zoom, camera.zoom);

  // ── Frustum culling via spatial grid ──────────────────────────
  const worldLeft = -camera.x / camera.zoom;
  const worldTop = -camera.y / camera.zoom;
  const worldRight = worldLeft + W / camera.zoom;
  const worldBottom = worldTop + H / camera.zoom;

  const visible = getVisibleCardIndices(worldLeft, worldTop, worldRight, worldBottom);
  const visibleCount = visible.length;

  // ── LOD: skip details at low zoom ─────────────────────────────
  const showText = camera.zoom > 0.15;
  const showCoords = camera.zoom > 0.3;
  const showShadow = camera.zoom > 0.08 && visibleCount < 200;

  // ── PASS 1: Shadows (batched) ─────────────────────────────────
  if (showShadow) {
    ctx.shadowColor = COLORS.cardShadow;
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = COLORS.cardBg;
    ctx.beginPath();
    for (let i = 0; i < visibleCount; i++) {
      const c = cards[visible[i]];
      ctx.roundRect(c.x, c.y, c.w, c.h, CARD_RADIUS);
    }
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  // ── PASS 2: Card backgrounds (single batch if no shadow) ──────
  if (!showShadow) {
    ctx.fillStyle = COLORS.cardBg;
    ctx.beginPath();
    for (let i = 0; i < visibleCount; i++) {
      const c = cards[visible[i]];
      ctx.roundRect(c.x, c.y, c.w, c.h, CARD_RADIUS);
    }
    ctx.fill();
  }

  // ── PASS 3: Card borders (single batch) ───────────────────────
  ctx.strokeStyle = COLORS.cardBorder;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (let i = 0; i < visibleCount; i++) {
    const c = cards[visible[i]];
    ctx.roundRect(c.x, c.y, c.w, c.h, CARD_RADIUS);
  }
  ctx.stroke();

  // ── PASS 4: Headers (batched by color — 4 draw calls max) ────
  const headerBuckets = [[], [], [], []];
  for (let i = 0; i < visibleCount; i++) {
    const idx = visible[i];
    headerBuckets[idx % 4].push(cards[idx]);
  }
  for (let ci = 0; ci < 4; ci++) {
    const bucket = headerBuckets[ci];
    if (bucket.length === 0) continue;
    ctx.fillStyle = CARD_PALETTE[ci];
    ctx.beginPath();
    for (let j = 0; j < bucket.length; j++) {
      const c = bucket[j];
      ctx.roundRect(c.x, c.y, c.w, 30, [CARD_RADIUS, CARD_RADIUS, 0, 0]);
    }
    ctx.fill();
  }

  // ── PASS 5: Text (batched by font — 3 draw calls max) ────────
  if (showText) {
    ctx.fillStyle = COLORS.titleText;
    ctx.font = FONT_TITLE;
    for (let i = 0; i < visibleCount; i++) {
      const c = cards[visible[i]];
      ctx.fillText(c.title, c.x + 12, c.y + 19);
    }

    ctx.fillStyle = COLORS.bodyText;
    ctx.font = FONT_BODY;
    for (let i = 0; i < visibleCount; i++) {
      const c = cards[visible[i]];
      ctx.fillText(c.body, c.x + 12, c.y + 52);
    }

    if (showCoords) {
      ctx.fillStyle = COLORS.coordText;
      ctx.font = FONT_COORD;
      for (let i = 0; i < visibleCount; i++) {
        const c = cards[visible[i]];
        ctx.fillText('(' + c.x + ', ' + c.y + ')', c.x + 12, c.y + 75);
      }
    }
  }

  ctx.restore();

  // ── HUD (throttled to every 100ms) ────────────────────────────
  const renderMs = (performance.now() - t0).toFixed(1);
  frameCount++;
  const now = performance.now();
  if (now - lastFrameTime >= 1000) {
    fps = frameCount;
    frameCount = 0;
    lastFrameTime = now;
  }

  if (now - lastHudTime >= 100) {
    lastHudTime = now;
    const wx = Math.round(-camera.x / camera.zoom);
    const wy = Math.round(-camera.y / camera.zoom);
    self.postMessage({
      type: 'hud',
      data: { wx, wy, zoom: camera.zoom.toFixed(2), renderMs, fps, visible: visibleCount },
    });
  }
}
