import { XYPosition } from '@infinit-canvas/react';

type Layout = Record<string, XYPosition>;

const layoutA: Layout = {
  A: { x: 0, y: 0 },
  B: { x: -150, y: 100 },
  C: { x: 150, y: 100 },
  D: { x: -300, y: 200 },
  E: { x: 300, y: 200 },
};

const layoutB: Layout = {
  A: { x: 0, y: 0 },
  B: { x: 0, y: 50 },
  C: { x: 0, y: 100 },
  D: { x: 0, y: 150 },
  E: { x: 0, y: 200 },
};

export const layouts = [layoutA, layoutB];
