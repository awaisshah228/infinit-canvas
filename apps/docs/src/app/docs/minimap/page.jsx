import ExampleBlock from '../../../components/ExampleBlock';
import OnThisPage from '../../../components/OnThisPage';
import ControlsExample from '../../../examples/ControlsExample';

const APP_CODE = `import {
  InfiniteCanvas, useNodesState, useEdgesState,
  Controls, MiniMap, Background,
} from '@infinit-canvas/react';
import '@infinit-canvas/react/styles.css';

const initialNodes = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'Node 1' } },
  { id: '2', position: { x: 200, y: 100 }, data: { label: 'Node 2' } },
  { id: '3', position: { x: 400, y: 50 }, data: { label: 'Node 3' } },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2' },
  { id: 'e2-3', source: '2', target: '3' },
];

export default function App() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <InfiniteCanvas
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      height="350px"
    >
      <Controls />
      <MiniMap />
      <Background variant="dots" />
    </InfiniteCanvas>
  );
}`;

const files = [{ name: 'App.jsx', code: APP_CODE }];

const tableOfContents = [
  { href: '#usage', label: 'Usage' },
  { href: '#custom-node-colors', label: 'Custom node colors' },
  { href: '#props', label: 'Props' },
];

export default function MiniMapPage() {
  return (
    <>
      <div className="page-content">
        <h1>MiniMap</h1>
        <p>
          The MiniMap renders a small overview of the entire canvas in the corner. It shows
          all node positions and highlights the current viewport area.
        </p>

        <h2 id="usage">Usage</h2>
        <p>Add the MiniMap as a child of InfiniteCanvas:</p>

        <ExampleBlock preview={<ControlsExample />} files={files} />

        <pre><code>{`import { MiniMap } from '@infinit-canvas/react';

<InfiniteCanvas ...>
  <MiniMap />
</InfiniteCanvas>`}</code></pre>

        <h2 id="custom-node-colors">Custom node colors</h2>
        <p>
          Use a function for <code>nodeColor</code> to color nodes based on their data:
        </p>
        <pre><code>{`<MiniMap
  nodeColor={(node) => {
    switch (node.type) {
      case 'input': return '#0041d0';
      case 'output': return '#ff0072';
      default: return '#1a192b';
    }
  }}
/>`}</code></pre>

        <h2 id="props">Props</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginBottom: 20 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Prop</th>
              <th style={{ padding: '8px 12px' }}>Type</th>
              <th style={{ padding: '8px 12px' }}>Default</th>
              <th style={{ padding: '8px 12px' }}>Description</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['width', 'number', '200', 'Width of the minimap in pixels'],
              ['height', 'number', '150', 'Height of the minimap in pixels'],
              ['nodeColor', 'string | function', "'#3b82f6'", 'Node color or (node) => color function'],
              ['nodeStrokeColor', 'string', "'#fff'", 'Stroke color around nodes'],
              ['maskColor', 'string', "'rgba(0,0,0,0.1)'", 'Overlay color outside the viewport'],
              ['style', 'object', '{}', 'Custom CSS styles'],
              ['className', 'string', "''", 'Custom CSS class name'],
            ].map(([prop, type, def, desc]) => (
              <tr key={prop} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 12px' }}><code>{prop}</code></td>
                <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{type}</td>
                <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{def}</td>
                <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <OnThisPage links={tableOfContents} />
    </>
  );
}
