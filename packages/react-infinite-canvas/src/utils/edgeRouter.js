// Obstacle-avoiding edge router
// Routes edges around node bounding boxes using A* on an orthogonal grid.
// Supports edge-to-edge spacing (nudging parallel segments apart).
// Designed for real-time interactive use during drag/drop.

const DEFAULT_NODE_WIDTH = 160;
const DEFAULT_NODE_HEIGHT = 60;
const OBSTACLE_PADDING = 20;
const EDGE_SPACING = 12; // spacing between parallel edges
const HANDLE_OFFSET = 20; // stub length extending outward from handle before routing

// ── Resolve handle position ─────────────────────────────────────────
function getHandlePos(node, handleType, handleId) {
  const nw = node.width || node.measured?.width || DEFAULT_NODE_WIDTH;
  const nh = node.height || node.measured?.height || DEFAULT_NODE_HEIGHT;
  const pos = node._absolutePosition || node.position;

  if (node.handles && node.handles.length > 0) {
    for (const h of node.handles) {
      if (h.type === handleType && (!handleId || h.id === handleId)) {
        if (h.x !== undefined && h.y !== undefined) {
          return { x: pos.x + h.x, y: pos.y + h.y, dir: h.position || (handleType === 'source' ? 'right' : 'left') };
        }
        const p = h.position || (handleType === 'source' ? 'right' : 'left');
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

// ── Offset a handle point outward by `dist` along its direction ──────
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
// Uses strict interior checks so segments along obstacle boundaries are OK.
function segmentIntersectsRect(x1, y1, x2, y2, rx, ry, rw, rh) {
  const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
  if (maxX <= rx || minX >= rx + rw || maxY <= ry || minY >= ry + rh) return false;
  // Strict interior check for endpoints (boundary points are OK)
  const e = 0.5;
  if (x1 > rx + e && x1 < rx + rw - e && y1 > ry + e && y1 < ry + rh - e) return true;
  if (x2 > rx + e && x2 < rx + rw - e && y2 > ry + e && y2 < ry + rh - e) return true;
  // Midpoint interior check (catches segments fully inside the rect)
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  if (mx > rx + e && mx < rx + rw - e && my > ry + e && my < ry + rh - e) return true;
  // Edge intersection checks
  const corners = [[rx, ry], [rx + rw, ry], [rx + rw, ry + rh], [rx, ry + rh]];
  for (let i = 0; i < 4; i++) {
    if (segsIntersect(x1, y1, x2, y2, corners[i][0], corners[i][1], corners[(i + 1) % 4][0], corners[(i + 1) % 4][1])) return true;
  }
  return false;
}

function segsIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
  const d1 = (x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3);
  const d2 = (x4 - x3) * (y2 - y3) - (y4 - y3) * (x2 - x3);
  const d3 = (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1);
  const d4 = (x2 - x1) * (y4 - y1) - (y2 - y1) * (x4 - x1);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  return false;
}

// ── Check segment free of obstacles ─────────────────────────────────
function isSegmentFree(x1, y1, x2, y2, obstacles) {
  for (let i = 0; i < obstacles.length; i++) {
    const o = obstacles[i];
    if (segmentIntersectsRect(x1, y1, x2, y2, o.x, o.y, o.w, o.h)) return false;
  }
  return true;
}

function pointInObstacle(px, py, obstacles) {
  for (let i = 0; i < obstacles.length; i++) {
    const o = obstacles[i];
    if (px > o.x && px < o.x + o.w && py > o.y && py < o.y + o.h) return true;
  }
  return false;
}

// ── Build obstacles from nodes ──────────────────────────────────────
export function buildObstacles(nodes, excludeIds) {
  const obstacles = [];
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.hidden || (excludeIds && excludeIds.has(n.id))) continue;
    // Skip group/parent nodes — they are containers, not obstacles
    if (n.type === 'group') continue;
    const pos = n._absolutePosition || n.position;
    const nw = n.width || n.measured?.width || DEFAULT_NODE_WIDTH;
    const nh = n.height || n.measured?.height || DEFAULT_NODE_HEIGHT;
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
// Grid is derived from obstacle corners + source/target.
// This is small (O(nodes^2) waypoints) so A* is fast.
export function findRoute(src, tgt, obstacles) {
  // Quick: if direct line is clear, no routing needed
  if (isSegmentFree(src.x, src.y, tgt.x, tgt.y, obstacles)) {
    return null;
  }

  // Collect grid coordinates from obstacle boundaries + endpoints
  const xSet = new Set();
  const ySet = new Set();
  xSet.add(src.x); xSet.add(tgt.x);
  ySet.add(src.y); ySet.add(tgt.y);

  // Handle extension points (go out from handle direction first)
  const EXT = OBSTACLE_PADDING + 5;
  if (src.dir === 'right') xSet.add(src.x + EXT);
  else if (src.dir === 'left') xSet.add(src.x - EXT);
  else if (src.dir === 'top') ySet.add(src.y - EXT);
  else if (src.dir === 'bottom') ySet.add(src.y + EXT);
  if (tgt.dir === 'right') xSet.add(tgt.x + EXT);
  else if (tgt.dir === 'left') xSet.add(tgt.x - EXT);
  else if (tgt.dir === 'top') ySet.add(tgt.y - EXT);
  else if (tgt.dir === 'bottom') ySet.add(tgt.y + EXT);

  for (let i = 0; i < obstacles.length; i++) {
    const o = obstacles[i];
    xSet.add(o.x); xSet.add(o.x + o.w);
    ySet.add(o.y); ySet.add(o.y + o.h);
  }

  const xs = [...xSet].sort((a, b) => a - b);
  const ys = [...ySet].sort((a, b) => a - b);

  const xIdx = new Map();
  const yIdx = new Map();
  for (let i = 0; i < xs.length; i++) xIdx.set(xs[i], i);
  for (let i = 0; i < ys.length; i++) yIdx.set(ys[i], i);

  const W = xs.length, H = ys.length;
  const encode = (xi, yi) => yi * W + xi;

  const srcXi = xIdx.get(src.x), srcYi = yIdx.get(src.y);
  const tgtXi = xIdx.get(tgt.x), tgtYi = yIdx.get(tgt.y);
  if (srcXi === undefined || srcYi === undefined || tgtXi === undefined || tgtYi === undefined) return null;

  const startKey = encode(srcXi, srcYi);
  const goalKey = encode(tgtXi, tgtYi);

  const gScore = new Float64Array(W * H).fill(Infinity);
  const fScore = new Float64Array(W * H).fill(Infinity);
  const from = new Int32Array(W * H).fill(-1);
  const fromDir = new Int8Array(W * H).fill(-1);
  const closed = new Uint8Array(W * H);

  gScore[startKey] = 0;
  fScore[startKey] = Math.abs(xs[tgtXi] - src.x) + Math.abs(ys[tgtYi] - src.y);

  // Binary heap for priority queue
  const heap = [startKey];
  const BEND_COST = 15;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  while (heap.length > 0) {
    // Pop min fScore
    let minI = 0;
    for (let i = 1; i < heap.length; i++) {
      if (fScore[heap[i]] < fScore[heap[minI]]) minI = i;
    }
    const cur = heap[minI];
    heap[minI] = heap[heap.length - 1];
    heap.pop();

    if (cur === goalKey) {
      // Reconstruct
      const path = [];
      let k = goalKey;
      while (k !== -1 && k !== startKey) {
        const yi = (k / W) | 0, xi = k % W;
        path.unshift({ x: xs[xi], y: ys[yi] });
        k = from[k];
      }
      path.unshift({ x: src.x, y: src.y });
      return simplifyPath(path, obstacles);
    }

    if (closed[cur]) continue;
    closed[cur] = 1;

    const cyi = (cur / W) | 0, cxi = cur % W;
    const cx = xs[cxi], cy = ys[cyi];
    const curDir = fromDir[cur];

    for (let d = 0; d < 4; d++) {
      const nxi = cxi + dirs[d][0], nyi = cyi + dirs[d][1];
      if (nxi < 0 || nxi >= W || nyi < 0 || nyi >= H) continue;
      const nk = encode(nxi, nyi);
      if (closed[nk]) continue;

      const nx = xs[nxi], ny = ys[nyi];
      if (pointInObstacle(nx, ny, obstacles)) continue;
      if (!isSegmentFree(cx, cy, nx, ny, obstacles)) continue;

      const dist = Math.abs(nx - cx) + Math.abs(ny - cy);
      const bend = (curDir >= 0 && curDir !== d) ? BEND_COST : 0;
      const g = gScore[cur] + dist + bend;

      if (g < gScore[nk]) {
        from[nk] = cur;
        fromDir[nk] = d;
        gScore[nk] = g;
        fScore[nk] = g + Math.abs(xs[tgtXi] - nx) + Math.abs(ys[tgtYi] - ny);
        heap.push(nk);
      }
    }
  }

  return null; // fallback to default path
}

// ── Remove redundant collinear points ───────────────────────────────
function simplifyPath(points, obstacles) {
  if (!points || points.length <= 2) return points;
  const result = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = result[result.length - 1];
    const curr = points[i];
    const next = points[i + 1];
    const sameX = Math.abs(prev.x - curr.x) < 0.5 && Math.abs(curr.x - next.x) < 0.5;
    const sameY = Math.abs(prev.y - curr.y) < 0.5 && Math.abs(curr.y - next.y) < 0.5;
    if (sameX || sameY) {
      // Collinear — skip if we can go direct
      if (isSegmentFree(prev.x, prev.y, next.x, next.y, obstacles)) continue;
    }
    result.push(curr);
  }
  result.push(points[points.length - 1]);
  return result;
}

// ── Edge-to-edge spacing (nudge parallel shared segments) ───────────
// Groups edges that share the same pair of horizontal/vertical channels
// and offsets them so they don't overlap.
export function nudgeParallelEdges(edgesWithRoutes) {
  // Collect all horizontal and vertical segments keyed by coordinate
  const hSegs = new Map(); // y -> [{edgeId, x1, x2}]
  const vSegs = new Map(); // x -> [{edgeId, y1, y2}]

  for (const edge of edgesWithRoutes) {
    const pts = edge._routedPoints;
    if (!pts || pts.length < 2) continue;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      if (Math.abs(a.y - b.y) < 0.5) {
        // Horizontal segment
        const y = Math.round(a.y * 10) / 10;
        if (!hSegs.has(y)) hSegs.set(y, []);
        hSegs.get(y).push({ edgeId: edge.id, segIdx: i, x1: Math.min(a.x, b.x), x2: Math.max(a.x, b.x) });
      } else if (Math.abs(a.x - b.x) < 0.5) {
        // Vertical segment
        const x = Math.round(a.x * 10) / 10;
        if (!vSegs.has(x)) vSegs.set(x, []);
        vSegs.get(x).push({ edgeId: edge.id, segIdx: i, y1: Math.min(a.y, b.y), y2: Math.max(a.y, b.y) });
      }
    }
  }

  // Build lookup for edge routes
  const routeMap = new Map();
  for (const edge of edgesWithRoutes) {
    if (edge._routedPoints) {
      routeMap.set(edge.id, edge._routedPoints.map(p => ({ ...p })));
    }
  }

  // Nudge overlapping horizontal segments
  for (const [, segs] of hSegs) {
    if (segs.length < 2) continue;
    // Find overlapping groups
    const groups = findOverlappingGroups(segs, 'x1', 'x2');
    for (const group of groups) {
      if (group.length < 2) continue;
      const half = (group.length - 1) * EDGE_SPACING / 2;
      for (let i = 0; i < group.length; i++) {
        const seg = group[i];
        const offset = -half + i * EDGE_SPACING;
        const pts = routeMap.get(seg.edgeId);
        if (pts) {
          pts[seg.segIdx].y += offset;
          pts[seg.segIdx + 1].y += offset;
        }
      }
    }
  }

  // Nudge overlapping vertical segments
  for (const [, segs] of vSegs) {
    if (segs.length < 2) continue;
    const groups = findOverlappingGroups(segs, 'y1', 'y2');
    for (const group of groups) {
      if (group.length < 2) continue;
      const half = (group.length - 1) * EDGE_SPACING / 2;
      for (let i = 0; i < group.length; i++) {
        const seg = group[i];
        const offset = -half + i * EDGE_SPACING;
        const pts = routeMap.get(seg.edgeId);
        if (pts) {
          pts[seg.segIdx].x += offset;
          pts[seg.segIdx + 1].x += offset;
        }
      }
    }
  }

  // Write back nudged routes
  return edgesWithRoutes.map(edge => {
    const nudged = routeMap.get(edge.id);
    if (nudged) return { ...edge, _routedPoints: nudged };
    return edge;
  });
}

function findOverlappingGroups(segs, minKey, maxKey) {
  if (segs.length < 2) return [];
  const sorted = [...segs].sort((a, b) => a[minKey] - b[minKey]);
  const groups = [];
  let group = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = group[group.length - 1];
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

// ── Convert routed points → SVG path ────────────────────────────────
// smooth=true uses Catmull-Rom spline (for bezier edges),
// smooth=false uses straight segments with rounded corners (for step edges).
export function routedPointsToPath(points, borderRadius = 6, smooth = false) {
  if (!points || points.length < 2) return null;

  if (smooth) return routedPointsToCurve(points);

  const br = borderRadius;
  let d = `M ${points[0].x},${points[0].y}`;

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1], curr = points[i], next = points[i + 1];
    const dPrev = Math.abs(curr.x - prev.x) + Math.abs(curr.y - prev.y);
    const dNext = Math.abs(next.x - curr.x) + Math.abs(next.y - curr.y);
    const r = Math.min(br, dPrev / 2, dNext / 2);

    if (r > 0.5) {
      const ax = curr.x - prev.x, ay = curr.y - prev.y;
      const bx = next.x - curr.x, by = next.y - curr.y;
      const aLen = Math.sqrt(ax * ax + ay * ay) || 1;
      const bLen = Math.sqrt(bx * bx + by * by) || 1;
      d += ` L ${curr.x - (ax / aLen) * r},${curr.y - (ay / aLen) * r}`;
      d += ` Q ${curr.x},${curr.y} ${curr.x + (bx / bLen) * r},${curr.y + (by / bLen) * r}`;
    } else {
      d += ` L ${curr.x},${curr.y}`;
    }
  }
  d += ` L ${points[points.length - 1].x},${points[points.length - 1].y}`;
  return d;
}

// Catmull-Rom → cubic Bezier SVG path (smooth curve through all waypoints)
function routedPointsToCurve(points) {
  if (points.length === 2) {
    return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`;
  }
  if (points.length === 3) {
    return `M ${points[0].x},${points[0].y} Q ${points[1].x},${points[1].y} ${points[2].x},${points[2].y}`;
  }
  const tension = 0.3;
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : points.length - 1];
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}

// ── Get label position from routed points ───────────────────────────
export function getRoutedLabelPosition(points) {
  if (!points || points.length < 2) return { x: 0, y: 0 };
  let totalLen = 0;
  for (let i = 1; i < points.length; i++) {
    totalLen += Math.abs(points[i].x - points[i - 1].x) + Math.abs(points[i].y - points[i - 1].y);
  }
  let halfLen = totalLen / 2;
  for (let i = 1; i < points.length; i++) {
    const segLen = Math.abs(points[i].x - points[i - 1].x) + Math.abs(points[i].y - points[i - 1].y);
    if (halfLen <= segLen) {
      const t = segLen > 0 ? halfLen / segLen : 0;
      return {
        x: points[i - 1].x + (points[i].x - points[i - 1].x) * t,
        y: points[i - 1].y + (points[i].y - points[i - 1].y) * t,
      };
    }
    halfLen -= segLen;
  }
  return { x: points[0].x, y: points[0].y };
}

// ── Main: compute all routed edges ──────────────────────────────────
export function computeRoutedEdges(nodes, edges) {
  if (!nodes || !edges || nodes.length === 0 || edges.length === 0) return edges;

  const nodeLookup = {};
  for (const n of nodes) nodeLookup[n.id] = n;

  // Build obstacles once for all edges (include ALL nodes)
  const allObstacles = buildObstacles(nodes, null);

  const routed = edges.map(edge => {
    const srcNode = nodeLookup[edge.source];
    const tgtNode = nodeLookup[edge.target];
    if (!srcNode || !tgtNode) return edge;
    if (srcNode.hidden || tgtNode.hidden) return edge;


    const srcHandle = getHandlePos(srcNode, 'source', edge.sourceHandle);
    const tgtHandle = getHandlePos(tgtNode, 'target', edge.targetHandle);

    // Compute offset points extending outward from each handle.
    // The A* route runs between these offset points so edges don't
    // hug node boundaries.  We prepend/append the actual handle
    // positions afterward so the edge visually connects to the node.
    const srcOff = offsetPoint(srcHandle, HANDLE_OFFSET);
    const tgtOff = offsetPoint(tgtHandle, HANDLE_OFFSET);

    // Exclude source/target from the padded obstacle set, then re-add
    // them with a small gap so the routed path stays clear of the node
    // body while the stub segments bridge the gap.
    const SRC_TGT_PAD = 5;
    const obstacles = allObstacles.filter(o => o.id !== edge.source && o.id !== edge.target);

    const srcPos = srcNode._absolutePosition || srcNode.position;
    const srcW = srcNode.width || srcNode.measured?.width || DEFAULT_NODE_WIDTH;
    const srcH = srcNode.height || srcNode.measured?.height || DEFAULT_NODE_HEIGHT;
    obstacles.push({ id: edge.source, x: srcPos.x - SRC_TGT_PAD, y: srcPos.y - SRC_TGT_PAD, w: srcW + 2 * SRC_TGT_PAD, h: srcH + 2 * SRC_TGT_PAD });

    const tgtPos = tgtNode._absolutePosition || tgtNode.position;
    const tgtW = tgtNode.width || tgtNode.measured?.width || DEFAULT_NODE_WIDTH;
    const tgtH = tgtNode.height || tgtNode.measured?.height || DEFAULT_NODE_HEIGHT;
    obstacles.push({ id: edge.target, x: tgtPos.x - SRC_TGT_PAD, y: tgtPos.y - SRC_TGT_PAD, w: tgtW + 2 * SRC_TGT_PAD, h: tgtH + 2 * SRC_TGT_PAD });

    if (obstacles.length === 0) return edge;

    const routedPoints = findRoute(srcOff, tgtOff, obstacles);
    if (routedPoints && routedPoints.length >= 2) {
      // Prepend handle pos → offset, append offset → handle pos
      routedPoints.unshift({ x: srcHandle.x, y: srcHandle.y });
      routedPoints.push({ x: tgtHandle.x, y: tgtHandle.y });
      return { ...edge, _routedPoints: routedPoints };
    }
    // No obstacles in the way — let the default bezier/straight render handle it
    return edge;
  });

  // Apply edge-to-edge spacing
  return nudgeParallelEdges(routed);
}

// ── Route a single path (for connection line during drag) ───────────
export function routeSinglePath(fromX, fromY, toX, toY, fromDir, toDir, nodes, excludeNodeIds) {
  const obstacles = buildObstacles(nodes, excludeNodeIds ? new Set(excludeNodeIds) : null);
  if (obstacles.length === 0) return null;

  const src = { x: fromX, y: fromY, dir: fromDir || 'right' };
  const tgt = { x: toX, y: toY, dir: toDir || 'left' };
  const srcOff = offsetPoint(src, HANDLE_OFFSET);
  const tgtOff = offsetPoint(tgt, HANDLE_OFFSET);
  const route = findRoute(srcOff, tgtOff, obstacles);
  if (route && route.length >= 2) {
    route.unshift({ x: src.x, y: src.y });
    route.push({ x: tgt.x, y: tgt.y });
    return route;
  }
  return null;
}

export default computeRoutedEdges;
