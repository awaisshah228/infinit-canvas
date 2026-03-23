import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  OnConnect,
  OnEdgesChange,
  OnNodeDrag,
  OnNodesChange,
  XYPosition,
} from '@infinit-canvas/react';

import {
  AppNode,
  AppNodeType,
  createNodeByType,
} from '@/app/workflow/components/nodes';
import { AppEdge, createEdge } from '@/app/workflow/components/edges';
import { layoutGraph } from '@/app/workflow/utils/layout-helper';
import { nodesConfig } from '../config';

export type AppState = {
  nodes: AppNode[];
  edges: AppEdge[];
  layout: 'fixed' | 'free';
  draggedNodes: Map<string, AppNode>;
  connectionSites: Map<string, PotentialConnection>;
  potentialConnection?: PotentialConnection;
};

/**
 * You can potentially connect to an already existing edge or to a free handle of a node.
 */
export type PotentialConnection = {
  id: string;
  position: XYPosition;
  type?: 'source' | 'target';
  source?: ConnectionHandle;
  target?: ConnectionHandle;
};
export type ConnectionHandle = {
  node: string;
  handle?: string | null;
};

export type AppActions = {
  toggleLayout: () => void;
  onNodesChange: OnNodesChange<AppNode>;
  setNodes: (nodes: AppNode[]) => void;
  addNode: (node: AppNode) => void;
  removeNode: (nodeId: string) => void;
  addNodeByType: (type: AppNodeType, position: XYPosition) => null | string;
  addNodeInBetween: ({
    type,
    source,
    target,
    sourceHandleId,
    targetHandleId,
    position,
  }: {
    type: AppNodeType;
    source?: string;
    target?: string;
    sourceHandleId?: string | null;
    targetHandleId?: string | null;
    position: XYPosition;
  }) => void;
  getNodes: () => AppNode[];
  setEdges: (edges: AppEdge[]) => void;
  getEdges: () => AppEdge[];
  addEdge: (edge: AppEdge) => void;
  removeEdge: (edgeId: string) => void;
  onConnect: OnConnect;
  onEdgesChange: OnEdgesChange<AppEdge>;
  onNodeDragStart: OnNodeDrag<AppNode>;
  onNodeDragStop: OnNodeDrag<AppNode>;
  checkForPotentialConnection: (
    position: XYPosition,
    options?: { exclude?: string[]; type?: 'source' | 'target' },
  ) => void;
  resetPotentialConnection: () => void;
};

export type AppStore = AppState & AppActions;

export function createAppStore(
  initialState: Partial<AppState> | undefined = undefined,
) {
  const store = create<AppStore>()(
    subscribeWithSelector((set, get) => ({
      nodes: initialState?.nodes ?? [],
      edges: initialState?.edges ?? [],
      layout: 'free',
      draggedNodes: new Map(),
      connectionSites: new Map(),
      potentialConnection: undefined,
      ...initialState,

      onNodesChange: async (changes) => {
        const nextNodes = applyNodeChanges(changes, get().nodes);
        set({ nodes: nextNodes });

        if (
          get().layout === 'fixed' &&
          changes.some((change) => change.type === 'dimensions')
        ) {
          const layoutedNodes = await layoutGraph(nextNodes, get().edges);
          set({ nodes: layoutedNodes });
        } else {
          set({ nodes: nextNodes });
        }
      },

      setNodes: (nodes) => set({ nodes }),

      addNode: (node) => {
        const nextNodes = [...get().nodes, node];
        set({ nodes: nextNodes });
      },

      removeNode: (nodeId) => {
        const { nodes, edges } = get();
        const nextNodes = nodes.filter((node) => node.id !== nodeId);
        const nextEdges = edges.filter(
          (edge) => edge.source !== nodeId && edge.target !== nodeId,
        );
        return set({ nodes: nextNodes, edges: nextEdges });
      },

      addNodeByType: (type, position) => {
        const newNode = createNodeByType({ type, position });

        if (!newNode) return null;

        get().addNode(newNode);

        return newNode.id;
      },

      getNodes: () => get().nodes,

      addNodeInBetween: ({
        source,
        target,
        type,
        sourceHandleId,
        targetHandleId,
        position,
      }) => {
        const newNodeId = get().addNodeByType(type, position);
        if (!newNodeId) return;

        get().removeEdge(
          `${source}-${sourceHandleId}-${target}-${targetHandleId}`,
        );

        const nodeHandles = nodesConfig[type].handles;
        const nodeSource = nodeHandles.find(
          (handle) => handle.type === 'source',
        );
        const nodeTarget = nodeHandles.find(
          (handle) => handle.type === 'target',
        );

        const edges = [];
        if (nodeTarget && source) {
          edges.push(
            createEdge(source, newNodeId, sourceHandleId, nodeTarget.id),
          );
        }

        if (nodeSource && target) {
          edges.push(
            createEdge(newNodeId, target, nodeSource.id, targetHandleId),
          );
        }

        const nextEdges = [...get().edges, ...edges];
        set({ edges: nextEdges });
      },

      setEdges: (edges) => set({ edges }),

      getEdges: () => get().edges,

      addEdge: (edge) => {
        const nextEdges = addEdge(edge, get().edges);
        set({ edges: nextEdges });
      },

      removeEdge: (edgeId) => {
        set({ edges: get().edges.filter((edge) => edge.id !== edgeId) });
      },

      onEdgesChange: (changes) => {
        const nextEdges = applyEdgeChanges(changes, get().edges);
        set({ edges: nextEdges });
      },

      onConnect: (connection) => {
        const newEdge: AppEdge = {
          ...connection,
          type: 'workflow',
          id: `${connection.source}-${connection.target}`,
          animated: true,
        };

        get().addEdge(newEdge);
      },

      toggleLayout: () =>
        set((state) => ({
          layout: state.layout === 'fixed' ? 'free' : 'fixed',
        })),

      checkForPotentialConnection: (position, options) => {
        const closest: {
          distance: number;
          potentialConnection?: PotentialConnection;
        } = {
          distance: Infinity,
          potentialConnection: undefined,
        };

        for (const connectionSite of get().connectionSites.values()) {
          if (options?.exclude?.includes(connectionSite.id)) {
            continue;
          }

          if (
            options?.type &&
            options.type &&
            options.type === connectionSite.type
          ) {
            continue;
          }

          const distance = Math.hypot(
            connectionSite.position.x - position.x,
            connectionSite.position.y - position.y,
          );

          if (distance < closest.distance) {
            closest.distance = distance;
            closest.potentialConnection = connectionSite;
          }
        }

        set({
          potentialConnection:
            closest.distance < 150 ? closest.potentialConnection : undefined,
        });
      },

      resetPotentialConnection: () => {
        set({ potentialConnection: undefined });
      },

      onNodeDragStart: (_, __, nodes) => {
        set({ draggedNodes: new Map(nodes.map((node) => [node.id, node])) });
      },
      onNodeDragStop: () => {
        set({ draggedNodes: new Map() });
        set({ potentialConnection: undefined });
      },
    })),
  );

  return store;
}
