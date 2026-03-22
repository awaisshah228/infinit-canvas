import { memo } from 'react';
import { BaseEdge } from './BaseEdge.jsx';
import { getSmoothStepPath } from '../../utils/paths.js';
import { routedPointsToPath, getRoutedLabelPosition } from '../../utils/edgeRouter.js';

const SmoothStepEdge = memo(function SmoothStepEdge({
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
    [path, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      borderRadius: pathOptions?.borderRadius,
      offset: pathOptions?.offset,
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

SmoothStepEdge.displayName = 'SmoothStepEdge';

export { SmoothStepEdge };
