import ExampleBlock from '../../../../components/ExampleBlock';
import OnThisPage from '../../../../components/OnThisPage';
import SlideshowExample from '../../../../examples/SlideshowExample';

const APP_CODE = `import { useState, useCallback } from 'react';
import {
  InfiniteCanvas, useNodesState, useEdgesState,
  Background, Panel,
} from 'react-infinite-canvas';
import 'react-infinite-canvas/styles.css';

const slides = [
  { title: 'Welcome', content: 'This is a slideshow built with Infinite Canvas.' },
  { title: 'Nodes', content: 'Nodes are the building blocks of your canvas.' },
  { title: 'Edges', content: 'Edges connect nodes with bezier, straight, or step paths.' },
  { title: 'Handles', content: 'Handles define where edges connect to nodes.' },
  { title: 'Thank You', content: 'Start building with react-infinite-canvas!' },
];

function SlideNode({ data }) {
  return (
    <div style={{
      width: 380, height: 240,
      background: data.bg || '#fff',
      border: '1px solid #e5e7eb', borderRadius: 12,
      padding: 30, display: 'flex', flexDirection: 'column', justifyContent: 'center',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    }}>
      <h2 style={{ margin: '0 0 12px', fontSize: 22 }}>{data.title}</h2>
      <p style={{ margin: 0, fontSize: 14, color: '#666' }}>{data.content}</p>
    </div>
  );
}

const nodeTypes = { slide: SlideNode };
const bgs = ['#eff6ff', '#f0fdf4', '#fffbeb', '#fdf2f8', '#eef2ff'];

const initialNodes = slides.map((s, i) => ({
  id: \`slide-\${i}\`, type: 'slide',
  position: { x: i * 500, y: 0 },
  data: { ...s, bg: bgs[i] },
  draggable: false,
}));

export default function App() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [current, setCurrent] = useState(0);

  return (
    <InfiniteCanvas
      nodes={nodes} edges={[]}
      onNodesChange={onNodesChange}
      fitView fitViewOptions={{ padding: 0.3, nodes: [{ id: \`slide-\${current}\` }] }}
      zoomOnScroll={false} panOnScroll={false}
      nodesDraggable={false} showHud={false} showHint={false}
      height="380px"
    >
      <Background variant="dots" />
      <Panel position="bottom-center">
        <div style={{ display: 'flex', gap: 12, background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '6px 16px' }}>
          <button onClick={() => setCurrent(Math.max(0, current - 1))} disabled={current === 0}>←</button>
          <span>{current + 1} / {slides.length}</span>
          <button onClick={() => setCurrent(Math.min(slides.length - 1, current + 1))} disabled={current === slides.length - 1}>→</button>
        </div>
      </Panel>
    </InfiniteCanvas>
  );
}`;

const SLIDE_CODE = `function SlideNode({ data }) {
  return (
    <div style={{
      width: 380, height: 240,
      background: data.bg || '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 12,
      padding: 30,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    }}>
      <h2 style={{ margin: '0 0 12px', fontSize: 22 }}>{data.title}</h2>
      <p style={{ margin: 0, fontSize: 14, color: '#666' }}>{data.content}</p>
    </div>
  );
}`;

const files = [
  { name: 'App.jsx', code: APP_CODE },
  { name: 'SlideNode.jsx', code: SLIDE_CODE },
];

const tableOfContents = [
  { href: '#what-well-build', label: "What we'll build" },
  { href: '#step-1-slide-nodes', label: '1. Create slide nodes' },
  { href: '#step-2-layout', label: '2. Layout slides' },
  { href: '#step-3-navigation', label: '3. Add navigation' },
  { href: '#step-4-disable-interactions', label: '4. Disable interactions' },
];

export default function SlideshowTutorialPage() {
  return (
    <>
      <div className="page-content">
        <h1>Tutorial: Slideshow App</h1>
        <p>
          Build a presentation app where each "slide" is a large canvas node.
          Navigate between slides with arrow buttons that focus the viewport on each slide.
        </p>

        <h2 id="what-well-build">What we'll build</h2>
        <ExampleBlock preview={<SlideshowExample />} files={files} />

        <h2 id="step-1-slide-nodes">1. Create slide nodes</h2>
        <p>
          Each slide is a custom node component — a large card with a title and content.
        </p>
        <pre><code>{SLIDE_CODE}</code></pre>

        <h2 id="step-2-layout">2. Layout slides horizontally</h2>
        <p>
          Position slides in a row with spacing. Use <code>draggable: false</code> to prevent
          users from moving slides.
        </p>
        <pre><code>{`const initialNodes = slides.map((s, i) => ({
  id: \`slide-\${i}\`,
  type: 'slide',
  position: { x: i * 500, y: 0 },
  data: { ...s, bg: bgs[i] },
  draggable: false,
}));`}</code></pre>

        <h2 id="step-3-navigation">3. Add navigation controls</h2>
        <p>
          Use <code>fitView</code> with <code>fitViewOptions.nodes</code> to focus on a specific
          slide. A <code>Panel</code> at the bottom shows prev/next buttons.
        </p>
        <pre><code>{`<InfiniteCanvas
  fitView
  fitViewOptions={{
    padding: 0.3,
    nodes: [{ id: \`slide-\${current}\` }],
  }}
  ...
/>`}</code></pre>

        <h2 id="step-4-disable-interactions">4. Disable canvas interactions</h2>
        <p>
          For a presentation, disable scroll zoom, pan, and drag so users only navigate
          via the buttons:
        </p>
        <pre><code>{`<InfiniteCanvas
  zoomOnScroll={false}
  panOnScroll={false}
  nodesDraggable={false}
  showHud={false}
  showHint={false}
  ...
/>`}</code></pre>
      </div>
      <OnThisPage links={tableOfContents} />
    </>
  );
}
