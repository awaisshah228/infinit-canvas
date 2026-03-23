import { Node, Edge } from '@infinit-canvas/react';

export const nodes: Node[] = [
  {
    id: '1',
    position: { x: 0, y: 0 },
    style: { width: 200, height: 100, backgroundColor: '#00d7ca' },
    data: { label: 'Node 1: Move me around' },
  },
  {
    id: '2',
    position: { x: 380, y: 125 },
    style: { width: 220, height: 400, backgroundColor: '#6ede87' },
    data: { label: 'Node 2: Move me around' },
  },
  {
    id: '3',
    position: { x: -100, y: 220 },
    style: { width: 125, height: 220, backgroundColor: '#ff6700' },
    data: { label: 'Node 3: Move me around' },
  },
  {
    id: '4',
    position: { x: 250, y: -160 },
    style: { width: 180, height: 180, backgroundColor: '#ff0071' },
    data: { label: 'Node 4: Move me around' },
  },
  {
    id: '5',
    position: { x: -20, y: 500 },
    style: { width: 300, height: 120, backgroundColor: '#784be8' },
    data: { label: 'Node 5: Move me around' },
  },
  {
    id: '6',
    data: { label: 'Group A' },
    position: { x: 100, y: 160 },
    style: { width: 200, height: 200 },
    type: 'group',
  },
  {
    id: '6a',
    data: { label: 'Node A.1' },
    position: { x: 10, y: 50 },
    style: { width: 80, height: 80, backgroundColor: '#784be8' },
    parentId: '6',
    extent: 'parent',
  },
  // ======================================================================
  // Would you like to test the performance of the example with many nodes?
  // Uncomment the following lines to add 1000 random nodes.
  // ======================================================================
  // ...Array.from({ length: 1000 }, (_, i) => ({
  //   id: `${i + 6}`,
  //   type: 'appNode',
  //   position: {
  //     x: Math.floor(Math.random() * 6000) - 200,
  //     y: Math.floor(Math.random() * 6000) - 200,
  //   },
  //   style: {
  //     width: 100 + Math.floor(Math.random() * 150),
  //     height: 80 + Math.floor(Math.random() * 120),
  //     backgroundColor: `#${Math.floor(Math.random() * 16777215)
  //       .toString(16)
  //       .padStart(6, '0')}`,
  //   },
  //   data: { label: `Node ${i + 6}: Move me around` },
  // })),
];

export const edges: Edge[] = [];
