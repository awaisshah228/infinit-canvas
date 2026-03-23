import { useCallback, useState } from 'react';
import {
  InfiniteCanvas,
  applyEdgeChanges,
  applyNodeChanges,
  InfiniteCanvasProvider,
  MiniMap,
  Background,
  OnNodesChange,
  OnEdgesChange,
  NodeMouseHandler,
  Edge,
} from '@infinit-canvas/react';

// This is used to display a leva (https://github.com/pmndrs/leva) control panel for the example
import { useControls } from 'leva';

import CustomNode from './CustomNode';
import {
  nodes as initialNodes,
  edges as initialEdges,
} from './initialElements';
import useExpandCollapse from './useExpandCollapse';

import '@infinit-canvas/react/styles.css';
import styles from './styles.module.css';
import { ExpandCollapseNode } from './types';

const proOptions = { account: 'paid-pro', hideAttribution: true };

const nodeTypes = {
  custom: CustomNode,
};

type ExpandCollapseExampleProps = {
  treeWidth?: number;
  treeHeight?: number;
};

function InfiniteCanvasPro({
  treeWidth = 220,
  treeHeight = 100,
}: ExpandCollapseExampleProps = {}) {
  const [nodes, setNodes] = useState<ExpandCollapseNode[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  const { nodes: visibleNodes, edges: visibleEdges } = useExpandCollapse(
    nodes,
    edges,
    { treeWidth, treeHeight }
  );

  const onNodesChange: OnNodesChange<ExpandCollapseNode> = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === node.id) {
            return {
              ...n,
              data: { ...n.data, expanded: !n.data.expanded },
            };
          }

          return n;
        })
      );
    },
    [setNodes]
  );

  return (
    <InfiniteCanvas
      fitView
      nodes={visibleNodes}
      edges={visibleEdges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      proOptions={proOptions}
      nodeTypes={nodeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      className={styles.viewport}
      zoomOnDoubleClick={false}
      elementsSelectable={false}
    >
      <Background />
      <MiniMap />
    </InfiniteCanvas>
  );
}

function InfiniteCanvasWrapper() {
  // 👇 This hook is used to display a leva (https://github.com/pmndrs/leva) control panel for this example.
  // You can safely remove it, if you don't want to use it.
  const levaProps = useControls({
    treeWidth: {
      value: 220,
      min: 0,
      max: 440,
    },
    treeHeight: {
      value: 100,
      min: 0,
      max: 200,
    },
  });

  return (
    <InfiniteCanvasProvider>
      <InfiniteCanvasPro {...levaProps} />
    </InfiniteCanvasProvider>
  );
}

export default InfiniteCanvasWrapper;
