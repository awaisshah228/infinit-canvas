import ExampleBlock from '../../../../components/ExampleBlock';
import OnThisPage from '../../../../components/OnThisPage';
import ViewportExample from '../../../../examples/ViewportExample';

const tableOfContents = [
  { href: '#panning-and-zooming', label: 'Panning and zooming' },
  { href: '#viewport-configuration', label: 'Viewport configuration' },
  { href: '#initial-camera', label: 'Initial camera' },
  { href: '#fit-view', label: 'Fit view' },
  { href: '#coordinate-systems', label: 'Coordinate systems' },
  { href: '#programmatic-control', label: 'Programmatic control' },
];

export default function TheViewportPage() {
  return (
    <>
      <div className="page-content">
        <h1>The Viewport</h1>
        <p>
          The viewport controls what part of the canvas is visible. It has three properties:
          <code>x</code> (horizontal pan), <code>y</code> (vertical pan), and <code>zoom</code> (scale).
        </p>

        <ExampleBlock preview={<ViewportExample />} files={[{ name: 'App.jsx', code: `<InfiniteCanvas
  fitView
  zoomMin={0.5}
  zoomMax={3}
  ...
/>` }]} />

        <h2 id="panning-and-zooming">Panning and zooming</h2>
        <p>
          By default, users can pan by dragging on the canvas background and zoom with the scroll
          wheel or pinch gesture. You can customize this behavior:
        </p>
        <pre><code>{`<InfiniteCanvas
  // Zoom
  zoomOnScroll={true}        // Scroll to zoom
  zoomOnDoubleClick={true}   // Double-click to zoom
  zoomOnPinch={true}         // Pinch to zoom
  zoomMin={0.1}              // Minimum zoom level
  zoomMax={4}                // Maximum zoom level

  // Pan
  panOnScroll={false}        // Scroll to pan (instead of zoom)
  panOnScrollMode="free"     // 'free', 'vertical', 'horizontal'
  panOnScrollSpeed={0.5}     // Pan speed multiplier
  panActivationKeyCode="Space" // Hold key to pan
  preventScrolling={true}    // Prevent page scroll inside canvas
  ...
/>`}</code></pre>

        <h2 id="viewport-configuration">Viewport configuration</h2>
        <p>
          Control the extent of panning with <code>translateExtent</code>:
        </p>
        <pre><code>{`<InfiniteCanvas
  translateExtent={[
    [-1000, -1000],  // [minX, minY]
    [1000, 1000],    // [maxX, maxY]
  ]}
  ...
/>`}</code></pre>

        <h2 id="initial-camera">Initial camera</h2>
        <p>
          Set the initial viewport position and zoom:
        </p>
        <pre><code>{`<InfiniteCanvas
  initialCamera={{ x: 100, y: 50, zoom: 1.5 }}
  ...
/>`}</code></pre>

        <h2 id="fit-view">Fit view</h2>
        <p>
          Automatically fit all nodes into view on mount:
        </p>
        <pre><code>{`<InfiniteCanvas
  fitView={true}
  fitViewOptions={{
    padding: 0.2,      // Padding around nodes (0-1)
    maxZoom: 1.5,       // Don't zoom in past this
    minZoom: 0.5,       // Don't zoom out past this
  }}
  ...
/>`}</code></pre>

        <h2 id="coordinate-systems">Coordinate systems</h2>
        <p>
          There are two coordinate systems in Infinite Canvas:
        </p>
        <ul>
          <li><strong>World coordinates</strong> — the position of nodes on the canvas. These stay fixed regardless of viewport changes.</li>
          <li><strong>Screen coordinates</strong> — pixel positions relative to the browser window.</li>
        </ul>
        <p>
          Use the <code>useReactFlow</code> hook to convert between them:
        </p>
        <pre><code>{`const { screenToFlowPosition, flowToScreenPosition } = useReactFlow();

// Screen → World
const worldPos = screenToFlowPosition({ x: event.clientX, y: event.clientY });

// World → Screen
const screenPos = flowToScreenPosition({ x: 100, y: 200 });`}</code></pre>

        <h2 id="programmatic-control">Programmatic control</h2>
        <p>
          Use the <code>useReactFlow</code> hook for programmatic viewport control:
        </p>
        <pre><code>{`const { setViewport, getViewport, zoomIn, zoomOut, zoomTo, fitView, setCenter } = useReactFlow();

// Get current viewport
const { x, y, zoom } = getViewport();

// Set viewport
setViewport({ x: 0, y: 0, zoom: 1 });

// Zoom controls
zoomIn();
zoomOut();
zoomTo(1.5);

// Fit all nodes
fitView({ padding: 0.2 });

// Center on a point
setCenter(200, 150, { zoom: 1.2 });`}</code></pre>
      </div>
      <OnThisPage links={tableOfContents} />
    </>
  );
}
