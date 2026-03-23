import ExampleBlock from '../../../components/ExampleBlock';
import OnThisPage from '../../../components/OnThisPage';
import PanelExample from '../../../examples/PanelExample';

const tableOfContents = [
  { href: '#usage', label: 'Usage' },
  { href: '#positions', label: 'Positions' },
  { href: '#props', label: 'Props' },
];

export default function PanelPage() {
  return (
    <>
      <div className="page-content">
        <h1>Panel</h1>
        <p>
          The Panel component renders a positioned container on top of the canvas.
          Content inside a Panel stays fixed — it doesn't move with pan/zoom. Use it for
          toolbars, info panels, debug overlays, or any UI you want to float over the canvas.
        </p>

        <ExampleBlock preview={<PanelExample />} files={[{ name: 'App.jsx', code: `import { Panel } from '@infinit-canvas/react';

<InfiniteCanvas ...>
  <Panel position="top-right">
    <button onClick={addNode}>+ Add Node</button>
  </Panel>
</InfiniteCanvas>` }]} />

        <h2 id="usage">Usage</h2>
        <pre><code>{`import { Panel } from '@infinit-canvas/react';

<InfiniteCanvas ...>
  <Panel position="top-right">
    <button onClick={handleSave}>Save</button>
    <button onClick={handleExport}>Export</button>
  </Panel>

  <Panel position="bottom-center">
    <span>3 nodes selected</span>
  </Panel>
</InfiniteCanvas>`}</code></pre>

        <h2 id="positions">Positions</h2>
        <p>The Panel supports six positions:</p>
        <pre><code>{`'top-left'       'top-center'       'top-right'
'bottom-left'    'bottom-center'    'bottom-right'`}</code></pre>

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
              ['position', 'string', "'top-left'", 'Panel position on the canvas'],
              ['style', 'object', '{}', 'Custom CSS styles'],
              ['className', 'string', "''", 'Custom CSS class name'],
              ['children', 'ReactNode', '-', 'Panel content'],
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
