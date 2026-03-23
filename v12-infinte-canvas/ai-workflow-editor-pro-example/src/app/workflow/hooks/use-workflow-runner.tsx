'use client';

import { useCallback, useRef } from 'react';
import { type Edge } from '@infinit-canvas/react';
import { useShallow } from 'zustand/react/shallow';

import { AppEdge } from '@/app/workflow/components/edges';
import {
  AppNode,
  NodeProcessor,
  nodeProcessors,
} from '@/app/workflow/components/nodes';
import { useAppStore } from '@/app/workflow/store';
import { AppStore } from '@/app/workflow/store/app-store';
import { nodesConfig } from '../config';

export type IncomingNodeData = Record<string, (AppNode | undefined)[]>;

const selector = (state: AppStore) => ({
  getNodes: state.getNodes,
  setNodes: state.setNodes,
  getEdges: state.getEdges,
  updateNodeData: state.updateNodeData,
});

/**
 * This is a demo workflow runner that runs a simplified version of a workflow.
 * You can customize how nodes are processed by overriding `processNode` or
 * even replacing the entire `collectNodesToProcess` function with your own logic.
 */
export function useWorkflowRunner() {
  const isRunning = useRef(false);
  const { getNodes, getEdges, updateNodeData } = useAppStore(
    useShallow(selector),
  );

  const stopWorkflow = useCallback(() => {
    isRunning.current = false;
  }, []);

  const getAllIncomingData = useCallback(
    <T extends AppNode>(node: T): IncomingNodeData => {
      const edges = getEdges();

      if (!node.type) {
        return {};
      }

      const handles = nodesConfig[node.type].handles;
      const incomerEdges: Record<string, Edge[]> = Object.fromEntries(
        handles.map((handle) => [
          handle.id,
          edges.filter(
            (edge) =>
              edge.target === node.id && edge.targetHandle === handle.id,
          ),
        ]),
      );

      const nodes = getNodes();
      const incomers = Object.fromEntries(
        Object.entries(incomerEdges).map(([handleId, edges]) => [
          handleId,
          edges.map((e) => nodes.find((n) => n.id === e.source)),
        ]),
      );

      // Assert that incomers are not empty and there is only one node
      // You may want to extend this to support multiple nodes connected to a single target handle
      if (Object.keys(incomers).length == 0) {
        return {};
      } else {
        for (const handleId in incomers) {
          if (incomers[handleId].length > 1) {
            throw new Error(
              `Multiple incomers found for node ${node.id} on handle ${handleId}`,
            );
          }
        }
      }
      return incomers;
    },
    [getEdges, getNodes],
  );

  const processNode = useCallback(
    async function <T extends AppNode>(node: T) {
      updateNodeData(node.id, { status: 'loading', error: undefined });

      const allIncomingData = getAllIncomingData(node);

      const processor = nodeProcessors[node.type] as NodeProcessor<T>;

      let newData: Partial<T['data']> | undefined;
      if (processor) {
        try {
          newData = await processor(allIncomingData, node as T);
        } catch (error) {
          console.error(`Error processing node ${node.id}:`, error);
          updateNodeData(node.id, {
            status: 'error',
            error: error instanceof Error ? error.message : String(error),
          });
          return;
        }
      } else {
        console.error(`No processor found for node type: ${node.type}`);
        updateNodeData(node.id, { status: 'error', error: undefined });
        return;
      }

      if (!isRunning.current) {
        // Reset the node status if the workflow was stopped
        updateNodeData(node.id, { status: 'initial', error: undefined });
        return;
      }

      updateNodeData(
        node.id,
        newData ?? { status: 'error', error: 'Unknown error' },
      );
    },
    [updateNodeData, getAllIncomingData],
  );

  const runWorkflow = useCallback(
    async (startNodeId?: string) => {
      if (isRunning.current) return;
      const nodes = getNodes();
      const edges = getEdges();
      isRunning.current = true;

      // for this demo, we'll start with the passed start node
      // or the first node that doesn't have any incoming edges
      const _startNodeId =
        startNodeId ||
        nodes.find((node) => !edges.some((e) => e.target === node.id))?.id;

      if (!_startNodeId) {
        return;
      }

      const nodesToProcess = collectNodesToProcess(nodes, edges, _startNodeId);

      for (const node of nodesToProcess) {
        if (!isRunning.current) break;
        await processNode(node);
      }

      isRunning.current = false;
    },
    [getNodes, getEdges, processNode],
  );

  return {
    runWorkflow,
    stopWorkflow,
    isRunning: isRunning.current,
  };
}

/**
 * This is a very simplified example of how you might traverse a graph and collect nodes to process.
 * It's not meant to be used in production, but you can use it as a starting point for your own logic.
 */
function collectNodesToProcess(
  nodes: AppNode[],
  edges: AppEdge[],
  startNodeId: string,
) {
  const nodesToProcess: AppNode[] = [];
  const visited = new Set();

  function visit(nodeId: string) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    nodesToProcess.push(node);

    const outgoingEdges = edges.filter((e) => e.source === nodeId);
    for (const edge of outgoingEdges) {
      visit(edge.target);
    }
  }

  visit(startNodeId);

  return nodesToProcess;
}
