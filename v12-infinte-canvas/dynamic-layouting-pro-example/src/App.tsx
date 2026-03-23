/*
 * This example shows how you can use custom nodes and edges to dynamically add elements to your react flow graph.
 * A global layouting function calculates the new positions for the nodes every time the graph changes and animates existing nodes to their new position.
 *
 * There are three ways of adding nodes to the graph:
 *  1. Click an existing node: Create a new child node of the clicked node
 *  2. Click on the plus icon of an existing edge: Create a node in between the connected nodes of the edge
 *  3. Click a placeholder node: Turn the placeholder into a "real" node to prevent jumping of the layout
 *
 * The graph elements are added via hook calls in the custom nodes and edges. The layout is calculated every time the graph changes (see hooks/useLayout.ts).
 */
import {
  InfiniteCanvas,
  Background,
  Edge,
  Node,
  ProOptions,
  InfiniteCanvasProvider,
} from '@infinit-canvas/react';

import useLayout from './hooks/useLayout';
import nodeTypes from './NodeTypes';
import edgeTypes from './EdgeTypes';

import '@infinit-canvas/react/styles.css';

const proOptions: ProOptions = { account: 'paid-pro', hideAttribution: true };

// initial setup: one workflow node and a placeholder node
// placeholder nodes can be turned into a workflow node by click
const defaultNodes: Node[] = [
  {
    id: '1',
    data: { label: '🌮 Taco' },
    position: { x: 0, y: 0 },
    type: 'workflow',
  },
  {
    id: '2',
    data: { label: '+' },
    position: { x: 0, y: 150 },
    type: 'placeholder',
  },
];

// initial setup: connect the workflow node to the placeholder node with a placeholder edge
const defaultEdges: Edge[] = [
  {
    id: '1=>2',
    source: '1',
    target: '2',
    type: 'placeholder',
  },
];

const fitViewOptions = {
  padding: 0.1,
};

function InfiniteCanvasPro() {
  // this hook call ensures that the layout is re-calculated every time the graph changes
  useLayout();

  return (
    <>
      <InfiniteCanvas
        defaultNodes={defaultNodes}
        defaultEdges={defaultEdges}
        proOptions={proOptions}
        fitView
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitViewOptions={fitViewOptions}
        minZoom={0.2}
        nodesDraggable={false}
        nodesConnectable={false}
        zoomOnDoubleClick={false}
        // we are setting deleteKeyCode to null to prevent the deletion of nodes in order to keep the example simple.
        // If you want to enable deletion of nodes, you need to make sure that you only have one root node in your graph.
        deleteKeyCode={null}
      >
        <Background />
      </InfiniteCanvas>
    </>
  );
}

function InfiniteCanvasWrapper() {
  return (
    <InfiniteCanvasProvider>
      <InfiniteCanvasPro />
    </InfiniteCanvasProvider>
  );
}

export default InfiniteCanvasWrapper;
