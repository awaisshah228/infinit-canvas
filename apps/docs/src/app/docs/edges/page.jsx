import ExampleBlock from '../../../components/ExampleBlock';
import OnThisPage from '../../../components/OnThisPage';
import EdgesExample from '../../../examples/EdgesExample';

const APP_CODE = `import { useCallback } from 'react';
import {
  InfiniteCanvas, useNodesState, useEdgesState, addEdge,
  Controls, Background,
} from '@infinit-canvas/react';
import '@infinit-canvas/react/styles.css';

const initialNodes = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'Node A' } },
  { id: '2', position: { x: 250, y: 0 }, data: { label: 'Node B' } },
  { id: '3', position: { x: 0, y: 150 }, data: { label: 'Node C' } },
  { id: '4', position: { x: 250, y: 150 }, data: { label: 'Node D' } },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', label: 'default' },
  { id: 'e3-4', source: '3', target: '4', type: 'smoothstep', label: 'smoothstep' },
  { id: 'e1-3', source: '1', target: '3', animated: true, label: 'animated' },
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
  { href: '#create-an-edge', label: 'Create an edge' },
  { href: '#edge-properties', label: 'Edge properties' },
  { href: '#edge-types', label: 'Edge types' },
];

export default function EdgesPage() {
  return (
    <>
      <div className="page-content">
        <h1>Adding Edges</h1>
        <p>
          Edges are the connections between nodes. This page covers how to create and configure different edge types.
        </p>

        <h2 id="create-an-edge">Create an edge</h2>
        <p>
          An edge connects the node with <code>id: &apos;n1&apos;</code> (the source) to the node
          with <code>id: &apos;n2&apos;</code> (the target).
        </p>
        <pre><code>{`const edges = [
  { id: 'e1-2', source: '1', target: '2' },
];`}</code></pre>

        <ExampleBlock
          preview={<EdgesExample />}
          files={files}
        />

        <h2 id="edge-properties">Edge properties</h2>
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
              ['source', 'string', 'Source node ID'],
              ['target', 'string', 'Target node ID'],
              ['type', 'string', 'Edge type (default, smoothstep, or custom)'],
              ['animated', 'boolean', 'Animate the edge with a dashed stroke'],
              ['label', 'string', 'Text label displayed on the edge'],
            ].map(([prop, type, desc]) => (
              <tr key={prop} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 12px' }}><code>{prop}</code></td>
                <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{type}</td>
                <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 id="edge-types">Edge types</h2>
        <p>
          Built-in edge types include <code>default</code> (bezier curve) and <code>smoothstep</code> (right-angle path).
          You can also pass <code>animated: true</code> to animate any edge type.
        </p>
      </div>
      <OnThisPage links={tableOfContents} />
    </>
  );
}
