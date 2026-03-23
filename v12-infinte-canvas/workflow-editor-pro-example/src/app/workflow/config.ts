import { Position } from '@infinit-canvas/react';
import { AppNodeType, NodeConfig } from './components/nodes';

export const NODE_SIZE = { width: 260, height: 50 };

export const nodesConfig: Record<AppNodeType, NodeConfig> = {
  'initial-node': {
    id: 'initial-node',
    title: 'Initial Node',
    status: 'initial',
    handles: [
      {
        type: 'source',
        position: Position.Bottom,
        x: NODE_SIZE.width * 0.5,
        y: NODE_SIZE.height,
      },
    ],
    icon: 'Rocket',
  },
  'transform-node': {
    id: 'transform-node',
    title: 'Transform Node',
    handles: [
      {
        type: 'source',
        position: Position.Bottom,
        x: NODE_SIZE.width * 0.5,
        y: NODE_SIZE.height,
      },
      {
        type: 'target',
        position: Position.Top,
        x: NODE_SIZE.width * 0.5,
        y: 0,
      },
    ],
    icon: 'Spline',
  },
  'join-node': {
    id: 'join-node',
    title: 'Join Node',
    status: 'initial',
    handles: [
      {
        id: 'true',
        type: 'target',
        position: Position.Top,
        x: NODE_SIZE.width - NODE_SIZE.width / 3,
        y: 0,
      },
      {
        id: 'false',
        type: 'target',
        position: Position.Top,
        x: NODE_SIZE.width / 3,
        y: 0,
      },
      {
        type: 'source',
        position: Position.Bottom,
        x: NODE_SIZE.width * 0.5,
        y: NODE_SIZE.height,
      },
    ],
    icon: 'Split',
  },
  'branch-node': {
    id: 'branch-node',
    title: 'Branch Node',
    status: 'initial',
    handles: [
      {
        type: 'target',
        position: Position.Top,
        x: NODE_SIZE.width * 0.5,
        y: 0,
      },
      {
        id: 'true',
        type: 'source',
        position: Position.Bottom,
        x: NODE_SIZE.width / 3,
        y: NODE_SIZE.height,
      },
      {
        id: 'false',
        type: 'source',
        position: Position.Bottom,
        x: NODE_SIZE.width - NODE_SIZE.width / 3,
        y: NODE_SIZE.height,
      },
    ],
    icon: 'Merge',
  },
  'output-node': {
    id: 'output-node',
    title: 'Output Node',
    handles: [
      {
        type: 'target',
        position: Position.Top,
        x: NODE_SIZE.width * 0.5,
        y: 0,
      },
    ],
    icon: 'CheckCheck',
  },
};
