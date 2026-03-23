import ExampleBlock from '../../../../components/ExampleBlock';
import OnThisPage from '../../../../components/OnThisPage';
import MindMapExample from '../../../../examples/MindMapExample';

const APP_CODE = `import { useCallback } from 'react';
import {
  InfiniteCanvas, useNodesState, useEdgesState, addEdge,
  Controls, Background, Handle, Panel,
} from '@infinit-canvas/react';
import '@infinit-canvas/react/styles.css';

function MindMapNode({ data }) {
  return (
    <div style={{
      padding: '6px 14px', background: data.color || '#fff',
      border: '1px solid #1a192b', borderRadius: 20,
      fontSize: 13, minWidth: 60, textAlign: 'center',
    }}>
      <Handle type="target" position="left" />
      {data.label}
      <Handle type="source" position="right" />
    </div>
  );
}

const nodeTypes = { mindmap: MindMapNode };

const initialNodes = [
  { id: 'root', type: 'mindmap', position: { x: 250, y: 150 }, data: { label: 'Main Idea', color: '#dbeafe' } },
  { id: '1', type: 'mindmap', position: { x: 500, y: 50 }, data: { label: 'Branch 1', color: '#dcfce7' } },
  { id: '2', type: 'mindmap', position: { x: 500, y: 150 }, data: { label: 'Branch 2', color: '#fef3c7' } },
  { id: '3', type: 'mindmap', position: { x: 500, y: 250 }, data: { label: 'Branch 3', color: '#fce7f3' } },
];

const initialEdges = [
  { id: 'e-root-1', source: 'root', target: '1' },
  { id: 'e-root-2', source: 'root', target: '2' },
  { id: 'e-root-3', source: 'root', target: '3' },
];

let idCounter = 10;

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const onConnect = useCallback((c) => setEdges((eds) => addEdge(c, eds)), [setEdges]);

  const addChild = useCallback(() => {
    const selected = nodes.find((n) => n.selected);
    if (!selected) return;
    const newId = \`node-\${idCounter++}\`;
    setNodes((nds) => [...nds, {
      id: newId, type: 'mindmap',
      position: { x: selected.position.x + 220, y: selected.position.y + (Math.random() - 0.5) * 100 },
      data: { label: 'New idea', color: '#e0e7ff' },
    }]);
    setEdges((eds) => [...eds, { id: \`e-\${selected.id}-\${newId}\`, source: selected.id, target: newId }]);
  }, [nodes, setNodes, setEdges]);

  return (
    <InfiniteCanvas nodes={nodes} edges={edges} nodeTypes={nodeTypes}
      onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
      onConnect={onConnect} fitView height="400px">
      <Controls />
      <Background variant="dots" />
      <Panel position="top-right">
        <button onClick={addChild}>+ Add Child</button>
      </Panel>
    </InfiniteCanvas>
  );
}`;

const NODE_CODE = `function MindMapNode({ data }) {
  return (
    <div style={{
      padding: '6px 14px',
      background: data.color || '#fff',
      border: '1px solid #1a192b',
      borderRadius: 20,
      fontSize: 13,
      minWidth: 60,
      textAlign: 'center',
    }}>
      <Handle type="target" position="left" />
      {data.label}
      <Handle type="source" position="right" />
    </div>
  );
}`;

const files = [
  { name: 'App.jsx', code: APP_CODE },
  { name: 'MindMapNode.jsx', code: NODE_CODE },
];

const tableOfContents = [
  { href: '#what-well-build', label: "What we'll build" },
  { href: '#step-1-custom-node', label: '1. Custom node' },
  { href: '#step-2-tree-structure', label: '2. Tree structure' },
  { href: '#step-3-add-children', label: '3. Add children dynamically' },
  { href: '#result', label: 'Result' },
];

export default function MindMapTutorialPage() {
  return (
    <>
      <div className="page-content">
        <h1>Tutorial: Mind Map App</h1>
        <p>
          Build a simple mind map app where you can branch ideas off a central node.
          Click a node and add children dynamically.
        </p>

        <h2 id="what-well-build">What we'll build</h2>
        <ExampleBlock preview={<MindMapExample />} files={files} />

        <h2 id="step-1-custom-node">1. Create a custom mind map node</h2>
        <p>
          Mind map nodes are pill-shaped with handles on left and right. We use a custom
          React component with rounded borders and colored backgrounds.
        </p>
        <pre><code>{NODE_CODE}</code></pre>
        <p>
          Register it as a custom type:
        </p>
        <pre><code>{`const nodeTypes = { mindmap: MindMapNode };`}</code></pre>

        <h2 id="step-2-tree-structure">2. Define the tree structure</h2>
        <p>
          Create a central root node with branches radiating outward. Each branch is
          connected via an edge from root to child.
        </p>
        <pre><code>{`const initialNodes = [
  { id: 'root', type: 'mindmap', position: { x: 250, y: 150 }, data: { label: 'Main Idea', color: '#dbeafe' } },
  { id: '1', type: 'mindmap', position: { x: 500, y: 50 }, data: { label: 'Branch 1', color: '#dcfce7' } },
  { id: '2', type: 'mindmap', position: { x: 500, y: 150 }, data: { label: 'Branch 2', color: '#fef3c7' } },
];

const initialEdges = [
  { id: 'e-root-1', source: 'root', target: '1' },
  { id: 'e-root-2', source: 'root', target: '2' },
];`}</code></pre>

        <h2 id="step-3-add-children">3. Add children dynamically</h2>
        <p>
          Use <code>setNodes</code> and <code>setEdges</code> to add new child nodes when
          the user clicks a button. The new node is positioned to the right of the selected parent.
        </p>
        <pre><code>{`const addChild = () => {
  const selected = nodes.find((n) => n.selected);
  if (!selected) return;

  const newId = \`node-\${idCounter++}\`;
  setNodes((nds) => [...nds, {
    id: newId,
    type: 'mindmap',
    position: { x: selected.position.x + 220, y: selected.position.y },
    data: { label: 'New idea', color: '#e0e7ff' },
  }]);
  setEdges((eds) => [...eds, {
    id: \`e-\${selected.id}-\${newId}\`,
    source: selected.id,
    target: newId,
  }]);
};`}</code></pre>

        <h2 id="result">Result</h2>
        <p>
          Select a node and click "Add Child" to grow your mind map. You can also drag
          nodes to rearrange and connect new branches by dragging handles.
        </p>
      </div>
      <OnThisPage links={tableOfContents} />
    </>
  );
}
