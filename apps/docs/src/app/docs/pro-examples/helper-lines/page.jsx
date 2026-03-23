'use client';
import ProExampleBlock from '../../../../components/ProExampleBlock';

const files = [
  {
    name: 'App.jsx',
    code: `import { useCallback, useState } from 'react';
import {
  InfiniteCanvas, useNodesState, useEdgesState,
  Controls, Background,
} from 'react-infinite-canvas';
import 'react-infinite-canvas/styles.css';
import { getHelperLines } from './useHelperLines';
import HelperLinesSVG from './HelperLinesRenderer';

const initialNodes = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'Node 1' },
    style: { width: 200, height: 100, backgroundColor: '#00d7ca' } },
  { id: '2', position: { x: 380, y: 125 }, data: { label: 'Node 2' },
    style: { width: 220, height: 200, backgroundColor: '#6ede87' } },
  { id: '3', position: { x: -100, y: 220 }, data: { label: 'Node 3' },
    style: { width: 125, height: 220, backgroundColor: '#ff6700' } },
  { id: '4', position: { x: 250, y: -160 }, data: { label: 'Node 4' },
    style: { width: 180, height: 180, backgroundColor: '#ff0071' } },
];

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState([]);
  const [hLine, setHLine] = useState(null);
  const [vLine, setVLine] = useState(null);

  const handleNodesChange = useCallback((changes) => {
    const posChange = changes.find((c) => c.type === 'position' && c.dragging);
    if (posChange?.position) {
      const { horizontal, vertical, snappedPosition } = getHelperLines(
        posChange, nodes
      );
      setHLine(horizontal);
      setVLine(vertical);
      posChange.position = snappedPosition;
    } else {
      setHLine(null);
      setVLine(null);
    }
    onNodesChange(changes);
  }, [nodes, onNodesChange]);

  return (
    <InfiniteCanvas
      nodes={nodes}
      edges={edges}
      onNodesChange={handleNodesChange}
      onEdgesChange={onEdgesChange}
      fitView
    >
      <Controls />
      <Background />
      <HelperLinesSVG horizontal={hLine} vertical={vLine} />
    </InfiniteCanvas>
  );
}`,
  },
  {
    name: 'useHelperLines.js',
    code: `const SNAP_THRESHOLD = 5;

export function getHelperLines(change, nodes) {
  const movingNode = nodes.find((n) => n.id === change.id);
  if (!movingNode || !change.position) {
    return { horizontal: null, vertical: null, snappedPosition: change.position };
  }

  const pos = change.position;
  const w = movingNode.width || movingNode.style?.width || 160;
  const h = movingNode.height || movingNode.style?.height || 60;

  let horizontal = null;
  let vertical = null;
  let snapX = pos.x;
  let snapY = pos.y;

  for (const node of nodes) {
    if (node.id === movingNode.id) continue;
    const nw = node.width || node.style?.width || 160;
    const nh = node.height || node.style?.height || 60;

    // Vertical alignment (x-axis snap)
    const anchorsX = [
      { moving: pos.x, target: node.position.x },           // left-left
      { moving: pos.x + w, target: node.position.x + nw },  // right-right
      { moving: pos.x + w / 2, target: node.position.x + nw / 2 }, // center
      { moving: pos.x, target: node.position.x + nw },       // left-right
      { moving: pos.x + w, target: node.position.x },        // right-left
    ];

    for (const a of anchorsX) {
      if (Math.abs(a.moving - a.target) < SNAP_THRESHOLD) {
        snapX = pos.x + (a.target - a.moving);
        vertical = a.target;
        break;
      }
    }

    // Horizontal alignment (y-axis snap)
    const anchorsY = [
      { moving: pos.y, target: node.position.y },
      { moving: pos.y + h, target: node.position.y + nh },
      { moving: pos.y + h / 2, target: node.position.y + nh / 2 },
      { moving: pos.y, target: node.position.y + nh },
      { moving: pos.y + h, target: node.position.y },
    ];

    for (const a of anchorsY) {
      if (Math.abs(a.moving - a.target) < SNAP_THRESHOLD) {
        snapY = pos.y + (a.target - a.moving);
        horizontal = a.target;
        break;
      }
    }
  }

  return { horizontal, vertical, snappedPosition: { x: snapX, y: snapY } };
}`,
  },
  {
    name: 'HelperLinesRenderer.jsx',
    code: `export default function HelperLinesSVG({ horizontal, vertical }) {
  if (horizontal === null && vertical === null) return null;

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0, left: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
        zIndex: 50,
      }}
    >
      {vertical !== null && (
        <line
          x1={vertical} y1="0"
          x2={vertical} y2="100%"
          stroke="#0041d0"
          strokeWidth="1"
          strokeDasharray="5,5"
        />
      )}
      {horizontal !== null && (
        <line
          x1="0" y1={horizontal}
          x2="100%" y2={horizontal}
          stroke="#0041d0"
          strokeWidth="1"
          strokeDasharray="5,5"
        />
      )}
    </svg>
  );
}`,
  },
];

export default function HelperLinesPage() {
  return (
    <div className="page-content">
      <ProExampleBlock
        title="Helper Lines"
        description="Visual guides and snapping for nodes while dragging. Drag nodes around to see them snap and align with other node boundaries."
        files={files}
        readme={`
          <h2>How it works</h2>
          <p>This example implements alignment guides (helper lines) that appear when dragging nodes near other node edges or centers.</p>
          <h3>Core concept</h3>
          <p>When a node is being dragged, we compare its position anchors (left, right, center, top, bottom) against all other nodes. If any anchor is within the snap threshold (5px by default), the dragged node snaps to that position and a dashed blue line is rendered.</p>
          <h3>Key files</h3>
          <ul>
            <li><code>useHelperLines.js</code> — Computes snap positions by comparing moving node anchors against all other nodes</li>
            <li><code>HelperLinesRenderer.jsx</code> — Renders the dashed alignment lines as an SVG overlay</li>
            <li><code>App.jsx</code> — Intercepts <code>onNodesChange</code> to apply snapping before the change is committed</li>
          </ul>
        `}
      />
    </div>
  );
}
