// Edge Router Worker
// Runs A* obstacle-avoiding edge routing off the main thread.
// Messages:
//   IN:  { type: 'route',       id, nodes, edges }
//   IN:  { type: 'routeSingle', id, fromX, fromY, toX, toY, fromDir, toDir, nodes, excludeNodeIds }
//   OUT: { type: 'routed',       id, edges }
//   OUT: { type: 'routedSingle', id, points }

var DEFAULT_NODE_WIDTH = 160;
var DEFAULT_NODE_HEIGHT = 60;
var OBSTACLE_PADDING = 20;
var EDGE_SPACING = 12;
var HANDLE_OFFSET = 20;

// ── Resolve handle position ─────────────────────────────────────────
function getHandlePos(node, handleType, handleId) {
  var nw = node.width || (node.measured && node.measured.width) || DEFAULT_NODE_WIDTH;
  var nh = node.height || (node.measured && node.measured.height) || DEFAULT_NODE_HEIGHT;
  var pos = node._absolutePosition || node.position;

  if (node.handles && node.handles.length > 0) {
    for (var i = 0; i < node.handles.length; i++) {
      var h = node.handles[i];
      if (h.type === handleType && (!handleId || h.id === handleId)) {
        if (h.x !== undefined && h.y !== undefined) {
          return { x: pos.x + h.x, y: pos.y + h.y, dir: h.position || (handleType === 'source' ? 'right' : 'left') };
        }
        var p = h.position || (handleType === 'source' ? 'right' : 'left');
        switch (p) {
          case 'top': return { x: pos.x + nw / 2, y: pos.y, dir: 'top' };
          case 'bottom': return { x: pos.x + nw / 2, y: pos.y + nh, dir: 'bottom' };
          case 'left': return { x: pos.x, y: pos.y + nh / 2, dir: 'left' };
          default: return { x: pos.x + nw, y: pos.y + nh / 2, dir: 'right' };
        }
      }
    }
  }

  if (handleType === 'source') return { x: pos.x + nw, y: pos.y + nh / 2, dir: 'right' };
  return { x: pos.x, y: pos.y + nh / 2, dir: 'left' };
}

function offsetPoint(handle, dist) {
  switch (handle.dir) {
    case 'right':  return { x: handle.x + dist, y: handle.y, dir: handle.dir };
    case 'left':   return { x: handle.x - dist, y: handle.y, dir: handle.dir };
    case 'bottom': return { x: handle.x, y: handle.y + dist, dir: handle.dir };
    case 'top':    return { x: handle.x, y: handle.y - dist, dir: handle.dir };
    default:       return { x: handle.x + dist, y: handle.y, dir: handle.dir };
  }
}

// ── Segment vs rectangle intersection ───────────────────────────────
function segmentIntersectsRect(x1, y1, x2, y2, rx, ry, rw, rh) {
  var minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
  var minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
  if (maxX <= rx || minX >= rx + rw || maxY <= ry || minY >= ry + rh) return false;
  var e = 0.5;
  if (x1 > rx + e && x1 < rx + rw - e && y1 > ry + e && y1 < ry + rh - e) return true;
  if (x2 > rx + e && x2 < rx + rw - e && y2 > ry + e && y2 < ry + rh - e) return true;
  var mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  if (mx > rx + e && mx < rx + rw - e && my > ry + e && my < ry + rh - e) return true;
  var corners = [[rx, ry], [rx + rw, ry], [rx + rw, ry + rh], [rx, ry + rh]];
  for (var i = 0; i < 4; i++) {
    if (segsIntersect(x1, y1, x2, y2, corners[i][0], corners[i][1], corners[(i + 1) % 4][0], corners[(i + 1) % 4][1])) return true;
  }
  return false;
}

function segsIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
  var d1 = (x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3);
  var d2 = (x4 - x3) * (y2 - y3) - (y4 - y3) * (x2 - x3);
  var d3 = (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1);
  var d4 = (x2 - x1) * (y4 - y1) - (y2 - y1) * (x4 - x1);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  return false;
}

function isSegmentFree(x1, y1, x2, y2, obstacles) {
  for (var i = 0; i < obstacles.length; i++) {
    var o = obstacles[i];
    if (segmentIntersectsRect(x1, y1, x2, y2, o.x, o.y, o.w, o.h)) return false;
  }
  return true;
}

function pointInObstacle(px, py, obstacles) {
  for (var i = 0; i < obstacles.length; i++) {
    var o = obstacles[i];
    if (px > o.x && px < o.x + o.w && py > o.y && py < o.y + o.h) return true;
  }
  return false;
}

// ── Build obstacles from nodes ──────────────────────────────────────
function buildObstacles(nodes, excludeIds) {
  var obstacles = [];
  for (var i = 0; i < nodes.length; i++) {
    var n = nodes[i];
    if (n.hidden || (excludeIds && excludeIds.has(n.id))) continue;
    // Skip group/parent nodes — they are containers, not obstacles
    if (n.type === 'group') continue;
    var pos = n._absolutePosition || n.position;
    var nw = n.width || (n.measured && n.measured.width) || DEFAULT_NODE_WIDTH;
    var nh = n.height || (n.measured && n.measured.height) || DEFAULT_NODE_HEIGHT;
    obstacles.push({
      id: n.id,
      x: pos.x - OBSTACLE_PADDING,
      y: pos.y - OBSTACLE_PADDING,
      w: nw + 2 * OBSTACLE_PADDING,
      h: nh + 2 * OBSTACLE_PADDING,
    });
  }
  return obstacles;
}

// ── A* pathfinder on orthogonal waypoint grid ───────────────────────
function findRoute(src, tgt, obstacles) {
  if (isSegmentFree(src.x, src.y, tgt.x, tgt.y, obstacles)) {
    return null;
  }

  var xSet = new Set();
  var ySet = new Set();
  xSet.add(src.x); xSet.add(tgt.x);
  ySet.add(src.y); ySet.add(tgt.y);

  var EXT = OBSTACLE_PADDING + 5;
  if (src.dir === 'right') xSet.add(src.x + EXT);
  else if (src.dir === 'left') xSet.add(src.x - EXT);
  else if (src.dir === 'top') ySet.add(src.y - EXT);
  else if (src.dir === 'bottom') ySet.add(src.y + EXT);
  if (tgt.dir === 'right') xSet.add(tgt.x + EXT);
  else if (tgt.dir === 'left') xSet.add(tgt.x - EXT);
  else if (tgt.dir === 'top') ySet.add(tgt.y - EXT);
  else if (tgt.dir === 'bottom') ySet.add(tgt.y + EXT);

  for (var i = 0; i < obstacles.length; i++) {
    var o = obstacles[i];
    xSet.add(o.x); xSet.add(o.x + o.w);
    ySet.add(o.y); ySet.add(o.y + o.h);
  }

  var xs = Array.from(xSet).sort(function(a, b) { return a - b; });
  var ys = Array.from(ySet).sort(function(a, b) { return a - b; });

  var xIdx = new Map();
  var yIdx = new Map();
  for (var xi = 0; xi < xs.length; xi++) xIdx.set(xs[xi], xi);
  for (var yi = 0; yi < ys.length; yi++) yIdx.set(ys[yi], yi);

  var W = xs.length, H = ys.length;
  var encode = function(xi, yi) { return yi * W + xi; };

  var srcXi = xIdx.get(src.x), srcYi = yIdx.get(src.y);
  var tgtXi = xIdx.get(tgt.x), tgtYi = yIdx.get(tgt.y);
  if (srcXi === undefined || srcYi === undefined || tgtXi === undefined || tgtYi === undefined) return null;

  var startKey = encode(srcXi, srcYi);
  var goalKey = encode(tgtXi, tgtYi);

  var gScore = new Float64Array(W * H).fill(Infinity);
  var fScore = new Float64Array(W * H).fill(Infinity);
  var from = new Int32Array(W * H).fill(-1);
  var fromDir = new Int8Array(W * H).fill(-1);
  var closed = new Uint8Array(W * H);

  gScore[startKey] = 0;
  fScore[startKey] = Math.abs(xs[tgtXi] - src.x) + Math.abs(ys[tgtYi] - src.y);

  var heap = [startKey];
  var BEND_COST = 15;
  var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  while (heap.length > 0) {
    var minI = 0;
    for (var hi = 1; hi < heap.length; hi++) {
      if (fScore[heap[hi]] < fScore[heap[minI]]) minI = hi;
    }
    var cur = heap[minI];
    heap[minI] = heap[heap.length - 1];
    heap.pop();

    if (cur === goalKey) {
      var path = [];
      var k = goalKey;
      while (k !== -1 && k !== startKey) {
        var pyi = (k / W) | 0, pxi = k % W;
        path.unshift({ x: xs[pxi], y: ys[pyi] });
        k = from[k];
      }
      path.unshift({ x: src.x, y: src.y });
      return simplifyPath(path, obstacles);
    }

    if (closed[cur]) continue;
    closed[cur] = 1;

    var cyi = (cur / W) | 0, cxi = cur % W;
    var cx = xs[cxi], cy = ys[cyi];
    var curDir = fromDir[cur];

    for (var d = 0; d < 4; d++) {
      var nxi = cxi + dirs[d][0], nyi = cyi + dirs[d][1];
      if (nxi < 0 || nxi >= W || nyi < 0 || nyi >= H) continue;
      var nk = encode(nxi, nyi);
      if (closed[nk]) continue;

      var nx = xs[nxi], ny = ys[nyi];
      if (pointInObstacle(nx, ny, obstacles)) continue;
      if (!isSegmentFree(cx, cy, nx, ny, obstacles)) continue;

      var dist = Math.abs(nx - cx) + Math.abs(ny - cy);
      var bend = (curDir >= 0 && curDir !== d) ? BEND_COST : 0;
      var g = gScore[cur] + dist + bend;

      if (g < gScore[nk]) {
        from[nk] = cur;
        fromDir[nk] = d;
        gScore[nk] = g;
        fScore[nk] = g + Math.abs(xs[tgtXi] - nx) + Math.abs(ys[tgtYi] - ny);
        heap.push(nk);
      }
    }
  }

  return null;
}

function simplifyPath(points, obstacles) {
  if (!points || points.length <= 2) return points;
  var result = [points[0]];
  for (var i = 1; i < points.length - 1; i++) {
    var prev = result[result.length - 1];
    var curr = points[i];
    var next = points[i + 1];
    var sameX = Math.abs(prev.x - curr.x) < 0.5 && Math.abs(curr.x - next.x) < 0.5;
    var sameY = Math.abs(prev.y - curr.y) < 0.5 && Math.abs(curr.y - next.y) < 0.5;
    if (sameX || sameY) {
      if (isSegmentFree(prev.x, prev.y, next.x, next.y, obstacles)) continue;
    }
    result.push(curr);
  }
  result.push(points[points.length - 1]);
  return result;
}

// ── Nudge parallel edges ────────────────────────────────────────────
function nudgeParallelEdges(edgesWithRoutes) {
  var hSegs = new Map();
  var vSegs = new Map();

  for (var ei = 0; ei < edgesWithRoutes.length; ei++) {
    var edge = edgesWithRoutes[ei];
    var pts = edge._routedPoints;
    if (!pts || pts.length < 2) continue;
    for (var i = 0; i < pts.length - 1; i++) {
      var a = pts[i], b = pts[i + 1];
      if (Math.abs(a.y - b.y) < 0.5) {
        var y = Math.round(a.y * 10) / 10;
        if (!hSegs.has(y)) hSegs.set(y, []);
        hSegs.get(y).push({ edgeId: edge.id, segIdx: i, x1: Math.min(a.x, b.x), x2: Math.max(a.x, b.x) });
      } else if (Math.abs(a.x - b.x) < 0.5) {
        var x = Math.round(a.x * 10) / 10;
        if (!vSegs.has(x)) vSegs.set(x, []);
        vSegs.get(x).push({ edgeId: edge.id, segIdx: i, y1: Math.min(a.y, b.y), y2: Math.max(a.y, b.y) });
      }
    }
  }

  var routeMap = new Map();
  for (var ri = 0; ri < edgesWithRoutes.length; ri++) {
    var re = edgesWithRoutes[ri];
    if (re._routedPoints) {
      routeMap.set(re.id, re._routedPoints.map(function(p) { return { x: p.x, y: p.y }; }));
    }
  }

  function nudgeSegs(segsMap, coordKey, min1, max1) {
    for (var [, segs] of segsMap) {
      if (segs.length < 2) continue;
      var groups = findOverlappingGroups(segs, min1, max1);
      for (var gi = 0; gi < groups.length; gi++) {
        var group = groups[gi];
        if (group.length < 2) continue;
        var half = (group.length - 1) * EDGE_SPACING / 2;
        for (var si = 0; si < group.length; si++) {
          var seg = group[si];
          var offset = -half + si * EDGE_SPACING;
          var p = routeMap.get(seg.edgeId);
          if (p) {
            p[seg.segIdx][coordKey] += offset;
            p[seg.segIdx + 1][coordKey] += offset;
          }
        }
      }
    }
  }

  nudgeSegs(hSegs, 'y', 'x1', 'x2');
  nudgeSegs(vSegs, 'x', 'y1', 'y2');

  return edgesWithRoutes.map(function(edge) {
    var nudged = routeMap.get(edge.id);
    if (nudged) return Object.assign({}, edge, { _routedPoints: nudged });
    return edge;
  });
}

function findOverlappingGroups(segs, minKey, maxKey) {
  if (segs.length < 2) return [];
  var sorted = segs.slice().sort(function(a, b) { return a[minKey] - b[minKey]; });
  var groups = [];
  var group = [sorted[0]];
  for (var i = 1; i < sorted.length; i++) {
    var prev = group[group.length - 1];
    if (sorted[i][minKey] < prev[maxKey]) {
      group.push(sorted[i]);
    } else {
      if (group.length > 1) groups.push(group);
      group = [sorted[i]];
    }
  }
  if (group.length > 1) groups.push(group);
  return groups;
}

// ── Main: compute all routed edges ──────────────────────────────────
function computeRoutedEdges(nodes, edges) {
  if (!nodes || !edges || nodes.length === 0 || edges.length === 0) return edges;

  var nodeLookup = {};
  for (var ni = 0; ni < nodes.length; ni++) nodeLookup[nodes[ni].id] = nodes[ni];

  var allObstacles = buildObstacles(nodes, null);
  var SRC_TGT_PAD = 5;

  var routed = edges.map(function(edge) {
    var srcNode = nodeLookup[edge.source];
    var tgtNode = nodeLookup[edge.target];
    if (!srcNode || !tgtNode) return edge;
    if (srcNode.hidden || tgtNode.hidden) return edge;


    var srcHandle = getHandlePos(srcNode, 'source', edge.sourceHandle);
    var tgtHandle = getHandlePos(tgtNode, 'target', edge.targetHandle);
    var srcOff = offsetPoint(srcHandle, HANDLE_OFFSET);
    var tgtOff = offsetPoint(tgtHandle, HANDLE_OFFSET);

    var obstacles = allObstacles.filter(function(o) { return o.id !== edge.source && o.id !== edge.target; });

    var srcPos = srcNode._absolutePosition || srcNode.position;
    var srcW = srcNode.width || (srcNode.measured && srcNode.measured.width) || DEFAULT_NODE_WIDTH;
    var srcH = srcNode.height || (srcNode.measured && srcNode.measured.height) || DEFAULT_NODE_HEIGHT;
    obstacles.push({ id: edge.source, x: srcPos.x - SRC_TGT_PAD, y: srcPos.y - SRC_TGT_PAD, w: srcW + 2 * SRC_TGT_PAD, h: srcH + 2 * SRC_TGT_PAD });

    var tgtPos = tgtNode._absolutePosition || tgtNode.position;
    var tgtW = tgtNode.width || (tgtNode.measured && tgtNode.measured.width) || DEFAULT_NODE_WIDTH;
    var tgtH = tgtNode.height || (tgtNode.measured && tgtNode.measured.height) || DEFAULT_NODE_HEIGHT;
    obstacles.push({ id: edge.target, x: tgtPos.x - SRC_TGT_PAD, y: tgtPos.y - SRC_TGT_PAD, w: tgtW + 2 * SRC_TGT_PAD, h: tgtH + 2 * SRC_TGT_PAD });

    if (obstacles.length === 0) return edge;

    var routedPoints = findRoute(srcOff, tgtOff, obstacles);
    if (routedPoints && routedPoints.length >= 2) {
      routedPoints.unshift({ x: srcHandle.x, y: srcHandle.y });
      routedPoints.push({ x: tgtHandle.x, y: tgtHandle.y });
      return Object.assign({}, edge, { _routedPoints: routedPoints });
    }
    return edge;
  });

  return nudgeParallelEdges(routed);
}

function routeSinglePath(fromX, fromY, toX, toY, fromDir, toDir, nodes, excludeNodeIds) {
  var obstacles = buildObstacles(nodes, excludeNodeIds ? new Set(excludeNodeIds) : null);
  if (obstacles.length === 0) return null;

  var src = { x: fromX, y: fromY, dir: fromDir || 'right' };
  var tgt = { x: toX, y: toY, dir: toDir || 'left' };
  var srcOff = offsetPoint(src, HANDLE_OFFSET);
  var tgtOff = offsetPoint(tgt, HANDLE_OFFSET);
  var route = findRoute(srcOff, tgtOff, obstacles);
  if (route && route.length >= 2) {
    route.unshift({ x: src.x, y: src.y });
    route.push({ x: tgt.x, y: tgt.y });
    return route;
  }
  return null;
}

// ── Worker message handler ──────────────────────────────────────────
self.onmessage = function(e) {
  var msg = e.data;
  if (msg.type === 'route') {
    var edges = computeRoutedEdges(msg.nodes, msg.edges);
    self.postMessage({ type: 'routed', id: msg.id, edges: edges });
  } else if (msg.type === 'routeSingle') {
    var points = routeSinglePath(
      msg.fromX, msg.fromY, msg.toX, msg.toY,
      msg.fromDir, msg.toDir, msg.nodes, msg.excludeNodeIds
    );
    self.postMessage({ type: 'routedSingle', id: msg.id, points: points });
  }
};
