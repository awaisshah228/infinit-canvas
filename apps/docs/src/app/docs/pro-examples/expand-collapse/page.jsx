'use client';
import ProExampleBlock from '../../../../components/ProExampleBlock';

const files = [
  {
    name: 'App.jsx',
    code: `import { useCallback, useMemo, useState } from 'react';
import {
  InfiniteCanvas, useNodesState, useEdgesState,
  Controls, Background, Handle,
} from 'react-infinite-canvas';

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
    >
      <Controls />
      <Background variant="dots" />
    </InfiniteCanvas>
  );
}`,
  },
  {
    name: 'useExpandCollapse.js',
    code: `export function flattenTree(node, expanded, x = 0, y = 0) {
  const nodes = [];
  const edges = [];
  const hGap = 180;
  const vGap = 80;

  function walk(n, px, py, parentId) {
    const hasChildren = n.children && n.children.length > 0;
    const isExpanded = expanded.has(n.id);

    nodes.push({
      id: n.id,
      type: 'expandable',
      position: { x: px, y: py },
      data: {
        label: n.label,
        hasChildren,
        isExpanded,
        childCount: n.children?.length || 0,
      },
    });

    if (parentId) {
      edges.push({
        id: 'e-' + parentId + '-' + n.id,
        source: parentId,
        target: n.id,
      });
    }

    if (hasChildren && isExpanded) {
      const totalWidth = (n.children.length - 1) * hGap;
      let startX = px - totalWidth / 2;
      for (const child of n.children) {
        walk(child, startX, py + vGap, n.id);
        startX += hGap;
      }
    }
  }

  walk(node, x, y, null);
  return { nodes, edges };
}`,
  },
  {
    name: 'ExpandableNode.jsx',
    code: `import { Handle } from 'react-infinite-canvas';

export default function ExpandableNode({ data }) {
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
          {data.isExpanded ? '−' : '+' + data.childCount}
        </span>
      )}
      <Handle type="source" position="bottom" />
    </div>
  );
}`,
  },
  {
    name: 'initialElements.js',
    code: `export const treeData = {
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
};`,
  },
];

export default function ExpandCollapsePage() {
  return (
    <div className="page-content">
      <ProExampleBlock
        title="Expand / Collapse"
        description="Tree structures with expandable and collapsible nodes. Click on branch nodes to expand or collapse their children."
        files={files}
        readme={`
          <h2>How it works</h2>
          <p>This example shows how to create a tree visualization where nodes can be expanded or collapsed to show/hide their children.</p>
          <h3>Core concept</h3>
          <p>The tree data is stored as a nested structure. A <code>Set</code> tracks which node IDs are expanded. On each render, the tree is flattened into nodes and edges, only including children of expanded nodes.</p>
          <h3>Layout algorithm</h3>
          <p>Children are evenly distributed horizontally below their parent with configurable gaps. The layout recalculates automatically when expand/collapse state changes.</p>
          <h3>Key features</h3>
          <ul>
            <li>Click nodes to expand/collapse</li>
            <li>Badge shows child count when collapsed</li>
            <li>Automatic tree layout positioning</li>
            <li>Branch nodes styled differently from leaves</li>
          </ul>
        `}
      />
    </div>
  );
}
