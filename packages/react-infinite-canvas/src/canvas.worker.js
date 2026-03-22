// OffscreenCanvas Web Worker
// All rendering happens here, off the main thread.

var canvas = null;
var ctx = null;
var W = 0;
var H = 0;

var camera = { x: 0, y: 0, zoom: 1 };
var cards = [];
var dark = false;
var gridSize = 40;
var renderScheduled = false;

// ── Performance: pre-computed theme colors ──────────────────────
var COLORS = {};
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

var CARD_PALETTE = ['#534AB7', '#0F6E56', '#993C1D', '#185FA5'];
var CARD_RADIUS = 8;
var FONT_TITLE = '500 11px system-ui, sans-serif';
var FONT_BODY = '400 11px system-ui, sans-serif';
var FONT_COORD = '10px monospace';

// ── Spatial grid for O(1) frustum culling ───────────────────────
var CELL_SIZE = 400;
var spatialGrid = {};
var gridDirty = true;

function rebuildSpatialGrid() {
  spatialGrid = {};
  for (var i = 0; i < cards.length; i++) {
    var c = cards[i];
    var minCX = Math.floor(c.x / CELL_SIZE);
    var minCY = Math.floor(c.y / CELL_SIZE);
    var maxCX = Math.floor((c.x + c.w) / CELL_SIZE);
    var maxCY = Math.floor((c.y + c.h) / CELL_SIZE);
    for (var cx = minCX; cx <= maxCX; cx++) {
      for (var cy = minCY; cy <= maxCY; cy++) {
        var key = cx + ',' + cy;
        if (!spatialGrid[key]) spatialGrid[key] = [];
        spatialGrid[key].push(i);
      }
    }
  }
  gridDirty = false;
}

function getVisibleCardIndices(wl, wt, wr, wb) {
  if (gridDirty) rebuildSpatialGrid();
  var seen = {};
  var result = [];
  var minCX = Math.floor(wl / CELL_SIZE);
  var minCY = Math.floor(wt / CELL_SIZE);
  var maxCX = Math.floor(wr / CELL_SIZE);
  var maxCY = Math.floor(wb / CELL_SIZE);
  for (var cx = minCX; cx <= maxCX; cx++) {
    for (var cy = minCY; cy <= maxCY; cy++) {
      var key = cx + ',' + cy;
      var bucket = spatialGrid[key];
      if (!bucket) continue;
      for (var j = 0; j < bucket.length; j++) {
        var idx = bucket[j];
        if (!seen[idx]) {
          seen[idx] = true;
          result.push(idx);
        }
      }
    }
  }
  return result;
}

// ── FPS tracking ────────────────────────────────────────────────
var lastFrameTime = 0;
var frameCount = 0;
var fps = 0;
var lastHudTime = 0;

console.log('[worker] script loaded');
self.postMessage({ type: 'ping', data: { status: 'alive' } });

self.onmessage = function(e) {
  try {
    var type = e.data.type;
    var data = e.data.data;

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
        updateColors();
        gridDirty = true;
        console.log('[worker] init done — canvas:', W, 'x', H, '| cards:', cards.length);
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
  } catch (err) {
    console.error('[worker] error:', err);
  }
};

function scheduleRender() {
  if (renderScheduled) return;
  renderScheduled = true;
  requestAnimationFrame(function() {
    renderScheduled = false;
    render();
  });
}

function render() {
  if (!ctx) return;
  var t0 = performance.now();

  ctx.clearRect(0, 0, W, H);

  // ── Grid ──────────────────────────────────────────────────────
  var step = gridSize * camera.zoom;
  if (step > 2) {
    var sx = ((camera.x % step) + step) % step;
    var sy = ((camera.y % step) + step) % step;
    ctx.beginPath();
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 0.5;
    for (var gx = sx; gx < W; gx += step) {
      var snx = Math.round(gx) + 0.5;
      ctx.moveTo(snx, 0);
      ctx.lineTo(snx, H);
    }
    for (var gy = sy; gy < H; gy += step) {
      var sny = Math.round(gy) + 0.5;
      ctx.moveTo(0, sny);
      ctx.lineTo(W, sny);
    }
    ctx.stroke();
  }

  // ── Origin dot ────────────────────────────────────────────────
  ctx.beginPath();
  ctx.arc(camera.x, camera.y, 4 * camera.zoom, 0, 6.2832);
  ctx.fillStyle = COLORS.origin;
  ctx.fill();

  // ── World-space transform ─────────────────────────────────────
  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.scale(camera.zoom, camera.zoom);

  // ── Frustum culling via spatial grid ──────────────────────────
  var worldLeft = -camera.x / camera.zoom;
  var worldTop = -camera.y / camera.zoom;
  var worldRight = worldLeft + W / camera.zoom;
  var worldBottom = worldTop + H / camera.zoom;

  var visible = getVisibleCardIndices(worldLeft, worldTop, worldRight, worldBottom);
  var visibleCount = visible.length;

  // ── LOD: skip details at low zoom ─────────────────────────────
  var showText = camera.zoom > 0.15;
  var showCoords = camera.zoom > 0.3;
  var showShadow = camera.zoom > 0.08 && visibleCount < 200;

  // ── PASS 1: Shadows (batched, only if few cards visible) ──────
  if (showShadow) {
    ctx.shadowColor = COLORS.cardShadow;
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = COLORS.cardBg;
    ctx.beginPath();
    for (var si = 0; si < visibleCount; si++) {
      var sc = cards[visible[si]];
      ctx.roundRect(sc.x, sc.y, sc.w, sc.h, CARD_RADIUS);
    }
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  // ── PASS 2: Card backgrounds (batched) ────────────────────────
  if (!showShadow) {
    ctx.fillStyle = COLORS.cardBg;
    ctx.beginPath();
    for (var bi = 0; bi < visibleCount; bi++) {
      var bc = cards[visible[bi]];
      ctx.roundRect(bc.x, bc.y, bc.w, bc.h, CARD_RADIUS);
    }
    ctx.fill();
  }

  // ── PASS 3: Card borders (single batch) ───────────────────────
  ctx.strokeStyle = COLORS.cardBorder;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (var bri = 0; bri < visibleCount; bri++) {
    var brc = cards[visible[bri]];
    ctx.roundRect(brc.x, brc.y, brc.w, brc.h, CARD_RADIUS);
  }
  ctx.stroke();

  // ── PASS 4: Headers (batched by color) ────────────────────────
  var headersByColor = [{}, {}, {}, {}];
  for (var hi = 0; hi < visibleCount; hi++) {
    var cidx = visible[hi];
    var colorIdx = cidx % 4;
    if (!headersByColor[colorIdx].items) headersByColor[colorIdx].items = [];
    headersByColor[colorIdx].items.push(cards[cidx]);
  }
  for (var hci = 0; hci < 4; hci++) {
    var items = headersByColor[hci].items;
    if (!items || items.length === 0) continue;
    ctx.fillStyle = CARD_PALETTE[hci];
    ctx.beginPath();
    for (var hj = 0; hj < items.length; hj++) {
      var hc = items[hj];
      ctx.roundRect(hc.x, hc.y, hc.w, 30, [CARD_RADIUS, CARD_RADIUS, 0, 0]);
    }
    ctx.fill();
  }

  // ── PASS 5: Text (batched by font) ────────────────────────────
  if (showText) {
    // Titles
    ctx.fillStyle = COLORS.titleText;
    ctx.font = FONT_TITLE;
    for (var ti = 0; ti < visibleCount; ti++) {
      var tc = cards[visible[ti]];
      ctx.fillText(tc.title, tc.x + 12, tc.y + 19);
    }

    // Bodies
    ctx.fillStyle = COLORS.bodyText;
    ctx.font = FONT_BODY;
    for (var tbi = 0; tbi < visibleCount; tbi++) {
      var tbc = cards[visible[tbi]];
      ctx.fillText(tbc.body, tbc.x + 12, tbc.y + 52);
    }

    // Coords
    if (showCoords) {
      ctx.fillStyle = COLORS.coordText;
      ctx.font = FONT_COORD;
      for (var tci = 0; tci < visibleCount; tci++) {
        var tcc = cards[visible[tci]];
        ctx.fillText('(' + tcc.x + ', ' + tcc.y + ')', tcc.x + 12, tcc.y + 75);
      }
    }
  }

  ctx.restore();

  // ── HUD (throttled to every 100ms) ────────────────────────────
  var renderMs = (performance.now() - t0).toFixed(1);
  frameCount++;
  var now = performance.now();
  if (now - lastFrameTime >= 1000) {
    fps = frameCount;
    frameCount = 0;
    lastFrameTime = now;
  }

  if (now - lastHudTime >= 100) {
    lastHudTime = now;
    var wx = Math.round(-camera.x / camera.zoom);
    var wy = Math.round(-camera.y / camera.zoom);
    self.postMessage({
      type: 'hud',
      data: { wx: wx, wy: wy, zoom: camera.zoom.toFixed(2), renderMs: renderMs, fps: fps, visible: visibleCount }
    });
  }
}
