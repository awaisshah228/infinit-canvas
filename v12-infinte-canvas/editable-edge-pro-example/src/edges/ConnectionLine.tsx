import { useEffect, useMemo, useState } from 'react';
import { MarkerType, type ConnectionLineComponentProps } from '@infinit-canvas/react';

import { useAppStore } from '../store';
import { getPath } from './EditableEdge';
import { Algorithm, COLORS, DEFAULT_ALGORITHM } from './EditableEdge/constants';
import { getStepInitialPoints, OFFSET } from './EditableEdge/path/step';

// The distance between points when free drawing
const DISTANCE = DEFAULT_ALGORITHM === Algorithm.BezierCatmullRom ? 50 : 25;

export function ConnectionLine({
  fromX,
  fromY,
  toX,
  toY,
  fromPosition,
  toPosition,
  connectionStatus,
}: ConnectionLineComponentProps) {
  const { connectionLinePath, setConnectionLinePath } = useAppStore();
  const [freeDrawing, setFreeDrawing] = useState(false);

  // Check how far the cursor is from the last point in the path
  // and add a new point if it's far enough
  const prev = connectionLinePath[connectionLinePath.length - 1] ?? {
    x: fromX,
    y: fromY,
  };
  const distance = Math.hypot(prev.x - toX, prev.y - toY);
  const shouldAddPoint = freeDrawing && distance > DISTANCE;

  useEffect(() => {
    if (shouldAddPoint) {
      setConnectionLinePath([...connectionLinePath, { x: toX, y: toY }]);
    }
  }, [connectionLinePath, setConnectionLinePath, shouldAddPoint, toX, toY]);

  useEffect(() => {
    // pressing or holding the space key enables free drawing
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === ' ') {
        setFreeDrawing(true);
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.key === ' ') {
        setFreeDrawing(false);
      }
    }

    setConnectionLinePath([]);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      setFreeDrawing(false);
    };
  }, [setConnectionLinePath]);

  /**
   * Added Initial Step Points here so that dont have to calculate seperately
   * in the path + control points function
   */
  const initialStepPoints = useMemo(
    () =>
      getStepInitialPoints({
        source: { x: fromX, y: fromY },
        target: { x: toX, y: toY },
        offset: OFFSET,
        sourcePosition: fromPosition,
        targetPosition: toPosition,
      }).map((point, index) => ({ ...point, id: `${index}` })),
    [fromPosition, fromX, fromY, toPosition, toX, toY]
  );

  const path = getPath({
    points: [{ x: fromX, y: fromY }, ...connectionLinePath, { x: toX, y: toY }],
    algorithm: DEFAULT_ALGORITHM,
    sides: { fromSide: fromPosition, toSide: toPosition },
    initialStepPoints,
  });

  return (
    <g>
      <path
        fill="none"
        stroke={COLORS[DEFAULT_ALGORITHM]}
        strokeWidth={2}
        className={connectionStatus === 'valid' ? '' : 'animated'}
        d={path}
        markerStart={MarkerType.ArrowClosed}
        markerWidth={25}
        markerEnd={MarkerType.ArrowClosed}
      />
    </g>
  );
}
