'use client';
import { useCallback, createContext, useContext } from 'react';
import {
  InfiniteCanvas, useNodesState, useEdgesState, addEdge,
  Controls, Background, Handle, NodeToolbar,
} from '@infinit-canvas/react';
import '@infinit-canvas/react/styles.css';

const ToolbarActionsContext = createContext({});

function ToolbarNode({ id, data, selected }) {
  const { onEdit, onDelete } = useContext(ToolbarActionsContext);
  return (
    <div style={{
      padding: 10,
      border: '1px solid #1a192b',
      borderRadius: 3,
      background: '#fff',
      minWidth: 120,
      fontSize: 12,
      position: 'relative',
    }}>
      <Handle type="target" position="left" />
      <div>{data.label}</div>
      <Handle type="source" position="right" />
      <NodeToolbar position="top" offset={8}>
        <div style={{
          display: 'flex', gap: 4,
          background: '#fff', border: '1px solid #ddd',
          borderRadius: 4, padding: '3px 6px', fontSize: 11,
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
        }}>
          <button
            style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 11 }}
            onClick={() => onEdit?.(id)}
          >Edit</button>
          <button
            style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 11, color: '#ef4444' }}
            onClick={() => onDelete?.(id)}
          >Delete</button>
        </div>
      </NodeToolbar>
    </div>
  );
}

const nodeTypes = { toolbar: ToolbarNode };

const initialNodes = [
  { id: '1', type: 'toolbar', position: { x: 0, y: 50 }, data: { label: 'Select me!' } },
  { id: '2', type: 'toolbar', position: { x: 250, y: 0 }, data: { label: 'Or me!' } },
  { id: '3', type: 'toolbar', position: { x: 250, y: 120 }, data: { label: 'Or me!' } },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2' },
  { id: 'e1-3', source: '1', target: '3' },
];

export default function NodeToolbarExample() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

  const onEdit = useCallback((id) => {
    const label = prompt('New label:');
    if (label) setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, label } } : n));
  }, [setNodes]);

  const onDelete = useCallback((id) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  }, [setNodes, setEdges]);

  return (
    <ToolbarActionsContext.Provider value={{ onEdit, onDelete }}>
      <InfiniteCanvas
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        height="350px"
      >
        <Controls />
        <Background variant="dots" />
      </InfiniteCanvas>
    </ToolbarActionsContext.Provider>
  );
}
