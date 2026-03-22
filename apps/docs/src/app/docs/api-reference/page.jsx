import OnThisPage from '../../../components/OnThisPage';

const tableOfContents = [
  { href: '#data-props', label: 'Data props' },
  { href: '#custom-types', label: 'Custom types' },
  { href: '#appearance', label: 'Appearance' },
  { href: '#viewport-props', label: 'Viewport props' },
  { href: '#node-edge-callbacks', label: 'Node & Edge callbacks' },
  { href: '#pane-callbacks', label: 'Pane callbacks' },
  { href: '#behavior-props', label: 'Behavior props' },
  { href: '#connection-props', label: 'Connection props' },
  { href: '#selection-props', label: 'Selection props' },
  { href: '#edge-routing-props', label: 'Edge routing props' },
  { href: '#hud-props', label: 'HUD props' },
];

const PropTable = ({ rows }) => (
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
      {rows.map(([prop, type, def, desc]) => (
        <tr key={prop} style={{ borderBottom: '1px solid var(--border)' }}>
          <td style={{ padding: '8px 12px' }}><code>{prop}</code></td>
          <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{type}</td>
          <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{def}</td>
          <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{desc}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

export default function ApiReferencePage() {
  return (
    <>
      <div className="page-content">
        <h1>InfiniteCanvas API Reference</h1>
        <p>
          Complete prop reference for the <code>&lt;InfiniteCanvas&gt;</code> component.
        </p>

        <pre><code>{`import { InfiniteCanvas } from 'react-infinite-canvas';

<InfiniteCanvas
  nodes={nodes}
  edges={edges}
  onNodesChange={onNodesChange}
  onEdgesChange={onEdgesChange}
  onConnect={onConnect}
  height="400px"
>
  {children}
</InfiniteCanvas>`}</code></pre>

        <h2 id="data-props">Data props</h2>
        <PropTable rows={[
          ['nodes', 'Node[]', '[]', 'Array of node objects'],
          ['edges', 'Edge[]', '[]', 'Array of edge objects'],
        ]} />

        <h2 id="custom-types">Custom types</h2>
        <PropTable rows={[
          ['nodeTypes', 'Record<string, Component>', 'undefined', 'Map of custom node type names to React components'],
          ['edgeTypes', 'Record<string, Component>', 'undefined', 'Map of custom edge type names to React components'],
        ]} />

        <h2 id="appearance">Appearance</h2>
        <PropTable rows={[
          ['width', 'string | number', "'100%'", 'Canvas container width'],
          ['height', 'string | number', "'420px'", 'Canvas container height'],
          ['dark', 'boolean', 'undefined', 'Enable dark mode'],
          ['gridSize', 'number', 'undefined', 'Background grid size'],
          ['className', 'string', "''", 'CSS class for the canvas container'],
          ['style', 'object', '{}', 'Inline styles for the canvas container'],
        ]} />

        <h2 id="viewport-props">Viewport props</h2>
        <PropTable rows={[
          ['zoomMin', 'number', '0.1', 'Minimum zoom level'],
          ['zoomMax', 'number', '4', 'Maximum zoom level'],
          ['initialCamera', 'object', 'undefined', 'Initial viewport { x, y, zoom }'],
          ['fitView', 'boolean', 'false', 'Auto-fit all nodes on mount'],
          ['fitViewOptions', 'object', 'undefined', '{ padding, maxZoom, minZoom }'],
          ['zoomOnScroll', 'boolean', 'true', 'Enable scroll-to-zoom'],
          ['zoomOnDoubleClick', 'boolean', 'true', 'Enable double-click zoom'],
          ['zoomOnPinch', 'boolean', 'true', 'Enable pinch-to-zoom'],
          ['panOnScroll', 'boolean', 'false', 'Scroll to pan instead of zoom'],
          ['panOnScrollMode', 'string', "'free'", "'free', 'vertical', 'horizontal'"],
          ['panOnScrollSpeed', 'number', '0.5', 'Pan speed multiplier'],
          ['panActivationKeyCode', 'string', 'undefined', 'Key to hold for pan mode'],
          ['preventScrolling', 'boolean', 'true', 'Prevent page scroll inside canvas'],
          ['translateExtent', 'array', 'undefined', 'Pan limits [[minX,minY],[maxX,maxY]]'],
          ['nodeExtent', 'array', 'undefined', 'Node drag limits [[minX,minY],[maxX,maxY]]'],
        ]} />

        <h2 id="node-edge-callbacks">Node & Edge callbacks</h2>
        <PropTable rows={[
          ['onNodesChange', 'function', 'undefined', 'Called with node changes (position, selection, add, remove)'],
          ['onEdgesChange', 'function', 'undefined', 'Called with edge changes'],
          ['onConnect', 'function', 'undefined', 'Called when a new connection is made'],
          ['onConnectStart', 'function', 'undefined', 'Called when connection drag starts'],
          ['onConnectEnd', 'function', 'undefined', 'Called when connection drag ends'],
          ['onNodeClick', 'function', 'undefined', 'Node click handler (event, node)'],
          ['onNodeDoubleClick', 'function', 'undefined', 'Node double-click handler'],
          ['onNodeContextMenu', 'function', 'undefined', 'Node right-click handler'],
          ['onNodeMouseEnter', 'function', 'undefined', 'Node mouse enter'],
          ['onNodeMouseMove', 'function', 'undefined', 'Node mouse move'],
          ['onNodeMouseLeave', 'function', 'undefined', 'Node mouse leave'],
          ['onNodeDragStart', 'function', 'undefined', 'Node drag start'],
          ['onNodeDrag', 'function', 'undefined', 'Node dragging'],
          ['onNodeDragStop', 'function', 'undefined', 'Node drag end'],
          ['onEdgeClick', 'function', 'undefined', 'Edge click handler'],
          ['onEdgeDoubleClick', 'function', 'undefined', 'Edge double-click handler'],
          ['onEdgeContextMenu', 'function', 'undefined', 'Edge right-click handler'],
          ['onEdgeMouseEnter', 'function', 'undefined', 'Edge mouse enter'],
          ['onEdgeMouseMove', 'function', 'undefined', 'Edge mouse move'],
          ['onEdgeMouseLeave', 'function', 'undefined', 'Edge mouse leave'],
        ]} />

        <h2 id="pane-callbacks">Pane & lifecycle callbacks</h2>
        <PropTable rows={[
          ['onPaneClick', 'function', 'undefined', 'Background click handler'],
          ['onPaneContextMenu', 'function', 'undefined', 'Background right-click handler'],
          ['onPaneMouseEnter', 'function', 'undefined', 'Pane mouse enter'],
          ['onPaneMouseMove', 'function', 'undefined', 'Pane mouse move'],
          ['onPaneMouseLeave', 'function', 'undefined', 'Pane mouse leave'],
          ['onSelectionChange', 'function', 'undefined', 'Called when selection changes'],
          ['onInit', 'function', 'undefined', 'Called when the canvas initializes'],
          ['onMoveStart', 'function', 'undefined', 'Viewport move start'],
          ['onMove', 'function', 'undefined', 'Viewport moving'],
          ['onMoveEnd', 'function', 'undefined', 'Viewport move end'],
          ['onDelete', 'function', 'undefined', 'Called after elements are deleted'],
          ['onBeforeDelete', 'function', 'undefined', 'Called before deletion (return false to cancel)'],
          ['onError', 'function', 'undefined', 'Error handler'],
        ]} />

        <h2 id="behavior-props">Behavior props</h2>
        <PropTable rows={[
          ['nodesDraggable', 'boolean', 'true', 'Enable/disable node dragging'],
          ['nodesConnectable', 'boolean', 'true', 'Enable/disable creating connections'],
          ['elementsSelectable', 'boolean', 'true', 'Enable/disable element selection'],
          ['snapToGrid', 'boolean', 'false', 'Snap nodes to grid when dragging'],
          ['snapGrid', 'array', '[15, 15]', 'Grid size for snapping [x, y]'],
          ['deleteKeyCode', 'string', "'Backspace'", 'Key to delete selected elements'],
          ['autoPanOnNodeDrag', 'boolean', 'true', 'Auto-pan when dragging nodes near edges'],
          ['autoPanOnConnect', 'boolean', 'true', 'Auto-pan when connecting near edges'],
          ['autoPanSpeed', 'number', 'undefined', 'Auto-pan speed'],
          ['edgesReconnectable', 'boolean', 'false', 'Allow edges to be reconnected'],
          ['elevateNodesOnSelect', 'boolean', 'true', 'Bring selected nodes to front'],
        ]} />

        <h2 id="connection-props">Connection props</h2>
        <PropTable rows={[
          ['connectionMode', 'string', 'undefined', 'Connection mode'],
          ['connectionRadius', 'number', 'undefined', 'Snap radius for connections (px)'],
          ['connectOnClick', 'boolean', 'undefined', 'Allow click-to-connect'],
          ['isValidConnection', 'function', 'undefined', 'Validate connections (connection) => boolean'],
          ['defaultEdgeOptions', 'object', 'undefined', 'Default props for new edges'],
        ]} />

        <h2 id="selection-props">Selection props</h2>
        <PropTable rows={[
          ['multiSelectionKeyCode', 'string', "'Shift'", 'Key for multi-selection'],
          ['selectionOnDrag', 'boolean', 'false', 'Enable drag-to-select'],
          ['selectionMode', 'string', "'partial'", "'partial' or 'full' overlap mode"],
        ]} />

        <h2 id="edge-routing-props">Edge routing props</h2>
        <PropTable rows={[
          ['edgeRouting', 'boolean', 'true', 'Enable automatic edge routing around obstacles'],
        ]} />

        <h2 id="hud-props">HUD props</h2>
        <PropTable rows={[
          ['showHud', 'boolean', 'true', 'Show coordinates/zoom info bar'],
          ['showHint', 'boolean', 'true', 'Show pan/zoom hint text'],
          ['hintText', 'string', "'Drag to pan · Scroll to zoom'", 'Custom hint text'],
          ['onHudUpdate', 'function', 'undefined', 'Called when HUD data changes'],
          ['onNodesProcessed', 'function', 'undefined', 'Called when worker processes nodes'],
        ]} />
      </div>
      <OnThisPage links={tableOfContents} />
    </>
  );
}
