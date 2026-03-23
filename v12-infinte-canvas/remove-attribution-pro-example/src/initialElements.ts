import { Node, Edge } from '@infinit-canvas/react';

export const nodes: Node[] = [
  {
    type: 'input',
    id: '1',
    data: { label: 'Thanks' },
    position: { x: 100, y: 0 },
  },
  {
    id: '2',
    data: { label: 'for' },
    position: { x: 0, y: 100 },
  },
  {
    id: '3',
    data: { label: 'using' },
    position: { x: 200, y: 100 },
  },
  {
    id: '4',
    data: { label: 'React Flow Pro!' },
    position: { x: 100, y: 200 },
  },
];

export const edges: Edge[] = [
  {
    id: '1->2',
    source: '1',
    target: '2',
    animated: true,
  },
  {
    id: '1->3',
    source: '1',
    target: '3',
    animated: true,
  },
  {
    id: '2->4',
    source: '2',
    target: '4',
    animated: true,
  },
  {
    id: '3->4',
    source: '3',
    target: '4',
    animated: true,
  },
];
