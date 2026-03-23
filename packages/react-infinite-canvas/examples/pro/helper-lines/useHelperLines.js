const SNAP_THRESHOLD = 5;

export function getHelperLines(change, nodes) {
  const movingNode = nodes.find((n) => n.id === change.id);
  if (!movingNode || !change.position) {
    return { horizontal: null, vertical: null, snappedPosition: change.position };
  }

  const pos = change.position;
  const w = movingNode.width || movingNode.style?.width || 160;
  const h = movingNode.height || movingNode.style?.height || 60;

  let horizontal = null;
  let vertical = null;
  let snapX = pos.x;
  let snapY = pos.y;

  for (const node of nodes) {
    if (node.id === movingNode.id) continue;
    const nw = node.width || node.style?.width || 160;
    const nh = node.height || node.style?.height || 60;

    // Vertical alignment (x-axis snap)
    const anchorsX = [
      { moving: pos.x, target: node.position.x },
      { moving: pos.x + w, target: node.position.x + nw },
      { moving: pos.x + w / 2, target: node.position.x + nw / 2 },
      { moving: pos.x, target: node.position.x + nw },
      { moving: pos.x + w, target: node.position.x },
    ];

    for (const a of anchorsX) {
      if (Math.abs(a.moving - a.target) < SNAP_THRESHOLD) {
        snapX = pos.x + (a.target - a.moving);
        vertical = a.target;
        break;
      }
    }

    // Horizontal alignment (y-axis snap)
    const anchorsY = [
      { moving: pos.y, target: node.position.y },
      { moving: pos.y + h, target: node.position.y + nh },
      { moving: pos.y + h / 2, target: node.position.y + nh / 2 },
      { moving: pos.y, target: node.position.y + nh },
      { moving: pos.y + h, target: node.position.y },
    ];

    for (const a of anchorsY) {
      if (Math.abs(a.moving - a.target) < SNAP_THRESHOLD) {
        snapY = pos.y + (a.target - a.moving);
        horizontal = a.target;
        break;
      }
    }
  }

  return { horizontal, vertical, snappedPosition: { x: snapX, y: snapY } };
}
