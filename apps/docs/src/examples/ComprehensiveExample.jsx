'use client';
import { useState, useCallback, useRef } from 'react';
import {
  InfiniteCanvas, useNodesState, useEdgesState, addEdge,
  Controls, MiniMap, Background, Panel, Handle,
  NodeToolbar, BaseEdge, EdgeLabelRenderer,
  getBezierPath, getSmoothStepPath,
} from '@infinit-canvas/react';
import '@infinit-canvas/react/styles.css';

// ── Custom Nodes ─────────────────────────────────────────────

function CardNode({ data, selected }) {
  return (
    <div style={{
      background: data.color || '#fff',
      border: selected ? '2px solid #3b82f6' : '1px solid #e2e8f0',
      borderRadius: 10,
      padding: '12px 16px',
      minWidth: 160,
      boxShadow: selected ? '0 0 0 2px rgba(59,130,246,0.3)' : '0 1px 3px rgba(0,0,0,0.08)',
    }}>
      <Handle type="target" position="top" />
      <Handle type="target" position="left" id="left" />
      <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>
        {data.subtitle || 'Node'}
      </div>
      <div style={{ fontWeight: 600, fontSize: 14, marginTop: 2 }}>{data.label}</div>
      {data.description && (
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{data.description}</div>
      )}
      <NodeToolbar position="top">
        <div style={{
          display: 'flex', gap: 4, background: '#fff',
          border: '1px solid #e2e8f0', borderRadius: 6,
          padding: '3px 6px', fontSize: 11, boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <button style={{ border: 'none', background: 'none', cursor: 'pointer' }}>Edit</button>
          <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}>Delete</button>
        </div>
      </NodeToolbar>
      <Handle type="source" position="right" />
      <Handle type="source" position="bottom" id="bottom" />
    </div>
  );
}

function CircleNode({ data, selected }) {
  return (
    <div style={{
      width: 80, height: 80, borderRadius: '50%',
      background: data.color || '#fef3c7',
      border: selected ? '2px solid #f59e0b' : '1px solid #fcd34d',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 600, textAlign: 'center',
      boxShadow: selected ? '0 0 0 2px rgba(245,158,11,0.3)' : 'none',
    }}>
      <Handle type="target" position="top" />
      <Handle type="target" position="left" id="left" />
      {data.label}
      <Handle type="source" position="bottom" />
      <Handle type="source" position="right" id="right" />
    </div>
  );
}

function StatusNode({ data, selected }) {
  const statusColors = {
    success: { bg: '#dcfce7', border: '#86efac', dot: '#22c55e' },
    warning: { bg: '#fef9c3', border: '#fde047', dot: '#eab308' },
    error:   { bg: '#fee2e2', border: '#fca5a5', dot: '#ef4444' },
    info:    { bg: '#dbeafe', border: '#93c5fd', dot: '#3b82f6' },
  };
  const s = statusColors[data.status] || statusColors.info;
  return (
    <div style={{
      background: s.bg,
      border: selected ? `2px solid ${s.dot}` : `1px solid ${s.border}`,
      borderRadius: 8, padding: '10px 14px', minWidth: 140,
    }}>
      <Handle type="target" position="left" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.dot }} />
        <span style={{ fontWeight: 600, fontSize: 13 }}>{data.label}</span>
      </div>
      {data.description && (
        <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>{data.description}</div>
      )}
      <Handle type="source" position="right" />
    </div>
  );
}

// ── Custom Edges ─────────────────────────────────────────────

function ButtonEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, markerEnd, data }) {
  const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  return (
    <>
      <BaseEdge path={path} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div style={{
          position: 'absolute',
          transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          pointerEvents: 'all',
        }}>
          <button
            style={{
              padding: '2px 8px', borderRadius: 10,
              background: '#fff', border: '1px solid #e2e8f0',
              cursor: 'pointer', fontSize: 10, color: '#64748b',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
            onClick={() => data?.onClick?.(id)}
          >
            {data?.label || 'x'}
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

function DashedEdge({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd }) {
  const [path] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  return (
    <BaseEdge
      path={path}
      markerEnd={markerEnd}
      style={{ strokeDasharray: '6 3', stroke: '#94a3b8' }}
    />
  );
}

const nodeTypes = { card: CardNode, circle: CircleNode, status: StatusNode };
const edgeTypes = { button: ButtonEdge, dashed: DashedEdge };

// ── Drag palette config ──────────────────────────────────────

const PALETTE = [
  { type: 'card',   label: 'Card',   color: '#dbeafe', border: '#3b82f6' },
  { type: 'circle', label: 'Circle', color: '#fef3c7', border: '#f59e0b' },
  { type: 'status', label: 'Status', color: '#dcfce7', border: '#22c55e' },
  { type: 'default', label: 'Default', color: '#f1f5f9', border: '#64748b' },
];

// ── Initial data ─────────────────────────────────────────────

const initialNodes = [
  { id: '1', type: 'card', position: { x: 0, y: 0 }, data: { label: 'Start', subtitle: 'Entry', color: '#dbeafe', description: 'Drag from sidebar to add' } },
  { id: '2', type: 'circle', position: { x: 300, y: -20 }, data: { label: 'Check', color: '#fef3c7' } },
  { id: '3', type: 'status', position: { x: 550, y: -40 }, data: { label: 'API Call', status: 'success', description: '200 OK' } },
  { id: '4', type: 'status', position: { x: 550, y: 80 }, data: { label: 'Validate', status: 'warning', description: 'Pending' } },
  { id: '5', type: 'card', position: { x: 820, y: 20 }, data: { label: 'Result', subtitle: 'Output', color: '#f0fdf4' } },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', type: 'button', data: { label: 'next' } },
  { id: 'e2-3', source: '2', target: '3', sourceHandle: 'right', type: 'smoothstep' },
  { id: 'e2-4', source: '2', target: '4', animated: true },
  { id: 'e3-5', source: '3', target: '5', type: 'dashed' },
  { id: 'e4-5', source: '4', target: '5', type: 'button', data: { label: 'done' } },
];

let id = 10;
const getId = () => `dnd_${id++}`;

// ── Main Component ───────────────────────────────────────────

export default function ComprehensiveExample() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [dragType, setDragType] = useState(null);
  const wrapRef = useRef(null);

  const onConnect = useCallback(
    (connection) => setEdges((eds) => addEdge({ ...connection, type: 'smoothstep' }, eds)),
    [setEdges],
  );

  const onDragStart = (event, type) => {
    setDragType(type);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event) => {
    event.preventDefault();
    if (!dragType) return;

    const defaults = {
      card:    { subtitle: 'New', color: '#f8fafc', description: 'Custom card node' },
      circle:  { color: '#fef3c7' },
      status:  { status: 'info', description: 'New status' },
      default: {},
    };

    const newNode = {
      id: getId(),
      type: dragType,
      position: { x: event.nativeEvent.offsetX - 80, y: event.nativeEvent.offsetY - 30 },
      data: { label: `${dragType.charAt(0).toUpperCase() + dragType.slice(1)}`, ...defaults[dragType] },
    };

    setNodes((nds) => [...nds, newNode]);
    setDragType(null);
  }, [dragType, setNodes]);

  return (
    <InfiniteCanvas
      ref={wrapRef}
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onDragOver={onDragOver}
      onDrop={onDrop}
      fitView
      height="450px"
    >
      <Controls />
      <MiniMap />
      <Background variant="dots" />
      <Panel position="top-right">
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 6,
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
          padding: 10, fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}>
          <div style={{ fontWeight: 700, fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>
            Drag to canvas
          </div>
          {PALETTE.map((item) => (
            <div
              key={item.type}
              draggable
              onDragStart={(e) => onDragStart(e, item.type)}
              style={{
                padding: '5px 10px', border: `1px solid ${item.border}`,
                borderRadius: 5, cursor: 'grab', textAlign: 'center',
                background: item.color, fontSize: 12, fontWeight: 500,
              }}
            >
              {item.label}
            </div>
          ))}
        </div>
      </Panel>
    </InfiniteCanvas>
  );
}
