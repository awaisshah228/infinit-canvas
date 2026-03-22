import ExampleBlock from '../../../../components/ExampleBlock';
import OnThisPage from '../../../../components/OnThisPage';
import StressTestExample from '../../../../examples/StressTestExample';

const APP_CODE = `import { useMemo } from 'react';
import {
  InfiniteCanvas, useNodesState, useEdgesState,
  Controls, Background,
} from 'react-infinite-canvas';
import 'react-infinite-canvas/styles.css';

function generateGrid(cols = 15, rows = 10) {
  const nodes = [];
  const edges = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const id = \`\${r}-\${c}\`;
      nodes.push({ id, position: { x: c * 200, y: r * 80 }, data: { label: \`\${r},\${c}\` } });
      if (c > 0) edges.push({ id: \`eh-\${id}\`, source: \`\${r}-\${c-1}\`, target: id });
      if (r > 0) edges.push({ id: \`ev-\${id}\`, source: \`\${r-1}-\${c}\`, target: id });
    }
  }
  return { nodes, edges };
}

export default function App() {
  const { nodes: initNodes, edges: initEdges } = useMemo(() => generateGrid(), []);
  const [nodes, , onNodesChange] = useNodesState(initNodes);
  const [edges, , onEdgesChange] = useEdgesState(initEdges);

  return (
    <InfiniteCanvas nodes={nodes} edges={edges}
      onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
      fitView height="400px">
      <Controls />
      <Background variant="dots" />
    </InfiniteCanvas>
  );
}`;

const files = [{ name: 'App.jsx', code: APP_CODE }];

const tableOfContents = [
  { href: '#stress-test', label: 'Stress test' },
  { href: '#performance', label: 'Performance notes' },
];

export default function StressTestPage() {
  return (
    <>
      <div className="page-content">
        <h1>Stress Test</h1>
        <p>
          150 nodes and 270+ edges in a 15x10 grid. Infinite Canvas uses an OffscreenCanvas
          web worker, so even large graphs render at 60fps.
        </p>

        <h2 id="stress-test">Stress test</h2>
        <ExampleBlock preview={<StressTestExample />} files={files} />

        <h2 id="performance">Performance notes</h2>
        <ul>
          <li>Default nodes and edges are rendered on the canvas worker thread</li>
          <li>Only custom React node/edge types use the main thread</li>
          <li>Edge routing is computed in a separate web worker</li>
          <li>The MiniMap throttles to ~15fps to minimize overhead</li>
        </ul>
      </div>
      <OnThisPage links={tableOfContents} />
    </>
  );
}
