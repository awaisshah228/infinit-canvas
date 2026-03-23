import { Handle, Position } from '@infinit-canvas/react';

// This is just a very simple node with a handle on each side
// Because ConnectionMode is set to 'loose' all of them are
// of type 'source' and can be connected to each other
export function CustomNode() {
  return (
    <>
      <Handle type="source" position={Position.Top} id="top" />
      <Handle type="source" position={Position.Left} id="left" />
      <Handle type="source" position={Position.Bottom} id="bottom" />
      <Handle type="source" position={Position.Right} id="right" />
    </>
  );
}
