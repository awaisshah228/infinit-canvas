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
