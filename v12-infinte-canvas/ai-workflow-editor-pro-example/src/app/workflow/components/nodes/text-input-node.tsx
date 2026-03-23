'use client';
import React, { memo, useCallback } from 'react';
import { type Node, NodeProps, Position, useReactFlow } from '@infinit-canvas/react';

import {
  NodeProcessor,
  WorkflowNodeData,
} from '@/app/workflow/components/nodes';
import { BaseNode, BaseNodeContent } from '@/components/base-node';
import { LabeledHandle } from '@/components/labeled-handle';
import { NodeStatusIndicator } from '@/components/node-status-indicator';
import { Textarea } from '@/components/ui/textarea';
import { RunnableNodeHeader } from '../runnable-node-header';

export type TextInputNodeType = Node<TextInputNodeData, 'text-input-node'>;

export type TextInputNodeData = WorkflowNodeData & {
  text?: string;
};

export const processTextInputNode: NodeProcessor<
  TextInputNodeType
> = async () => {
  return { status: 'success' };
};

// This is an example of how to implement the WorkflowNode component. All the nodes in the Workflow Builder example
// are variations on this CustomNode defined in the index.tsx file.
// You can also create new components for each of your nodes for greater flexibility.
function TextInputNode({ id, data }: NodeProps<TextInputNodeType>) {
  const text = data?.text || '';
  const { updateNodeData } = useReactFlow();

  const onTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData(id, { text: e.target.value });
    },
    [id, updateNodeData],
  );

  return (
    <NodeStatusIndicator status={data?.status}>
      <BaseNode className="w-[350px]">
        <RunnableNodeHeader
          nodeId={id}
          title={data?.title}
          icon={data?.icon}
          status={data?.status}
        />
        <BaseNodeContent>
          <Textarea
            value={text || data.text || ''}
            onChange={onTextChange}
            className="w-full nodrag nopan nowheel h-full resize-none"
            placeholder="Enter your text here..."
          />
          <div className="flex justify-end text-sm">
            <LabeledHandle
              id="text-output"
              title="Text"
              type="source"
              position={Position.Right}
              className="justify-self-end -right-3"
            />
          </div>
        </BaseNodeContent>
      </BaseNode>
    </NodeStatusIndicator>
  );
}

export default memo(TextInputNode) as typeof TextInputNode;
