import { memo } from 'react';
import { Handle, Position, NodeProps, BuiltInNode } from '@infinit-canvas/react';

import useNodeClickHandler from '../hooks/useNodeClick';

const WorkflowNode = ({ id, data }: NodeProps<BuiltInNode>) => {
  // see the hook implementation for details of the click handler
  // calling onClick adds a child node to this node
  const onClick = useNodeClickHandler(id);

  return (
    <div onClick={onClick} title="click to add a child node">
      {data.label}
      <Handle type="target" position={Position.Top} isConnectable={false} />
      <Handle type="source" position={Position.Bottom} isConnectable={false} />
    </div>
  );
};

export default memo(WorkflowNode);
