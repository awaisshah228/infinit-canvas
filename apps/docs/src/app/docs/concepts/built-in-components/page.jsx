import OnThisPage from '../../../../components/OnThisPage';

const tableOfContents = [
  { href: '#controls', label: 'Controls' },
  { href: '#minimap', label: 'MiniMap' },
  { href: '#background', label: 'Background' },
  { href: '#panel', label: 'Panel' },
  { href: '#handle', label: 'Handle' },
  { href: '#node-toolbar', label: 'NodeToolbar' },
  { href: '#node-resizer', label: 'NodeResizer' },
  { href: '#edge-label-renderer', label: 'EdgeLabelRenderer' },
  { href: '#viewport-portal', label: 'ViewportPortal' },
];

export default function BuiltInComponentsPage() {
  return (
    <>
      <div className="page-content">
        <h1>Built-in Components</h1>
        <p>
          Infinite Canvas ships with several helper components for building
          common canvas features. All are placed as children of <code>InfiniteCanvas</code>.
        </p>

        <pre><code>{`import {
  Controls, MiniMap, Background, Panel,
  Handle, NodeToolbar, NodeResizer,
  EdgeLabelRenderer, ViewportPortal,
} from '@infinit-canvas/react';`}</code></pre>

        <h2 id="controls">Controls</h2>
        <p>
          Renders zoom-in, zoom-out, and fit-view buttons. Positioned at the bottom-left by default.
        </p>
        <pre><code>{`<Controls
  showZoom={true}          // Show +/- buttons
  showFitView={true}       // Show fit-view button
  position="bottom-left"   // 'top-left', 'top-right', 'bottom-left', 'bottom-right'
/>`}</code></pre>

        <h2 id="minimap">MiniMap</h2>
        <p>
          Renders a small overview of the entire canvas in the corner, showing node positions
          and the current viewport rectangle.
        </p>
        <pre><code>{`<MiniMap
  width={200}
  height={150}
  nodeColor="#3b82f6"          // Color or function: (node) => color
  maskColor="rgba(0,0,0,0.1)"
/>`}</code></pre>

        <h2 id="background">Background</h2>
        <p>
          Renders a repeating pattern (dots, lines, or cross) that moves with pan and zoom.
        </p>
        <pre><code>{`<Background
  variant="dots"    // 'dots', 'lines', 'cross'
  gap={20}          // Spacing
  size={1}          // Element size
  color="#ddd"      // Color
/>`}</code></pre>

        <h2 id="panel">Panel</h2>
        <p>
          A positioned container for custom UI overlays (toolbars, info panels, etc.).
          Content inside a Panel doesn't move with pan/zoom.
        </p>
        <pre><code>{`<Panel position="top-right">
  <button onClick={handleSave}>Save</button>
</Panel>`}</code></pre>

        <h2 id="handle">Handle</h2>
        <p>
          Defines a connection point on a custom node. Used inside custom node components.
        </p>
        <pre><code>{`<Handle
  type="source"         // 'source' or 'target'
  position="right"      // 'top', 'bottom', 'left', 'right'
  id="output-1"         // Optional ID for multiple handles
  isConnectable={true}
/>`}</code></pre>

        <h2 id="node-toolbar">NodeToolbar</h2>
        <p>
          Renders a floating toolbar above (or beside) a node. Auto-shows when the node
          is selected.
        </p>
        <pre><code>{`<NodeToolbar position="top" offset={10} align="center">
  <button>Edit</button>
  <button>Delete</button>
</NodeToolbar>`}</code></pre>

        <h2 id="node-resizer">NodeResizer</h2>
        <p>
          Adds resize handles to a custom node, letting users drag to resize.
        </p>
        <pre><code>{`<NodeResizer
  minWidth={100}
  minHeight={50}
  color="#3b82f6"
  isVisible={selected}
/>`}</code></pre>

        <h2 id="edge-label-renderer">EdgeLabelRenderer</h2>
        <p>
          Portals children into the edge label layer. Use inside custom edge components to
          render interactive labels with full React support.
        </p>
        <pre><code>{`<EdgeLabelRenderer>
  <div style={{ transform: \`translate(\${labelX}px, \${labelY}px)\` }}>
    {label}
  </div>
</EdgeLabelRenderer>`}</code></pre>

        <h2 id="viewport-portal">ViewportPortal</h2>
        <p>
          Portals children into a layer that transforms with the viewport. Elements will
          pan and zoom with the canvas.
        </p>
        <pre><code>{`<ViewportPortal>
  <div style={{ position: 'absolute', left: 100, top: 200 }}>
    I move with the canvas!
  </div>
</ViewportPortal>`}</code></pre>
      </div>
      <OnThisPage links={tableOfContents} />
    </>
  );
}
