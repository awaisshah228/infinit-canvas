import type { StateCreator } from "zustand";
import { type Edge, type Node } from "@infinit-canvas/react";

import type { FlowState } from "../types";

import type { Store } from "./";
import { MergeMap } from "@/lib/mergeMap";

type YjsNode = Omit<Node, "selected" | "measured">;
type YjsEdge = Omit<Edge, "selected">;

export interface FlowSlice extends FlowState {
  setYjsNodes: () => void;
  setYjsEdges: () => void;
}

export const createFlowSlice: StateCreator<Store, [], [], FlowSlice> = (
  set,
  get
) => {
  const nodeMap = new MergeMap<YjsNode, Node>({
    getId: (node: Node) => node.id,
    deriveLocal: (node: Node) => node,
  });
  const edgeMap = new MergeMap<YjsEdge, Edge>({
    getId: (edge: Edge) => edge.id,
    deriveLocal: (edge: Edge) => edge,
  });

  function getYjsNodes() {
    return get().yDoc?.getMap<YjsNode>("nodes");
  }

  function getYjsEdges() {
    return get().yDoc?.getMap<YjsEdge>("edges");
  }

  return {
    nodes: [],
    edges: [],
    setYjsNodes: () => {
      const yjsNodes = getYjsNodes();

      const newjsNodes = Array.from(yjsNodes?.values() || []);

      const derivedNodes = nodeMap.merge(newjsNodes);

      set({
        nodes: derivedNodes,
      });
    },
    setYjsEdges: () => {
      const yjsEdges = getYjsEdges();

      const newjsEdges = Array.from(yjsEdges?.values() || []);

      const derivedEdges = edgeMap.merge(newjsEdges);

      set({
        edges: derivedEdges,
      });
    },
    onNodesChange: (changes) => {
      let forceUpdate = false;
      const yjsNodes = getYjsNodes();
      if (!yjsNodes) return;

      for (const change of changes) {
        switch (change.type) {
          case "position": {
            const node = yjsNodes.get(change.id);
            if (node && change.position) {
              yjsNodes.set(change.id, { ...node, position: change.position });
            }
            break;
          }
          case "dimensions": {
            const cached = nodeMap.get(change.id);
            if (cached && change.dimensions) {
              nodeMap.set(change.id, cached.remote, {
                ...cached.local,
                measured: change.dimensions,
              });
              forceUpdate = true;
            }
            break;
          }
          case "select": {
            const cached = nodeMap.get(change.id);
            if (cached) {
              nodeMap.set(change.id, cached.remote, {
                ...cached.local,
                selected: change.selected,
              });
              forceUpdate = true;
            }
            break;
          }
          case "add":
            yjsNodes.set(change.item.id, change.item);
            break;
          case "remove":
            yjsNodes.delete(change.id);
            break;
          case "replace":
            yjsNodes.set(change.item.id, change.item);
            break;
        }
      }
      if (forceUpdate) {
        get().setYjsNodes();
      }
    },
    onEdgesChange: (changes) => {
      let forceUpdate = false;
      const yjsEdges = getYjsEdges();
      if (!yjsEdges) return;

      for (const change of changes) {
        switch (change.type) {
          case "select": {
            const cached = edgeMap.get(change.id);
            if (cached) {
              edgeMap.set(change.id, cached.remote, {
                ...cached.local,
                selected: change.selected,
              });
              forceUpdate = true;
            }
            break;
          }
          case "add":
            yjsEdges.set(change.item.id, change.item);
            break;
          case "remove":
            yjsEdges.delete(change.id);
            break;
          case "replace":
            yjsEdges.set(change.item.id, change.item);
            break;
        }
      }
      if (forceUpdate) {
        get().setYjsEdges();
      }
    },
    onConnect: (connection) => {
      const yjsEdges = getYjsEdges();
      if (!yjsEdges) return;

      const id = crypto.randomUUID();
      yjsEdges.set(id, { ...connection, id });
    },
    addNode: async (node) => {
      const yjsNodes = getYjsNodes();
      if (!yjsNodes) return;

      const id = crypto.randomUUID();
      yjsNodes.set(id, { ...node, id });
    },
    addEdge: async (edge) => {
      const yjsEdges = getYjsEdges();
      if (!yjsEdges) return;

      const id = crypto.randomUUID();
      yjsEdges.set(id, { ...edge, id });
    },
    updateNodeData: (nodeId, newData) => {
      const yjsNodes = getYjsNodes();
      if (!yjsNodes) return;

      const node = yjsNodes.get(nodeId);
      if (node) {
        yjsNodes.set(nodeId, { ...node, data: { ...node.data, ...newData } });
      }
    },
  };
};
