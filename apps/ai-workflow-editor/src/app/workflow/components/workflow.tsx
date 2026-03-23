'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Background,
  ColorMode,
  Connection,
  Edge,
  InfiniteCanvas,
  ReactFlowInstance,
  useNodesInitialized,
  useReactFlow,
} from '@infinit-canvas/react';
import { useTheme } from 'next-themes';
import { useShallow } from 'zustand/react/shallow';

import FlowContextMenu from '@/app/workflow/components/flow-context-menu';
import { nodeTypes } from '@/app/workflow/components/nodes';
import { useDragAndDrop } from '@/app/workflow/hooks/useDragAndDrop';
import { useAppStore } from '@/app/workflow/store';
import { AppStore } from '@/app/workflow/store/app-store';
import { layoutGraph } from '../utils/layout-helper';
import { WorkflowControls } from './controls';

const selector = (state: AppStore) => ({
  nodes: state.nodes,
  edges: state.edges,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
  setNodes: state.setNodes,
});

// We assume that the handle ids are in the format `${typeFlowingOnWire}-${handleId}`
// For example `image-output` or `text-prompt`.
// See also:
// - `components/nodes/index.tsx` for definition of the node configuration
// - `data/workflow-data.tsx` for a definition of an initial flow
// - Components `generate-text-node.tsx` and `generate-image-node.tsx`
const isValidConnection = (c: Edge | Connection) =>
  typeof c.sourceHandle === 'string' &&
  typeof c.targetHandle === 'string' &&
  c.sourceHandle.split('-')[0] === c.targetHandle.split('-')[0];

function AutoLayout({ nodes, edges, setNodes }: {
  nodes: AppStore['nodes'];
  edges: AppStore['edges'];
  setNodes: AppStore['setNodes'];
}) {
  const { fitView } = useReactFlow();
  const [hasLayouted, setHasLayouted] = useState(false);
  const nodesInitialized = useNodesInitialized();

  const layoutNodes = useCallback(async () => {
    const layoutedNodes = await layoutGraph(nodes, edges);
    setNodes(layoutedNodes);
    setHasLayouted(true);
    fitView();
  }, [fitView, nodes, edges, setNodes]);

  useEffect(() => {
    if (nodesInitialized && !hasLayouted) {
      layoutNodes();
    }
  }, [nodesInitialized, hasLayouted, layoutNodes]);

  return null;
}

export default function Workflow() {
  const store = useAppStore(useShallow(selector));
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const { onDragOver, onDrop } = useDragAndDrop(rfInstance);
  const { theme } = useTheme();

  return (
    <InfiniteCanvas
      nodes={store.nodes}
      edges={store.edges}
      onNodesChange={store.onNodesChange}
      onEdgesChange={store.onEdgesChange}
      onConnect={store.onConnect}
      nodeTypes={nodeTypes}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onInit={setRfInstance}
      colorMode={theme as ColorMode}
      isValidConnection={isValidConnection}
      width="100%"
      height="100%"
      style={{ flex: 1 }}
    >
      <AutoLayout nodes={store.nodes} edges={store.edges} setNodes={store.setNodes} />
      <Background />
      <WorkflowControls />
      <FlowContextMenu />
    </InfiniteCanvas>
  );
}
