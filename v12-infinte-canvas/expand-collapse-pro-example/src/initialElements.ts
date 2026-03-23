import { Edge } from '@infinit-canvas/react';
import { ExpandCollapseNode } from './types';

export const nodes: ExpandCollapseNode[] = [
  {
    id: 'A',
    position: { x: 0, y: 0 },
    data: { expanded: true },
    type: 'expandcollapse',
  },
  {
    id: 'B',
    position: { x: 0, y: 0 },
    data: { expanded: false },
    type: 'expandcollapse',
  },
  {
    id: 'C',
    position: { x: 0, y: 0 },
    data: { expanded: false },
    type: 'expandcollapse',
  },
  {
    id: 'D',
    position: { x: 0, y: 0 },
    data: { expanded: true },
    type: 'expandcollapse',
  },
  {
    id: 'E',
    position: { x: 0, y: 0 },
    data: { expanded: true },
    type: 'expandcollapse',
  },
  {
    id: 'F',
    position: { x: 0, y: 0 },
    data: { expanded: true },
    type: 'expandcollapse',
  },
  {
    id: 'G',
    position: { x: 0, y: 0 },
    data: { expanded: true },
    type: 'expandcollapse',
  },
  {
    id: 'H',
    position: { x: 0, y: 0 },
    data: { expanded: true },
    type: 'expandcollapse',
  },
];

export const edges: Edge[] = [
  {
    id: 'A->B',
    source: 'A',
    target: 'B',
  },
  {
    id: 'A->C',
    source: 'A',
    target: 'C',
  },
  {
    id: 'B->E',
    source: 'B',
    target: 'E',
  },
  {
    id: 'C->F',
    source: 'C',
    target: 'F',
  },
  {
    id: 'D->G',
    source: 'D',
    target: 'G',
  },
  {
    id: 'D->H',
    source: 'D',
    target: 'H',
  },
];
