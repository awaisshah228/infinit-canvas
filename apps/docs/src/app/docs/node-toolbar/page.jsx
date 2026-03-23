import ExampleBlock from '../../../components/ExampleBlock';
import OnThisPage from '../../../components/OnThisPage';
import NodeToolbarExample from '../../../examples/NodeToolbarExample';

const tableOfContents = [
  { href: '#usage', label: 'Usage' },
  { href: '#positioning', label: 'Positioning' },
  { href: '#visibility', label: 'Visibility' },
  { href: '#props', label: 'Props' },
];

export default function NodeToolbarPage() {
  return (
    <>
      <div className="page-content">
        <h1>NodeToolbar</h1>
        <p>
          The NodeToolbar component renders a floating toolbar next to a node.
          By default, it auto-shows when the node is selected.
        </p>

        <ExampleBlock preview={<NodeToolbarExample />} files={[{ name: 'App.jsx', code: `import { Handle, NodeToolbar } from '@infinit-canvas/react';

function ToolbarNode({ data, selected }) {
  return (
    <div style={{ padding: 10, border: '1px solid #1a192b', borderRadius: 3 }}>
      <Handle type="target" position="left" />
      <div>{data.label}</div>
      <Handle type="source" position="right" />
      <NodeToolbar position="top">
        <button>Edit</button>
        <button>Delete</button>
      </NodeToolbar>
    </div>
  );
}` }]} />

        <h2 id="usage">Usage</h2>
        <p>Add NodeToolbar inside your custom node component:</p>
        <pre><code>{`import { Handle, NodeToolbar } from '@infinit-canvas/react';

function ToolbarNode({ data, selected }) {
  return (
    <div style={{ padding: 10, border: '1px solid #1a192b', borderRadius: 3 }}>
      <Handle type="target" position="left" />
      <div>{data.label}</div>
      <Handle type="source" position="right" />
      <NodeToolbar position="top">
        <button onClick={() => alert('Edit')}>Edit</button>
        <button onClick={() => alert('Delete')}>Delete</button>
      </NodeToolbar>
    </div>
  );
}`}</code></pre>

        <h2 id="positioning">Positioning</h2>
        <p>
          The toolbar can be placed on any side of the node with alignment control:
        </p>
        <pre><code>{`// Position: 'top', 'bottom', 'left', 'right'
// Align: 'start', 'center', 'end'

<NodeToolbar position="top" align="center" />    // Centered above
<NodeToolbar position="bottom" align="start" />  // Left-aligned below
<NodeToolbar position="right" align="end" />     // Bottom-aligned right

// Adjust spacing with offset (px)
<NodeToolbar position="top" offset={20} />`}</code></pre>

        <h2 id="visibility">Visibility</h2>
        <p>
          By default, the toolbar shows when the node is selected. Override with <code>isVisible</code>:
        </p>
        <pre><code>{`// Always visible
<NodeToolbar isVisible={true} />

// Controlled visibility
<NodeToolbar isVisible={isHovered || selected} />

// Default: auto-show on selection
<NodeToolbar />`}</code></pre>

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
              ['isVisible', 'boolean', 'undefined', 'Override visibility (default: auto on selection)'],
              ['position', 'string', "'top'", "Toolbar position: 'top', 'bottom', 'left', 'right'"],
              ['offset', 'number', '10', 'Distance from the node edge in pixels'],
              ['align', 'string', "'center'", "Alignment: 'start', 'center', 'end'"],
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
