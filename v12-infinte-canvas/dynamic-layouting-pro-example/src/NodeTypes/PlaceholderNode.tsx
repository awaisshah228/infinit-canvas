import { memo } from 'react';
import { Handle, Position, NodeProps, BuiltInNode } from '@infinit-canvas/react';

import usePlaceholderClick from '../hooks/usePlaceholderClick';

const PlaceholderNode = ({ id, data }: NodeProps<BuiltInNode>) => {
  // see the hook implementation for details of the click handler
  // calling onClick turns this node and the connecting edge into a workflow node
  const onClick = usePlaceholderClick(id);

  return (
    <div onClick={onClick} title="click to add a node">
      {data.label}
      <Handle type="target" position={Position.Top} isConnectable={false} />
      <Handle type="source" position={Position.Bottom} isConnectable={false} />
    </div>
  );
};

export default memo(PlaceholderNode);
