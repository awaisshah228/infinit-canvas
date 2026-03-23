import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useReactFlow, useStore, type XYPosition } from '@infinit-canvas/react';

import { ControlDirection, ControlPointData } from './ControlPoint';
import { isControlAnchorActive } from './path/step';

export type ControlAnchorProps = {
  id: string;
  index: number;
  x: number;
  y: number;
  color: string;
  active?: boolean;
  setControlPoints: (
    update: (points: ControlPointData[]) => ControlPointData[],
  ) => void;
  direction: ControlDirection | undefined;
  initialStepPoints: ControlPointData[];
};

/**
 * Determines if both points passed as params are same(their x,y coordinates are same)
 */
const isSamePoint = (
  point1: XYPosition | undefined,
  point2: XYPosition | undefined,
) => {
  return point1?.x === point2?.x && point1?.y === point2?.y;
};

function simplifyHorizontalPoints(
  points: ControlPointData[],
): ControlPointData[] {
  if (points.length < 3) return points;

  const result: ControlPointData[] = [];
  let i = 0;

  while (i < points.length) {
    const currentY = points[i].y;
    let j = i + 1;

    // Count how many consecutive points have the same y
    while (j < points.length && points[j].y === currentY) {
      j++;
    }

    const count = j - i;

    if (count >= 3) {
      // Keep only the first and last points in the group
      result.push(points[i]);
      result.push(points[j - 1]);
    } else {
      // Keep all points in small groups (< 3)
      for (let k = i; k < j; k++) {
        result.push(points[k]);
      }
    }

    i = j;
  }

  return result;
}

export function ControlAnchor({
  id,
  index,
  x,
  y,
  color,
  active,
  setControlPoints,
  direction = ControlDirection.Horizontal,
  initialStepPoints,
}: ControlAnchorProps) {
  const container = useStore((store) => store.domNode);
  const { screenToFlowPosition } = useReactFlow();
  const [dragging, setDragging] = useState(false);
  const ref = useRef<SVGCircleElement>(null);

  const giveFlatPosition = useCallback(
    ({
      prevControl,
      pos,
    }: {
      prevControl: ControlPointData;
      pos: XYPosition;
    }): XYPosition => {
      return {
        x: prevControl?.x,
        y: prevControl?.y,
        ...(direction === ControlDirection.Vertical && { y: pos.y }),
        ...(direction === ControlDirection.Horizontal && { x: pos.x }),
      };
    },
    [direction],
  );

  const slicedInitialStepPoints = useMemo(() => {
    return initialStepPoints.slice(1, initialStepPoints.length - 1);
  }, [initialStepPoints]);

  // CALLBACKS -----------------------------------------------------------------
  const updatePosition = useCallback(
    (pos: XYPosition) => {
      setControlPoints((prevControlPoints) => {
        const points =
          prevControlPoints?.length === 0
            ? slicedInitialStepPoints
            : prevControlPoints;

        const originPoint = points[0];
        const targetPoint = points[points.length - 1];

        const newPoints = [...points];
        const prevPoint = newPoints[index];
        const nextPoint = newPoints[index + 1];

        /**
         * Generate new point based on the dragging direction e.g
         * dragging a point in horizontal direction should only
         * change the x coordinate of the position of the point.
         */
        const modifiedPrevPoint = {
          ...prevPoint,
          ...giveFlatPosition({ prevControl: prevPoint, pos }),
        };
        const modifiedNextPoint = {
          ...nextPoint,
          ...giveFlatPosition({ prevControl: nextPoint, pos }),
          active: true,
        };

        newPoints[index] = modifiedPrevPoint;
        newPoints[index + 1] = modifiedNextPoint;

        /**
         * If a point is not active, dragging it should add a point
         * in the next or previous position
         */

        const shouldAddNextPoint =
          isSamePoint(nextPoint, targetPoint) && !active && !!targetPoint;
        const shouldAddPrevPoint =
          isSamePoint(prevPoint, originPoint) && !active && !!originPoint;

        if (shouldAddNextPoint) {
          newPoints.push({ ...targetPoint, id: window.crypto.randomUUID() });
        }

        if (shouldAddPrevPoint) {
          newPoints.unshift({ ...originPoint, id: window.crypto.randomUUID() });
        }

        return newPoints;
      });
    },
    [
      setControlPoints,
      slicedInitialStepPoints,
      index,
      giveFlatPosition,
      active,
    ],
  );

  const deletePoint = useCallback(() => {
    setControlPoints((points) => {
      if (!points.length) return points;

      const prevPoint = points[index];
      const nextPoint = points[index + 1];

      if (!prevPoint && !nextPoint) return points;
      if (!isControlAnchorActive({ nextPoint })) return points;

      let newPoints = [...points];

      let isHorizontal = false;
      if (prevPoint.y === nextPoint.y) isHorizontal = true;

      if (isHorizontal) {
        /**
         * If the line segment corresponding to the control anchor is horizontal, we should change the y
         * coordinates of the concerned points(previous and next) to the next line segment's y.
         */
        const relevantPoint = newPoints[index + 2];
        newPoints[index] = {
          ...newPoints[index],
          y: relevantPoint?.y,
        };
        newPoints[index + 1] = {
          ...newPoints[index + 1],
          y: relevantPoint?.y,
        };
      } else {
        /**
         * If the line segment corresponding to the control anchor is vertical, we should change the y
         * coordinates of the concerned points(previous and next) to the previous line segment's y.
         */
        const relevantPoint = newPoints[index];
        newPoints[index + 1] = {
          ...newPoints[index + 1],
          y: relevantPoint?.y,
        };
        newPoints[index + 2] = {
          ...newPoints[index + 2],
          y: relevantPoint?.y,
        };
      }

      /**
       * If changing the y coordinates of some points, results in more than 2 points in a line segment, we remove
       * the ones in between and only keep the first and last points of the segment
       */
      newPoints = simplifyHorizontalPoints(newPoints);

      /**
       * Whenever we delete a point, we set the active property of the 1st and nth index to false so that they remain
       * inactive(if they somehow become active due to the merging of several points to two as in above step)
       * because technically the first and last points should be inactive at all times
       */
      newPoints[1] = { ...newPoints[1], active: false };

      newPoints[newPoints.length - 1] = {
        ...newPoints[newPoints.length - 1],
        active: false,
      };

      /**
       * If the newPoints length based off of control anchor deletion has less length as the initial
       * step points, then we return an empty array which would then make use of the initialStepPoints array for
       * generating the step edge path
       */
      if (newPoints.length < slicedInitialStepPoints.length) return [];

      return newPoints;
    });
  }, [index, setControlPoints, slicedInitialStepPoints]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'Enter':
        case 'Space':
          if (!active) {
            e.preventDefault();
          }
          updatePosition({ x, y });
          break;

        case 'Backspace':
        case 'Delete':
          e.stopPropagation();
          deletePoint();
          break;

        // Move a point in horizontal or vertical direction by 5 px based on the
        // the key pressed
        case 'ArrowLeft':
          if (direction === ControlDirection.Horizontal)
            updatePosition({ x: x - 5, y });
          break;

        case 'ArrowRight':
          if (direction === ControlDirection.Horizontal)
            updatePosition({ x: x + 5, y });
          break;

        case 'ArrowUp':
          if (direction === ControlDirection.Vertical)
            updatePosition({ x, y: y - 5 });
          break;

        case 'ArrowDown':
          if (direction === ControlDirection.Vertical)
            updatePosition({ x, y: y + 5 });
          break;

        default:
          break;
      }
    },
    [active, updatePosition, x, y, deletePoint, direction],
  );

  // EFFECTS -------------------------------------------------------------------

  useEffect(() => {
    // return;
    if (!container || !active || !dragging) return;

    const onPointerMove = (e: PointerEvent) => {
      updatePosition(screenToFlowPosition({ x: e.clientX, y: e.clientY }));
    };

    const onPointerUp = (e: PointerEvent) => {
      container.removeEventListener('pointermove', onPointerMove);

      if (!active) {
        e.preventDefault();
      }

      setDragging(false);
      updatePosition(screenToFlowPosition({ x: e.clientX, y: e.clientY }));
    };

    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp, { once: true });
    container.addEventListener('pointerleave', onPointerUp, { once: true });

    return () => {
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointerleave', onPointerUp);

      setDragging(false);
    };
  }, [
    id,
    container,
    dragging,
    active,
    screenToFlowPosition,
    setControlPoints,
    updatePosition,
  ]);

  // RENDER --------------------------------------------------------------------

  return (
    <circle
      ref={ref}
      tabIndex={0}
      id={id}
      className={'nopan nodrag' + (active ? ' active' : '')}
      cx={x}
      cy={y}
      r={active ? 4 : 3}
      strokeOpacity={active ? 1 : 0.3}
      stroke={color}
      fill={active ? color : 'white'}
      style={{ pointerEvents: 'all' }}
      onContextMenu={(e) => {
        e.preventDefault();
        // delete point by right clicking
        if (active) {
          deletePoint();
        }
      }}
      onPointerDown={(e) => {
        if (e.button === 2) return;
        updatePosition({ x, y });
        setDragging(true);
      }}
      onKeyDown={handleKeyPress}
      onPointerUp={() => setDragging(false)}
    />
  );
}
