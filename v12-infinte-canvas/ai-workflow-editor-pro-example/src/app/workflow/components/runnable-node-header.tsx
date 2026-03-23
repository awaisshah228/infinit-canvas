'use client';

import { iconMapping } from '@/app/workflow/utils/icon-mapping';
import { CircleAlert, Pause, Play, Trash } from 'lucide-react';
import { useCallback } from 'react';
import { BaseNodeHeader, BaseNodeHeaderTitle } from '@/components/base-node';
import { RunnableNodeStatus } from '@/app/workflow/components/nodes';
import { useAppStore } from '@/app/workflow/store';
import { Button } from '@/components/ui/button';
import { AppStore } from '@/app/workflow/store/app-store';
import { useShallow } from 'zustand/react/shallow';
import { useWorkflowRunner } from '@/app/workflow/hooks/use-workflow-runner';

interface RunnableNodeHeaderProps {
  title?: string;
  icon?: keyof typeof iconMapping;
  status?: RunnableNodeStatus;
  nodeId: string;
}

const selector = (state: AppStore) => state.removeNode;

export function RunnableNodeHeader({
  title,
  icon,
  nodeId,
  status,
}: RunnableNodeHeaderProps) {
  const { runWorkflow } = useWorkflowRunner();
  const removeNode = useAppStore(useShallow(selector));
  const onClick = useCallback(() => runWorkflow(nodeId), [nodeId, runWorkflow]);
  const onRemove = useCallback(() => removeNode(nodeId), [nodeId, removeNode]);

  const IconComponent = icon ? iconMapping[icon] : undefined;

  let ActionIcon;
  switch (status) {
    case 'initial':
      ActionIcon = <Play className="stroke-blue-500 fill-blue-500" />;
      break;
    case 'success':
      ActionIcon = <Play className="stroke-emerald-500 fill-emerald-500" />;
      break;
    case 'loading':
      ActionIcon = <Pause className="stroke-orange-500 fill-orange-500" />;
      break;
    case 'error':
      ActionIcon = <CircleAlert className="stroke-red-500 fill-red-500" />;
      break;
    default:
      ActionIcon = <Play className="stroke-blue-500 fill-blue-500" />;
      break;
  }

  return (
    <>
      <BaseNodeHeader className="border-b-1">
        {IconComponent ? <IconComponent aria-label={icon} /> : null}
        <BaseNodeHeaderTitle>{title}</BaseNodeHeaderTitle>
        {/* <NodeHeaderStatus status={data.status} /> */}

        <Button variant="ghost" className="nodrag px-1!" onClick={onClick}>
          {ActionIcon}
        </Button>

        <Button variant="ghost" className="nodrag px-1!" onClick={onRemove}>
          <Trash />
        </Button>
      </BaseNodeHeader>
    </>
  );
}
