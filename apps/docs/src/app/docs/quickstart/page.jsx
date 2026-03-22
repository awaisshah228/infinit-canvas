import ExampleBlock from '../../../components/ExampleBlock';
import OnThisPage from '../../../components/OnThisPage';
import BasicFlow from '../../../examples/BasicFlow';

const APP_CODE = `import { useCallback } from 'react';
import {
  InfiniteCanvas, useNodesState, useEdgesState, addEdge,
  Controls, Background,
} from 'react-infinite-canvas';
import 'react-infinite-canvas/styles.css';

const initialNodes = [
  {
    id: 'n1',
    position: { x: 0, y: 0 },
    data: { label: 'Node 1' },
    type: 'input',
  },
  {
    id: 'n2',
    position: { x: 100, y: 100 },
    data: { label: 'Node 2' },
  },
];

const initialEdges = [{ id: 'n1-n2', source: 'n1', target: 'n2' }];

export default function App() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

  return (
    <InfiniteCanvas
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      height="400px"
    >
      <Controls />
      <Background variant="dots" />
    </InfiniteCanvas>
  );
}`;

const INDEX_CODE = `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);`;

const INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Infinite Canvas</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`;

const files = [
  { name: 'App.jsx', code: APP_CODE },
  { name: 'index.html', code: INDEX_HTML },
  { name: 'index.jsx', code: INDEX_CODE },
];

const tableOfContents = [
  { href: '#installation', label: 'Installation' },
  { href: '#creating-the-flow', label: 'Creating the flow' },
  { href: '#add-imports', label: 'Add imports' },
  { href: '#render-canvas', label: 'Render InfiniteCanvas' },
];

export default function QuickstartPage() {
  return (
    <>
      <div className="page-content">
        <h1>Quickstart</h1>
        <p>
          Get up and running with Infinite Canvas in under 5 minutes.
          This guide walks through the basic setup of a flow with nodes and edges.
        </p>

        <h2 id="installation">Installation</h2>
        <p>Install the library from npm:</p>
        <pre><code>npm install react-infinite-canvas</code></pre>

        <h2 id="creating-the-flow">Creating the flow</h2>
        <p>
          A flow consists of <strong>nodes</strong> and <strong>edges</strong>.
          Each node has an <code>id</code>, a <code>position</code>, and a <code>data</code> object.
          Edges connect two nodes via <code>source</code> and <code>target</code> IDs.
        </p>

        <ExampleBlock
          preview={<BasicFlow />}
          files={files}
        />

        <h2 id="add-imports">Add imports</h2>
        <p>Import the components and hooks you need:</p>
        <pre><code>{`import {
  InfiniteCanvas, useNodesState, useEdgesState, addEdge,
  Controls, Background,
} from 'react-infinite-canvas';
import 'react-infinite-canvas/styles.css';`}</code></pre>

        <h2 id="render-canvas">Render InfiniteCanvas</h2>
        <p>
          The <code>InfiniteCanvas</code> component is the main wrapper.
          Pass in your nodes, edges, and change handlers to make the flow interactive.
        </p>
        <pre><code>{`<InfiniteCanvas
  nodes={nodes}
  edges={edges}
  onNodesChange={onNodesChange}
  onEdgesChange={onEdgesChange}
  onConnect={onConnect}
  height="400px"
>
  <Controls />
  <Background variant="dots" />
</InfiniteCanvas>`}</code></pre>
      </div>
      <OnThisPage links={tableOfContents} />
    </>
  );
}
