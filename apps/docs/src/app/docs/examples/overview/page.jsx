import ExampleBlock from '../../../../components/ExampleBlock';
import OnThisPage from '../../../../components/OnThisPage';
import OverviewExample from '../../../../examples/OverviewExample';

const APP_CODE = `import { useCallback } from 'react';
import {
  InfiniteCanvas, useNodesState, useEdgesState, addEdge,
  Controls, MiniMap, Background, Handle, NodeToolbar,
} from 'react-infinite-canvas';
import 'react-infinite-canvas/styles.css';

function ColorNode({ data, selected }) {
  return (
    <div style={{
      background: data.color || '#fff',
      border: '1px solid #1a192b',
      borderRadius: 3,
      padding: 10, minWidth: 140, fontSize: 12,
    }}>
      <Handle type="target" position="left" />
      <div style={{ fontWeight: 600 }}>{data.label}</div>
      {data.description && <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{data.description}</div>}
      <NodeToolbar position="top">
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 4, padding: '2px 8px', fontSize: 11 }}>Edit</div>
      </NodeToolbar>
      <Handle type="source" position="right" />
    </div>
  );
}

const nodeTypes = { color: ColorNode };

const initialNodes = [
  { id: '1', type: 'input', position: { x: 0, y: 0 }, data: { label: 'Input Node' } },
  { id: '2', type: 'color', position: { x: 250, y: -30 }, data: { label: 'Custom Node', color: '#dbeafe', description: 'With toolbar' } },
  { id: '3', type: 'color', position: { x: 250, y: 100 }, data: { label: 'Process', color: '#dcfce7' } },
  { id: '4', position: { x: 500, y: 0 }, data: { label: 'Default Node' } },
  { id: '5', type: 'output', position: { x: 500, y: 130 }, data: { label: 'Output Node' } },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2' },
  { id: 'e1-3', source: '1', target: '3', animated: true },
  { id: 'e2-4', source: '2', target: '4' },
  { id: 'e3-5', source: '3', target: '5', type: 'smoothstep' },
];

export default function App() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const onConnect = useCallback((c) => setEdges((eds) => addEdge(c, eds)), [setEdges]);

  return (
    <InfiniteCanvas nodes={nodes} edges={edges} nodeTypes={nodeTypes}
      onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
      onConnect={onConnect} fitView height="400px">
      <Controls />
      <MiniMap />
      <Background variant="dots" />
    </InfiniteCanvas>
  );
}`;

const files = [{ name: 'App.jsx', code: APP_CODE }];

const tableOfContents = [
  { href: '#feature-overview', label: 'Feature overview' },
  { href: '#whats-included', label: "What's included" },
];

export default function OverviewExamplePage() {
  return (
    <>
      <div className="page-content">
        <h1>Feature Overview</h1>
        <p>
          A kitchen-sink demo showing all major features: built-in and custom nodes,
          edge types, Controls, MiniMap, Background, NodeToolbar, and more.
        </p>

        <h2 id="feature-overview">Feature overview</h2>
        <ExampleBlock preview={<OverviewExample />} files={files} />

        <h2 id="whats-included">What's included</h2>
        <ul>
          <li><strong>Input, Default, Output</strong> — built-in node types</li>
          <li><strong>Custom nodes</strong> — ColorNode with Handle and NodeToolbar</li>
          <li><strong>Edge types</strong> — default (bezier), smoothstep, animated</li>
          <li><strong>Controls</strong> — zoom in/out, fit view</li>
          <li><strong>MiniMap</strong> — overview of the canvas</li>
          <li><strong>Background</strong> — dot pattern</li>
          <li><strong>Connections</strong> — drag from handle to handle</li>
        </ul>
      </div>
      <OnThisPage links={tableOfContents} />
    </>
  );
}
