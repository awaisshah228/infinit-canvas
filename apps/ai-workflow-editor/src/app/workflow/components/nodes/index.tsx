import { Node, NodeProps, XYPosition } from '@infinit-canvas/react';
import { nanoid } from 'nanoid';

import { iconMapping } from '@/app/workflow/utils/icon-mapping';
import { IncomingNodeData } from '@/app/workflow/hooks/use-workflow-runner';
import GenerateImageNode, {
  GenerateImageNodeType,
} from './generate-image-node';
import GenerateTextNode, { GenerateTextNodeType } from './generate-text-node';
import TextInputNode, {
  processTextInputNode,
  TextInputNodeType,
} from './text-input-node';
import { processGenerateTextNode } from './processors/generate-text-processor';
import { processGenerateImageNode } from './processors/generate-image-processor';
import { NODE_SIZE, nodesConfig } from '../../config';

/* WORKFLOW NODE DATA PROPS ------------------------------------------------------ */
export type RunnableNodeStatus = 'loading' | 'success' | 'error' | 'initial';

export type WorkflowNodeData = {
  title?: string;
  label?: string;
  icon?: keyof typeof iconMapping;
  status?: RunnableNodeStatus;
  error?: string;
};

export type WorkflowNodeProps = NodeProps<Node<WorkflowNodeData>> & {
  type: AppNodeType;
  children?: React.ReactNode;
};

export type NodeConfig = {
  id: AppNodeType;
  title: string;
  status?: 'loading' | 'success' | 'error' | 'initial';
  handles: NonNullable<Node['handles']>;
  icon: keyof typeof iconMapping;
};

export const nodeTypes = {
  'text-input-node': TextInputNode,
  'generate-text-node': GenerateTextNode,
  'generate-image-node': GenerateImageNode,
};

export type TextNode = TextInputNodeType | GenerateTextNodeType;

export type ImageNode = GenerateImageNodeType;

export type AppNode = TextNode | ImageNode;

export type NodeProcessor<T extends AppNode = AppNode> = (
  incomingNodeData: IncomingNodeData,
  node: T,
) => Promise<Partial<T['data']>>;

// This is a mapping of node types to their respective processing functions,
// See also file `use-workflow-runner.tsx` for how these are used.
export const nodeProcessors = {
  'text-input-node': processTextInputNode,
  'generate-text-node': processGenerateTextNode,
  'generate-image-node': processGenerateImageNode,
} as const;

export function createNodeByType<T extends AppNode>({
  type,
  id,
  position = { x: 0, y: 0 },
  data,
}: {
  type: T['type'];
  id?: string;
  position?: XYPosition;
  data?: T['data'];
}): T {
  const node = nodesConfig[type as string];

  const defaultData = {
    title: node.title,
    status: node.status,
    icon: node.icon,
  };

  const newNode: AppNode = {
    id: id ?? nanoid(),
    data: data ? { ...defaultData, ...data } : defaultData,
    position: {
      x: position.x - NODE_SIZE.width * 0.5,
      y: position.y - NODE_SIZE.height * 0.5,
    },
    type,

    // If you want to render nodes and edges on the server, you need to uncomment the following lines

    // width: NODE_SIZE.width,
    // height: NODE_SIZE.height,
    // handles: node.handles,
  };

  return newNode as T;
}

export type AppNodeType = NonNullable<AppNode['type']>;
