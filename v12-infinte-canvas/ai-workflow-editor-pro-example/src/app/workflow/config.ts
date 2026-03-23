import { Position } from '@infinit-canvas/react';
import { AppNodeType, NodeConfig } from './components/nodes';

export const NODE_SIZE = { width: 260, height: 50 };

export const nodesConfig: Record<AppNodeType, NodeConfig> = {
  'text-input-node': {
    id: 'text-input-node',
    title: 'Text Input',
    status: 'initial',
    handles: [
      {
        id: 'text-output',
        type: 'source',
        position: Position.Right,
        x: NODE_SIZE.width * 0.5,
        y: NODE_SIZE.height,
      },
    ],
    icon: 'Rocket',
  },
  'generate-text-node': {
    id: 'generate-text-node',
    title: 'Generate Text',
    icon: 'Bot',
    handles: [
      {
        id: 'text-system',
        type: 'target',
        position: Position.Left,
        x: 0,
        y: 0,
      },
      {
        id: 'text-prompt',
        type: 'target',
        position: Position.Left,
        x: 0,
        y: NODE_SIZE.height,
      },

      {
        id: 'text-output',
        type: 'source',
        position: Position.Right,
        x: NODE_SIZE.width,
        y: NODE_SIZE.height * 0.5,
      },
    ],
  },
  'generate-image-node': {
    id: 'generate-image-node',
    title: 'Generate Image',
    icon: 'Image',
    handles: [
      {
        id: 'text-prompt',
        type: 'target',
        position: Position.Left,
        x: 0,
        y: NODE_SIZE.height,
      },
      {
        id: 'image-output',
        type: 'source',
        position: Position.Right,
        x: NODE_SIZE.width,
        y: NODE_SIZE.height * 0.5,
      },
    ],
  },
};
