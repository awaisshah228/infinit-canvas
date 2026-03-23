import { useCallback } from 'react';
import {
  InfiniteCanvas,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  OnConnect,
  Edge,
} from '@infinit-canvas/react';

import SimpleNode from './SimpleNode';
import { initialNodes, initialEdges } from './initial-elements';
import { useNodeDragHandlers } from './useNodeDragHandlers';

import '@infinit-canvas/react/styles.css';

const proOptions = {
  hideAttribution: true,
};

const nodeTypes = {
  node: SimpleNode,
};

export default function DynamicParentChild() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const onConnect: OnConnect = useCallback(
    (edge) => setEdges((eds: Edge[]) => addEdge(edge, eds)),
    [setEdges]
  );

  const { onNodeDrag, onNodeDragStop } = useNodeDragHandlers();

  return (
    <InfiniteCanvas
      nodes={nodes}
      edges={edges}
      onEdgesChange={onEdgesChange}
      onNodesChange={onNodesChange}
      onConnect={onConnect}
      onNodeDrag={onNodeDrag}
      onNodeDragStop={onNodeDragStop}
      proOptions={proOptions}
      fitView
      selectNodesOnDrag={false}
      nodeTypes={nodeTypes}
    >
      <Background color="#bbb" gap={50} variant={BackgroundVariant.Dots} />
    </InfiniteCanvas>
  );
}
