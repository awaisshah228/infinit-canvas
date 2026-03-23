import { Node, NodeProps, XYPosition } from '@infinit-canvas/react';
import { nanoid } from 'nanoid';

import { NODE_SIZE, nodesConfig } from '../../config';
import { iconMapping } from '@/app/workflow/utils/icon-mapping';
import { OutputNode } from './output-node';
import { InitialNode } from './initial-node';
import { TransformNode } from './transform-node';
import { BranchNode } from './branch-node';
import { JoinNode } from './join-node';

/* WORKFLOW NODE DATA PROPS ------------------------------------------------------ */

export type WorkflowNodeData = {
  title?: string;
  label?: string;
  icon?: keyof typeof iconMapping;
  status?: 'loading' | 'success' | 'error' | 'initial';
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
  'initial-node': InitialNode,
  'output-node': OutputNode,
  'transform-node': TransformNode,
  'branch-node': BranchNode,
  'join-node': JoinNode,
};

export const createNodeByType = ({
  type,
  id,
  position = { x: 0, y: 0 },
  data,
}: {
  type: AppNodeType;
  id?: string;
  position?: XYPosition;
  data?: WorkflowNodeData;
}): AppNode => {
  const node = nodesConfig[type];

  const newNode: AppNode = {
    id: id ?? nanoid(),
    data: data ?? {
      title: node.title,
      status: node.status,
      icon: node.icon,
    },
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

  return newNode;
};

export type AppNode =
  | Node<WorkflowNodeData, 'initial-node'>
  | Node<WorkflowNodeData, 'transform-node'>
  | Node<WorkflowNodeData, 'join-node'>
  | Node<WorkflowNodeData, 'branch-node'>
  | Node<WorkflowNodeData, 'output-node'>;

export type AppNodeType = NonNullable<AppNode['type']>;
