import { Edge, Node } from '@infinit-canvas/react';

export const initialNodes: Node[] = [
  {
    id: '1',
    position: { x: 0, y: 0 },
    data: { label: '👍' },
  },
  {
    id: '2',
    position: { x: 10, y: 10 },
    data: { label: '👌' },
  },
  {
    id: '3',
    position: { x: -10, y: -10 },
    data: { label: '👏' },
  },
  {
    id: '4',
    position: { x: -10, y: 10 },
    data: { label: '👋' },
  },
  {
    id: '5',
    position: { x: 10, y: -10 },
    data: { label: '🙌' },
  },
];

export const initialEdges: Edge[] = [
  {
    id: '1->2',
    source: '1',
    target: '2',
  },
  {
    id: '1->3',
    source: '1',
    target: '3',
  },
  {
    id: '1->4',
    source: '1',
    target: '4',
  },
  {
    id: '1->5',
    source: '1',
    target: '5',
  },
];
