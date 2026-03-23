import ExampleBlock from '../../../components/ExampleBlock';
import OnThisPage from '../../../components/OnThisPage';
import CustomNodesExample from '../../../examples/CustomNodesExample';

const APP_CODE = `import { useCallback } from 'react';
import {
  InfiniteCanvas, useNodesState, useEdgesState, addEdge,
  Controls, Background, Handle, NodeToolbar,
} from '@infinit-canvas/react';
import '@infinit-canvas/react/styles.css';

function ColorNode({ data, selected }) {
  return (
    <div style={{
      background: data.color || '#f0f9ff',
      border: selected ? '2px solid #3b82f6' : '1px solid #ddd',
      borderRadius: 8,
      padding: '10px 16px',
      minWidth: 140,
      position: 'relative',
    }}>
      <Handle type="target" position="left" />
      <div style={{ fontWeight: 600, fontSize: 13 }}>{data.label}</div>
      {data.description && (
        <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
          {data.description}
        </div>
      )}
      <NodeToolbar position="top">
        <div style={{
          background: '#fff', border: '1px solid #ddd',
          borderRadius: 4, padding: '2px 8px', fontSize: 11,
        }}>
          Edit
        </div>
      </NodeToolbar>
      <Handle type="source" position="right" />
    </div>
  );
}

const nodeTypes = { color: ColorNode };

const initialNodes = [
  { id: '1', type: 'color', position: { x: 50, y: 50 },
    data: { label: 'Input', color: '#dbeafe', description: 'Custom node' } },
  { id: '2', type: 'color', position: { x: 350, y: 30 },
    data: { label: 'Process', color: '#dcfce7' } },
  { id: '3', position: { x: 350, y: 180 },
    data: { label: 'Output' } },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2' },
  { id: 'e2-3', source: '2', target: '3' },
];

export default function App() {
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
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      height="350px"
    >
      <Controls />
      <Background variant="dots" />
    </InfiniteCanvas>
  );
}`;

const COLOR_NODE_CODE = `function ColorNode({ data, selected }) {
  return (
    <div style={{
      background: data.color || '#f0f9ff',
      border: selected ? '2px solid #3b82f6' : '1px solid #ddd',
      borderRadius: 8,
      padding: '10px 16px',
      minWidth: 140,
      position: 'relative',
    }}>
      <Handle type="target" position="left" />
      <div style={{ fontWeight: 600, fontSize: 13 }}>{data.label}</div>
      {data.description && (
        <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
          {data.description}
        </div>
      )}
      <NodeToolbar position="top">
        <div style={{
          background: '#fff', border: '1px solid #ddd',
          borderRadius: 4, padding: '2px 8px', fontSize: 11,
        }}>
          Edit
        </div>
      </NodeToolbar>
      <Handle type="source" position="right" />
    </div>
  );
}`;

const files = [
  { name: 'App.jsx', code: APP_CODE },
  { name: 'ColorNode.jsx', code: COLOR_NODE_CODE },
];

const tableOfContents = [
  { href: '#creating-custom-nodes', label: 'Creating custom nodes' },
  { href: '#node-props', label: 'Node props' },
  { href: '#registering-node-types', label: 'Registering node types' },
];

export default function CustomNodesPage() {
  return (
    <>
      <div className="page-content">
        <h1>Custom Nodes</h1>
        <p>
          Create fully custom node components with React. Custom nodes can render
          any React component including forms, charts, images, and more.
        </p>

        <h2 id="creating-custom-nodes">Creating custom nodes</h2>
        <p>
          A custom node is a React component that receives <code>data</code>, <code>selected</code>,
          and other props. Use <code>Handle</code> components to define connection points.
        </p>

        <ExampleBlock
          preview={<CustomNodesExample />}
          files={files}
        />

        <h2 id="node-props">Node props</h2>
        <p>
          Custom node components receive these props:
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginBottom: 20 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Prop</th>
              <th style={{ padding: '8px 12px' }}>Type</th>
              <th style={{ padding: '8px 12px' }}>Description</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['data', 'object', 'The data object from the node definition'],
              ['selected', 'boolean', 'Whether this node is currently selected'],
              ['width', 'number', 'Current width of the node'],
              ['height', 'number', 'Current height of the node'],
              ['id', 'string', 'The node ID'],
            ].map(([prop, type, desc]) => (
              <tr key={prop} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 12px' }}><code>{prop}</code></td>
                <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{type}</td>
                <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 id="registering-node-types">Registering node types</h2>
        <p>
          Pass a <code>nodeTypes</code> object to <code>InfiniteCanvas</code> mapping type strings to
          your custom components:
        </p>
        <pre><code>{`const nodeTypes = { color: ColorNode };

<InfiniteCanvas
  nodeTypes={nodeTypes}
  ...
/>`}</code></pre>
      </div>
      <OnThisPage links={tableOfContents} />
    </>
  );
}
