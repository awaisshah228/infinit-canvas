import { memo } from 'react';
import { BaseEdge } from './BaseEdge.jsx';
import { getBezierPath } from '../../utils/paths.js';
import { routedPointsToPath, getRoutedLabelPosition } from '../../utils/edgeRouter.js';

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
  pathOptions,
  interactionWidth,
  routedPoints,
}) {
  let path, labelX, labelY;
  if (routedPoints && routedPoints.length >= 2) {
    path = routedPointsToPath(routedPoints);
    const lp = getRoutedLabelPosition(routedPoints);
    labelX = lp.x;
    labelY = lp.y;
  } else {
    [path, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      curvature: pathOptions?.curvature,
    });
  }

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
