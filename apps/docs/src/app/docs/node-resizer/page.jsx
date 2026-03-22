import ExampleBlock from '../../../components/ExampleBlock';
import OnThisPage from '../../../components/OnThisPage';
import NodeResizerExample from '../../../examples/NodeResizerExample';

const tableOfContents = [
  { href: '#usage', label: 'Usage' },
  { href: '#resize-constraints', label: 'Resize constraints' },
  { href: '#callbacks', label: 'Callbacks' },
  { href: '#props', label: 'Props' },
];

export default function NodeResizerPage() {
  return (
    <>
      <div className="page-content">
        <h1>NodeResizer</h1>
        <p>
          The NodeResizer component adds drag-to-resize handles to custom nodes.
          Users can resize nodes by dragging the corner or edge handles.
        </p>

        <ExampleBlock preview={<NodeResizerExample />} files={[{ name: 'App.jsx', code: `import { Handle, NodeResizer } from 'react-infinite-canvas';

function ResizableNode({ data, selected }) {
  return (
    <div style={{ padding: 10, border: '1px solid #1a192b', borderRadius: 3, width: '100%', height: '100%' }}>
      <NodeResizer isVisible={selected} minWidth={80} minHeight={40} color="#3b82f6" />
      <Handle type="target" position="left" />
      <div>{data.label}</div>
      <Handle type="source" position="right" />
    </div>
  );
}` }]} />

        <h2 id="usage">Usage</h2>
        <p>Add NodeResizer inside your custom node component:</p>
        <pre><code>{`import { Handle, NodeResizer } from 'react-infinite-canvas';

function ResizableNode({ data, selected }) {
  return (
    <div style={{
      padding: 10,
      border: '1px solid #1a192b',
      borderRadius: 3,
      background: '#fff',
      position: 'relative',
      width: '100%',
      height: '100%',
    }}>
      <NodeResizer
        isVisible={selected}
        minWidth={100}
        minHeight={50}
        color="#3b82f6"
      />
      <Handle type="target" position="left" />
      <div>{data.label}</div>
      <Handle type="source" position="right" />
    </div>
  );
}`}</code></pre>

        <h2 id="resize-constraints">Resize constraints</h2>
        <p>Set minimum and maximum dimensions:</p>
        <pre><code>{`<NodeResizer
  minWidth={80}
  minHeight={40}
  maxWidth={400}
  maxHeight={300}
/>`}</code></pre>

        <h2 id="callbacks">Callbacks</h2>
        <p>Listen to resize events:</p>
        <pre><code>{`<NodeResizer
  onResizeStart={(event, { width, height }) => {
    console.log('Resize started', width, height);
  }}
  onResize={(event, { width, height }) => {
    console.log('Resizing', width, height);
  }}
  onResizeEnd={(event) => {
    console.log('Resize ended');
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
              ['isVisible', 'boolean', 'true', 'Show/hide resize handles'],
              ['minWidth', 'number', '10', 'Minimum node width'],
              ['minHeight', 'number', '10', 'Minimum node height'],
              ['maxWidth', 'number', 'Infinity', 'Maximum node width'],
              ['maxHeight', 'number', 'Infinity', 'Maximum node height'],
              ['color', 'string', "'#3b82f6'", 'Handle color'],
              ['handleStyle', 'object', '{}', 'Custom styles for resize handles'],
              ['lineStyle', 'object', '{}', 'Custom styles for resize lines'],
              ['onResizeStart', 'function', 'undefined', 'Called when resize starts'],
              ['onResize', 'function', 'undefined', 'Called during resize'],
              ['onResizeEnd', 'function', 'undefined', 'Called when resize ends'],
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
