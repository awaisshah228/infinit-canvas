import { memo } from 'react';
import { BaseEdge } from './BaseEdge.jsx';

const STUB = 20;

function getStubPoint(x, y, position) {
  switch (position) {
    case 'right':  return { x: x + STUB, y };
    case 'left':   return { x: x - STUB, y };
    case 'bottom': return { x, y: y + STUB };
    case 'top':    return { x, y: y - STUB };
    default:       return { x: x + STUB, y };
  }
}

const BezierEdge = memo(function BezierEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition = 'bottom',
  targetPosition = 'top',
  label,
  labelStyle,
  labelShowBg,
  labelBgStyle,
  labelBgPadding,
  labelBgBorderRadius,
  style,
  markerEnd,
  markerStart,
  interactionWidth,
}) {
  let path, labelX, labelY;

  // Bezier with stubs — short straight segment from handle, then curve between stub points
  const srcStub = getStubPoint(sourceX, sourceY, sourcePosition);
  const tgtStub = getStubPoint(targetX, targetY, targetPosition);

  const dx = Math.abs(tgtStub.x - srcStub.x);
  const cpOfs = Math.max(50, dx * 0.5);

  let cp1x, cp1y, cp2x, cp2y;
  switch (sourcePosition) {
    case 'left':   cp1x = srcStub.x - cpOfs; cp1y = srcStub.y; break;
    case 'top':    cp1x = srcStub.x; cp1y = srcStub.y - cpOfs; break;
    case 'bottom': cp1x = srcStub.x; cp1y = srcStub.y + cpOfs; break;
    default:       cp1x = srcStub.x + cpOfs; cp1y = srcStub.y; break; // right
  }
  switch (targetPosition) {
    case 'right':  cp2x = tgtStub.x + cpOfs; cp2y = tgtStub.y; break;
    case 'top':    cp2x = tgtStub.x; cp2y = tgtStub.y - cpOfs; break;
    case 'bottom': cp2x = tgtStub.x; cp2y = tgtStub.y + cpOfs; break;
    default:       cp2x = tgtStub.x - cpOfs; cp2y = tgtStub.y; break; // left
  }

  path = `M ${sourceX},${sourceY} L ${srcStub.x},${srcStub.y} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${tgtStub.x},${tgtStub.y} L ${targetX},${targetY}`;

  // Label at bezier midpoint (t=0.5)
  const t = 0.5, mt = 0.5;
  labelX = mt*mt*mt*srcStub.x + 3*mt*mt*t*cp1x + 3*mt*t*t*cp2x + t*t*t*tgtStub.x;
  labelY = mt*mt*mt*srcStub.y + 3*mt*mt*t*cp1y + 3*mt*t*t*cp2y + t*t*t*tgtStub.y;

  return (
    <BaseEdge
      id={id}
      path={path}
      labelX={labelX}
      labelY={labelY}
      label={label}
      labelStyle={labelStyle}
      labelShowBg={labelShowBg}
      labelBgStyle={labelBgStyle}
      labelBgPadding={labelBgPadding}
      labelBgBorderRadius={labelBgBorderRadius}
      style={style}
      markerEnd={markerEnd}
      markerStart={markerStart}
      interactionWidth={interactionWidth}
    />
  );
});

BezierEdge.displayName = 'BezierEdge';

export { BezierEdge };
