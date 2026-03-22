import { memo } from 'react';
import { BaseEdge } from './BaseEdge.jsx';
import { getStraightPath } from '../../utils/paths.js';
import { routedPointsToPath, getRoutedLabelPosition } from '../../utils/edgeRouter.js';

const StraightEdge = memo(function StraightEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
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
    [path, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY });
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

StraightEdge.displayName = 'StraightEdge';

export { StraightEdge };
