import ExampleBlock from '../../../components/ExampleBlock';
import OnThisPage from '../../../components/OnThisPage';
import CustomEdgesExample from '../../../examples/CustomEdgesExample';

const tableOfContents = [
  { href: '#built-in-edge-types', label: 'Built-in edge types' },
  { href: '#creating-custom-edges', label: 'Creating custom edges' },
  { href: '#edge-props', label: 'Edge props' },
  { href: '#path-utilities', label: 'Path utilities' },
  { href: '#registering-edge-types', label: 'Registering edge types' },
];

export default function CustomEdgesPage() {
  return (
    <>
      <div className="page-content">
        <h1>Custom Edges</h1>
        <p>
          You can create fully custom edge components with React SVG. Custom edges
          receive source and target positions and render any SVG path or shape.
        </p>

        <ExampleBlock preview={<CustomEdgesExample />} files={[{ name: 'App.jsx', code: `import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@infinit-canvas/react';

function ButtonEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition }) {
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  return (
    <>
      <BaseEdge path={edgePath} />
      <EdgeLabelRenderer>
        <div style={{ position: 'absolute', transform: \`translate(-50%, -50%) translate(\${labelX}px, \${labelY}px)\`, pointerEvents: 'all' }}>
          <button>x</button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

const edgeTypes = { button: ButtonEdge };` }]} />

        <h2 id="built-in-edge-types">Built-in edge types</h2>
        <p>
          Infinite Canvas ships with several edge types:
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginBottom: 20 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Type</th>
              <th style={{ padding: '8px 12px' }}>Component</th>
              <th style={{ padding: '8px 12px' }}>Description</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['default', 'BezierEdge', 'Smooth bezier curve (default)'],
              ['straight', 'StraightEdge', 'Straight line'],
              ['smoothstep', 'SmoothStepEdge', 'Rounded right-angle path'],
              ['step', 'StepEdge', 'Sharp right-angle path'],
              ['simplebezier', 'SimpleBezierEdge', 'Simplified bezier with less curvature'],
            ].map(([type, comp, desc]) => (
              <tr key={type} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 12px' }}><code>{type}</code></td>
                <td style={{ padding: '8px 12px' }}><code>{comp}</code></td>
                <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 id="creating-custom-edges">Creating custom edges</h2>
        <p>
          A custom edge is a React component that renders an SVG <code>&lt;path&gt;</code>.
          Use the <code>BaseEdge</code> component and path utilities to simplify creation.
        </p>
        <pre><code>{`import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@infinit-canvas/react';

function CustomEdge({
  id,
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  style = {},
  markerEnd,
  label,
}) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
  });

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: \`translate(-50%, -50%) translate(\${labelX}px, \${labelY}px)\`,
              background: '#fff',
              padding: '2px 6px',
              borderRadius: 4,
              fontSize: 11,
              border: '1px solid #ddd',
              pointerEvents: 'all',
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}`}</code></pre>

        <h2 id="edge-props">Edge props</h2>
        <p>Custom edge components receive these props:</p>
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
              ['id', 'string', 'Edge ID'],
              ['source', 'string', 'Source node ID'],
              ['target', 'string', 'Target node ID'],
              ['sourceX', 'number', 'Source handle X position'],
              ['sourceY', 'number', 'Source handle Y position'],
              ['targetX', 'number', 'Target handle X position'],
              ['targetY', 'number', 'Target handle Y position'],
              ['sourcePosition', 'string', 'Source handle position (top/bottom/left/right)'],
              ['targetPosition', 'string', 'Target handle position (top/bottom/left/right)'],
              ['selected', 'boolean', 'Whether the edge is selected'],
              ['animated', 'boolean', 'Whether the edge is animated'],
              ['label', 'string', 'Edge label text'],
              ['style', 'object', 'CSS styles for the edge path'],
              ['data', 'object', 'Custom data from the edge definition'],
              ['markerEnd', 'string', 'SVG marker at the end of the edge'],
            ].map(([prop, type, desc]) => (
              <tr key={prop} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 12px' }}><code>{prop}</code></td>
                <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{type}</td>
                <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 id="path-utilities">Path utilities</h2>
        <p>
          Use these functions to generate SVG path strings. Each returns <code>[path, labelX, labelY]</code>:
        </p>
        <pre><code>{`import {
  getBezierPath,
  getSimpleBezierPath,
  getSmoothStepPath,
  getStraightPath,
} from '@infinit-canvas/react';

const [path, labelX, labelY] = getBezierPath({
  sourceX, sourceY,
  targetX, targetY,
  sourcePosition: 'right',
  targetPosition: 'left',
  curvature: 0.25,  // bezier only
});`}</code></pre>

        <h2 id="registering-edge-types">Registering edge types</h2>
        <p>
          Pass a <code>edgeTypes</code> object to <code>InfiniteCanvas</code>:
        </p>
        <pre><code>{`const edgeTypes = { custom: CustomEdge };

<InfiniteCanvas edgeTypes={edgeTypes} ... />

// Use in edge definitions:
const edges = [
  { id: 'e1', source: '1', target: '2', type: 'custom', label: 'Hello' },
];`}</code></pre>
      </div>
      <OnThisPage links={tableOfContents} />
    </>
  );
}
