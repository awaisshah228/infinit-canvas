import { useMemo } from 'react';
import { NodeResizer, type Node, type NodeProps } from '@infinit-canvas/react';

import { pointsToPath } from './path';
import type { Points } from './types';

export type FreehandNodeType = Node<
  {
    points: Points;
    initialSize: { width: number; height: number };
  },
  'freehand'
>;

export function FreehandNode({
  data,
  width,
  height,
  selected,
  dragging,
}: NodeProps<FreehandNodeType>) {
  const scaleX = (width ?? 1) / data.initialSize.width;
  const scaleY = (height ?? 1) / data.initialSize.height;

  const points = useMemo(
    () =>
      data.points.map((point) => [
        point[0] * scaleX,
        point[1] * scaleY,
        point[2],
      ]) satisfies Points,
    [data.points, scaleX, scaleY],
  );

  return (
    <>
      <NodeResizer isVisible={selected && !dragging} />
      <svg
        width={width}
        height={height}
        style={{
          pointerEvents: selected ? 'auto' : 'none',
        }}
      >
        <path
          style={{
            pointerEvents: 'visiblePainted',
            cursor: 'pointer',
          }}
          d={pointsToPath(points)}
        />
      </svg>
    </>
  );
}
