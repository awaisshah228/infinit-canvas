import ExampleBlock from '../../../../components/ExampleBlock';
import OnThisPage from '../../../../components/OnThisPage';
import OverviewExample from '../../../../examples/OverviewExample';

const tableOfContents = [
  { href: '#nodes', label: 'Nodes' },
  { href: '#edges', label: 'Edges' },
  { href: '#handles', label: 'Handles' },
  { href: '#the-viewport', label: 'The Viewport' },
  { href: '#canvas-worker', label: 'Canvas Worker' },
];

export default function OverviewPage() {
  return (
    <>
      <div className="page-content">
        <h1>Overview</h1>
        <p>
          Infinite Canvas is a React library for building node-based editors, interactive diagrams,
          and flow-based interfaces. It uses an OffscreenCanvas web worker for rendering, delivering
          smooth 60fps performance even with thousands of nodes.
        </p>

        <ExampleBlock preview={<OverviewExample />} files={[{ name: 'App.jsx', code: `import {
  InfiniteCanvas, useNodesState, useEdgesState, addEdge,
  Controls, MiniMap, Background, Handle, NodeToolbar,
} from 'react-infinite-canvas';
import 'react-infinite-canvas/styles.css';` }]} />

        <h2 id="nodes">Nodes</h2>
        <p>
          A <strong>node</strong> is a draggable element on the canvas. Each node has an <code>id</code>,
          a <code>position</code> with <code>x</code> and <code>y</code> coordinates, and a <code>data</code> object.
          Nodes can be built-in types (<code>default</code>, <code>input</code>, <code>output</code>, <code>group</code>)
          or fully custom React components.
        </p>
        <pre><code>{`const node = {
  id: '1',
  position: { x: 0, y: 0 },
  data: { label: 'Hello' },
  type: 'default', // optional — 'default', 'input', 'output', 'group', or custom
};`}</code></pre>

        <h2 id="edges">Edges</h2>
        <p>
          An <strong>edge</strong> is a connection between two nodes. Each edge has an <code>id</code>,
          a <code>source</code> node ID, and a <code>target</code> node ID. Edges can be styled,
          animated, and labeled.
        </p>
        <pre><code>{`const edge = {
  id: 'e1-2',
  source: '1',
  target: '2',
  type: 'default',    // 'default' (bezier), 'smoothstep', 'straight', 'step'
  animated: false,
  label: 'connects',
};`}</code></pre>

        <h2 id="handles">Handles</h2>
        <p>
          A <strong>handle</strong> is a connection point on a node. Handles define where edges
          can attach. There are two types: <code>source</code> handles (where edges start) and
          <code>target</code> handles (where edges end). Each handle has a <code>position</code>:
          <code>top</code>, <code>bottom</code>, <code>left</code>, or <code>right</code>.
        </p>

        <h2 id="the-viewport">The Viewport</h2>
        <p>
          The <strong>viewport</strong> is the visible area of the canvas. Users can pan (drag to move)
          and zoom (scroll to scale) the viewport. The viewport is described by three values:
          <code>x</code> (horizontal offset), <code>y</code> (vertical offset), and <code>zoom</code> (scale factor).
        </p>
        <p>
          Node positions are always in <strong>world coordinates</strong> — they don't change when the user
          pans or zooms. The viewport transforms world coordinates into screen coordinates.
        </p>

        <h2 id="canvas-worker">Canvas Worker</h2>
        <p>
          Unlike React Flow which renders nodes and edges in the DOM, Infinite Canvas uses an
          <strong>OffscreenCanvas web worker</strong> for default node and edge rendering. This means
          the main thread stays free for React interactions while the worker handles the heavy
          drawing at 60fps. Custom node types are rendered as React components overlaid on top
          of the canvas.
        </p>
      </div>
      <OnThisPage links={tableOfContents} />
    </>
  );
}
