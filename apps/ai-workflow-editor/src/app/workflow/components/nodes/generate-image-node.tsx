'use client';

import { type Node, NodeProps, Position, useReactFlow } from '@infinit-canvas/react';
import { AlertCircle, Download } from 'lucide-react';
import { memo, useCallback } from 'react';

import { WorkflowNodeData } from '@/app/workflow/components/nodes';
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeFooter,
} from '@/components/base-node';
import { ConnectionLimitHandle } from '@/components/connection-limit-handle';
import { NodeAppendix } from '@/components/node-appendix';
import { NodeStatusIndicator } from '@/components/node-status-indicator';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IMAGE_SIZES, ImageModel, ImageSize } from '../../openai-data';
import { ImageModelSelector } from '../model-selector';
import { RunnableNodeHeader } from '../runnable-node-header';

export type GenerateImageNodeType = Node<GenerateImageNodeData>;

export type GenerateImageNodeData = WorkflowNodeData & {
  config?: {
    model?: ImageModel;
    size?: ImageSize;
  };
  // Base64 image
  image?: string;
};

// This is an example of how to implement the WorkflowNode component. All the nodes in the Workflow Builder example
// are variations on this CustomNode defined in the index.tsx file.
// You can also create new components for each of your nodes for greater flexibility.
function GenerateImageNode({ id, data }: NodeProps<GenerateImageNodeType>) {
  const { updateNodeData } = useReactFlow();
  const model = data?.config?.model ?? 'dall-e-2';
  const size = data?.config?.size ?? IMAGE_SIZES[model][0];

  const onModelChange = useCallback(
    (newModel: ImageModel) => {
      const newSize = IMAGE_SIZES[newModel][0] as ImageSize;

      updateNodeData(id, {
        config: { model: newModel, size: newSize },
      });
    },
    [id, updateNodeData],
  );

  const onSizeChange = useCallback(
    (newSize: ImageSize) => {
      const isValid = /^\d+x\d+$/.test(newSize);

      updateNodeData(id, {
        config: {
          ...data?.config,
          size: isValid ? (newSize as ImageSize) : undefined,
        },
      });
    },
    [id, data?.config, updateNodeData],
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
            <label>
              <span className="text-sm">Image Model:</span>
              <ImageModelSelector value={model} onChange={onModelChange} />
            </label>

            <label>
              <span className="text-sm">Image Size:</span>
              <Select
                value={data?.config?.size ?? size}
                onValueChange={onSizeChange}
              >
                <SelectTrigger className="input input-bordered w-full nodrag">
                  <SelectValue placeholder="Image Size" />
                </SelectTrigger>

                <SelectContent>
                  {IMAGE_SIZES[model].map((size) => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>

          <div className="flex w-full justify-between py-2 text-sm">
            <ConnectionLimitHandle
              id="text-prompt"
              title="Prompt"
              type="target"
              position={Position.Left}
              connectionLimit={1}
              className="-left-3"
            />
            <ConnectionLimitHandle
              id="image-output"
              title="Image"
              type="source"
              position={Position.Right}
              className="-right-3"
            />
          </div>
        </BaseNodeContent>
        <BaseNodeFooter>
          <div className="flex flex-col w-full">
            <span className="text-sm">Image Preview:</span>

            {data.image ? (
              <div className="flex flex-col gap-2 w-full">
                <img
                  src={`data:image/png;base64,${data.image}`}
                  alt="Visualized image"
                  className="w-full h-auto rounded-md"
                />
                <a
                  className="w-full"
                  href={`data:image/png;base64,${data.image}`}
                  download="image.png"
                >
                  <Button className="text-xs w-full nodrag" variant="outline">
                    <Download /> Download Image
                  </Button>
                </a>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No image to display.
              </div>
            )}
          </div>
        </BaseNodeFooter>
      </BaseNode>
    </NodeStatusIndicator>
  );
}

export default memo(GenerateImageNode) as typeof GenerateImageNode;
