import ExampleBlock from '../../../../components/ExampleBlock';
import OnThisPage from '../../../../components/OnThisPage';
import SaveRestoreExample from '../../../../examples/SaveRestoreExample';

const APP_CODE = `import { useCallback } from 'react';
import {
  InfiniteCanvas, useNodesState, useEdgesState, addEdge,
  Controls, Background, Panel,
} from '@infinit-canvas/react';

const STORAGE_KEY = 'ric-save-restore';

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges);

  const onConnect = useCallback(
    (c) => setEdges((eds) => addEdge(c, eds)), [setEdges],
  );

  const onSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, edges }));
  };

  const onRestore = () => {
    const flow = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (flow) { setNodes(flow.nodes); setEdges(flow.edges); }
  };

  return (
    <InfiniteCanvas nodes={nodes} edges={edges}
      onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
      onConnect={onConnect} fitView height="350px">
      <Controls />
      <Background variant="dots" />
      <Panel position="top-right">
        <button onClick={onSave}>Save</button>
        <button onClick={onRestore}>Restore</button>
        <button onClick={() => { setNodes([]); setEdges([]); }}>Clear</button>
      </Panel>
    </InfiniteCanvas>
  );
}`;

const files = [{ name: 'App.jsx', code: APP_CODE }];

const tableOfContents = [
  { href: '#save-and-restore', label: 'Save and restore' },
  { href: '#how-it-works', label: 'How it works' },
];

export default function SaveRestorePage() {
  return (
    <>
      <div className="page-content">
        <h1>Save and Restore</h1>
        <p>
          Save the current flow state to localStorage and restore it later.
        </p>

        <h2 id="save-and-restore">Save and restore</h2>
        <ExampleBlock preview={<SaveRestoreExample />} files={files} />

        <h2 id="how-it-works">How it works</h2>
        <ol>
          <li>Serialize <code>nodes</code> and <code>edges</code> to JSON</li>
          <li>Save to <code>localStorage</code> (or any backend)</li>
          <li>Restore by calling <code>setNodes</code> and <code>setEdges</code></li>
        </ol>
      </div>
      <OnThisPage links={tableOfContents} />
    </>
  );
}
