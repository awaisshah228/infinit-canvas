import { useCallback, useMemo, useState } from 'react';
import {
  InfiniteCanvas, useNodesState, useEdgesState,
  Controls, Background, Handle,
} from '@infinit-canvas/react';
import '@infinit-canvas/react/styles.css';
import { treeData } from './initialElements';
import { flattenTree } from './useExpandCollapse';
import ExpandableNode from './ExpandableNode';

const nodeTypes = { expandable: ExpandableNode };

export default function App() {
  const [expanded, setExpanded] = useState(new Set(['1', '2', '3']));

  const { nodes: flatNodes, edges: flatEdges } = useMemo(
    () => flattenTree(treeData, expanded, 300, 0),
    [expanded],
  );

  const [nodes, , onNodesChange] = useNodesState(flatNodes);
  const [edges, , onEdgesChange] = useEdgesState(flatEdges);

  const onNodeClick = useCallback((_, node) => {
    if (!node.data?.hasChildren) return;
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(node.id)) next.delete(node.id);
      else next.add(node.id);
      return next;
    });
  }, []);

  return (
    <InfiniteCanvas
      nodes={flatNodes}
      edges={flatEdges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      nodeTypes={nodeTypes}
      fitView
      style={{ width: '100%', height: '100vh' }}
    >
      <Controls />
      <Background variant="dots" />
    </InfiniteCanvas>
  );
}
