const DEFAULT_NODE_WIDTH = 160;
const DEFAULT_NODE_HEIGHT = 60;

export function isNode(element) {
  return element && typeof element === 'object' && 'position' in element && 'data' in element;
}

export function isEdge(element) {
  return element && typeof element === 'object' && 'source' in element && 'target' in element;
}

export function getConnectedEdges(nodesOrId, edges) {
  const ids = typeof nodesOrId === 'string'
    ? new Set([nodesOrId])
    : new Set(Array.isArray(nodesOrId) ? nodesOrId.map((n) => n.id) : [nodesOrId.id]);
  return edges.filter((e) => ids.has(e.source) || ids.has(e.target));
}

export function getIncomers(nodeOrId, nodes, edges) {
  const id = typeof nodeOrId === 'string' ? nodeOrId : nodeOrId.id;
  const incomingIds = new Set();
  for (const edge of edges) {
    if (edge.target === id) incomingIds.add(edge.source);
  }
  return nodes.filter((n) => incomingIds.has(n.id));
}

export function getOutgoers(nodeOrId, nodes, edges) {
  const id = typeof nodeOrId === 'string' ? nodeOrId : nodeOrId.id;
  const outgoingIds = new Set();
  for (const edge of edges) {
    if (edge.source === id) outgoingIds.add(edge.target);
  }
  return nodes.filter((n) => outgoingIds.has(n.id));
}

export function getNodesBounds(nodes) {
  if (!nodes.length) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const node of nodes) {
    const x = node.position.x;
    const y = node.position.y;
    const w = node.width || DEFAULT_NODE_WIDTH;
    const h = node.height || DEFAULT_NODE_HEIGHT;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x + w > maxX) maxX = x + w;
    if (y + h > maxY) maxY = y + h;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function getViewportForBounds(bounds, viewportWidth, viewportHeight, padding = 0.1) {
  const bw = bounds.width * (1 + padding * 2);
  const bh = bounds.height * (1 + padding * 2);
  const zoom = Math.min(viewportWidth / bw, viewportHeight / bh, 1);
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  return {
    x: viewportWidth / 2 - cx * zoom,
    y: viewportHeight / 2 - cy * zoom,
    zoom,
  };
}

export function snapPosition(position, snapGrid) {
  return {
    x: snapGrid[0] * Math.round(position.x / snapGrid[0]),
    y: snapGrid[1] * Math.round(position.y / snapGrid[1]),
  };
}

export function clampPosition(position, extent) {
  return {
    x: Math.min(Math.max(position.x, extent[0][0]), extent[1][0]),
    y: Math.min(Math.max(position.y, extent[0][1]), extent[1][1]),
  };
}

export function getNodeDimensions(node) {
  return {
    width: node.width || node.measured?.width || DEFAULT_NODE_WIDTH,
    height: node.height || node.measured?.height || DEFAULT_NODE_HEIGHT,
  };
}

export function getNodesInside(nodes, rect, viewport = { x: 0, y: 0, zoom: 1 }, partially = false) {
  const rLeft = rect.x;
  const rTop = rect.y;
  const rRight = rect.x + rect.width;
  const rBottom = rect.y + rect.height;

  return nodes.filter((node) => {
    const { width: nw, height: nh } = getNodeDimensions(node);
    const nLeft = node.position.x;
    const nTop = node.position.y;
    const nRight = nLeft + nw;
    const nBottom = nTop + nh;

    if (partially) {
      return nLeft < rRight && nRight > rLeft && nTop < rBottom && nBottom > rTop;
    }
    return nLeft >= rLeft && nRight <= rRight && nTop >= rTop && nBottom <= rBottom;
  });
}

export function rectToBox(rect) {
  return { x: rect.x, y: rect.y, x2: rect.x + rect.width, y2: rect.y + rect.height };
}

export function boxToRect(box) {
  return { x: box.x, y: box.y, width: box.x2 - box.x, height: box.y2 - box.y };
}

export function getBoundsOfBoxes(box1, box2) {
  return {
    x: Math.min(box1.x, box2.x),
    y: Math.min(box1.y, box2.y),
    x2: Math.max(box1.x2, box2.x2),
    y2: Math.max(box1.y2, box2.y2),
  };
}

export function getOverlappingArea(rectA, rectB) {
  const xOverlap = Math.max(0, Math.min(rectA.x + rectA.width, rectB.x + rectB.width) - Math.max(rectA.x, rectB.x));
  const yOverlap = Math.max(0, Math.min(rectA.y + rectA.height, rectB.y + rectB.height) - Math.max(rectA.y, rectB.y));
  return xOverlap * yOverlap;
}

export function nodeToRect(node) {
  const { width, height } = getNodeDimensions(node);
  return { x: node.position.x, y: node.position.y, width, height };
}
