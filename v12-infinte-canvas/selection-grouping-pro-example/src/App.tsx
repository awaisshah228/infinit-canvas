import { useCallback } from 'react';
import {
  InfiniteCanvas,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  OnConnect,
  SelectionMode,
  Edge,
} from '@infinit-canvas/react';

import GroupNode from './GroupNode';
import SelectedNodesToolbar from './SelectedNodesToolbar';
import { initialNodes, initialEdges } from './initial-elements';

import '@infinit-canvas/react/styles.css';

const proOptions = {
  hideAttribution: true,
};

const nodeTypes = {
  group: GroupNode,
};

export default function DynamicGrouping() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const onConnect: OnConnect = useCallback(
    (edge) => setEdges((eds: Edge[]) => addEdge(edge, eds)),
    [setEdges]
  );

  return (
    <InfiniteCanvas
      nodes={nodes}
      edges={edges}
      onEdgesChange={onEdgesChange}
      onNodesChange={onNodesChange}
      onConnect={onConnect}
      proOptions={proOptions}
      fitView
      selectNodesOnDrag={false}
      nodeTypes={nodeTypes}
      multiSelectionKeyCode="Shift"
      selectionMode={SelectionMode.Partial}
    >
      <Background />
      {/* 👇 This is toolbar is displayed when multiple nodes are selected to group them */}
      <SelectedNodesToolbar />
    </InfiniteCanvas>
  );
}
