import { type XYPosition, Position } from '@infinit-canvas/react';

import type { ControlPointData } from '../ControlPoint';
import { getLinearPath, getLinearControlPoints } from './linear';
import { getCatmullRomPath, getCatmullRomControlPoints } from './catmull-rom';
import { getStepControlPoints, getStepPath } from './step';
import { Algorithm } from '../constants';

export function getControlPoints({
  points,
  algorithm = Algorithm.BezierCatmullRom,
  sides = { fromSide: Position.Left, toSide: Position.Right },
  initialStepPoints,
}: {
  points: (ControlPointData | XYPosition)[];
  algorithm: Algorithm | undefined;
  sides: { fromSide: Position; toSide: Position };
  initialStepPoints: ControlPointData[];
}) {
  switch (algorithm) {
    case Algorithm.Linear:
      return getLinearControlPoints(points);

    case Algorithm.Step:
      return getStepControlPoints({ points, initialStepPoints });

    case Algorithm.CatmullRom:
      return getCatmullRomControlPoints(points);

    case Algorithm.BezierCatmullRom:
      return getCatmullRomControlPoints(points, true, sides);
  }
}

export function getPath({
  points,
  algorithm = Algorithm.BezierCatmullRom,
  sides = { fromSide: Position.Left, toSide: Position.Right },
  initialStepPoints,
}: {
  points: (ControlPointData | XYPosition)[];
  algorithm: Algorithm | undefined;
  sides: { fromSide: Position; toSide: Position };
  initialStepPoints: ControlPointData[];
}) {
  switch (algorithm) {
    case Algorithm.Linear:
      return getLinearPath(points);

    case Algorithm.Step:
      return getStepPath({ points, initialStepPoints });

    case Algorithm.CatmullRom:
      return getCatmullRomPath(points);

    case Algorithm.BezierCatmullRom:
      return getCatmullRomPath(points, true, sides);
  }
}
