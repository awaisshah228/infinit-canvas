import ExampleBlock from '../../../../components/ExampleBlock';
import OnThisPage from '../../../../components/OnThisPage';
import DragAndDropExample from '../../../../examples/DragAndDropExample';

const APP_CODE = `import { useState, useCallback } from 'react';
import {
  InfiniteCanvas, useNodesState, useEdgesState, addEdge,
  Controls, Background, Panel,
} from '@infinit-canvas/react';
import '@infinit-canvas/react/styles.css';

let id = 1;
const getId = () => \`dnd_\${id++}\`;

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState([
    { id: '1', type: 'input', position: { x: 50, y: 50 }, data: { label: 'Start here' } },
  ]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [dragType, setDragType] = useState(null);

  const onConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

  const onDragStart = (event, type) => {
    setDragType(type);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDrop = useCallback((event) => {
    event.preventDefault();
    if (!dragType) return;
    setNodes((nds) => [...nds, {
      id: getId(),
      type: dragType,
      position: { x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY },
      data: { label: \`\${dragType} node\` },
    }]);
    setDragType(null);
  }, [dragType, setNodes]);

  return (
    <InfiniteCanvas nodes={nodes} edges={edges}
      onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
      onConnect={onConnect} fitView height="350px">
      <Controls />
      <Background variant="dots" />
      <Panel position="top-right">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 8, background: '#fff', border: '1px solid #ddd', borderRadius: 4, fontSize: 12 }}>
          <div style={{ fontWeight: 600 }}>Drag to canvas:</div>
          <div draggable onDragStart={(e) => onDragStart(e, 'input')} style={{ padding: '4px 8px', border: '1px solid #0041d0', borderRadius: 3, cursor: 'grab' }}>Input</div>
          <div draggable onDragStart={(e) => onDragStart(e, 'default')} style={{ padding: '4px 8px', border: '1px solid #1a192b', borderRadius: 3, cursor: 'grab' }}>Default</div>
          <div draggable onDragStart={(e) => onDragStart(e, 'output')} style={{ padding: '4px 8px', border: '1px solid #ff0072', borderRadius: 3, cursor: 'grab' }}>Output</div>
        </div>
      </Panel>
    </InfiniteCanvas>
  );
}`;

const files = [{ name: 'App.jsx', code: APP_CODE }];

const tableOfContents = [
  { href: '#drag-and-drop', label: 'Drag and drop' },
  { href: '#how-it-works', label: 'How it works' },
];

export default function DragAndDropPage() {
  return (
    <>
      <div className="page-content">
        <h1>Drag and Drop</h1>
        <p>
          Drag node types from a sidebar and drop them onto the canvas to create new nodes.
        </p>

        <h2 id="drag-and-drop">Drag and drop</h2>
        <ExampleBlock preview={<DragAndDropExample />} files={files} />

        <h2 id="how-it-works">How it works</h2>
        <ol>
          <li>Track the dragged node type in state</li>
          <li>Use the native <code>onDragStart</code> / <code>onDrop</code> events</li>
          <li>On drop, calculate the position and add a new node with <code>setNodes</code></li>
        </ol>
      </div>
      <OnThisPage links={tableOfContents} />
    </>
  );
}
