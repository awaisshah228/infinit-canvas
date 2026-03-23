'use client';
import { type Node, NodeProps, Position, useReactFlow } from '@infinit-canvas/react';
import { AlertCircle } from 'lucide-react';
import { memo, useCallback } from 'react';

import { WorkflowNodeData } from '@/app/workflow/components/nodes';
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeFooter,
} from '@/components/base-node';
import { ConnectionLimitHandle } from '@/components/connection-limit-handle';
import { MarkdownContent } from '@/components/markdown-content';
import { NodeAppendix } from '@/components/node-appendix';
import { NodeStatusIndicator } from '@/components/node-status-indicator';
import { Slider } from '@/components/ui/slider';
import {
  DEFAULT_TEMPERATURE,
  DEFAULT_TEXT_MODEL,
  TextModel,
} from '../../openai-data';
import { TextModelSelector } from '../model-selector';
import { RunnableNodeHeader } from '../runnable-node-header';

export type GenerateTextNodeType = Node<GenerateTextNodeData>;

export type GenerateTextNodeData = WorkflowNodeData & {
  config?: {
    model?: TextModel;
    temperature?: number;
  };
  text?: string;
};

// This is an example of how to implement the WorkflowNode component. All the nodes in the Workflow Builder example
// are variations on this CustomNode defined in the index.tsx file.
// You can also create new components for each of your nodes for greater flexibility.
function GenerateTextNode({ id, data }: NodeProps<GenerateTextNodeType>) {
  const { updateNodeData } = useReactFlow();
  const model = data?.config?.model ?? DEFAULT_TEXT_MODEL;
  const temperature = data?.config?.temperature ?? DEFAULT_TEMPERATURE;

  const onModelChange = useCallback(
    (newModel: TextModel) => {
      updateNodeData(id, { config: { model: newModel } });
    },
    [updateNodeData, id],
  );

  const onTemperatureChange = useCallback(
    (newTemperature: number) => {
      updateNodeData(id, { config: { temperature: newTemperature } });
    },
    [updateNodeData, id],
  );

  return (
    <NodeStatusIndicator status={data?.status}>
      <BaseNode className="w-[350px]">
        {data?.error && (
          <NodeAppendix
            position="top"
            className="p-2 text-sm text-red-500 border-red-500"
          >
            <AlertCircle />
            {data?.error}
          </NodeAppendix>
        )}
        <RunnableNodeHeader
          nodeId={id}
          title={data?.title}
          icon={data?.icon}
          status={data?.status}
        />
        <BaseNodeContent>
          <div className="flex flex-col gap-4">
            <label className="text-sm">
              <span>Text Model:</span>
              <TextModelSelector value={model} onChange={onModelChange} />
            </label>
            <div>
              <label className="text-sm">Temperature:</label>
              <Slider
                id={`temperature-${id}`}
                className="nodrag"
                defaultValue={[0.7]}
                max={2}
                step={0.2}
                value={[temperature]}
                onValueChange={(t) => onTemperatureChange(t[0])}
              />

              <div className="text-xs text-muted-foreground flex justify-between">
                <span>0</span>
                <span>{(data?.config?.temperature ?? 1).toFixed(1)}</span>
                <span>2</span>
              </div>
            </div>
          </div>

          <div className="text-sm">
            <ConnectionLimitHandle
              id="text-system"
              title="System"
              type="target"
              connectionLimit={1}
              position={Position.Left}
              className="-left-3"
            />

            <div className="w-full flex justify-between items-center pt-1">
              <ConnectionLimitHandle
                id="text-prompt"
                title="Prompt"
                type="target"
                position={Position.Left}
                connectionLimit={1}
                className="-left-3"
              />

              <ConnectionLimitHandle
                className="justify-self-end -right-3"
                id="text-output"
                title="Result"
                type="source"
                position={Position.Right}
              />
            </div>
          </div>
        </BaseNodeContent>
        <BaseNodeFooter>
          <div className="w-full">
            <span className="text-sm">Generated Text:</span>
            {data.text ? (
              <div className="flex-1 overflow-auto nodrag nopan nowheel border border-border rounded-md p-2 select-text cursor-auto text-sm">
                <MarkdownContent id={id} content={data.text} />
              </div>
            ) : (
              <div>
                <span className="text-sm text-muted-foreground">
                  No text to display.
                </span>
              </div>
            )}
          </div>
        </BaseNodeFooter>
      </BaseNode>
    </NodeStatusIndicator>
  );
}

export default memo(GenerateTextNode) as typeof GenerateTextNode;
