import { memo } from 'react';
import { getBezierPath, getStraightPath, getSmoothStepPath, getSimpleBezierPath } from '../../utils/paths.js';

function ConnectionLine({
  fromX,
  fromY,
  toX,
  toY,
  fromPosition = 'right',
  toPosition = 'left',
  connectionLineType = 'default',
  connectionLineStyle,
  connectionLineComponent: CustomComponent,
}) {
  if (CustomComponent) {
    return (
      <CustomComponent
        fromX={fromX}
        fromY={fromY}
        toX={toX}
        toY={toY}
        fromPosition={fromPosition}
        toPosition={toPosition}
      />
    );
  }

  let path;
  switch (connectionLineType) {
    case 'straight':
      [path] = getStraightPath({ sourceX: fromX, sourceY: fromY, targetX: toX, targetY: toY });
      break;
    case 'step':
      [path] = getSmoothStepPath({
        sourceX: fromX, sourceY: fromY, targetX: toX, targetY: toY,
        sourcePosition: fromPosition, targetPosition: toPosition,
        borderRadius: 0,
      });
      break;
    case 'smoothstep':
      [path] = getSmoothStepPath({
        sourceX: fromX, sourceY: fromY, targetX: toX, targetY: toY,
        sourcePosition: fromPosition, targetPosition: toPosition,
      });
      break;
    case 'simplebezier':
      [path] = getSimpleBezierPath({ sourceX: fromX, sourceY: fromY, targetX: toX, targetY: toY });
      break;
    default: // 'default' or 'bezier'
      [path] = getBezierPath({
        sourceX: fromX, sourceY: fromY, targetX: toX, targetY: toY,
        sourcePosition: fromPosition, targetPosition: toPosition,
      });
      break;
  }

  return (
    <path
      d={path}
      fill="none"
      className="ric-connection-line"
      stroke="#b1b1b7"
      strokeWidth={1.5}
      style={connectionLineStyle}
    />
  );
}

ConnectionLine.displayName = 'ConnectionLine';

export default memo(ConnectionLine);
