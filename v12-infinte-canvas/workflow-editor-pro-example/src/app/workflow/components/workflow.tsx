'use client';

import React from 'react';
import { Background, InfiniteCanvas, ColorMode } from '@infinit-canvas/react';
import { useShallow } from 'zustand/react/shallow';
import { useTheme } from 'next-themes';

import { nodeTypes } from '@/app/workflow/components/nodes';
import { WorkflowEdge } from '@/app/workflow/components/edges/workflow-edge';
import { useAppStore } from '@/app/workflow/store';
import { WorkflowControls } from './controls';
import FlowContextMenu from '@/app/workflow/components/flow-context-menu';
import { AppStore } from '@/app/workflow/store/app-store';
import { useDragAndDrop } from '@/app/workflow/hooks/useDragAndDrop';
import { FlowRunButton } from '@/app/workflow/components/flow-run-button';

const edgeTypes = {
  workflow: WorkflowEdge,
};

const defaultEdgeOptions = { type: 'workflow' };

const selector = (state: AppStore) => ({
  nodes: state.nodes,
  edges: state.edges,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
  onNodeDragStart: state.onNodeDragStart,
  onNodeDragStop: state.onNodeDragStop,
});

export default function Workflow() {
  const store = useAppStore(useShallow(selector));
  const { onDragOver, onDrop } = useDragAndDrop();
  const { theme } = useTheme();

  return (
    <InfiniteCanvas
      nodes={store.nodes}
      edges={store.edges}
      onNodesChange={store.onNodesChange}
      onEdgesChange={store.onEdgesChange}
      onConnect={store.onConnect}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onNodeDragStart={store.onNodeDragStart}
      onNodeDragStop={store.onNodeDragStop}
      colorMode={theme as ColorMode}
      defaultEdgeOptions={defaultEdgeOptions}
      fitView
    >
      <Background />
      <WorkflowControls />
      <FlowContextMenu />
      <FlowRunButton />
    </InfiniteCanvas>
  );
}
