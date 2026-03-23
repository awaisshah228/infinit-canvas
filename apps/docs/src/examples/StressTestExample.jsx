'use client';
import { useMemo } from 'react';
import {
  InfiniteCanvas, useNodesState, useEdgesState,
  Controls, Background,
} from '@infinit-canvas/react';
import '@infinit-canvas/react/styles.css';

function generateGrid(cols = 15, rows = 10) {
  const nodes = [];
  const edges = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const id = `${r}-${c}`;
      nodes.push({
        id,
        position: { x: c * 200, y: r * 80 },
        data: { label: `${r},${c}` },
      });
      if (c > 0) edges.push({ id: `e-${r}-${c - 1}-${r}-${c}`, source: `${r}-${c - 1}`, target: id });
      if (r > 0) edges.push({ id: `e-${r - 1}-${c}-${r}-${c}`, source: `${r - 1}-${c}`, target: id });
    }
  }
  return { nodes, edges };
}

export default function StressTestExample() {
  const { nodes: initNodes, edges: initEdges } = useMemo(() => generateGrid(), []);
  const [nodes, , onNodesChange] = useNodesState(initNodes);
  const [edges, , onEdgesChange] = useEdgesState(initEdges);

  return (
    <InfiniteCanvas
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      fitView
      height="400px"
    >
      <Controls />
      <Background variant="dots" />
    </InfiniteCanvas>
  );
}
