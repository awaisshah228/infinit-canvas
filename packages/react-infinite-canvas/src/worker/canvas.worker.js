// OffscreenCanvas Web Worker
// All rendering happens here, off the main thread.

var canvas = null;
var ctx = null;
var W = 0;
var H = 0;

var camera = { x: 0, y: 0, zoom: 1 };
var cards = [];
var nodes = [];
var edges = [];
var dark = false;
var gridSize = 40;
var renderScheduled = false;
var bgVariant = 'lines'; // 'lines' | 'dots' | 'cross'
var bgSize = 1;
var bgColor = null; // null = use theme default

// Connection line being dragged (null when not connecting)
var connectingLine = null; // { from: {x,y}, to: {x,y} }

// Selection box (null when not selecting)
var selectionBox = null; // { startWorld: {x,y}, endWorld: {x,y} }

// Default node dimensions
var DEFAULT_NODE_WIDTH = 160;
var DEFAULT_NODE_HEIGHT = 60;
var NODE_RADIUS = 8;
var HANDLE_RADIUS = 5;

// Get render position (uses absolute position for sub-flow nodes)
function getNodePos(node) {
  return node._absolutePosition || node.position;
}

// Handle position helpers
function resolveHandlePos(handle, nodeX, nodeY, nw, nh) {
  if (handle.x !== undefined && handle.y !== undefined) {
    return { x: nodeX + handle.x, y: nodeY + handle.y };
  }
  var pos = handle.position || (handle.type === 'source' ? 'right' : 'left');
  switch (pos) {
    case 'top':    return { x: nodeX + nw / 2, y: nodeY };
    case 'bottom': return { x: nodeX + nw / 2, y: nodeY + nh };
    case 'left':   return { x: nodeX,          y: nodeY + nh / 2 };
    case 'right':  return { x: nodeX + nw,     y: nodeY + nh / 2 };
    default:       return { x: nodeX + nw,     y: nodeY + nh / 2 };
  }
}

// Get all handles for a node (uses node.handles or defaults)
function getNodeHandles(node) {
  var nw = node.width || DEFAULT_NODE_WIDTH;
  var nh = node.height || DEFAULT_NODE_HEIGHT;
  if (node.handles && node.handles.length > 0) {
    return node.handles.map(function(h) {
      var pos = resolveHandlePos(h, getNodePos(node).x, getNodePos(node).y, nw, nh);
      return { id: h.id || null, type: h.type, x: pos.x, y: pos.y, position: h.position };
    });
  }
  return [
    { id: null, type: 'target', x: getNodePos(node).x, y: getNodePos(node).y + nh / 2, position: 'left' },
    { id: null, type: 'source', x: getNodePos(node).x + nw, y: getNodePos(node).y + nh / 2, position: 'right' },
  ];
}

// Handle cache: avoids recomputing handles for the same node multiple times per frame
var handleCache = {};
var handleCacheDirty = true;

function getCachedHandles(node) {
  if (handleCacheDirty) {
    handleCache = {};
    handleCacheDirty = false;
  }
  var cached = handleCache[node.id];
  if (cached) return cached;
  cached = getNodeHandles(node);
  handleCache[node.id] = cached;
  return cached;
}

function findEdgeHandle(node, handleType, handleId) {
  var handles = getCachedHandles(node);
  for (var i = 0; i < handles.length; i++) {
    if (handles[i].type === handleType) {
      if (handleId) {
        if (handles[i].id === handleId) return handles[i];
      } else {
        return handles[i];
      }
    }
  }
  var nw = node.width || DEFAULT_NODE_WIDTH;
  var nh = node.height || DEFAULT_NODE_HEIGHT;
  if (handleType === 'source') {
    return { x: getNodePos(node).x + nw, y: getNodePos(node).y + nh / 2 };
  }
  return { x: getNodePos(node).x, y: getNodePos(node).y + nh / 2 };
}

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
    nodeBg: dark ? '#1e1e2e' : '#ffffff',
    nodeBorder: dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
    nodeSelectedBorder: '#3b82f6',
    nodeShadow: dark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.08)',
    nodeText: dark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)',
    edgeStroke: dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)',
    edgeSelected: '#3b82f6',
    edgeAnimated: '#3b82f6',
    handleFill: '#ffffff',
    handleBorder: '#3b82f6',
    connectionLine: '#3b82f6',
  };
  gridCacheDirty = true;
}
updateColors();

var CARD_PALETTE = ['#534AB7', '#0F6E56', '#993C1D', '#185FA5'];
var CARD_RADIUS = 8;
var FONT_TITLE = '500 11px system-ui, sans-serif';
var FONT_BODY = '400 11px system-ui, sans-serif';
var FONT_COORD = '10px monospace';
var FONT_NODE = '500 13px system-ui, sans-serif';
var FONT_EDGE_LABEL = '400 11px system-ui, sans-serif';

// ── Spatial grid for O(1) frustum culling (cards) ───────────────
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

// ── Spatial grid for nodes (O(visible) frustum culling) ─────────
var NODE_CELL_SIZE = 500;
var nodeSpatialGrid = {};
var nodeSpatialDirty = true;

function rebuildNodeSpatialGrid() {
  nodeSpatialGrid = {};
  for (var i = 0; i < nodes.length; i++) {
    var n = nodes[i];
    if (n.hidden) continue;
    var pos = getNodePos(n);
    var nw = n.width || DEFAULT_NODE_WIDTH;
    var nh = n.height || DEFAULT_NODE_HEIGHT;
    var minCX = Math.floor(pos.x / NODE_CELL_SIZE);
    var minCY = Math.floor(pos.y / NODE_CELL_SIZE);
    var maxCX = Math.floor((pos.x + nw) / NODE_CELL_SIZE);
    var maxCY = Math.floor((pos.y + nh) / NODE_CELL_SIZE);
    for (var cx = minCX; cx <= maxCX; cx++) {
      for (var cy = minCY; cy <= maxCY; cy++) {
        var key = cx + ',' + cy;
        if (!nodeSpatialGrid[key]) nodeSpatialGrid[key] = [];
        nodeSpatialGrid[key].push(i);
      }
    }
  }
  nodeSpatialDirty = false;
}

function getVisibleNodeIndices(wl, wt, wr, wb) {
  if (nodeSpatialDirty) rebuildNodeSpatialGrid();
  var seen = {};
  var result = [];
  var minCX = Math.floor(wl / NODE_CELL_SIZE);
  var minCY = Math.floor(wt / NODE_CELL_SIZE);
  var maxCX = Math.floor(wr / NODE_CELL_SIZE);
  var maxCY = Math.floor(wb / NODE_CELL_SIZE);
  for (var cx = minCX; cx <= maxCX; cx++) {
    for (var cy = minCY; cy <= maxCY; cy++) {
      var key = cx + ',' + cy;
      var bucket = nodeSpatialGrid[key];
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

// ── Node lookup for edge rendering ────────────────────────────
var nodeLookup = {};
var nodeLookupDirty = true;

function rebuildNodeLookup() {
  nodeLookup = {};
  for (var i = 0; i < nodes.length; i++) {
    nodeLookup[nodes[i].id] = nodes[i];
  }
  nodeLookupDirty = false;
}

function getNodeById(id) {
  if (nodeLookupDirty) rebuildNodeLookup();
  return nodeLookup[id];
}

// ── Edge adjacency index (maps nodeId → array of edge indices) ──
var edgeAdjacency = {};
var edgeAdjacencyDirty = true;

function rebuildEdgeAdjacency() {
  edgeAdjacency = {};
  for (var i = 0; i < edges.length; i++) {
    var e = edges[i];
    if (!edgeAdjacency[e.source]) edgeAdjacency[e.source] = [];
    edgeAdjacency[e.source].push(i);
    if (e.source !== e.target) {
      if (!edgeAdjacency[e.target]) edgeAdjacency[e.target] = [];
      edgeAdjacency[e.target].push(i);
    }
  }
  edgeAdjacencyDirty = false;
}

// ── Grid/background cache (offscreen canvas) ─────────────────────
var gridCache = null;
var gridCacheW = 0;
var gridCacheH = 0;
var gridCacheStep = 0;
var gridCacheVariant = '';
var gridCacheDirty = true;

function renderGridToCache(step) {
  if (!gridCache) {
    gridCache = new OffscreenCanvas(1, 1);
  }
  // Create a tile that covers one grid period in both directions
  // We'll tile it across the viewport
  var tileW = Math.ceil(step);
  var tileH = Math.ceil(step);
  if (tileW < 2 || tileH < 2) return false;
  // Cap tile size to avoid huge allocations
  if (tileW > 512) tileW = 512;
  if (tileH > 512) tileH = 512;
  gridCache.width = tileW;
  gridCache.height = tileH;
  gridCacheW = tileW;
  gridCacheH = tileH;
  gridCacheStep = step;
  gridCacheVariant = bgVariant;
  gridCacheDirty = false;

  var gctx = gridCache.getContext('2d');
  gctx.clearRect(0, 0, tileW, tileH);
  var gridColor = bgColor || COLORS.grid;

  if (bgVariant === 'dots') {
    gctx.fillStyle = gridColor;
    var dotR = bgSize * camera.zoom;
    gctx.beginPath();
    gctx.arc(0, 0, dotR, 0, 6.2832);
    gctx.fill();
  } else if (bgVariant === 'cross') {
    gctx.strokeStyle = gridColor;
    gctx.lineWidth = bgSize;
    var crossSize = 3 * camera.zoom;
    gctx.beginPath();
    gctx.moveTo(-crossSize, 0);
    gctx.lineTo(crossSize, 0);
    gctx.moveTo(0, -crossSize);
    gctx.lineTo(0, crossSize);
    gctx.stroke();
  } else {
    gctx.beginPath();
    gctx.strokeStyle = gridColor;
    gctx.lineWidth = bgSize * 0.5;
    gctx.moveTo(0.5, 0);
    gctx.lineTo(0.5, tileH);
    gctx.moveTo(0, 0.5);
    gctx.lineTo(tileW, 0.5);
    gctx.stroke();
  }
  return true;
}

// ── FPS tracking ────────────────────────────────────────────────
var lastFrameTime = 0;
var frameCount = 0;
var fps = 0;
var lastHudTime = 0;

// ── Edge animation ──────────────────────────────────────────────
var animOffset = 0;
var hasAnimatedEdges = false;

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
        cards = data.cards || [];
        nodes = data.nodes || [];
        edges = data.edges || [];
        dark = data.dark;
        if (data.gridSize) gridSize = data.gridSize;
        updateColors();
        gridDirty = true;
        nodeLookupDirty = true;
        nodeSpatialDirty = true;
        handleCacheDirty = true;
        edgeAdjacencyDirty = true;
        hasAnimatedEdges = edges.some(function(edge) { return edge.animated; });
        console.log('[worker] init done — canvas:', W, 'x', H, '| cards:', cards.length, '| nodes:', nodes.length, '| edges:', edges.length);
        render();
        self.postMessage({ type: 'ready' });
        if (hasAnimatedEdges) startAnimationLoop();
        break;

      case 'resize':
        W = data.width;
        H = data.height;
        canvas.width = W;
        canvas.height = H;
        gridCacheDirty = true;
        render();
        break;

      case 'camera':
        camera = data.camera;
        gridCacheDirty = true; // zoom changed = grid tile size changed
        scheduleRender();
        break;

      case 'cards':
        cards = data.cards;
        gridDirty = true;
        scheduleRender();
        break;

      case 'nodes':
        nodes = data.nodes;
        nodeLookupDirty = true;
        nodeSpatialDirty = true;
        handleCacheDirty = true;
        scheduleRender();
        self.postMessage({ type: 'nodesProcessed', data: { nodeCount: nodes.length } });
        break;

      case 'nodePositions':
        // Lightweight update: only patch positions of changed nodes (used during drag)
        if (nodeLookupDirty) rebuildNodeLookup();
        var updates = data.updates; // [{ id, position, _absolutePosition?, width?, height? }]
        for (var ui = 0; ui < updates.length; ui++) {
          var u = updates[ui];
          var existing = nodeLookup[u.id];
          if (existing) {
            existing.position = u.position;
            if (u._absolutePosition) existing._absolutePosition = u._absolutePosition;
            if (u.width !== undefined) existing.width = u.width;
            if (u.height !== undefined) existing.height = u.height;
            existing.dragging = u.dragging;
            existing.selected = u.selected;
          }
        }
        // Only invalidate handle cache (positions changed) — spatial grid rebuild is deferred
        handleCacheDirty = true;
        nodeSpatialDirty = true;
        scheduleRender();
        break;

      case 'edges':
        edges = data.edges;
        edgeAdjacencyDirty = true;
        hasAnimatedEdges = edges.some(function(edge) { return edge.animated; });
        if (hasAnimatedEdges) startAnimationLoop();
        scheduleRender();
        break;

      case 'theme':
        dark = data.dark;
        updateColors();
        scheduleRender();
        break;

      case 'connecting':
        connectingLine = data;
        scheduleRender();
        break;

      case 'selectionBox':
        selectionBox = data;
        scheduleRender();
        break;

      case 'background':
        if (data.variant) bgVariant = data.variant;
        if (data.gap) gridSize = data.gap;
        if (data.size) bgSize = data.size;
        bgColor = data.color || null;
        gridCacheDirty = true;
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

var animLoopRunning = false;
function startAnimationLoop() {
  if (animLoopRunning) return;
  animLoopRunning = true;
  function tick() {
    if (!hasAnimatedEdges) {
      animLoopRunning = false;
      return;
    }
    animOffset = (animOffset + 0.5) % 20;
    render();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ── Routed path helpers ──────────────────────────────────────
function drawRoutedPath(path, points) {
  var br = 6;
  path.moveTo(points[0].x, points[0].y);
  for (var i = 1; i < points.length - 1; i++) {
    var prev = points[i - 1], curr = points[i], next = points[i + 1];
    var dPrev = Math.abs(curr.x - prev.x) + Math.abs(curr.y - prev.y);
    var dNext = Math.abs(next.x - curr.x) + Math.abs(next.y - curr.y);
    var r = Math.min(br, dPrev / 2, dNext / 2);
    if (r > 0.5) {
      var ax = curr.x - prev.x, ay = curr.y - prev.y;
      var bx = next.x - curr.x, by = next.y - curr.y;
      var aLen = Math.sqrt(ax * ax + ay * ay) || 1;
      var bLen = Math.sqrt(bx * bx + by * by) || 1;
      path.lineTo(curr.x - (ax / aLen) * r, curr.y - (ay / aLen) * r);
      path.quadraticCurveTo(curr.x, curr.y, curr.x + (bx / bLen) * r, curr.y + (by / bLen) * r);
    } else {
      path.lineTo(curr.x, curr.y);
    }
  }
  path.lineTo(points[points.length - 1].x, points[points.length - 1].y);
}

function drawRoutedCurve(path, points) {
  if (points.length < 2) return;
  path.moveTo(points[0].x, points[0].y);
  if (points.length === 2) {
    path.lineTo(points[1].x, points[1].y);
    return;
  }
  if (points.length === 3) {
    path.quadraticCurveTo(points[1].x, points[1].y, points[2].x, points[2].y);
    return;
  }
  var tension = 0.3;
  for (var i = 0; i < points.length - 1; i++) {
    var p0 = points[i === 0 ? 0 : i - 1];
    var p1 = points[i];
    var p2 = points[i + 1];
    var p3 = points[i + 2 < points.length ? i + 2 : points.length - 1];
    var cp1x = p1.x + (p2.x - p0.x) * tension;
    var cp1y = p1.y + (p2.y - p0.y) * tension;
    var cp2x = p2.x - (p3.x - p1.x) * tension;
    var cp2y = p2.y - (p3.y - p1.y) * tension;
    path.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }
}

function getRoutedMidpoint(points) {
  var totalLen = 0;
  for (var i = 1; i < points.length; i++) {
    totalLen += Math.abs(points[i].x - points[i - 1].x) + Math.abs(points[i].y - points[i - 1].y);
  }
  var halfLen = totalLen / 2;
  for (var j = 1; j < points.length; j++) {
    var segLen = Math.abs(points[j].x - points[j - 1].x) + Math.abs(points[j].y - points[j - 1].y);
    if (halfLen <= segLen) {
      var t = segLen > 0 ? halfLen / segLen : 0;
      return {
        x: points[j - 1].x + (points[j].x - points[j - 1].x) * t,
        y: points[j - 1].y + (points[j].y - points[j - 1].y) * t,
      };
    }
    halfLen -= segLen;
  }
  return { x: points[0].x, y: points[0].y };
}

// ── Bezier curve helpers ──────────────────────────────────────
function getBezierPath(sx, sy, tx, ty) {
  var dx = Math.abs(tx - sx);
  var cpOffset = Math.max(50, dx * 0.5);
  var cp1x = sx + cpOffset;
  var cp1y = sy;
  var cp2x = tx - cpOffset;
  var cp2y = ty;
  return { cp1x: cp1x, cp1y: cp1y, cp2x: cp2x, cp2y: cp2y };
}

function getBezierMidpoint(sx, sy, tx, ty) {
  var bp = getBezierPath(sx, sy, tx, ty);
  var t = 0.5;
  var mt = 1 - t;
  var x = mt*mt*mt*sx + 3*mt*mt*t*bp.cp1x + 3*mt*t*t*bp.cp2x + t*t*t*tx;
  var y = mt*mt*mt*sy + 3*mt*mt*t*bp.cp1y + 3*mt*t*t*bp.cp2y + t*t*t*ty;
  return { x: x, y: y };
}

function render() {
  if (!ctx) return;
  var t0 = performance.now();

  ctx.clearRect(0, 0, W, H);

  // ── Grid / Background (cached tile) ─────────────────────────────
  var step = gridSize * camera.zoom;
  if (step > 2) {
    // For lines variant, use cached offscreen tile for performance
    if (bgVariant === 'lines' && step >= 4 && step <= 512) {
      if (gridCacheDirty || gridCacheStep !== step || gridCacheVariant !== bgVariant) {
        renderGridToCache(step);
      }
      if (gridCache && gridCacheW > 0) {
        var ox = ((camera.x % step) + step) % step;
        var oy = ((camera.y % step) + step) % step;
        ctx.save();
        ctx.translate(ox, oy);
        var pat = ctx.createPattern(gridCache, 'repeat');
        if (pat) {
          ctx.fillStyle = pat;
          ctx.fillRect(-ox, -oy, W, H);
        }
        ctx.restore();
      }
    } else {
      // Fallback: direct draw for dots/cross or edge-case step sizes
      var sx = ((camera.x % step) + step) % step;
      var sy = ((camera.y % step) + step) % step;
      var gridColor = bgColor || COLORS.grid;

      if (bgVariant === 'dots') {
        ctx.fillStyle = gridColor;
        var dotR = bgSize * camera.zoom;
        for (var dx = sx; dx < W; dx += step) {
          for (var dy = sy; dy < H; dy += step) {
            ctx.beginPath();
            ctx.arc(Math.round(dx), Math.round(dy), dotR, 0, 6.2832);
            ctx.fill();
          }
        }
      } else if (bgVariant === 'cross') {
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = bgSize;
        var crossSize = 3 * camera.zoom;
        ctx.beginPath();
        for (var cx2 = sx; cx2 < W; cx2 += step) {
          for (var cy2 = sy; cy2 < H; cy2 += step) {
            var rx = Math.round(cx2);
            var ry = Math.round(cy2);
            ctx.moveTo(rx - crossSize, ry);
            ctx.lineTo(rx + crossSize, ry);
            ctx.moveTo(rx, ry - crossSize);
            ctx.lineTo(rx, ry + crossSize);
          }
        }
        ctx.stroke();
      } else {
        // Lines fallback for very small/large steps
        var gridColor2 = bgColor || COLORS.grid;
        ctx.beginPath();
        ctx.strokeStyle = gridColor2;
        ctx.lineWidth = bgSize * 0.5;
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
    }
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

  // ── Frustum bounds (with padding for edges that extend beyond nodes) ──
  var edgePadding = 100; // extra world-space padding so edges near viewport aren't clipped
  var worldLeft = -camera.x / camera.zoom;
  var worldTop = -camera.y / camera.zoom;
  var worldRight = worldLeft + W / camera.zoom;
  var worldBottom = worldTop + H / camera.zoom;
  var paddedLeft = worldLeft - edgePadding;
  var paddedTop = worldTop - edgePadding;
  var paddedRight = worldRight + edgePadding;
  var paddedBottom = worldBottom + edgePadding;

  // ── Render cards (legacy) ─────────────────────────────────────
  if (cards.length > 0) {
    var visible = getVisibleCardIndices(worldLeft, worldTop, worldRight, worldBottom);
    var visibleCount = visible.length;
    var showText = camera.zoom > 0.15;
    var showCoords = camera.zoom > 0.3;
    var showShadow = camera.zoom > 0.08 && visibleCount < 200;

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

    if (!showShadow) {
      ctx.fillStyle = COLORS.cardBg;
      ctx.beginPath();
      for (var bi = 0; bi < visibleCount; bi++) {
        var bc = cards[visible[bi]];
        ctx.roundRect(bc.x, bc.y, bc.w, bc.h, CARD_RADIUS);
      }
      ctx.fill();
    }

    ctx.strokeStyle = COLORS.cardBorder;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (var bri = 0; bri < visibleCount; bri++) {
      var brc = cards[visible[bri]];
      ctx.roundRect(brc.x, brc.y, brc.w, brc.h, CARD_RADIUS);
    }
    ctx.stroke();

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

    if (showText) {
      ctx.fillStyle = COLORS.titleText;
      ctx.font = FONT_TITLE;
      for (var ti = 0; ti < visibleCount; ti++) {
        var tc = cards[visible[ti]];
        ctx.fillText(tc.title, tc.x + 12, tc.y + 19);
      }
      ctx.fillStyle = COLORS.bodyText;
      ctx.font = FONT_BODY;
      for (var tbi = 0; tbi < visibleCount; tbi++) {
        var tbc = cards[visible[tbi]];
        ctx.fillText(tbc.body, tbc.x + 12, tbc.y + 52);
      }
      if (showCoords) {
        ctx.fillStyle = COLORS.coordText;
        ctx.font = FONT_COORD;
        for (var tci = 0; tci < visibleCount; tci++) {
          var tcc = cards[visible[tci]];
          ctx.fillText('(' + tcc.x + ', ' + tcc.y + ')', tcc.x + 12, tcc.y + 75);
        }
      }
    }
  }

  // ── Collect visible nodes (spatial grid culling) ────────────────
  var visibleNodes = [];
  var visibleNodeSet = null;
  if (nodes.length > 0) {
    visibleNodeSet = {};
    // Use spatial grid for fast culling when we have many nodes
    if (nodes.length > 100) {
      var visIndices = getVisibleNodeIndices(paddedLeft, paddedTop, paddedRight, paddedBottom);
      for (var vii = 0; vii < visIndices.length; vii++) {
        var vn = nodes[visIndices[vii]];
        visibleNodeSet[vn.id] = true;
        if (!vn._customRendered) {
          visibleNodes.push(vn);
        }
      }
    } else {
      // Linear scan for small node counts (avoids grid rebuild overhead)
      for (var vni = 0; vni < nodes.length; vni++) {
        var vn2 = nodes[vni];
        if (vn2.hidden) continue;
        var vnw = vn2.width || DEFAULT_NODE_WIDTH;
        var vnh = vn2.height || DEFAULT_NODE_HEIGHT;
        if (getNodePos(vn2).x + vnw < paddedLeft || getNodePos(vn2).x > paddedRight ||
            getNodePos(vn2).y + vnh < paddedTop || getNodePos(vn2).y > paddedBottom) continue;
        visibleNodeSet[vn2.id] = true;
        if (!vn2._customRendered) {
          visibleNodes.push(vn2);
        }
      }
    }
  }
  var visNodeCount = visibleNodes.length;

  // ── Render edges (batched, with frustum culling via adjacency) ──
  if (edges.length > 0 && nodes.length > 0) {
    if (edgeAdjacencyDirty) rebuildEdgeAdjacency();
    var normalPath = null;
    var selectedPath = null;
    var animatedPath = null;
    var normalArrows = [];
    var selectedArrows = [];
    var animatedArrows = [];
    var edgeLabels = [];

    // At very low zoom, skip edge labels and arrows for performance
    var showEdgeLabels = camera.zoom > 0.3;
    var showEdgeArrows = camera.zoom > 0.05;

    // Collect edge indices connected to visible nodes (avoid iterating all edges)
    var edgeIndices;
    if (visibleNodeSet && nodes.length > 100) {
      var seenEdge = {};
      edgeIndices = [];
      for (var vid in visibleNodeSet) {
        var adj = edgeAdjacency[vid];
        if (!adj) continue;
        for (var ai = 0; ai < adj.length; ai++) {
          var idx = adj[ai];
          if (!seenEdge[idx]) {
            seenEdge[idx] = true;
            edgeIndices.push(idx);
          }
        }
      }
    } else {
      // Small graph: iterate all edges
      edgeIndices = [];
      for (var allEi = 0; allEi < edges.length; allEi++) edgeIndices.push(allEi);
    }

    for (var eii = 0; eii < edgeIndices.length; eii++) {
      var edge = edges[edgeIndices[eii]];
      var srcNode = getNodeById(edge.source);
      var tgtNode = getNodeById(edge.target);
      if (!srcNode || !tgtNode) continue;
      if (srcNode.hidden || tgtNode.hidden) continue;
      if (edge._customRendered) continue;

      var srcHandle = findEdgeHandle(srcNode, 'source', edge.sourceHandle);
      var tgtHandle = findEdgeHandle(tgtNode, 'target', edge.targetHandle);
      var ex1 = srcHandle.x, ey1 = srcHandle.y;
      var ex2 = tgtHandle.x, ey2 = tgtHandle.y;

      var edgeType = edge.type || 'default';
      var isSelected = edge.selected;
      var isAnimated = edge.animated;

      var path;
      if (isSelected) {
        if (!selectedPath) selectedPath = new Path2D();
        path = selectedPath;
      } else if (isAnimated) {
        if (!animatedPath) animatedPath = new Path2D();
        path = animatedPath;
      } else {
        if (!normalPath) normalPath = new Path2D();
        path = normalPath;
      }

      var rp = edge._routedPoints;
      if (rp && rp.length >= 2) {
        if (edgeType === 'step' || edgeType === 'smoothstep' || edgeType === 'straight') {
          drawRoutedPath(path, rp);
        } else {
          drawRoutedCurve(path, rp);
        }
      } else if (edgeType === 'straight') {
        path.moveTo(ex1, ey1);
        path.lineTo(ex2, ey2);
      } else if (edgeType === 'step' || edgeType === 'smoothstep') {
        var midX = (ex1 + ex2) / 2;
        path.moveTo(ex1, ey1);
        if (edgeType === 'smoothstep') {
          var br = 8;
          path.lineTo(midX - br, ey1);
          path.quadraticCurveTo(midX, ey1, midX, ey1 + (ey2 > ey1 ? br : -br));
          path.lineTo(midX, ey2 - (ey2 > ey1 ? br : -br));
          path.quadraticCurveTo(midX, ey2, midX + br, ey2);
          path.lineTo(ex2, ey2);
        } else {
          path.lineTo(midX, ey1);
          path.lineTo(midX, ey2);
          path.lineTo(ex2, ey2);
        }
      } else {
        var bp = getBezierPath(ex1, ey1, ex2, ey2);
        path.moveTo(ex1, ey1);
        path.bezierCurveTo(bp.cp1x, bp.cp1y, bp.cp2x, bp.cp2y, ex2, ey2);
      }

      // Arrows (skip at very low zoom — sub-pixel)
      if (showEdgeArrows) {
        var arrowSize = 8;
        var angle;
        if (rp && rp.length >= 2) {
          var last = rp[rp.length - 1], prev = rp[rp.length - 2];
          angle = Math.atan2(last.y - prev.y, last.x - prev.x);
        } else if (edgeType === 'straight') {
          angle = Math.atan2(ey2 - ey1, ex2 - ex1);
        } else if (edgeType === 'step' || edgeType === 'smoothstep') {
          angle = 0;
        } else {
          var bpa = getBezierPath(ex1, ey1, ex2, ey2);
          angle = Math.atan2(ey2 - bpa.cp2y, ex2 - bpa.cp2x);
        }
        var arrowTip = (rp && rp.length >= 2) ? rp[rp.length - 1] : { x: ex2, y: ey2 };
        var arrowData = { x: arrowTip.x, y: arrowTip.y, angle: angle, size: arrowSize };
        if (isSelected) selectedArrows.push(arrowData);
        else if (isAnimated) animatedArrows.push(arrowData);
        else normalArrows.push(arrowData);
      }

      // Labels
      if (showEdgeLabels && edge.label) {
        var labelPos;
        if (rp && rp.length >= 2) {
          labelPos = getRoutedMidpoint(rp);
        } else if (edgeType === 'straight' || edgeType === 'step' || edgeType === 'smoothstep') {
          labelPos = { x: (ex1 + ex2) / 2, y: (ey1 + ey2) / 2 };
        } else {
          labelPos = getBezierMidpoint(ex1, ey1, ex2, ey2);
        }
        edgeLabels.push({ text: edge.label, x: labelPos.x, y: labelPos.y });
      }
    }

    // Draw normal edges
    if (normalPath) {
      ctx.strokeStyle = COLORS.edgeStroke;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.stroke(normalPath);
    }

    // Draw animated edges
    if (animatedPath) {
      ctx.strokeStyle = COLORS.edgeAnimated;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.lineDashOffset = -animOffset;
      ctx.stroke(animatedPath);
      ctx.setLineDash([]);
    }

    // Draw selected edges
    if (selectedPath) {
      ctx.strokeStyle = COLORS.edgeSelected;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([]);
      ctx.stroke(selectedPath);
    }

    // Draw arrows (batched by color)
    function drawArrows(arrows, color) {
      if (!arrows.length) return;
      ctx.fillStyle = color;
      ctx.beginPath();
      for (var ai = 0; ai < arrows.length; ai++) {
        var a = arrows[ai];
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(a.x - a.size * Math.cos(a.angle - 0.5236), a.y - a.size * Math.sin(a.angle - 0.5236));
        ctx.lineTo(a.x - a.size * Math.cos(a.angle + 0.5236), a.y - a.size * Math.sin(a.angle + 0.5236));
        ctx.closePath();
      }
      ctx.fill();
    }
    drawArrows(normalArrows, COLORS.edgeStroke);
    drawArrows(animatedArrows, COLORS.edgeAnimated);
    drawArrows(selectedArrows, COLORS.edgeSelected);

    // Draw edge labels
    if (edgeLabels.length > 0) {
      ctx.font = FONT_EDGE_LABEL;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (var li = 0; li < edgeLabels.length; li++) {
        var el = edgeLabels[li];
        var lm = ctx.measureText(el.text);
        var lw = lm.width + 12;
        ctx.fillStyle = dark ? '#2a2a2a' : '#ffffff';
        ctx.fillRect(el.x - lw / 2, el.y - 9, lw, 18);
        ctx.fillStyle = COLORS.nodeText;
        ctx.fillText(el.text, el.x, el.y);
      }
      ctx.textAlign = 'start';
      ctx.textBaseline = 'alphabetic';
    }
  }

  // ── Render connection line (while dragging) ───────────────────
  if (connectingLine) {
    ctx.beginPath();
    ctx.strokeStyle = COLORS.connectionLine;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    var crp = connectingLine._routedPoints;
    if (crp && crp.length >= 2) {
      var connPath = new Path2D();
      drawRoutedPath(connPath, crp);
      ctx.stroke(connPath);
    } else {
      var cfrom = connectingLine.from;
      var cto = connectingLine.to;
      var cbp = getBezierPath(cfrom.x, cfrom.y, cto.x, cto.y);
      ctx.moveTo(cfrom.x, cfrom.y);
      ctx.bezierCurveTo(cbp.cp1x, cbp.cp1y, cbp.cp2x, cbp.cp2y, cto.x, cto.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  // ── Render selection box ────────────────────────────────────────
  if (selectionBox) {
    var sx1 = Math.min(selectionBox.startWorld.x, selectionBox.endWorld.x);
    var sy1 = Math.min(selectionBox.startWorld.y, selectionBox.endWorld.y);
    var sw = Math.abs(selectionBox.endWorld.x - selectionBox.startWorld.x);
    var sh = Math.abs(selectionBox.endWorld.y - selectionBox.startWorld.y);
    ctx.fillStyle = dark ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.06)';
    ctx.fillRect(sx1, sy1, sw, sh);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1 / camera.zoom;
    ctx.setLineDash([]);
    ctx.strokeRect(sx1, sy1, sw, sh);
  }

  // ── Render nodes (batched like cards) ─────────────────────────
  if (visNodeCount > 0) {
    // Adaptive LOD thresholds based on visible node count
    var showNodeText = camera.zoom > 0.12 && (camera.zoom > 0.25 || visNodeCount < 500);
    var showShadowN = camera.zoom > 0.08 && visNodeCount < 200;
    var showHandles = camera.zoom > 0.2 && visNodeCount < 300;

    // PASS 1: Shadows (batched, expensive — skip when many nodes)
    if (showShadowN) {
      ctx.shadowColor = COLORS.nodeShadow;
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = COLORS.nodeBg;
      ctx.beginPath();
      for (var nsi = 0; nsi < visNodeCount; nsi++) {
        var ns = visibleNodes[nsi];
        ctx.roundRect(getNodePos(ns).x, getNodePos(ns).y, ns.width || DEFAULT_NODE_WIDTH, ns.height || DEFAULT_NODE_HEIGHT, NODE_RADIUS);
      }
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    }

    // PASS 2: Node backgrounds (batched)
    if (!showShadowN) {
      ctx.fillStyle = COLORS.nodeBg;
      ctx.beginPath();
      for (var nbi = 0; nbi < visNodeCount; nbi++) {
        var nb = visibleNodes[nbi];
        ctx.roundRect(getNodePos(nb).x, getNodePos(nb).y, nb.width || DEFAULT_NODE_WIDTH, nb.height || DEFAULT_NODE_HEIGHT, NODE_RADIUS);
      }
      ctx.fill();
    }

    // PASS 3: Node borders — batch normal and selected separately
    ctx.strokeStyle = COLORS.nodeBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var nbi2 = 0; nbi2 < visNodeCount; nbi2++) {
      var nb2 = visibleNodes[nbi2];
      if (nb2.selected) continue;
      ctx.roundRect(getNodePos(nb2).x, getNodePos(nb2).y, nb2.width || DEFAULT_NODE_WIDTH, nb2.height || DEFAULT_NODE_HEIGHT, NODE_RADIUS);
    }
    ctx.stroke();

    // Selected node borders
    var hasSelected = false;
    ctx.strokeStyle = COLORS.nodeSelectedBorder;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var nbs = 0; nbs < visNodeCount; nbs++) {
      var nbs2 = visibleNodes[nbs];
      if (!nbs2.selected) continue;
      hasSelected = true;
      ctx.roundRect(getNodePos(nbs2).x, getNodePos(nbs2).y, nbs2.width || DEFAULT_NODE_WIDTH, nbs2.height || DEFAULT_NODE_HEIGHT, NODE_RADIUS);
    }
    if (hasSelected) ctx.stroke();

    // PASS 4: Text (batched) — skip when nodes are tiny on screen
    if (showNodeText) {
      ctx.fillStyle = COLORS.nodeText;
      ctx.font = FONT_NODE;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (var nti = 0; nti < visNodeCount; nti++) {
        var nt = visibleNodes[nti];
        if (!nt.data || !nt.data.label) continue;
        var ntw = nt.width || DEFAULT_NODE_WIDTH;
        var nth2 = nt.height || DEFAULT_NODE_HEIGHT;
        ctx.fillText(nt.data.label, getNodePos(nt).x + ntw / 2, getNodePos(nt).y + nth2 / 2, ntw - 24);
      }
      ctx.textAlign = 'start';
      ctx.textBaseline = 'alphabetic';
    }

    // PASS 5: Handles (batched — fill all, then stroke all)
    if (showHandles) {
      var allHandleXYs = [];
      for (var nhi = 0; nhi < visNodeCount; nhi++) {
        var nodeHandles = getNodeHandles(visibleNodes[nhi]);
        for (var nhj = 0; nhj < nodeHandles.length; nhj++) {
          allHandleXYs.push(nodeHandles[nhj]);
        }
      }
      ctx.fillStyle = COLORS.handleFill;
      ctx.beginPath();
      for (var hfi = 0; hfi < allHandleXYs.length; hfi++) {
        var hf = allHandleXYs[hfi];
        ctx.moveTo(hf.x + HANDLE_RADIUS, hf.y);
        ctx.arc(hf.x, hf.y, HANDLE_RADIUS, 0, 6.2832);
      }
      ctx.fill();
      ctx.strokeStyle = COLORS.handleBorder;
      ctx.lineWidth = 1.5;
      ctx.stroke();
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
      data: {
        wx: wx, wy: wy,
        zoom: camera.zoom.toFixed(2),
        renderMs: renderMs,
        fps: fps,
        visible: (cards.length > 0 ? getVisibleCardIndices(worldLeft, worldTop, worldRight, worldBottom).length : 0),
        nodeCount: nodes.length,
        visibleNodes: visNodeCount,
        edgeCount: edges.length,
      }
    });
  }
}
