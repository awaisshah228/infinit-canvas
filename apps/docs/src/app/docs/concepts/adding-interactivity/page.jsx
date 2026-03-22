import ExampleBlock from '../../../../components/ExampleBlock';
import OnThisPage from '../../../../components/OnThisPage';
import InteractivityExample from '../../../../examples/InteractivityExample';

const tableOfContents = [
  { href: '#dragging-nodes', label: 'Dragging nodes' },
  { href: '#connecting-nodes', label: 'Connecting nodes' },
  { href: '#selecting-elements', label: 'Selecting elements' },
  { href: '#deleting-elements', label: 'Deleting elements' },
  { href: '#event-handlers', label: 'Event handlers' },
];

export default function AddingInteractivityPage() {
  return (
    <>
      <div className="page-content">
        <h1>Adding Interactivity</h1>
        <p>
          Infinite Canvas supports dragging, connecting, selecting, and deleting out of the box.
          This page explains how each interaction works and which callbacks you can hook into.
        </p>

        <ExampleBlock preview={<InteractivityExample />} files={[{ name: 'App.jsx', code: `<InfiniteCanvas
  nodesDraggable={draggable}
  nodesConnectable={connectable}
  elementsSelectable={selectable}
  ...
/>` }]} />

        <h2 id="dragging-nodes">Dragging nodes</h2>
        <p>
          Nodes are draggable by default. When a node is dragged, the <code>onNodesChange</code> callback
          receives position changes. You can disable dragging globally with <code>nodesDraggable=&#123;false&#125;</code> or
          per-node with <code>draggable: false</code> on the node object.
        </p>
        <pre><code>{`// Disable dragging globally
<InfiniteCanvas nodesDraggable={false} ... />

// Disable per-node
const nodes = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'Fixed' }, draggable: false },
];`}</code></pre>

        <p>You can also snap nodes to a grid:</p>
        <pre><code>{`<InfiniteCanvas
  snapToGrid={true}
  snapGrid={[15, 15]}
  ...
/>`}</code></pre>

        <h2 id="connecting-nodes">Connecting nodes</h2>
        <p>
          Users create new edges by dragging from a source handle to a target handle.
          The <code>onConnect</code> callback receives the connection details.
        </p>
        <pre><code>{`const onConnect = useCallback(
  (connection) => {
    // connection = { source, target, sourceHandle, targetHandle }
    setEdges((eds) => addEdge(connection, eds));
  },
  [setEdges],
);

<InfiniteCanvas onConnect={onConnect} ... />`}</code></pre>

        <p>Control connection behavior with these props:</p>
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
              ['connectionRadius', 'number', 'Snap distance (px) for connecting to a handle'],
              ['isValidConnection', 'function', 'Validate whether a connection is allowed'],
              ['connectOnClick', 'boolean', 'Allow click-to-connect (click source, then click target)'],
              ['defaultEdgeOptions', 'object', 'Default props applied to newly created edges'],
            ].map(([prop, type, desc]) => (
              <tr key={prop} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 12px' }}><code>{prop}</code></td>
                <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{type}</td>
                <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 id="selecting-elements">Selecting elements</h2>
        <p>
          Click a node or edge to select it. Hold <code>Shift</code> (configurable) and click
          to multi-select. You can also drag a selection box by holding the selection key and
          dragging on the pane.
        </p>
        <pre><code>{`<InfiniteCanvas
  multiSelectionKeyCode="Shift"   // Key for multi-select
  selectionOnDrag={true}          // Enable drag-to-select
  selectionMode="partial"         // 'partial' or 'full' overlap
  elementsSelectable={true}       // Enable/disable selection
  onSelectionChange={(selected) => console.log(selected)}
  ...
/>`}</code></pre>

        <h2 id="deleting-elements">Deleting elements</h2>
        <p>
          Press <code>Backspace</code> or <code>Delete</code> to remove selected elements.
          Customize the delete key with the <code>deleteKeyCode</code> prop.
        </p>
        <pre><code>{`<InfiniteCanvas
  deleteKeyCode="Backspace"
  onDelete={({ nodes, edges }) => console.log('Deleted:', nodes, edges)}
  onBeforeDelete={({ nodes, edges }) => {
    // Return false to prevent deletion
    return true;
  }}
  ...
/>`}</code></pre>

        <h2 id="event-handlers">Event handlers</h2>
        <p>Infinite Canvas provides granular event handlers for nodes, edges, and the pane:</p>

        <h3>Node events</h3>
        <pre><code>{`onNodeClick, onNodeDoubleClick, onNodeContextMenu,
onNodeMouseEnter, onNodeMouseMove, onNodeMouseLeave,
onNodeDragStart, onNodeDrag, onNodeDragStop`}</code></pre>

        <h3>Edge events</h3>
        <pre><code>{`onEdgeClick, onEdgeDoubleClick, onEdgeContextMenu,
onEdgeMouseEnter, onEdgeMouseMove, onEdgeMouseLeave`}</code></pre>

        <h3>Pane events</h3>
        <pre><code>{`onPaneClick, onPaneContextMenu,
onPaneMouseEnter, onPaneMouseMove, onPaneMouseLeave`}</code></pre>

        <h3>Viewport events</h3>
        <pre><code>{`onMoveStart, onMove, onMoveEnd`}</code></pre>
      </div>
      <OnThisPage links={tableOfContents} />
    </>
  );
}
