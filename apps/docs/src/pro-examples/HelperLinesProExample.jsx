'use client';
import { useCallback, useState, useEffect, useRef } from 'react';
import {
  InfiniteCanvas, useNodesState, useEdgesState,
  Controls, Background,
} from '@infinit-canvas/react';
import '@infinit-canvas/react/styles.css';

const initialNodes = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'Node 1: Move me around' }, style: { width: 200, height: 100, backgroundColor: '#00d7ca', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3, fontWeight: 600 } },
  { id: '2', position: { x: 380, y: 125 }, data: { label: 'Node 2: Move me around' }, style: { width: 220, height: 200, backgroundColor: '#6ede87', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3, fontWeight: 600 } },
  { id: '3', position: { x: -100, y: 220 }, data: { label: 'Node 3: Move me around' }, style: { width: 125, height: 220, backgroundColor: '#ff6700', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3, fontWeight: 600 } },
  { id: '4', position: { x: 250, y: -160 }, data: { label: 'Node 4: Move me around' }, style: { width: 180, height: 180, backgroundColor: '#ff0071', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3, fontWeight: 600 } },
  { id: '5', position: { x: -20, y: 500 }, data: { label: 'Node 5: Move me around' }, style: { width: 300, height: 120, backgroundColor: '#784be8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3, fontWeight: 600 } },
];

const SNAP_THRESHOLD = 5;

function getHelperLines(change, nodes) {
  const movingNode = nodes.find((n) => n.id === change.id);
  if (!movingNode || !change.position) return { horizontal: null, vertical: null, snappedPosition: change.position };

  const pos = change.position;
  const w = movingNode.width || 160;
  const h = movingNode.height || 60;

  let horizontal = null;
  let vertical = null;
  let snapX = pos.x;
  let snapY = pos.y;

  for (const node of nodes) {
    if (node.id === movingNode.id) continue;
    const nw = node.width || 160;
    const nh = node.height || 60;

    // Vertical alignment (x)
    const anchorsX = [
      { moving: pos.x, target: node.position.x },
      { moving: pos.x + w, target: node.position.x + nw },
      { moving: pos.x + w / 2, target: node.position.x + nw / 2 },
      { moving: pos.x, target: node.position.x + nw },
      { moving: pos.x + w, target: node.position.x },
    ];
    for (const a of anchorsX) {
      if (Math.abs(a.moving - a.target) < SNAP_THRESHOLD) {
        snapX = pos.x + (a.target - a.moving);
        vertical = a.target;
        break;
      }
    }

    // Horizontal alignment (y)
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
}

export default function HelperLinesProExample() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState([]);
  const [hLine, setHLine] = useState(null);
  const [vLine, setVLine] = useState(null);

  const handleNodesChange = useCallback((changes) => {
    const posChange = changes.find((c) => c.type === 'position' && c.dragging);
    if (posChange && posChange.position) {
      const { horizontal, vertical, snappedPosition } = getHelperLines(posChange, nodes);
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
      height="500px"
    >
      <Controls />
      <Background />
      <HelperLinesSVG horizontal={hLine} vertical={vLine} />
    </InfiniteCanvas>
  );
}

function HelperLinesSVG({ horizontal, vertical }) {
  if (horizontal === null && vertical === null) return null;

  return (
    <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 50 }}>
      {vertical !== null && (
        <line x1="0" y1="0" x2="0" y2="100%" stroke="#0041d0" strokeWidth="1" strokeDasharray="5,5" style={{ transform: `translateX(${vertical}px)` }} />
      )}
      {horizontal !== null && (
        <line x1="0" y1="0" x2="100%" y2="0" stroke="#0041d0" strokeWidth="1" strokeDasharray="5,5" style={{ transform: `translateY(${horizontal}px)` }} />
      )}
    </svg>
  );
}
