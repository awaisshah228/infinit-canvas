import ExampleBlock from '../../../components/ExampleBlock';
import OnThisPage from '../../../components/OnThisPage';
import HandlesExample from '../../../examples/HandlesExample';

const tableOfContents = [
  { href: '#what-are-handles', label: 'What are handles?' },
  { href: '#handle-types', label: 'Handle types' },
  { href: '#handle-positions', label: 'Handle positions' },
  { href: '#multiple-handles', label: 'Multiple handles' },
  { href: '#handle-props', label: 'Handle props' },
  { href: '#hiding-handles', label: 'Hiding handles' },
  { href: '#custom-handle-styles', label: 'Custom handle styles' },
];

export default function HandlesPage() {
  return (
    <>
      <div className="page-content">
        <h1>Handles</h1>
        <p>
          Handles are the connection points on nodes. They define where edges can attach
          and are the starting point for creating new connections.
        </p>

        <ExampleBlock preview={<HandlesExample />} files={[{ name: 'App.jsx', code: `import { Handle } from 'react-infinite-canvas';

function MultiHandleNode({ data }) {
  return (
    <div style={{ padding: 10, border: '1px solid #1a192b', borderRadius: 3 }}>
      <Handle type="target" position="left" id="input-a" style={{ top: '30%' }} />
      <Handle type="target" position="left" id="input-b" style={{ top: '70%' }} />
      <div>{data.label}</div>
      <Handle type="source" position="right" id="output" />
    </div>
  );
}` }]} />

        <h2 id="what-are-handles">What are handles?</h2>
        <p>
          Every node has handles — small circles on its edges where connections can be made.
          The built-in node types come with pre-configured handles:
        </p>
        <ul>
          <li><strong>Default node</strong> — has a target handle (left) and source handle (right)</li>
          <li><strong>Input node</strong> — has only a source handle (right)</li>
          <li><strong>Output node</strong> — has only a target handle (left)</li>
        </ul>

        <h2 id="handle-types">Handle types</h2>
        <p>
          There are two handle types:
        </p>
        <ul>
          <li><code>source</code> — where edges start (output)</li>
          <li><code>target</code> — where edges end (input)</li>
        </ul>
        <pre><code>{`import { Handle } from 'react-infinite-canvas';

<Handle type="source" position="right" />
<Handle type="target" position="left" />`}</code></pre>

        <h2 id="handle-positions">Handle positions</h2>
        <p>
          Handles can be placed at four positions on a node:
        </p>
        <pre><code>{`<Handle type="source" position="top" />
<Handle type="source" position="bottom" />
<Handle type="source" position="left" />
<Handle type="source" position="right" />`}</code></pre>

        <h2 id="multiple-handles">Multiple handles</h2>
        <p>
          A node can have multiple handles. Use the <code>id</code> prop to distinguish them.
          Edge definitions can reference specific handles with <code>sourceHandle</code> and <code>targetHandle</code>.
        </p>
        <pre><code>{`function MultiHandleNode({ data }) {
  return (
    <div style={{ padding: 10, border: '1px solid #1a192b', borderRadius: 3 }}>
      <Handle type="target" position="left" id="input-a" style={{ top: '30%' }} />
      <Handle type="target" position="left" id="input-b" style={{ top: '70%' }} />
      <div>{data.label}</div>
      <Handle type="source" position="right" id="output" />
    </div>
  );
}

// Connect to a specific handle
const edges = [
  { id: 'e1', source: '1', target: '2', targetHandle: 'input-a' },
  { id: 'e2', source: '3', target: '2', targetHandle: 'input-b' },
];`}</code></pre>

        <h2 id="handle-props">Handle props</h2>
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
              ['type', 'string', "'source'", "Handle type: 'source' or 'target'"],
              ['position', 'string', "auto", "Position: 'top', 'bottom', 'left', 'right'"],
              ['id', 'string', 'undefined', 'Unique ID for multiple handles on one node'],
              ['isConnectable', 'boolean', 'true', 'Whether connections can be made from/to this handle'],
              ['isConnectableStart', 'boolean', 'true', 'Whether connections can start from this handle'],
              ['isConnectableEnd', 'boolean', 'true', 'Whether connections can end at this handle'],
              ['style', 'object', '{}', 'Custom CSS styles'],
              ['className', 'string', "''", 'Custom CSS class name'],
              ['onConnect', 'function', 'undefined', 'Callback when a connection is made to this handle'],
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

        <h2 id="hiding-handles">Hiding handles</h2>
        <p>
          Built-in node types support hiding handles via props:
        </p>
        <pre><code>{`// In your node data or when using built-in components directly:
<DefaultNode hideSourceHandle={true} hideTargetHandle={false} ... />
<InputNode hideSourceHandle={true} ... />
<OutputNode hideTargetHandle={true} ... />`}</code></pre>
        <p>
          For custom nodes, simply don't render the <code>Handle</code> component.
        </p>

        <h2 id="custom-handle-styles">Custom handle styles</h2>
        <p>
          Override handle appearance with the <code>style</code> and <code>className</code> props:
        </p>
        <pre><code>{`<Handle
  type="source"
  position="right"
  style={{
    width: 12,
    height: 12,
    background: '#ff0072',
    border: '2px solid #fff',
  }}
/>`}</code></pre>
      </div>
      <OnThisPage links={tableOfContents} />
    </>
  );
}
