import { useCallback } from 'react';
import {
  NodeResizer,
  type NodeProps,
  Handle,
  Position,
  useKeyPress,
  useReactFlow,
} from '@infinit-canvas/react';

import Shape from '../shape';
import ShapeNodeToolbar from '../toolbar';
import { type ShapeNode } from '../shape/types';

const handlePositions = [
  Position.Top,
  Position.Right,
  Position.Bottom,
  Position.Left,
];

function ShapeNode({
  id,
  selected,
  data,
  width,
  height,
}: NodeProps<ShapeNode>) {
  const { color, type } = data;
  const { updateNodeData } = useReactFlow();
  const shiftKeyPressed = useKeyPress('Shift');

  const onColorChange = useCallback(
    (color: string) => {
      updateNodeData(id, { color });
    },
    [id, updateNodeData]
  );

  return (
    <>
      <ShapeNodeToolbar onColorChange={onColorChange} activeColor={color} />
      <NodeResizer
        color={color}
        keepAspectRatio={shiftKeyPressed}
        isVisible={selected}
      />
      <Shape
        type={type}
        width={width}
        height={height}
        fill={color}
        strokeWidth={2}
        stroke={color}
        fillOpacity={0.8}
      />
      <input type="text" className="node-label" placeholder={type} />

      {handlePositions.map((position) => (
        <Handle
          id={position}
          style={{ backgroundColor: color }}
          type="source"
          position={position}
        />
      ))}
    </>
  );
}

export default ShapeNode;
