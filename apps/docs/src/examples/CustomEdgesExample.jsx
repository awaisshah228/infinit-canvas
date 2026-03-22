'use client';
import { useCallback } from 'react';
import {
  InfiniteCanvas, useNodesState, useEdgesState, addEdge,
  Controls, Background, BaseEdge, EdgeLabelRenderer, getBezierPath,
} from 'react-infinite-canvas';
import 'react-infinite-canvas/styles.css';

function ButtonEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, markerEnd }) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
  });

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div style={{
          position: 'absolute',
          transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          pointerEvents: 'all',
        }}>
          <button style={{
            width: 20, height: 20, borderRadius: '50%',
            background: '#eee', border: '1px solid #999',
            cursor: 'pointer', fontSize: 10, lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            x
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

const edgeTypes = { button: ButtonEdge };

const initialNodes = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'Node A' } },
  { id: '2', position: { x: 300, y: 0 }, data: { label: 'Node B' } },
  { id: '3', position: { x: 0, y: 150 }, data: { label: 'Node C' } },
  { id: '4', position: { x: 300, y: 150 }, data: { label: 'Node D' } },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', type: 'button' },
  { id: 'e3-4', source: '3', target: '4', type: 'button' },
  { id: 'e1-3', source: '1', target: '3', animated: true },
];

export default function CustomEdgesExample() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

  return (
    <InfiniteCanvas
      nodes={nodes}
      edges={edges}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      fitView
      height="350px"
    >
      <Controls />
      <Background variant="dots" />
    </InfiniteCanvas>
  );
}
