import OnThisPage from '../../../components/OnThisPage';

const tableOfContents = [
  { href: '#css-classes', label: 'CSS classes' },
  { href: '#dark-mode', label: 'Dark mode' },
  { href: '#custom-styles', label: 'Custom styles' },
  { href: '#node-styling', label: 'Node styling' },
];

export default function ThemingPage() {
  return (
    <>
      <div className="page-content">
        <h1>Theming</h1>
        <p>
          Customize the look and feel of your canvas with CSS and component props.
        </p>

        <h2 id="css-classes">CSS classes</h2>
        <p>
          Infinite Canvas uses <code>ric-</code> prefixed class names for all elements.
          You can target these in your CSS:
        </p>
        <pre><code>{`/* Main container */
.ric-wrap { }

/* Canvas element */
.ric-canvas { }

/* Controls */
.ric-controls { }

/* MiniMap */
.ric-minimap { }

/* Node overlays (custom nodes) */
.ric-nodes-overlay { }

/* Edge overlays (custom edges) */
.ric-edges-overlay { }

/* Built-in node types */
.ric-default-node { }
.ric-input-node { }
.ric-output-node { }

/* Handles */
.ric-handle { }
.ric-handle-source { }
.ric-handle-target { }
.ric-handle-top { }
.ric-handle-bottom { }
.ric-handle-left { }
.ric-handle-right { }

/* HUD elements */
.ric-hint { }
.ric-info { }

/* Panel */
.ric-panel { }

/* Toolbars */
.ric-node-toolbar { }
.ric-edge-toolbar { }`}</code></pre>

        <h2 id="dark-mode">Dark mode</h2>
        <p>
          Enable dark mode with the <code>dark</code> prop. This changes the canvas
          background, grid, and default node/edge colors:
        </p>
        <pre><code>{`<InfiniteCanvas dark={true} ... />`}</code></pre>

        <h2 id="custom-styles">Custom styles</h2>
        <p>
          Pass <code>style</code> and <code>className</code> to the main canvas or any built-in component:
        </p>
        <pre><code>{`<InfiniteCanvas
  className="my-canvas"
  style={{ border: '1px solid #e5e7eb', borderRadius: 8 }}
  ...
>
  <Controls className="my-controls" style={{ background: '#f9fafb' }} />
  <Background color="#e5e7eb" />
  <MiniMap style={{ border: '1px solid #e5e7eb' }} />
</InfiniteCanvas>`}</code></pre>

        <h2 id="node-styling">Node styling</h2>
        <p>
          Built-in nodes follow the xyflow default styling convention:
        </p>
        <ul>
          <li><strong>Default node</strong> — white background, <code>#1a192b</code> border, 3px border-radius</li>
          <li><strong>Input node</strong> — blue bottom accent (<code>#0041d0</code>)</li>
          <li><strong>Output node</strong> — pink top accent (<code>#ff0072</code>)</li>
          <li><strong>Selected state</strong> — subtle box-shadow instead of border change</li>
          <li><strong>Handles</strong> — 8px dark circles (<code>#1a192b</code>)</li>
        </ul>
        <p>
          For fully custom styling, create custom node types with your own React components.
        </p>
      </div>
      <OnThisPage links={tableOfContents} />
    </>
  );
}
