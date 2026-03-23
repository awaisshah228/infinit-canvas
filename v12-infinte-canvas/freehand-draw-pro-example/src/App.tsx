import { useState, useCallback } from 'react';
import {
  InfiniteCanvas,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
  type Connection,
  Edge,
} from '@infinit-canvas/react';
import '@infinit-canvas/react/styles.css';

import { FreehandNode } from './FreehandNode';
import { Freehand } from './Freehand';
import { initialEdges, initialNodes } from './initial-elements';

const nodeTypes = {
  freehand: FreehandNode,
};

function App() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isDrawing, setIsDrawing] = useState(true);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds: Edge[]) => addEdge(params, eds)),
    [setEdges],
  );

  return (
    <InfiniteCanvas
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      panOnDrag={!isDrawing}
      zoomOnScroll={!isDrawing}
      panOnScroll={!isDrawing}
      selectNodesOnDrag={!isDrawing}
      fitView
    >
      {isDrawing && <Freehand />}
      <Controls />
      <Background />
      <Panel position="top-left">
        <div className="xy-theme__button-group">
          <button
            className={`xy-theme__button ${isDrawing ? 'active' : ''}`}
            onClick={() => setIsDrawing(true)}
          >
            Drawing Mode
          </button>
          <button
            className={`xy-theme__button ${!isDrawing ? 'active' : ''}`}
            onClick={() => setIsDrawing(false)}
          >
            Selection Mode
          </button>
        </div>
      </Panel>
    </InfiniteCanvas>
  );
}

export default App;
