import { useCallback, MouseEvent } from 'react';
import { Background, InfiniteCanvas, type Node } from '@infinit-canvas/react';
import { useStore } from './store';
import { useShallow } from 'zustand/react/shallow';

const proOptions = { hideAttribution: true };

export default function ExampleFlow() {
  const nodes = useStore(useShallow((s) => s.nodes));
  const edges = useStore(useShallow((s) => s.edges));
  const { onNodesChange, onEdgesChange, onConnect, updateNodePosition } =
    useStore(
      useShallow((s) => ({
        onConnect: s.onConnect,
        onNodesChange: s.onNodesChange,
        onEdgesChange: s.onEdgesChange,
        updateNodePosition: s.updateNodePosition,
      }))
    );

  const onNodeDragStop = useCallback(
    (_event: MouseEvent, node: Node) => {
      updateNodePosition(node.id, node.position);
    },
    [updateNodePosition]
  );

  return (
    <InfiniteCanvas
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeDragStop={onNodeDragStop}
      fitView
      proOptions={proOptions}
    >
      <Background />
    </InfiniteCanvas>
  );
}
