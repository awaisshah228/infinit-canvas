import OnThisPage from '../../../components/OnThisPage';

const tableOfContents = [
  { href: '#change-helpers', label: 'Change helpers' },
  { href: '#graph-utilities', label: 'Graph utilities' },
  { href: '#path-generators', label: 'Path generators' },
  { href: '#edge-routing', label: 'Edge routing' },
  { href: '#geometry-helpers', label: 'Geometry helpers' },
];

export default function UtilitiesPage() {
  return (
    <>
      <div className="page-content">
        <h1>Utilities</h1>
        <p>
          Infinite Canvas exports a rich set of utility functions for working with nodes,
          edges, paths, and geometry.
        </p>

        <h2 id="change-helpers">Change helpers</h2>
        <pre><code>{`import { applyNodeChanges, applyEdgeChanges, addEdge } from 'react-infinite-canvas';`}</code></pre>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginBottom: 20 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Function</th>
              <th style={{ padding: '8px 12px' }}>Description</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['applyNodeChanges(changes, nodes)', 'Apply incremental changes to a nodes array. Returns a new array.'],
              ['applyEdgeChanges(changes, edges)', 'Apply incremental changes to an edges array. Returns a new array.'],
              ['addEdge(connection, edges)', 'Add a new edge from a connection object. Prevents duplicates.'],
            ].map(([fn, desc]) => (
              <tr key={fn} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 12px' }}><code>{fn}</code></td>
                <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <pre><code>{`// Manual change application (alternative to useNodesState/useEdgesState)
const onNodesChange = useCallback((changes) => {
  setNodes((nds) => applyNodeChanges(changes, nds));
}, []);`}</code></pre>

        <h2 id="graph-utilities">Graph utilities</h2>
        <pre><code>{`import {
  isNode, isEdge,
  getConnectedEdges, getIncomers, getOutgoers,
  getNodesBounds, getViewportForBounds,
  getNodeDimensions, getNodesInside,
} from 'react-infinite-canvas';`}</code></pre>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginBottom: 20 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Function</th>
              <th style={{ padding: '8px 12px' }}>Description</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['isNode(element)', 'Type guard: does this object have a position? Returns boolean.'],
              ['isEdge(element)', 'Type guard: does this object have source/target? Returns boolean.'],
              ['getConnectedEdges(nodes, edges)', 'Get all edges touching a set of nodes.'],
              ['getIncomers(node, nodes, edges)', 'Get nodes with edges pointing TO a node.'],
              ['getOutgoers(node, nodes, edges)', 'Get nodes with edges pointing FROM a node.'],
              ['getNodesBounds(nodes)', 'Compute bounding box { x, y, width, height } of nodes.'],
              ['getViewportForBounds(bounds, w, h, padding)', 'Compute viewport { x, y, zoom } to fit a bounding box.'],
              ['getNodeDimensions(node)', 'Get { width, height } with fallbacks.'],
              ['getNodesInside(nodes, rect)', 'Filter nodes inside a rectangle.'],
              ['snapPosition(pos, grid)', 'Snap { x, y } to a grid [gridX, gridY].'],
              ['clampPosition(pos, extent)', 'Clamp { x, y } to an extent [[minX, minY], [maxX, maxY]].'],
            ].map(([fn, desc]) => (
              <tr key={fn} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 12px' }}><code>{fn}</code></td>
                <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <pre><code>{`// Example: Get all downstream nodes
const outgoers = getOutgoers(selectedNode, nodes, edges);

// Example: Compute bounds for export
const bounds = getNodesBounds(nodes);
console.log(bounds); // { x, y, width, height }`}</code></pre>

        <h2 id="path-generators">Path generators</h2>
        <p>
          Generate SVG path strings for edge rendering. Each returns <code>[pathString, labelX, labelY]</code>.
        </p>
        <pre><code>{`import {
  getBezierPath,
  getSimpleBezierPath,
  getSmoothStepPath,
  getStraightPath,
  getBezierEdgeCenter,
  getEdgeCenter,
  reconnectEdge,
} from 'react-infinite-canvas';`}</code></pre>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginBottom: 20 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Function</th>
              <th style={{ padding: '8px 12px' }}>Description</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['getBezierPath(params)', 'Smooth bezier curve path'],
              ['getSimpleBezierPath(params)', 'Simplified bezier with less curvature'],
              ['getSmoothStepPath(params)', 'Rounded right-angle path'],
              ['getStraightPath(params)', 'Straight line'],
              ['getBezierEdgeCenter(params)', 'Center point of a bezier edge'],
              ['getEdgeCenter(params)', 'Center point of any edge'],
              ['reconnectEdge(oldEdge, newConnection, edges)', 'Move edge source/target to a new node'],
            ].map(([fn, desc]) => (
              <tr key={fn} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 12px' }}><code>{fn}</code></td>
                <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <pre><code>{`// Path generator parameters
const [path, labelX, labelY] = getBezierPath({
  sourceX: 0,
  sourceY: 0,
  sourcePosition: 'right',
  targetX: 200,
  targetY: 100,
  targetPosition: 'left',
  curvature: 0.25,       // bezier only
});`}</code></pre>

        <h2 id="edge-routing">Edge routing</h2>
        <p>
          Infinite Canvas includes built-in edge routing that avoids node obstacles.
          These utilities are used internally but can also be called directly.
        </p>
        <pre><code>{`import {
  computeRoutedEdges,
  routeSinglePath,
  routedPointsToPath,
  getRoutedLabelPosition,
  buildObstacles,
} from 'react-infinite-canvas';`}</code></pre>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginBottom: 20 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Function</th>
              <th style={{ padding: '8px 12px' }}>Description</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['computeRoutedEdges(nodes, edges)', 'Compute routed paths for all edges avoiding obstacles'],
              ['routeSinglePath(from, to, obstacles)', 'Route a single path between two points'],
              ['routedPointsToPath(points)', 'Convert waypoints to an SVG path string'],
              ['getRoutedLabelPosition(points)', 'Get label position along a routed path'],
              ['buildObstacles(nodes)', 'Build obstacle rectangles from nodes'],
            ].map(([fn, desc]) => (
              <tr key={fn} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 12px' }}><code>{fn}</code></td>
                <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p>Enable/disable edge routing on the canvas:</p>
        <pre><code>{`<InfiniteCanvas
  edgeRouting={true}    // Enable obstacle-avoiding routes (default: true)
  ...
/>`}</code></pre>

        <h2 id="geometry-helpers">Geometry helpers</h2>
        <pre><code>{`import {
  rectToBox, boxToRect,
  getBoundsOfBoxes, getOverlappingArea,
  nodeToRect,
} from 'react-infinite-canvas';`}</code></pre>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginBottom: 20 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Function</th>
              <th style={{ padding: '8px 12px' }}>Description</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['rectToBox(rect)', 'Convert { x, y, width, height } to { x, y, x2, y2 }'],
              ['boxToRect(box)', 'Convert { x, y, x2, y2 } to { x, y, width, height }'],
              ['getBoundsOfBoxes(box1, box2)', 'Merge two bounding boxes'],
              ['getOverlappingArea(rect1, rect2)', 'Overlap area of two rectangles'],
              ['nodeToRect(node)', 'Convert a node to a rectangle'],
            ].map(([fn, desc]) => (
              <tr key={fn} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 12px' }}><code>{fn}</code></td>
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
