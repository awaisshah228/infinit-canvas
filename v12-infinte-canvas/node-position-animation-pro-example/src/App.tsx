import { useCallback, useRef, useState } from 'react';
import {
  InfiniteCanvas,
  applyEdgeChanges,
  applyNodeChanges,
  InfiniteCanvasProvider,
  MiniMap,
  Background,
  OnNodesChange,
  OnEdgesChange,
  Edge,
  Controls,
  Node,
  Panel,
} from '@infinit-canvas/react';

import '@infinit-canvas/react/styles.css';

import { nodes as initialNodes } from './initialElements';
import { layouts } from './layouts';
import useAnimatedNodes from './useAnimatedNodes';

const proOptions = { account: 'paid-pro', hideAttribution: true };

function LayoutAnimationFlow() {
  const layoutIndex = useRef(0);
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>([]);

  const animatedNodes = useAnimatedNodes(nodes, {
    animationDuration: 300,
  });

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onUpdateNodePositions = useCallback(() => {
    layoutIndex.current = (layoutIndex.current + 1) % layouts.length;
    const layout = layouts[layoutIndex.current];

    setNodes((nds) => {
      return nds.map((node) => {
        const nextPosition = layout[node.id];

        return {
          ...node,
          position: nextPosition,
        };
      });
    });
  }, []);

  return (
    <InfiniteCanvas
      fitView
      nodes={animatedNodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      proOptions={proOptions}
      nodesDraggable={false}
      nodesConnectable={false}
      zoomOnDoubleClick={false}
      elementsSelectable={false}
    >
      <Background />
      <MiniMap />
      <Controls />
      <Panel>
        <button className="xy-theme__button" onClick={onUpdateNodePositions}>
          toggle layout
        </button>
      </Panel>
    </InfiniteCanvas>
  );
}

function InfiniteCanvasWrapper() {
  return (
    <InfiniteCanvasProvider>
      <LayoutAnimationFlow />
    </InfiniteCanvasProvider>
  );
}

export default InfiniteCanvasWrapper;
