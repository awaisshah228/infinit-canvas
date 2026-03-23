import { Node } from '@infinit-canvas/react';

import { EditableEdge, EditableEdgeComponent } from './edges/EditableEdge';
import { CustomNode } from './nodes/CustomNode';
import { Algorithm } from './edges/EditableEdge/constants';

export const nodeTypes = {
  custom: CustomNode,
};

export const initialNodes: Node[] = [
  {
    id: '1',
    type: 'custom',
    data: {},
    position: { x: 0, y: 0 },
  },
  {
    id: '2',
    type: 'custom',
    data: {},
    position: { x: 250, y: 0 },
  },
  {
    id: '3',
    type: 'custom',
    data: {},
    position: { x: 0, y: 175 },
  },
  {
    id: '4',
    type: 'custom',
    data: {},
    position: { x: 250, y: 100 },
  },
  {
    id: '5',
    type: 'custom',
    data: {},
    position: { x: 0, y: 350 },
  },
  {
    id: '6',
    type: 'custom',
    data: {},
    position: { x: 250, y: 250 },
  },
  {
    id: '7',
    type: 'custom',
    data: {},
    position: { x: 0, y: 550 },
  },
  {
    id: '8',
    type: 'custom',
    data: {},
    position: { x: 250, y: 450 },
  },
];

export const CustomEdgeType = EditableEdgeComponent;

export const edgeTypes = {
  'editable-edge': EditableEdgeComponent,
};

export const initialEdges: EditableEdge[] = [
  {
    id: '1->2',
    type: 'editable-edge',
    source: '1',
    target: '2',
    sourceHandle: 'right',
    targetHandle: 'left',
    animated: true,
    data: {
      algorithm: Algorithm.CatmullRom,
      points: [
        {
          x: 92.5,
          y: 24.75,
          id: 'spline-d24e57b4-88ad-47af-8b4e-9ecec78e5066',
          active: true,
        },
        {
          x: 129.5,
          y: 16.25,
          id: 'spline-bec90e8b-2d76-4727-a4d6-9fabdf18aea5',
          active: true,
        },
        {
          x: 168,
          y: -19.25,
          id: 'spline-8d5f62cc-e9d7-4460-98fd-bd9b902bc671',
          active: true,
        },
        {
          x: 143,
          y: -45,
          id: 'spline-252e2875-a052-43fb-9f01-c4670fd3170c',
          active: true,
        },
        {
          x: 119.5,
          y: -20.75,
          id: 'spline-f37a3789-dfb7-46e7-abed-04374b274ce3',
          active: true,
        },
        {
          x: 159.5,
          y: 17.25,
          id: 'spline-724c522e-c90b-46c3-9e95-8b99d955cc70',
          active: true,
        },
        {
          x: 202.5,
          y: 23.25,
          id: 'spline-e97e7074-c028-4cf6-82dc-b6ed1690db2f',
          active: true,
        },
      ],
    },
  },
  {
    id: '3->4',
    type: 'editable-edge',
    source: '3',
    target: '4',
    sourceHandle: 'right',
    targetHandle: 'left',
    data: {
      algorithm: Algorithm.BezierCatmullRom,
      points: [],
    },
  },
  {
    id: '5->6',
    type: 'editable-edge',
    source: '5',
    target: '6',
    sourceHandle: 'right',
    targetHandle: 'left',
    animated: true,
    data: {
      algorithm: Algorithm.Step,
      points: [],
    },
  },
  {
    id: '7->8',
    type: 'editable-edge',
    source: '7',
    target: '8',
    sourceHandle: 'right',
    targetHandle: 'left',
    animated: false,
    data: {
      algorithm: Algorithm.Linear,
      points: [
        {
          x: 100,
          y: 575,
          id: 'spline-964fc95f-2399-4a62-9dd1-3a5d66a5459a',
          active: true,
        },
        {
          x: 100,
          y: 525,
          id: 'spline-51c08f0b-3092-4e2e-834a-2d71d8d5c396',
          active: true,
        },
        {
          x: 150,
          y: 525,
          id: 'spline-d53c4828-09c0-4387-92d7-7d72e0ceda7a',
          active: true,
        },
        {
          x: 150,
          y: 625,
          id: 'spline-0c24fc20-d285-4868-a3d8-730a5f2c683d',
          active: true,
        },
        {
          x: 200,
          y: 625,
          id: 'spline-4349d5d7-62fc-4b66-99a4-f6760081c1a8',
          active: true,
        },
        {
          x: 200,
          y: 475,
          id: 'spline-f4cba410-811e-4620-894f-12804138f104',
          active: true,
        },
      ],
    },
  },
];
