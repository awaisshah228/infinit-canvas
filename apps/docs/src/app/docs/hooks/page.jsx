import OnThisPage from '../../../components/OnThisPage';

const tableOfContents = [
  { href: '#state-hooks', label: 'State hooks' },
  { href: '#usereactflow', label: 'useReactFlow' },
  { href: '#data-access-hooks', label: 'Data access hooks' },
  { href: '#subscription-hooks', label: 'Subscription hooks' },
  { href: '#utility-hooks', label: 'Utility hooks' },
  { href: '#store-hooks', label: 'Store hooks' },
];

export default function HooksPage() {
  return (
    <>
      <div className="page-content">
        <h1>Hooks</h1>
        <p>
          Infinite Canvas provides a comprehensive set of hooks for state management,
          data access, and canvas interaction. All hooks must be used inside an <code>InfiniteCanvas</code> component.
        </p>

        <h2 id="state-hooks">State hooks</h2>

        <h3><code>useNodesState(initialNodes)</code></h3>
        <p>
          Manages the nodes array. Returns <code>[nodes, setNodes, onNodesChange]</code>.
        </p>
        <pre><code>{`import { useNodesState } from '@infinit-canvas/react';

const [nodes, setNodes, onNodesChange] = useNodesState([
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'Node 1' } },
]);

// Update nodes
setNodes([...nodes, { id: '2', position: { x: 200, y: 0 }, data: { label: 'Node 2' } }]);

// Pass onNodesChange to InfiniteCanvas
<InfiniteCanvas onNodesChange={onNodesChange} ... />`}</code></pre>

        <h3><code>useEdgesState(initialEdges)</code></h3>
        <p>
          Manages the edges array. Returns <code>[edges, setEdges, onEdgesChange]</code>.
        </p>
        <pre><code>{`import { useEdgesState } from '@infinit-canvas/react';

const [edges, setEdges, onEdgesChange] = useEdgesState([
  { id: 'e1-2', source: '1', target: '2' },
]);`}</code></pre>

        <hr style={{ margin: '32px 0', border: 'none', borderTop: '1px solid var(--border)' }} />

        <h2 id="usereactflow">useReactFlow</h2>
        <p>
          The main imperative API hook. Provides methods for reading/writing nodes, edges,
          and the viewport programmatically.
        </p>
        <pre><code>{`import { useReactFlow } from '@infinit-canvas/react';

const {
  // Node/Edge access
  getNodes, getEdges, getNode, getEdge,
  setNodes, setEdges, addNodes, addEdges,
  deleteElements,

  // Viewport
  getViewport, setViewport, getZoom,
  zoomIn, zoomOut, zoomTo,
  fitView, setCenter,

  // Coordinate conversion
  screenToFlowPosition,
  flowToScreenPosition,
} = useReactFlow();`}</code></pre>

        <h3>Node/Edge methods</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginBottom: 20 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Method</th>
              <th style={{ padding: '8px 12px' }}>Description</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['getNodes()', 'Returns a copy of the current nodes array'],
              ['getEdges()', 'Returns a copy of the current edges array'],
              ['getNode(id)', 'Find a node by ID'],
              ['getEdge(id)', 'Find an edge by ID'],
              ['setNodes(nodes | updater)', 'Replace all nodes'],
              ['setEdges(edges | updater)', 'Replace all edges'],
              ['addNodes(node | nodes)', 'Add one or more nodes'],
              ['addEdges(edge | edges)', 'Add one or more edges'],
              ['deleteElements({ nodes, edges })', 'Delete nodes and/or edges (also removes connected edges)'],
            ].map(([method, desc]) => (
              <tr key={method} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 12px' }}><code>{method}</code></td>
                <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3>Viewport methods</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginBottom: 20 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Method</th>
              <th style={{ padding: '8px 12px' }}>Description</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['getViewport()', 'Returns { x, y, zoom }'],
              ['setViewport({ x, y, zoom })', 'Set viewport position and zoom'],
              ['getZoom()', 'Returns current zoom level'],
              ['zoomIn()', 'Zoom in by 1.2x'],
              ['zoomOut()', 'Zoom out by 1.2x'],
              ['zoomTo(level)', 'Zoom to a specific level'],
              ['fitView(options?)', 'Fit all nodes in view. Options: { padding, maxZoom, minZoom, nodes }'],
              ['setCenter(x, y, { zoom? })', 'Center the viewport on a point'],
              ['screenToFlowPosition({ x, y })', 'Convert screen coordinates to world coordinates'],
              ['flowToScreenPosition({ x, y })', 'Convert world coordinates to screen coordinates'],
            ].map(([method, desc]) => (
              <tr key={method} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 12px' }}><code>{method}</code></td>
                <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <hr style={{ margin: '32px 0', border: 'none', borderTop: '1px solid var(--border)' }} />

        <h2 id="data-access-hooks">Data access hooks</h2>

        <h3><code>useNodes()</code></h3>
        <p>Returns the current nodes array. Re-renders when nodes change.</p>
        <pre><code>{`const nodes = useNodes();`}</code></pre>

        <h3><code>useEdges()</code></h3>
        <p>Returns the current edges array. Re-renders when edges change.</p>
        <pre><code>{`const edges = useEdges();`}</code></pre>

        <h3><code>useViewport()</code></h3>
        <p>Returns the current viewport <code>{'{ x, y, zoom }'}</code>.</p>
        <pre><code>{`const { x, y, zoom } = useViewport();`}</code></pre>

        <h3><code>useNodesData(nodeIds)</code></h3>
        <p>Returns data for specific node IDs. Accepts a single ID or an array.</p>
        <pre><code>{`const data = useNodesData(['node-1', 'node-2']);
// Returns [{ id, type, data }, ...]`}</code></pre>

        <h3><code>useNodeConnections(nodeId)</code></h3>
        <p>Returns all edges connected to a specific node.</p>
        <pre><code>{`const connections = useNodeConnections('node-1');
// Returns edges where source or target === 'node-1'`}</code></pre>

        <h3><code>useHandleConnections({'{ nodeId, type, handleId }'})</code></h3>
        <p>Returns edges connected to a specific handle on a node.</p>
        <pre><code>{`const edges = useHandleConnections({
  nodeId: 'node-1',
  type: 'source',
  handleId: 'output-a',
});`}</code></pre>

        <h3><code>useConnection()</code></h3>
        <p>Returns the active connection state while a user is dragging a new edge.</p>
        <pre><code>{`const connection = useConnection();
// { from: { x, y }, to: { x, y } } or null`}</code></pre>

        <h3><code>useInternalNode(nodeId)</code></h3>
        <p>Access the full internal node data for a specific node.</p>
        <pre><code>{`const node = useInternalNode('node-1');`}</code></pre>

        <h3><code>useNodeId()</code></h3>
        <p>Returns the current node ID inside a custom node component.</p>
        <pre><code>{`function MyCustomNode() {
  const nodeId = useNodeId();
  return <div>I am node {nodeId}</div>;
}`}</code></pre>

        <hr style={{ margin: '32px 0', border: 'none', borderTop: '1px solid var(--border)' }} />

        <h2 id="subscription-hooks">Subscription hooks</h2>

        <h3><code>useOnViewportChange({'{ onChange, onStart, onEnd }'})</code></h3>
        <p>Subscribe to viewport changes without causing re-renders.</p>
        <pre><code>{`useOnViewportChange({
  onChange: ({ x, y, zoom }) => console.log('Viewport:', x, y, zoom),
});`}</code></pre>

        <h3><code>useOnSelectionChange({'{ onChange }'})</code></h3>
        <p>Subscribe to selection changes.</p>
        <pre><code>{`useOnSelectionChange({
  onChange: ({ nodes, edges }) => console.log('Selected:', nodes, edges),
});`}</code></pre>

        <hr style={{ margin: '32px 0', border: 'none', borderTop: '1px solid var(--border)' }} />

        <h2 id="utility-hooks">Utility hooks</h2>

        <h3><code>useKeyPress(key | keys)</code></h3>
        <p>Returns <code>true</code> while the specified key is held down.</p>
        <pre><code>{`const isShiftPressed = useKeyPress('Shift');
const isDeletePressed = useKeyPress(['Backspace', 'Delete']);`}</code></pre>

        <h3><code>useNodesInitialized()</code></h3>
        <p>Returns <code>true</code> when nodes have been rendered at least once.</p>
        <pre><code>{`const initialized = useNodesInitialized();
if (!initialized) return <Loading />;`}</code></pre>

        <h3><code>useUpdateNodeInternals()</code></h3>
        <p>Returns a function to force recalculate node internals (handles, bounds).</p>
        <pre><code>{`const updateNodeInternals = useUpdateNodeInternals();

// After dynamically changing handles:
updateNodeInternals('node-1');
updateNodeInternals(['node-1', 'node-2']);`}</code></pre>

        <hr style={{ margin: '32px 0', border: 'none', borderTop: '1px solid var(--border)' }} />

        <h2 id="store-hooks">Store hooks</h2>

        <h3><code>useStore(selector?)</code></h3>
        <p>Direct access to the canvas store with an optional selector.</p>
        <pre><code>{`const nodes = useStore((store) => store.nodes);
const store = useStore(); // Full store`}</code></pre>

        <h3><code>useStoreApi()</code></h3>
        <p>Imperative store access. Returns <code>{'{ getState() }'}</code>.</p>
        <pre><code>{`const storeApi = useStoreApi();
const currentNodes = storeApi.getState().nodes;`}</code></pre>
      </div>
      <OnThisPage links={tableOfContents} />
    </>
  );
}
