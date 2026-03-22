import { memo } from 'react';
import { BaseEdge } from './BaseEdge.jsx';
import { getSimpleBezierPath } from '../../utils/paths.js';
import { routedPointsToPath, getRoutedLabelPosition } from '../../utils/edgeRouter.js';

const SimpleBezierEdge = memo(function SimpleBezierEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
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
  routedPoints,
}) {
  let path, labelX, labelY;
  if (routedPoints && routedPoints.length >= 2) {
    path = routedPointsToPath(routedPoints);
    const lp = getRoutedLabelPosition(routedPoints);
    labelX = lp.x;
    labelY = lp.y;
  } else {
    [path, labelX, labelY] = getSimpleBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
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

SimpleBezierEdge.displayName = 'SimpleBezierEdge';

export { SimpleBezierEdge };
