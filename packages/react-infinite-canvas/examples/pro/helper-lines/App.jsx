import { useCallback, useState } from 'react';
import {
  InfiniteCanvas, useNodesState, useEdgesState,
  Controls, Background,
} from '@infinit-canvas/react';
import '@infinit-canvas/react/styles.css';
import { getHelperLines } from './useHelperLines';
import HelperLinesSVG from './HelperLinesRenderer';

const initialNodes = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'Node 1: Move me around' }, style: { width: 200, height: 100, backgroundColor: '#00d7ca', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3, fontWeight: 600 } },
  { id: '2', position: { x: 380, y: 125 }, data: { label: 'Node 2: Move me around' }, style: { width: 220, height: 200, backgroundColor: '#6ede87', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3, fontWeight: 600 } },
  { id: '3', position: { x: -100, y: 220 }, data: { label: 'Node 3: Move me around' }, style: { width: 125, height: 220, backgroundColor: '#ff6700', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3, fontWeight: 600 } },
  { id: '4', position: { x: 250, y: -160 }, data: { label: 'Node 4: Move me around' }, style: { width: 180, height: 180, backgroundColor: '#ff0071', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3, fontWeight: 600 } },
  { id: '5', position: { x: -20, y: 500 }, data: { label: 'Node 5: Move me around' }, style: { width: 300, height: 120, backgroundColor: '#784be8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3, fontWeight: 600 } },
];

export default function App() {
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
      style={{ width: '100%', height: '100vh' }}
    >
      <Controls />
      <Background />
      <HelperLinesSVG horizontal={hLine} vertical={vLine} />
    </InfiniteCanvas>
  );
}
