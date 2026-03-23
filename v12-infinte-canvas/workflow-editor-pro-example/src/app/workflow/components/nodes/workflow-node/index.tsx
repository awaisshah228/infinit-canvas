import React, { useCallback } from 'react';
import { Play, Trash } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { WorkflowNodeData } from '@/app/workflow/components/nodes';
import { useWorkflowRunner } from '@/app/workflow/hooks/use-workflow-runner';
import { iconMapping } from '@/app/workflow/utils/icon-mapping';
import { useAppStore } from '@/app/workflow/store';
import {
  BaseNode,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from '@/components/base-node';
import { NodeStatusIndicator } from '@/components/node-status-indicator';
import { NODE_SIZE } from '@/app/workflow/config';

// This is an example of how to implement the WorkflowNode component. All the nodes in the Workflow Builder example
// are variations on this CustomNode defined in the index.tsx file.
// You can also create new components for each of your nodes for greater flexibility.
function WorkflowNode({
  id,
  data,
  children,
}: {
  id: string;
  data: WorkflowNodeData;
  children?: React.ReactNode;
}) {
  const { runWorkflow } = useWorkflowRunner();
  const removeNode = useAppStore((s) => s.removeNode);
  const onPlay = useCallback(() => runWorkflow(id), [id, runWorkflow]);
  const onRemove = useCallback(() => removeNode(id), [id, removeNode]);

  const IconComponent = data?.icon ? iconMapping[data.icon] : undefined;

  return (
    <NodeStatusIndicator status={data?.status}>
      <BaseNode style={{ ...NODE_SIZE }}>
        <BaseNodeHeader>
          {IconComponent ? <IconComponent aria-label={data?.icon} /> : null}
          <BaseNodeHeaderTitle>{data?.title}</BaseNodeHeaderTitle>
          <Button variant="ghost" className="nodrag px-1!" onClick={onPlay}>
            <Play className="stroke-blue-500 fill-blue-500" />
          </Button>
          <Button variant="ghost" className="nodrag px-1!" onClick={onRemove}>
            <Trash />
          </Button>
        </BaseNodeHeader>
        {children}
      </BaseNode>
    </NodeStatusIndicator>
  );
}

export default WorkflowNode;
