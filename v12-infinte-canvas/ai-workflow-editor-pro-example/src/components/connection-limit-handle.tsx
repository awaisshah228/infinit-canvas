import React, { type ComponentProps } from 'react';
import { useNodeConnections } from '@infinit-canvas/react';

import { LabeledHandle } from '@/components/labeled-handle';

export function ConnectionLimitHandle({
  connectionLimit,
  type,
  id,
  ...props
}: ComponentProps<typeof LabeledHandle> & {
  // If connectionLimit is set, the handle will only accept that many connections
  connectionLimit?: number;
}) {
  const connections = useNodeConnections({
    handleType: type,
    handleId: id,
  });

  const isConnectable = connectionLimit
    ? connections.length < connectionLimit
    : true;

  return (
    <LabeledHandle
      type={type}
      id={id}
      isConnectable={isConnectable}
      {...props}
    />
  );
}
