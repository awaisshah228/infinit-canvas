import { create } from 'zustand';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Edge,
  Node,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
  XYPosition,
} from '@infinit-canvas/react';

export type Store = {
  nodes: Node[];
  edges: Edge[];

  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  updateNodePosition: (id: string, position: XYPosition) => void;
  onConnect: OnConnect;

  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
};

/**
 *
 * Access the store by calling this hook with a function to extract the slice of
 * the store you're interested in. We use Zustand internally at React Flow and we
 * recommend folks use it for state management in their projects too!
 *
 */
export const useStore = create<Store>((set, get) => ({
  nodes: [
    {
      id: '1',
      width: 100,
      height: 40,
      position: { x: 0, y: 0 },
      data: { label: 'A' },
    },
    {
      id: '2',
      width: 100,
      height: 40,
      position: { x: 100, y: 100 },
      data: { label: 'A' },
    },
    {
      id: '3',
      width: 100,
      height: 40,
      position: { x: -100, y: 100 },
      data: { label: 'C' },
    },
    {
      id: '4',
      width: 100,
      height: 40,
      position: { x: 200, y: 200 },
      data: { label: 'D' },
    },
    {
      id: '5',
      width: 100,
      height: 40,
      position: { x: -200, y: 200 },
      data: { label: 'E' },
    },
  ],
  edges: [
    { id: '1-2', source: '1', target: '2' },
    { id: '3-5', source: '3', target: '5' },
  ],

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  onConnect: (params) =>
    set({
      edges: addEdge(params, get().edges),
    }),

  onNodesChange: (changes) =>
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes),
    })),

  onEdgesChange: (changes) =>
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
    })),

  updateNodePosition: (id, position) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id ? { ...node, position } : node
      ),
    })),
}));
