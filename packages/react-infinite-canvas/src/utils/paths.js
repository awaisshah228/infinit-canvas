// Edge path generators — compatible with React Flow's API
// Returns [path, labelX, labelY, offsetX, offsetY]

export function getStraightPath({ sourceX, sourceY, targetX, targetY }) {
  const path = `M ${sourceX},${sourceY}L ${targetX},${targetY}`;
  const labelX = (sourceX + targetX) / 2;
  const labelY = (sourceY + targetY) / 2;
  return [path, labelX, labelY, 0, 0];
}

export function getBezierPath({
  sourceX, sourceY, targetX, targetY,
  sourcePosition = 'right', targetPosition = 'left',
  curvature = 0.25,
}) {
  const dx = Math.abs(targetX - sourceX);
  const dy = Math.abs(targetY - sourceY);
  const dist = Math.sqrt(dx * dx + dy * dy);
  const offset = Math.max(dist * curvature, 50);

  let cp1x, cp1y, cp2x, cp2y;

  switch (sourcePosition) {
    case 'top':    cp1x = sourceX; cp1y = sourceY - offset; break;
    case 'bottom': cp1x = sourceX; cp1y = sourceY + offset; break;
    case 'left':   cp1x = sourceX - offset; cp1y = sourceY; break;
    default:       cp1x = sourceX + offset; cp1y = sourceY; break; // right
  }

  switch (targetPosition) {
    case 'top':    cp2x = targetX; cp2y = targetY - offset; break;
    case 'bottom': cp2x = targetX; cp2y = targetY + offset; break;
    case 'right':  cp2x = targetX + offset; cp2y = targetY; break;
    default:       cp2x = targetX - offset; cp2y = targetY; break; // left
  }

  const path = `M ${sourceX},${sourceY} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${targetX},${targetY}`;
  // Bezier midpoint at t=0.5
  const t = 0.5;
  const mt = 1 - t;
  const labelX = mt*mt*mt*sourceX + 3*mt*mt*t*cp1x + 3*mt*t*t*cp2x + t*t*t*targetX;
  const labelY = mt*mt*mt*sourceY + 3*mt*mt*t*cp1y + 3*mt*t*t*cp2y + t*t*t*targetY;
  return [path, labelX, labelY, 0, 0];
}

export function getSimpleBezierPath({ sourceX, sourceY, targetX, targetY }) {
  const dx = Math.abs(targetX - sourceX);
  const offset = Math.max(dx * 0.5, 50);
  const cp1x = sourceX + offset;
  const cp2x = targetX - offset;
  const path = `M ${sourceX},${sourceY} C ${cp1x},${sourceY} ${cp2x},${targetY} ${targetX},${targetY}`;
  const t = 0.5;
  const mt = 0.5;
  const labelX = mt*mt*mt*sourceX + 3*mt*mt*t*cp1x + 3*mt*t*t*cp2x + t*t*t*targetX;
  const labelY = mt*mt*mt*sourceY + 3*mt*mt*t*sourceY + 3*mt*t*t*targetY + t*t*t*targetY;
  return [path, labelX, labelY, 0, 0];
}

export function getSmoothStepPath({
  sourceX, sourceY, targetX, targetY,
  sourcePosition = 'right', targetPosition = 'left',
  borderRadius = 5,
  offset = 20,
}) {
  const isHorizontalSource = sourcePosition === 'left' || sourcePosition === 'right';
  const isHorizontalTarget = targetPosition === 'left' || targetPosition === 'right';

  // Calculate midpoints
  let midX, midY;
  if (isHorizontalSource && isHorizontalTarget) {
    midX = (sourceX + targetX) / 2;
    midY = sourceY; // First segment is horizontal
  } else if (!isHorizontalSource && !isHorizontalTarget) {
    midX = sourceX;
    midY = (sourceY + targetY) / 2;
  } else {
    midX = targetX;
    midY = sourceY;
  }

  const br = Math.min(borderRadius, Math.abs(targetX - sourceX) / 2, Math.abs(targetY - sourceY) / 2);

  // Build step path with rounded corners
  if (isHorizontalSource) {
    const dirX = sourcePosition === 'right' ? 1 : -1;
    const sx = sourceX + dirX * offset;

    if (Math.abs(targetY - sourceY) < 1) {
      // Straight horizontal
      const path = `M ${sourceX},${sourceY} L ${targetX},${targetY}`;
      return [path, (sourceX + targetX) / 2, sourceY, 0, 0];
    }

    const stepX = (sourceX + targetX) / 2;
    const dySign = targetY > sourceY ? 1 : -1;

    const path = `M ${sourceX},${sourceY} L ${stepX - br},${sourceY} Q ${stepX},${sourceY} ${stepX},${sourceY + dySign * br} L ${stepX},${targetY - dySign * br} Q ${stepX},${targetY} ${stepX + (targetX > stepX ? br : -br)},${targetY} L ${targetX},${targetY}`;
    return [path, stepX, (sourceY + targetY) / 2, 0, 0];
  }

  // Vertical source
  const dirY = sourcePosition === 'bottom' ? 1 : -1;
  const stepY = (sourceY + targetY) / 2;
  const dxSign = targetX > sourceX ? 1 : -1;

  const path = `M ${sourceX},${sourceY} L ${sourceX},${stepY - br} Q ${sourceX},${stepY} ${sourceX + dxSign * br},${stepY} L ${targetX - dxSign * br},${stepY} Q ${targetX},${stepY} ${targetX},${stepY + (targetY > stepY ? br : -br)} L ${targetX},${targetY}`;
  return [path, (sourceX + targetX) / 2, stepY, 0, 0];
}

export function getBezierEdgeCenter({ sourceX, sourceY, targetX, targetY }) {
  const [, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY });
  return [labelX, labelY, 0, 0];
}

export function getEdgeCenter({ sourceX, sourceY, targetX, targetY }) {
  return [(sourceX + targetX) / 2, (sourceY + targetY) / 2, 0, 0];
}

// Reconnect an edge — moves source or target to a new node/handle
export function reconnectEdge(oldEdge, newConnection, edges) {
  const newEdges = edges.filter((e) => e.id !== oldEdge.id);
  const newEdge = {
    ...oldEdge,
    id: oldEdge.id,
    source: newConnection.source,
    target: newConnection.target,
    sourceHandle: newConnection.sourceHandle ?? oldEdge.sourceHandle,
    targetHandle: newConnection.targetHandle ?? oldEdge.targetHandle,
  };
  newEdges.push(newEdge);
  return newEdges;
}
