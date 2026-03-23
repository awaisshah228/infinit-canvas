'use client';
import { useCallback, useMemo, useState } from 'react';
import {
  InfiniteCanvas, useNodesState, useEdgesState,
  Controls, Background, Handle,
} from '@infinit-canvas/react';
import '@infinit-canvas/react/styles.css';

const treeData = {
  id: '1', label: 'Root', children: [
    { id: '2', label: 'Branch A', children: [
      { id: '4', label: 'Leaf A.1', children: [] },
      { id: '5', label: 'Leaf A.2', children: [] },
    ]},
    { id: '3', label: 'Branch B', children: [
      { id: '6', label: 'Leaf B.1', children: [] },
      { id: '7', label: 'Branch B.2', children: [
        { id: '8', label: 'Leaf B.2.1', children: [] },
        { id: '9', label: 'Leaf B.2.2', children: [] },
      ]},
    ]},
  ],
};

function flattenTree(node, expanded, x = 0, y = 0, depth = 0) {
  const nodes = [];
  const edges = [];
  const hGap = 180;
  const vGap = 80;

  function walk(n, px, py, d, parentId) {
    const hasChildren = n.children && n.children.length > 0;
    const isExpanded = expanded.has(n.id);

    nodes.push({
      id: n.id,
      type: 'expandable',
      position: { x: px, y: py },
      data: { label: n.label, hasChildren, isExpanded, childCount: n.children?.length || 0 },
    });

    if (parentId) {
      edges.push({ id: `e-${parentId}-${n.id}`, source: parentId, target: n.id });
    }

    if (hasChildren && isExpanded) {
      const totalWidth = (n.children.length - 1) * hGap;
      let startX = px - totalWidth / 2;
      for (const child of n.children) {
        walk(child, startX, py + vGap, d + 1, n.id);
        startX += hGap;
      }
    }
  }

  walk(node, x, y, depth, null);
  return { nodes, edges };
}

function ExpandableNode({ data, id }) {
  return (
    <div style={{
      padding: '8px 16px',
      border: '1px solid #1a192b',
      borderRadius: 8,
      background: data.hasChildren ? '#f0f4ff' : '#fff',
      fontSize: 13,
      fontWeight: 500,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      minWidth: 100,
    }}>
      <Handle type="target" position="top" />
      <span>{data.label}</span>
      {data.hasChildren && (
        <span style={{
          fontSize: 11,
          color: '#6c757d',
          background: '#e9ecef',
          borderRadius: 10,
          padding: '1px 6px',
        }}>
          {data.isExpanded ? '−' : `+${data.childCount}`}
        </span>
      )}
      <Handle type="source" position="bottom" />
    </div>
  );
}

const nodeTypes = { expandable: ExpandableNode };

export default function ExpandCollapseProExample() {
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

  // Sync when expanded changes
  useMemo(() => {
    // This triggers re-render with new flatNodes/flatEdges
  }, [expanded]);

  return (
    <InfiniteCanvas
      nodes={flatNodes}
      edges={flatEdges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      nodeTypes={nodeTypes}
      fitView
      height="500px"
    >
      <Controls />
      <Background variant="dots" />
    </InfiniteCanvas>
  );
}
