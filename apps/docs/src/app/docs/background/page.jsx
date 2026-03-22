import ExampleBlock from '../../../components/ExampleBlock';
import OnThisPage from '../../../components/OnThisPage';
import BackgroundExample from '../../../examples/BackgroundExample';

const APP_CODE = `import {
  InfiniteCanvas, useNodesState, useEdgesState,
  Controls, Background,
} from 'react-infinite-canvas';
import 'react-infinite-canvas/styles.css';

const initialNodes = [
  { id: '1', position: { x: 50, y: 50 }, data: { label: 'Drag me around' } },
  { id: '2', position: { x: 300, y: 100 }, data: { label: 'Check the background' } },
];

const initialEdges = [{ id: 'e1-2', source: '1', target: '2' }];

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
      <Background variant="dots" gap={20} />
    </InfiniteCanvas>
  );
}`;

const files = [{ name: 'App.jsx', code: APP_CODE }];

const tableOfContents = [
  { href: '#background-component', label: 'Background component' },
  { href: '#variants', label: 'Variants' },
  { href: '#props', label: 'Props' },
];

export default function BackgroundPage() {
  return (
    <>
      <div className="page-content">
        <h1>Background</h1>
        <p>
          Add a visual background pattern to the canvas that moves with pan and zoom.
        </p>

        <h2 id="background-component">Background component</h2>
        <p>
          The <code>Background</code> component renders a repeating pattern behind
          all nodes and edges. It automatically adapts to the current zoom level.
        </p>

        <ExampleBlock
          preview={<BackgroundExample />}
          files={files}
        />

        <h2 id="variants">Variants</h2>
        <p>
          Use the <code>variant</code> prop to choose between <code>dots</code>, <code>lines</code>,
          and <code>cross</code> patterns.
        </p>
        <pre><code>{`<Background variant="dots" />
<Background variant="lines" />
<Background variant="cross" />`}</code></pre>

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
              ['variant', 'string', '"dots"', 'Pattern type: dots, lines, or cross'],
              ['gap', 'number', '20', 'Spacing between pattern elements'],
              ['size', 'number', '1', 'Size of pattern elements'],
              ['color', 'string', '"#ddd"', 'Color of the pattern'],
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
