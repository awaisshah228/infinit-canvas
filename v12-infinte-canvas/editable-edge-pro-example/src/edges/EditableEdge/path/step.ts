import { Position, XYPosition } from '@infinit-canvas/react';

import { ControlDirection, ControlPointData } from '../ControlPoint';

export const OFFSET = 20;

/**
 * These functions (getEdgeCenter, getDirection, distance, getBend) have been taken
 * from the xyflow package in their entirety, specifically from https://github.com/xyflow/xyflow/blob/411115f05b4a5b9c15f366e5537baeceab7899ec/packages/system/src/utils/edges/smoothstep-edge.ts.
 * The getInitialStepPoints function is a slightly modified version of getPoints where it only returns
 * anchor points and not labelX, labelY etc. Intially when no control point is added we want to mimic
 * the exact path behaviour that a smooth step edge has.
 */

export function getEdgeCenter({
  sourceX,
  sourceY,
  targetX,
  targetY,
}: {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}): [number, number, number, number] {
  const xOffset = Math.abs(targetX - sourceX) / 2;
  const centerX = targetX < sourceX ? targetX + xOffset : targetX - xOffset;

  const yOffset = Math.abs(targetY - sourceY) / 2;
  const centerY = targetY < sourceY ? targetY + yOffset : targetY - yOffset;

  return [centerX, centerY, xOffset, yOffset];
}

const handleDirections = {
  [Position.Left]: { x: -1, y: 0 },
  [Position.Right]: { x: 1, y: 0 },
  [Position.Top]: { x: 0, y: -1 },
  [Position.Bottom]: { x: 0, y: 1 },
};

const getDirection = ({
  source,
  sourcePosition = Position.Bottom,
  target,
}: {
  source: XYPosition;
  sourcePosition: Position;
  target: XYPosition;
}): XYPosition => {
  if (sourcePosition === Position.Left || sourcePosition === Position.Right) {
    return source.x < target.x ? { x: 1, y: 0 } : { x: -1, y: 0 };
  }
  return source.y < target.y ? { x: 0, y: 1 } : { x: 0, y: -1 };
};

const distance = (a: XYPosition, b: XYPosition) =>
  Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));

export function getStepInitialPoints({
  source,
  sourcePosition = Position.Bottom,
  target,
  targetPosition = Position.Top,
  center = { x: undefined, y: undefined },
  offset = OFFSET,
}: {
  source: XYPosition;
  sourcePosition: Position;
  target: XYPosition;
  targetPosition: Position;
  center?: Partial<XYPosition>;
  offset?: number;
}): XYPosition[] {
  const sourceDir = handleDirections[sourcePosition];
  const targetDir = handleDirections[targetPosition];
  const sourceGapped: XYPosition = {
    x: source.x + sourceDir.x * offset,
    y: source.y + sourceDir.y * offset,
  };
  const targetGapped: XYPosition = {
    x: target.x + targetDir.x * offset,
    y: target.y + targetDir.y * offset,
  };
  const dir = getDirection({
    source: sourceGapped,
    sourcePosition,
    target: targetGapped,
  });
  const dirAccessor = dir.x !== 0 ? 'x' : 'y';
  const currDir = dir[dirAccessor];

  let points: XYPosition[] = [];
  let centerX, centerY;
  const sourceGapOffset = { x: 0, y: 0 };
  const targetGapOffset = { x: 0, y: 0 };

  const [defaultCenterX, defaultCenterY] = getEdgeCenter({
    sourceX: source.x,
    sourceY: source.y,
    targetX: target.x,
    targetY: target.y,
  });

  // opposite handle positions, default case
  if (sourceDir[dirAccessor] * targetDir[dirAccessor] === -1) {
    centerX = center.x ?? defaultCenterX;
    centerY = center.y ?? defaultCenterY;
    /*
     *    --->
     *    |
     * >---
     */
    const verticalSplit: XYPosition[] = [
      { x: centerX, y: sourceGapped.y },
      { x: centerX, y: targetGapped.y },
    ];
    /*
     *    |
     *  ---
     *  |
     */
    const horizontalSplit: XYPosition[] = [
      { x: sourceGapped.x, y: centerY },
      { x: targetGapped.x, y: centerY },
    ];

    if (sourceDir[dirAccessor] === currDir) {
      points = dirAccessor === 'x' ? verticalSplit : horizontalSplit;
    } else {
      points = dirAccessor === 'x' ? horizontalSplit : verticalSplit;
    }
  } else {
    // sourceTarget means we take x from source and y from target, targetSource is the opposite
    const sourceTarget: XYPosition[] = [
      { x: sourceGapped.x, y: targetGapped.y },
    ];
    const targetSource: XYPosition[] = [
      { x: targetGapped.x, y: sourceGapped.y },
    ];
    // this handles edges with same handle positions
    if (dirAccessor === 'x') {
      points = sourceDir.x === currDir ? targetSource : sourceTarget;
    } else {
      points = sourceDir.y === currDir ? sourceTarget : targetSource;
    }

    if (sourcePosition === targetPosition) {
      const diff = Math.abs(source[dirAccessor] - target[dirAccessor]);

      // if an edge goes from right to right for example (sourcePosition === targetPosition) and the distance between source.x and target.x is less than the offset, the added point and the gapped source/target will overlap. This leads to a weird edge path. To avoid this we add a gapOffset to the source/target
      if (diff <= offset) {
        const gapOffset = Math.min(offset - 1, offset - diff);
        if (sourceDir[dirAccessor] === currDir) {
          sourceGapOffset[dirAccessor] =
            (sourceGapped[dirAccessor] > source[dirAccessor] ? -1 : 1) *
            gapOffset;
        } else {
          targetGapOffset[dirAccessor] =
            (targetGapped[dirAccessor] > target[dirAccessor] ? -1 : 1) *
            gapOffset;
        }
      }
    }

    // these are conditions for handling mixed handle positions like Right -> Bottom for example
    if (sourcePosition !== targetPosition) {
      const dirAccessorOpposite = dirAccessor === 'x' ? 'y' : 'x';
      const isSameDir =
        sourceDir[dirAccessor] === targetDir[dirAccessorOpposite];
      const sourceGtTargetOppo =
        sourceGapped[dirAccessorOpposite] > targetGapped[dirAccessorOpposite];
      const sourceLtTargetOppo =
        sourceGapped[dirAccessorOpposite] < targetGapped[dirAccessorOpposite];
      const flipSourceTarget =
        (sourceDir[dirAccessor] === 1 &&
          ((!isSameDir && sourceGtTargetOppo) ||
            (isSameDir && sourceLtTargetOppo))) ||
        (sourceDir[dirAccessor] !== 1 &&
          ((!isSameDir && sourceLtTargetOppo) ||
            (isSameDir && sourceGtTargetOppo)));

      if (flipSourceTarget) {
        points = dirAccessor === 'x' ? sourceTarget : targetSource;
      }
    }

    const sourceGapPoint = {
      x: sourceGapped.x + sourceGapOffset.x,
      y: sourceGapped.y + sourceGapOffset.y,
    };
    const targetGapPoint = {
      x: targetGapped.x + targetGapOffset.x,
      y: targetGapped.y + targetGapOffset.y,
    };
    const maxXDistance = Math.max(
      Math.abs(sourceGapPoint.x - points[0].x),
      Math.abs(targetGapPoint.x - points[0].x),
    );
    const maxYDistance = Math.max(
      Math.abs(sourceGapPoint.y - points[0].y),
      Math.abs(targetGapPoint.y - points[0].y),
    );

    // we want to place the label on the longest segment of the edge
    if (maxXDistance >= maxYDistance) {
      centerX = (sourceGapPoint.x + targetGapPoint.x) / 2;
      centerY = points[0].y;
    } else {
      centerX = points[0].x;
      centerY = (sourceGapPoint.y + targetGapPoint.y) / 2;
    }
  }

  const pathPoints = [
    source,
    {
      x: sourceGapped.x + sourceGapOffset.x,
      y: sourceGapped.y + sourceGapOffset.y,
    },
    ...points,
    {
      x: targetGapped.x + targetGapOffset.x,
      y: targetGapped.y + targetGapOffset.y,
    },
    target,
  ];

  return pathPoints;
}

function getBend(
  a: XYPosition,
  b: XYPosition,
  c: XYPosition,
  size: number,
): string {
  const bendSize = Math.min(distance(a, b) / 2, distance(b, c) / 2, size);
  const { x, y } = b;

  // no bend
  if ((a.x === x && x === c.x) || (a.y === y && y === c.y)) {
    return `L${x} ${y}`;
  }

  // first segment is horizontal
  if (a.y === y) {
    const xDir = a.x < c.x ? -1 : 1;
    const yDir = a.y < c.y ? 1 : -1;
    return `L ${x + bendSize * xDir},${y}Q ${x},${y} ${x},${
      y + bendSize * yDir
    }`;
  }

  const xDir = a.x < c.x ? 1 : -1;
  const yDir = a.y < c.y ? -1 : 1;
  return `L ${x},${y + bendSize * yDir}Q ${x},${y} ${x + bendSize * xDir},${y}`;
}

const setPointsBasedOnSide = ({
  points,
  side,
  handlePosition,
  isTarget = false,
}: {
  points: XYPosition[];
  side: Position;
  handlePosition: XYPosition;
  isTarget?: boolean;
}) => {
  // If the position is left or right then dirCoordinate would be x and vice versa.
  // Similary oppositeDirCoordinate is the opposite value of dirCoordinate

  let oppositeDirCoordinate: keyof XYPosition = 'x';
  let dirCoordinate: keyof XYPosition = 'y';
  if (side === Position.Left || side === Position.Right) {
    oppositeDirCoordinate = 'y';
    dirCoordinate = 'x';
  }

  /**
   * We want to mutate the x,y coordinates of the first and second point(from source and target side) based
   * off of the sourceX, sourceY(source handle) and targetX, targetY(target handle) position.
   *
   * The first and second point from the source side would have indices 0 and 1 but from the target side
   * they would be -1, -2
   */
  let firstPointIdx = 0;
  let secondPointIdx = 1;

  if (isTarget) {
    firstPointIdx = points.length - 1;
    secondPointIdx = points.length - 2;
  }

  /**
   * Following is code for changing the coordinates (x,y) of the first and second points from either side
   * (source, target) based on node's movement(i.e change in source or target handle positions). This logic
   * is written based off of a similar implementation in Miro for Editable Step Edges
   */

  if (
    points[secondPointIdx] &&
    points[firstPointIdx] &&
    points[secondPointIdx][oppositeDirCoordinate] !==
      points[firstPointIdx][oppositeDirCoordinate]
  ) {
    const sideDir = handleDirections[side];
    points[firstPointIdx] = {
      ...points[firstPointIdx],
      [dirCoordinate]:
        sideDir[dirCoordinate] * OFFSET + handlePosition[dirCoordinate],
      [oppositeDirCoordinate]: handlePosition[oppositeDirCoordinate],
    };
    points[secondPointIdx] = {
      ...points[secondPointIdx],
      [dirCoordinate]:
        sideDir[dirCoordinate] * OFFSET + handlePosition[dirCoordinate],
    };
  }

  if (
    points[secondPointIdx] &&
    points[firstPointIdx] &&
    points[secondPointIdx][oppositeDirCoordinate] ===
      points[firstPointIdx][oppositeDirCoordinate]
  ) {
    const sideDir = handleDirections[side];
    points[firstPointIdx] = {
      ...points[firstPointIdx],
      [oppositeDirCoordinate]: handlePosition[oppositeDirCoordinate],
      [dirCoordinate]:
        sideDir[dirCoordinate] * OFFSET + handlePosition[dirCoordinate],
    };
    points[secondPointIdx] = {
      ...points[secondPointIdx],
      [oppositeDirCoordinate]: handlePosition[oppositeDirCoordinate],
    };
  }
};

export const getPointsBasedOnNodePositions = ({
  points,
  sides: { fromSide, toSide },
  source,
  target,
}: {
  points: ControlPointData[];
  sides: { fromSide: Position; toSide: Position };
  source: { x: number; y: number };
  target: { x: number; y: number };
}) => {
  const copiedPoints = [...(points || [])];
  /**
   * We call the setPointsBasedOnSide function twice, once for each side(source and target). This updates the
   * first and second point from both source and target side based on node's movement(handle positions).
   */
  setPointsBasedOnSide({
    points: copiedPoints,
    side: fromSide,
    handlePosition: source,
  });
  setPointsBasedOnSide({
    points: copiedPoints,
    side: toSide,
    isTarget: true,
    handlePosition: target,
  });

  return copiedPoints;
};

/**
 * This function returns the initialStepPoints(based off of the smooth step edge react flow default implementation)
 * if points length is 2(i.e no control point as been added, its just source and target), otherwise it returns the
 * current control points
 */
const getStepPoints = ({
  points,
  initialStepPoints,
}: {
  points: (ControlPointData | XYPosition)[];
  initialStepPoints: ControlPointData[];
}) => {
  return points.length === 2 ? initialStepPoints : points;
};

// Generate step path based on anchor points
export function getStepPath({
  points,
  initialStepPoints,
}: {
  points: (ControlPointData | XYPosition)[];
  initialStepPoints: ControlPointData[];
}) {
  const finalPoints = getStepPoints({ points, initialStepPoints });

  /**
   * This function takes in the points and creates a basic path wrt to the points. Since this is a step path,
   * we just need to create lines between the points and bends at the corners.
   */
  const path = finalPoints.reduce<string>((res, p, i) => {
    let segment = '';

    if (i > 0 && i < finalPoints.length - 1) {
      segment = getBend(finalPoints[i - 1], p, finalPoints[i + 1], 5);
    } else {
      segment = `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`;
    }

    res += segment;

    return res;
  }, '');

  return path || '';
}

export const isControlAnchorActive = ({
  nextPoint,
}: {
  nextPoint: ControlPointData;
}) => {
  return nextPoint.active;
};

// Get middle step anchor control points based on edge control points.
export function getStepControlPoints({
  points,
  initialStepPoints,
}: {
  points: (ControlPointData | XYPosition)[];
  initialStepPoints: ControlPointData[];
}) {
  const controlPoints = [] as ControlPointData[];
  const finalPoints = getStepPoints({
    points,
    initialStepPoints,
  }) as ControlPointData[];

  /**
   * We map through the points to create control points for step edge. Based off of the x,y coordinates of these
   * points, we calculate the center point(vertical/horizontal) of the line segment and add a point based off of that.
   *
   * We exclude the source and target points because we dont want to show a control point between source/target
   * and the next point
   */
  for (let i = 1; i < finalPoints.length - 2; i++) {
    const p1 = finalPoints[i];
    const p2 = finalPoints[i + 1];
    if (!p1 && !p2) continue;

    let isHorizontal = false;
    if (p1.x - p2.x === 0) isHorizontal = true;

    let x = 0;
    let y = 0;

    if (isHorizontal) {
      x = p1.x;
      y = (p2.y - p1.y) / 2 + p1.y;
    } else {
      x = (p2.x - p1.x) / 2 + p1.x;
      y = p1.y;
    }

    controlPoints.push({
      prev: 'id' in p1 ? p1.id : undefined,
      id: `${p1.id}-${p2.id}`,
      active: isControlAnchorActive({ nextPoint: p2 }),
      x,
      y,
      direction: isHorizontal
        ? ControlDirection.Horizontal
        : ControlDirection.Vertical,
    });
  }

  return controlPoints;
}
