import { DragEvent, DragEventHandler } from 'react';
import {
  InfiniteCanvas,
  Background,
  InfiniteCanvasProvider,
  ConnectionLineType,
  MarkerType,
  ConnectionMode,
  Panel,
  NodeTypes,
  DefaultEdgeOptions,
  Controls,
  useReactFlow,
  MiniMap,
  SnapGrid,
} from '@infinit-canvas/react';

import '@infinit-canvas/react/styles.css';

import { defaultNodes, defaultEdges } from './initial-elements';
import ShapeNodeComponent from './components/shape-node';
import Sidebar from './components/sidebar';
import MiniMapNode from './components/minimap-node';
import { ShapeNode, ShapeType } from './components/shape/types';

const nodeTypes: NodeTypes = {
  shape: ShapeNodeComponent,
};

const defaultEdgeOptions: DefaultEdgeOptions = {
  type: 'smoothstep',
  markerEnd: { type: MarkerType.ArrowClosed },
  style: { strokeWidth: 2 },
};

const proOptions = { account: 'paid-pro', hideAttribution: true };
const snapGrid: SnapGrid = [10, 10];

function ShapesFlow() {
  const { screenToFlowPosition, setNodes } = useReactFlow<ShapeNode>();

  const onDragOver = (evt: DragEvent<HTMLDivElement>) => {
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'move';
  };

  // this function is called when a node from the sidebar is dropped onto the react flow pane
  const onDrop: DragEventHandler = (evt: DragEvent<HTMLDivElement>) => {
    evt.preventDefault();
    const type = evt.dataTransfer.getData('application/reactflow') as ShapeType;

    // this will convert the pixel position of the node to the react flow coordinate system
    // so that a node is added at the correct position even when viewport is translated and/or zoomed in
    const position = screenToFlowPosition({ x: evt.clientX, y: evt.clientY });

    const newNode: ShapeNode = {
      id: Date.now().toString(),
      type: 'shape',
      position,
      style: { width: 100, height: 100 },
      data: {
        type,
        color: '#3F8AE2',
      },
      selected: true,
    };

    setNodes((nodes) =>
      (nodes.map((n) => ({ ...n, selected: false })) as ShapeNode[]).concat([
        newNode,
      ])
    );
  };

  return (
    <InfiniteCanvas
      defaultNodes={defaultNodes}
      defaultEdges={defaultEdges}
      nodeTypes={nodeTypes}
      defaultEdgeOptions={defaultEdgeOptions}
      connectionLineType={ConnectionLineType.SmoothStep}
      fitView
      connectionMode={ConnectionMode.Loose}
      onDrop={onDrop}
      snapGrid={snapGrid}
      onDragOver={onDragOver}
      proOptions={proOptions}
    >
      <Background />
      <Panel position="top-left">
        <Sidebar />
      </Panel>
      <Controls />
      <MiniMap zoomable draggable nodeComponent={MiniMapNode} />
    </InfiniteCanvas>
  );
}

function ProExampleWrapper() {
  return (
    <InfiniteCanvasProvider>
      <ShapesFlow />
    </InfiniteCanvasProvider>
  );
}

export default ProExampleWrapper;
