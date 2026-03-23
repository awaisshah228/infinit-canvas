import { Node, Edge } from '@infinit-canvas/react';

export const initialNodes: Node[] = [
  {
    id: 'group-1',
    type: 'group',
    position: {
      x: 0,
      y: 0,
    },
    style: {
      width: 300,
      height: 300,
    },
    data: {},
  },
  {
    id: '1',
    type: 'node',
    parentId: 'group-1',
    position: {
      x: 125,
      y: 100,
    },
    data: { label: 'Node 1' },
    extent: 'parent',
  },
  {
    id: '2',
    type: 'node',
    position: {
      x: 500,
      y: 100,
    },
    data: { label: 'Node 2' },
  },
];

export const initialEdges: Edge[] = [];
