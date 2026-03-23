import ExampleBlock from '../../../../components/ExampleBlock';
import OnThisPage from '../../../../components/OnThisPage';
import BasicFlow from '../../../../examples/BasicFlow';

const APP_CODE = `import { useCallback } from 'react';
import {
  InfiniteCanvas, useNodesState, useEdgesState, addEdge,
  Controls, Background,
} from '@infinit-canvas/react';
import '@infinit-canvas/react/styles.css';

// 1. Define your nodes
const initialNodes = [
  { id: '1', type: 'input', position: { x: 0, y: 0 }, data: { label: 'Start' } },
  { id: '2', position: { x: 200, y: 100 }, data: { label: 'Process' } },
  { id: '3', type: 'output', position: { x: 400, y: 0 }, data: { label: 'End' } },
];

// 2. Define your edges
const initialEdges = [
  { id: 'e1-2', source: '1', target: '2' },
  { id: 'e2-3', source: '2', target: '3' },
];

export default function App() {
  // 3. Use state hooks for nodes and edges
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // 4. Handle new connections
  const onConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

  // 5. Render the canvas
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

const files = [{ name: 'App.jsx', code: APP_CODE }];

const tableOfContents = [
  { href: '#step-1-define-nodes', label: '1. Define nodes' },
  { href: '#step-2-define-edges', label: '2. Define edges' },
  { href: '#step-3-state-hooks', label: '3. State hooks' },
  { href: '#step-4-handle-connections', label: '4. Handle connections' },
  { href: '#step-5-render', label: '5. Render the canvas' },
  { href: '#result', label: 'Result' },
];

export default function BuildingAFlowPage() {
  return (
    <>
      <div className="page-content">
        <h1>Building a Flow</h1>
        <p>
          This guide walks through building a complete interactive flow from scratch.
          By the end, you'll have a canvas with draggable nodes, edges, and the ability
          to create new connections.
        </p>

        <h2 id="step-1-define-nodes">1. Define nodes</h2>
        <p>
          Create an array of node objects. Each node needs an <code>id</code>,
          <code>position</code>, and <code>data</code>. Optionally set a <code>type</code>.
        </p>
        <pre><code>{`const initialNodes = [
  { id: '1', type: 'input', position: { x: 0, y: 0 }, data: { label: 'Start' } },
  { id: '2', position: { x: 200, y: 100 }, data: { label: 'Process' } },
  { id: '3', type: 'output', position: { x: 400, y: 0 }, data: { label: 'End' } },
];`}</code></pre>

        <h2 id="step-2-define-edges">2. Define edges</h2>
        <p>
          Create an array of edge objects. Each edge connects a <code>source</code> node
          to a <code>target</code> node.
        </p>
        <pre><code>{`const initialEdges = [
  { id: 'e1-2', source: '1', target: '2' },
  { id: 'e2-3', source: '2', target: '3' },
];`}</code></pre>

        <h2 id="step-3-state-hooks">3. Use state hooks</h2>
        <p>
          The <code>useNodesState</code> and <code>useEdgesState</code> hooks manage your
          node and edge arrays. They return the current state, a setter, and an <code>onChange</code> handler.
        </p>
        <pre><code>{`const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);`}</code></pre>

        <h2 id="step-4-handle-connections">4. Handle new connections</h2>
        <p>
          The <code>onConnect</code> callback fires when a user drags from one handle to another.
          Use <code>addEdge</code> to add the new edge to your state.
        </p>
        <pre><code>{`const onConnect = useCallback(
  (connection) => setEdges((eds) => addEdge(connection, eds)),
  [setEdges],
);`}</code></pre>

        <h2 id="step-5-render">5. Render the canvas</h2>
        <p>
          Pass everything to <code>InfiniteCanvas</code>. Add <code>Controls</code> and <code>Background</code> as children.
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

        <h2 id="result">Result</h2>
        <ExampleBlock preview={<BasicFlow />} files={files} />
      </div>
      <OnThisPage links={tableOfContents} />
    </>
  );
}
