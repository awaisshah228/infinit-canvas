import ExampleBlock from '../../../components/ExampleBlock';
import OnThisPage from '../../../components/OnThisPage';
import NodesExample from '../../../examples/NodesExample';

const APP_CODE = `import { useCallback } from 'react';
import {
  InfiniteCanvas, useNodesState, useEdgesState, addEdge,
  Controls, Background,
} from 'react-infinite-canvas';
import 'react-infinite-canvas/styles.css';

const initialNodes = [
  {
    id: '1',
    position: { x: 0, y: 0 },
    data: { label: 'Default Node' },
  },
  {
    id: '2',
    type: 'input',
    position: { x: 0, y: 150 },
    data: { label: 'Input Node' },
  },
  {
    id: '3',
    type: 'output',
    position: { x: 250, y: 75 },
    data: { label: 'Output Node' },
  },
];

const initialEdges = [
  { id: 'e1-3', source: '1', target: '3' },
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

const files = [{ name: 'App.jsx', code: APP_CODE }];

const tableOfContents = [
  { href: '#create-node-objects', label: 'Create node objects' },
  { href: '#node-properties', label: 'Node properties' },
  { href: '#built-in-types', label: 'Built-in types' },
  { href: '#add-nodes-to-flow', label: 'Add nodes to the flow' },
];

export default function NodesPage() {
  return (
    <>
      <div className="page-content">
        <h1>Adding Nodes</h1>
        <p>
          Nodes are the building blocks of your canvas. Learn how to create and configure them.
        </p>

        <h2 id="create-node-objects">Create node objects</h2>
        <p>
          A node is a plain JavaScript object with at minimum an <code>id</code>,
          a <code>position</code> (with <code>x</code> and <code>y</code>), and
          a <code>data</code> object containing at least a <code>label</code>.
        </p>

        <pre><code>{`const nodes = [
  {
    id: '1',
    position: { x: 0, y: 0 },
    data: { label: 'My Node' },
  },
];`}</code></pre>

        <h2 id="node-properties">Node properties</h2>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginBottom: 20 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Property</th>
              <th style={{ padding: '8px 12px' }}>Type</th>
              <th style={{ padding: '8px 12px' }}>Description</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['id', 'string', 'Unique identifier'],
              ['position', '{ x, y }', 'Position in world coordinates'],
              ['data', 'object', 'Data passed to the node component'],
              ['type', 'string', 'Node type (default, input, output, or custom)'],
              ['width', 'number', 'Fixed width override'],
              ['height', 'number', 'Fixed height override'],
            ].map(([prop, type, desc]) => (
              <tr key={prop} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 12px' }}><code>{prop}</code></td>
                <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{type}</td>
                <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 id="built-in-types">Built-in types</h2>
        <p>
          There are three built-in node types: <code>default</code>, <code>input</code>, and <code>output</code>.
          Input nodes have only source handles, output nodes have only target handles.
        </p>

        <h2 id="add-nodes-to-flow">Add nodes to the flow</h2>

        <ExampleBlock
          preview={<NodesExample />}
          files={files}
        />
      </div>
      <OnThisPage links={tableOfContents} />
    </>
  );
}
