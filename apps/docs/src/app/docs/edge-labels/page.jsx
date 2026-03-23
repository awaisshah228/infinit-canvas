import ExampleBlock from '../../../components/ExampleBlock';
import OnThisPage from '../../../components/OnThisPage';
import EdgeLabelsExample from '../../../examples/EdgeLabelsExample';

const tableOfContents = [
  { href: '#simple-labels', label: 'Simple labels' },
  { href: '#edge-label-renderer', label: 'EdgeLabelRenderer' },
  { href: '#interactive-labels', label: 'Interactive labels' },
  { href: '#edge-toolbar', label: 'EdgeToolbar' },
];

export default function EdgeLabelsPage() {
  return (
    <>
      <div className="page-content">
        <h1>Edge Labels</h1>
        <p>
          Add text labels or interactive React components to your edges.
        </p>

        <ExampleBlock preview={<EdgeLabelsExample />} files={[{ name: 'App.jsx', code: `const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', label: 'validates' },
  { id: 'e2-3', source: '2', target: '3', label: 'transforms', animated: true },
];` }]} />

        <h2 id="simple-labels">Simple labels</h2>
        <p>
          The simplest way to add a label is the <code>label</code> property on an edge:
        </p>
        <pre><code>{`const edges = [
  { id: 'e1', source: '1', target: '2', label: 'connects to' },
];`}</code></pre>
        <p>
          This renders a text label at the midpoint of the edge. For canvas-rendered
          edges, the label is drawn on the canvas. For custom edges, you control the rendering.
        </p>

        <h2 id="edge-label-renderer">EdgeLabelRenderer</h2>
        <p>
          For custom edges, use the <code>EdgeLabelRenderer</code> component to render
          React content as edge labels. This portals your content into a special layer
          that moves with the viewport.
        </p>
        <pre><code>{`import { EdgeLabelRenderer, getBezierPath } from '@infinit-canvas/react';

function LabeledEdge({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, label }) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
  });

  return (
    <>
      <path d={edgePath} stroke="#b1b1b7" strokeWidth={1} fill="none" />
      <EdgeLabelRenderer>
        <div style={{
          position: 'absolute',
          transform: \`translate(-50%, -50%) translate(\${labelX}px, \${labelY}px)\`,
          background: '#fff',
          padding: '4px 8px',
          borderRadius: 4,
          fontSize: 12,
          border: '1px solid #ddd',
        }}>
          {label}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}`}</code></pre>

        <h2 id="interactive-labels">Interactive labels</h2>
        <p>
          Edge labels rendered via <code>EdgeLabelRenderer</code> are full React components.
          Add <code>pointerEvents: 'all'</code> to make them interactive:
        </p>
        <pre><code>{`<EdgeLabelRenderer>
  <div style={{
    position: 'absolute',
    transform: \`translate(-50%, -50%) translate(\${labelX}px, \${labelY}px)\`,
    pointerEvents: 'all',
  }}>
    <button onClick={() => onEdgeDelete(id)}>
      x Delete
    </button>
  </div>
</EdgeLabelRenderer>`}</code></pre>

        <h2 id="edge-toolbar">EdgeToolbar</h2>
        <p>
          The <code>EdgeToolbar</code> component positions a floating toolbar at a specific
          point along an edge:
        </p>
        <pre><code>{`import { EdgeToolbar } from '@infinit-canvas/react';

<EdgeToolbar
  isVisible={selected}
  x={labelX}
  y={labelY}
  alignX="center"     // 'left', 'center', 'right'
  alignY="center"     // 'top', 'center', 'bottom'
>
  <button>Edit</button>
  <button>Delete</button>
</EdgeToolbar>`}</code></pre>

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
              ['isVisible', 'boolean', 'false', 'Show/hide the toolbar'],
              ['x', 'number', '0', 'X position in world coordinates'],
              ['y', 'number', '0', 'Y position in world coordinates'],
              ['alignX', 'string', "'center'", "Horizontal alignment: 'left', 'center', 'right'"],
              ['alignY', 'string', "'center'", "Vertical alignment: 'top', 'center', 'bottom'"],
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
