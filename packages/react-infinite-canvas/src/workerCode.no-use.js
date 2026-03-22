/**
 * Worker source code — inlined as a JavaScript string.
 *
 * WHY INLINE: Vite's `new URL('./worker.js', import.meta.url)` pattern doesn't
 * work across workspace packages (the consumer's bundler can't resolve files
 * inside node_modules). By embedding the worker code as a string and creating
 * a Blob URL at runtime, the package works with any bundler.
 *
 * NOTE: Uses `var` instead of `let/const` and avoids template literals because
 * this string is embedded inside a JS template literal in the build output.
 * Backticks in the worker code would break the enclosing template literal.
 *
 * RENDERING PIPELINE:
 * 1. Receive camera/cards/theme updates via postMessage
 * 2. Coalesce multiple updates per frame via requestAnimationFrame
 * 3. On render:
 *    a. Clear canvas
 *    b. Draw background grid (modulo-based infinite tiling)
 *    c. Apply camera transform (translate + scale)
 *    d. Query spatial grid for visible cards (O(1) instead of O(n))
 *    e. Determine LOD level based on zoom
 *    f. Multi-pass batched rendering (shadows, bgs, borders, headers, text)
 *    g. Send HUD data back to main thread (throttled to 100ms)
 */
const WORKER_CODE = `
// ── Canvas state ────────────────────────────────────────────────────
// These are set once during init and updated via postMessage
var canvas = null;   // OffscreenCanvas instance (transferred from main thread)
var ctx = null;      // 2D rendering context
var W = 0;           // Canvas width in pixels
var H = 0;           // Canvas height in pixels

// ── World state (received from main thread) ─────────────────────────
var camera = { x: 0, y: 0, zoom: 1 };  // Camera: x,y = screen-space offset, zoom = scale factor
var cards = [];      // Array of { x, y, w, h, title, body } in world coordinates
var dark = false;    // Dark mode flag
var gridSize = 40;   // Background grid spacing in world pixels

// ── Render scheduling ───────────────────────────────────────────────
// Multiple postMessages can arrive between frames (e.g., fast mouse movement).
// We coalesce them into a single render via requestAnimationFrame.
var renderScheduled = false;

// ── Pre-computed theme colors ───────────────────────────────────────
// OPTIMIZATION: Instead of evaluating dark ? 'colorA' : 'colorB' per card
// per frame, we compute all colors once when theme changes.
// This eliminates thousands of conditional evaluations per render.
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

// ── Card rendering constants ────────────────────────────────────────
var CARD_PALETTE = ['#534AB7', '#0F6E56', '#993C1D', '#185FA5'];  // Header colors (cycled)
var CARD_RADIUS = 8;  // Border radius for roundRect

// OPTIMIZATION: Font strings are constants — setting ctx.font is expensive
// because the browser must parse and validate the font string each time.
// By setting it once per pass (not per card), we avoid N font parses.
var FONT_TITLE = '500 11px system-ui, sans-serif';
var FONT_BODY = '400 11px system-ui, sans-serif';
var FONT_COORD = '10px monospace';

// ── Spatial Grid Index ──────────────────────────────────────────────
// OPTIMIZATION: Instead of checking every card against the viewport (O(n)),
// we bucket cards into a grid of 400x400px cells. On each frame, we only
// check cells that overlap the viewport — typically O(1) for a small view
// of a large world.
//
// How it works:
// 1. On card insertion/update, each card is assigned to all cells it overlaps
// 2. On render, we compute which cells the viewport covers
// 3. We collect card indices from those cells (with deduplication)
//
// For 2000 cards with ~20 visible, this skips checking 99% of cards.
var CELL_SIZE = 400;      // Cell size in world pixels
var spatialGrid = {};     // Map of "cellX,cellY" -> [cardIndex, ...]
var gridDirty = true;     // True when cards change and grid needs rebuild

// Build the spatial grid from scratch. Called when cards array changes.
// Each card is inserted into every cell it overlaps (a card spanning
// multiple cells appears in all of them).
function rebuildSpatialGrid() {
  spatialGrid = {};
  for (var i = 0; i < cards.length; i++) {
    var c = cards[i];
    // Calculate the range of cells this card overlaps
    var minCX = Math.floor(c.x / CELL_SIZE);
    var minCY = Math.floor(c.y / CELL_SIZE);
    var maxCX = Math.floor((c.x + c.w) / CELL_SIZE);
    var maxCY = Math.floor((c.y + c.h) / CELL_SIZE);
    // Insert card index into every overlapping cell
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

// Query the spatial grid for all card indices visible in the given
// world-space rectangle. Returns deduplicated array of indices.
function getVisibleCardIndices(wl, wt, wr, wb) {
  if (gridDirty) rebuildSpatialGrid();
  var seen = {};       // Deduplication set (card may span multiple cells)
  var result = [];
  // Calculate which cells the viewport overlaps
  var minCX = Math.floor(wl / CELL_SIZE);
  var minCY = Math.floor(wt / CELL_SIZE);
  var maxCX = Math.floor(wr / CELL_SIZE);
  var maxCY = Math.floor(wb / CELL_SIZE);
  // Iterate over visible cells and collect unique card indices
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

// ── FPS / performance tracking ──────────────────────────────────────
var lastFrameTime = 0;  // Timestamp of last FPS reset
var frameCount = 0;     // Frames rendered since last reset
var fps = 0;            // Current FPS (updated every second)
var lastHudTime = 0;    // Timestamp of last HUD postMessage

// ── Worker lifecycle ────────────────────────────────────────────────
// Send a ping to confirm the worker script loaded and is executing.
// The main thread listens for this to verify worker health.
console.log('[worker] script loaded');
self.postMessage({ type: 'ping', data: { status: 'alive' } });

// ── Message handler: receive state updates from main thread ─────────
self.onmessage = function(e) {
  try {
    var type = e.data.type;
    var data = e.data.data;

    switch (type) {
      // INIT: First message — receive OffscreenCanvas + initial state
      case 'init':
        canvas = data.canvas;
        ctx = canvas.getContext('2d');
        W = data.width;
        H = data.height;
        canvas.width = W;    // Set pixel buffer dimensions (not CSS)
        canvas.height = H;
        camera = data.camera;
        cards = data.cards;
        dark = data.dark;
        if (data.gridSize) gridSize = data.gridSize;
        updateColors();       // Pre-compute theme colors
        gridDirty = true;     // Spatial grid needs building
        console.log('[worker] init done — canvas:', W, 'x', H, '| cards:', cards.length);
        render();             // Draw immediately (no scheduling)
        break;

      // RESIZE: Container size changed (ResizeObserver on main thread)
      case 'resize':
        W = data.width;
        H = data.height;
        canvas.width = W;
        canvas.height = H;
        render();             // Immediate render (clear + redraw at new size)
        break;

      // CAMERA: Pan/zoom update from pointer/wheel handlers
      case 'camera':
        camera = data.camera;
        scheduleRender();     // Coalesce with other updates this frame
        break;

      // CARDS: Card array updated (add/remove/modify)
      case 'cards':
        cards = data.cards;
        gridDirty = true;     // Spatial grid must be rebuilt
        scheduleRender();
        break;

      // THEME: Dark/light mode changed
      case 'theme':
        dark = data.dark;
        updateColors();       // Recompute all theme-dependent colors
        scheduleRender();
        break;
    }
  } catch (err) {
    console.error('[worker] error:', err);
  }
};

// ── Render scheduling (coalescing) ──────────────────────────────────
// Multiple camera updates can arrive between animation frames (fast mouse).
// We only render once per frame using the latest state.
function scheduleRender() {
  if (renderScheduled) return;  // Already scheduled — skip
  renderScheduled = true;
  requestAnimationFrame(function() {
    renderScheduled = false;
    render();  // Render with latest state
  });
}

// ══════════════════════════════════════════════════════════════════════
// MAIN RENDER FUNCTION — Multi-pass batched rendering
//
// Instead of per-card state changes (15+ canvas state changes per card),
// we batch by operation type. This reduces draw calls from O(n*15) to ~10
// regardless of card count.
//
// Pass 1: All shadows (1 draw call — most expensive, GPU Gaussian blur)
// Pass 2: All card backgrounds (1 draw call)
// Pass 3: All card borders (1 draw call)
// Pass 4: All headers grouped by color (4 draw calls max)
// Pass 5: All text grouped by font (3 draw calls max)
// ══════════════════════════════════════════════════════════════════════
function render() {
  if (!ctx) return;
  var t0 = performance.now();  // Start timing for renderMs

  ctx.clearRect(0, 0, W, H);

  // ── BACKGROUND GRID ───────────────────────────────────────────────
  // Infinite grid drawn using modulo-based tiling: we compute the offset
  // of the first visible grid line using modulo, then draw lines at
  // regular intervals. Only visible lines are drawn (never the full grid).
  //
  // Skip grid when step < 2px — lines would be sub-pixel and invisible.
  var step = gridSize * camera.zoom;
  if (step > 2) {
    // Calculate starting offset: modulo wraps camera offset to [0, step)
    var sx = ((camera.x % step) + step) % step;
    var sy = ((camera.y % step) + step) % step;
    ctx.beginPath();
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 0.5;
    // Vertical lines
    for (var gx = sx; gx < W; gx += step) {
      // Snap to pixel grid + 0.5 for crisp 1px lines on retina displays
      var snx = Math.round(gx) + 0.5;
      ctx.moveTo(snx, 0);
      ctx.lineTo(snx, H);
    }
    // Horizontal lines
    for (var gy = sy; gy < H; gy += step) {
      var sny = Math.round(gy) + 0.5;
      ctx.moveTo(0, sny);
      ctx.lineTo(W, sny);
    }
    ctx.stroke();  // Single stroke call for all grid lines
  }

  // ── ORIGIN DOT ────────────────────────────────────────────────────
  // Visual indicator at world origin (0,0) — helps with orientation
  ctx.beginPath();
  ctx.arc(camera.x, camera.y, 4 * camera.zoom, 0, 6.2832);  // 6.2832 = 2*PI
  ctx.fillStyle = COLORS.origin;
  ctx.fill();

  // ── WORLD-SPACE TRANSFORM ─────────────────────────────────────────
  // Apply camera transform so all subsequent drawing is in world coordinates.
  // ctx.translate moves the origin by camera offset (pan).
  // ctx.scale zooms uniformly from the transformed origin.
  // Cards at world position (200, 300) are automatically projected to
  // screen position (200*zoom + cam.x, 300*zoom + cam.y).
  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.scale(camera.zoom, camera.zoom);

  // ── FRUSTUM CULLING via spatial grid ──────────────────────────────
  // Convert viewport bounds from screen space to world space:
  //   worldX = (screenX - cam.x) / cam.zoom
  // Then query the spatial grid for cards in that rectangle.
  var worldLeft = -camera.x / camera.zoom;
  var worldTop = -camera.y / camera.zoom;
  var worldRight = worldLeft + W / camera.zoom;
  var worldBottom = worldTop + H / camera.zoom;

  var visible = getVisibleCardIndices(worldLeft, worldTop, worldRight, worldBottom);
  var visibleCount = visible.length;

  // ── LEVEL OF DETAIL (LOD) ─────────────────────────────────────────
  // At low zoom levels, text is too small to read and shadows are invisible.
  // Skip expensive operations based on zoom level and visible card count.
  var showText = camera.zoom > 0.15;     // Text readable above 15% zoom
  var showCoords = camera.zoom > 0.3;    // Coord labels above 30% zoom
  var showShadow = camera.zoom > 0.08 && visibleCount < 200;  // Shadows are expensive

  // ── PASS 1: SHADOWS (batched) ─────────────────────────────────────
  // Shadows use GPU Gaussian blur — the most expensive per-pixel operation.
  // OPTIMIZATION: Set shadow properties ONCE, then draw ALL card rects
  // in a single path. The GPU applies the blur to the entire composite
  // path, not per-card. This is ~200x faster than per-card shadows.
  //
  // When shadows are shown, this pass also draws card backgrounds
  // (shadow needs a filled shape to blur from).
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
    ctx.fill();  // ONE fill call for all cards with shadow
    // Reset shadow to prevent it from affecting subsequent draws
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  // ── PASS 2: CARD BACKGROUNDS (no-shadow fallback) ─────────────────
  // When shadows are disabled (low zoom or too many cards), draw
  // card backgrounds without shadow overhead.
  if (!showShadow) {
    ctx.fillStyle = COLORS.cardBg;
    ctx.beginPath();
    for (var bi = 0; bi < visibleCount; bi++) {
      var bc = cards[visible[bi]];
      ctx.roundRect(bc.x, bc.y, bc.w, bc.h, CARD_RADIUS);
    }
    ctx.fill();  // ONE fill call for all backgrounds
  }

  // ── PASS 3: CARD BORDERS (single batch) ───────────────────────────
  // All borders share the same color and line width — batch into one path.
  ctx.strokeStyle = COLORS.cardBorder;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (var bri = 0; bri < visibleCount; bri++) {
    var brc = cards[visible[bri]];
    ctx.roundRect(brc.x, brc.y, brc.w, brc.h, CARD_RADIUS);
  }
  ctx.stroke();  // ONE stroke call for all borders

  // ── PASS 4: HEADERS (batched by color) ────────────────────────────
  // Headers cycle through 4 colors. We group cards by their color index
  // and draw each color group in a single path. Max 4 fill calls.
  var headersByColor = [{}, {}, {}, {}];
  for (var hi = 0; hi < visibleCount; hi++) {
    var cidx = visible[hi];
    var colorIdx = cidx % 4;
    if (!headersByColor[colorIdx].items) headersByColor[colorIdx].items = [];
    headersByColor[colorIdx].items = headersByColor[colorIdx].items || [];
    headersByColor[colorIdx].items.push(cards[cidx]);
  }
  for (var hci = 0; hci < 4; hci++) {
    var items = headersByColor[hci].items;
    if (!items || items.length === 0) continue;
    ctx.fillStyle = CARD_PALETTE[hci];
    ctx.beginPath();
    for (var hj = 0; hj < items.length; hj++) {
      var hc = items[hj];
      // Header: top part of card with rounded top corners, flat bottom
      ctx.roundRect(hc.x, hc.y, hc.w, 30, [CARD_RADIUS, CARD_RADIUS, 0, 0]);
    }
    ctx.fill();  // One fill per color group
  }

  // ── PASS 5: TEXT (batched by font) ────────────────────────────────
  // OPTIMIZATION: ctx.font assignment is expensive (browser validates font).
  // By batching all text with the same font, we set ctx.font only 3 times
  // total (title, body, coords) instead of 3 times per card.
  if (showText) {
    // Sub-pass 5a: All titles (same font, same color)
    ctx.fillStyle = COLORS.titleText;
    ctx.font = FONT_TITLE;
    for (var ti = 0; ti < visibleCount; ti++) {
      var tc = cards[visible[ti]];
      ctx.fillText(tc.title, tc.x + 12, tc.y + 19);
    }

    // Sub-pass 5b: All body text
    ctx.fillStyle = COLORS.bodyText;
    ctx.font = FONT_BODY;
    for (var tbi = 0; tbi < visibleCount; tbi++) {
      var tbc = cards[visible[tbi]];
      ctx.fillText(tbc.body, tbc.x + 12, tbc.y + 52);
    }

    // Sub-pass 5c: Coordinate labels (only at higher zoom)
    if (showCoords) {
      ctx.fillStyle = COLORS.coordText;
      ctx.font = FONT_COORD;
      for (var tci = 0; tci < visibleCount; tci++) {
        var tcc = cards[visible[tci]];
        // String concat instead of template literal (no backticks in inline worker)
        ctx.fillText('(' + tcc.x + ', ' + tcc.y + ')', tcc.x + 12, tcc.y + 75);
      }
    }
  }

  // Restore canvas state (removes world-space transform)
  ctx.restore();

  // ── HUD DATA (throttled to every 100ms) ───────────────────────────
  // OPTIMIZATION: postMessage has serialization overhead. Instead of
  // sending every frame (60 messages/sec), we throttle to every 100ms
  // (10 messages/sec). The HUD only needs ~10 updates/sec to feel smooth.
  var renderMs = (performance.now() - t0).toFixed(1);
  frameCount++;
  var now = performance.now();
  // Update FPS counter every second
  if (now - lastFrameTime >= 1000) {
    fps = frameCount;
    frameCount = 0;
    lastFrameTime = now;
  }
  // Send HUD data at most every 100ms
  if (now - lastHudTime >= 100) {
    lastHudTime = now;
    var wx = Math.round(-camera.x / camera.zoom);  // World-space X coordinate
    var wy = Math.round(-camera.y / camera.zoom);  // World-space Y coordinate
    self.postMessage({
      type: 'hud',
      data: { wx: wx, wy: wy, zoom: camera.zoom.toFixed(2), renderMs: renderMs, fps: fps, visible: visibleCount }
    });
  }
}
`;

export default WORKER_CODE;
