import type { XYPosition } from '@infinit-canvas/react';

import type { ControlPointData } from '../ControlPoint';

export const isControlPoint = (
  point: ControlPointData | XYPosition,
): point is ControlPointData => 'id' in point;
