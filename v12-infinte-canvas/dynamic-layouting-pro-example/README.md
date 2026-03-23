## Usage Instructions

When loading the example app, you can see two nodes - a default one and a placeholder. In this app there are two ways to create a new child for a node:

1. Clicking the node itself
2. Clicking the placeholder which will turn into a node.

Whenever a node has one or more child nodes, you can see a small plus button on the edge, which will create a node in between the parent and the child. Whenever nodes are created, they are animated smoothly to their new position and get a placeholder automatically.

## Core Concepts

The general idea behind this example is to manipulate the nodes and edges of a graph without having to position and connect them with your mouse. We want to make it as easy as possible to add new nodes while always having a clean and organized visual result of the graph. Additionally, we want new nodes to transition smoothly to their position to prevent any flickering or jumping of the graph.

For adding new nodes and edges to the graph, we will implement several handlers for different UI interactions: Clicking a node adds a new child node, clicking an edge button adds a new node inbetween parent and child and clicking a placeholder turns the placeholder into a node.

Moreover, we will implement an auto layout hook that calculates the position of the nodes whenever the graph changes. We also want the placeholders to be placed at the same position of the node that they create. Therefore, we treat the placeholder nodes and edges the same as the regular React Flow elements.

## Getting Started

We recommend to have a look at the [auto layout example](https://pro.reactflow.dev/examples/auto-layout) first, as it has some features of this example built in. The auto layout example is more beginner-friendly than this one.

If you are starting from scratch, you will need to install the latest React Flow version into your project:

```sh
npm install @xyflow/react
```

This example makes use of the [d3-hierarchy](https://github.com/d3/d3-hierarchy) library for calculating the layout and [d3-timer](https://github.com/d3/d3-timer) for animating the nodes.

```sh
npm install d3-hierarchy d3-timer
```

## Custom Nodes and Edges

Let's start with the implementation by defining our custom node and edge types. We need two different types of nodes and edges.

The first is the so-called workflow node and edge. This type is used for the elements that are added to the graph. In a workflow builder app, these might be different types of inputs, actions, or outputs. In our simplified example, we apply random emojis as labels.

The implementation of the WorkflowNode is similar to the default node of React Flow:

```tsx
<div onClick={onClick} title="click to add a child node">
  {data.label}
  <Handle type="target" position={Position.Top} isConnectable={false} />
  <Handle type="source" position={Position.Bottom} isConnectable={false} />
</div>
```

In the middle of the WorkflowEdge, we want to display a button with a plus icon. For this we are using the [EdgeLabelRenderer](https://reactflow.dev/api-reference/components/edge-label-renderer)

```tsx
const [edgePath, edgeCenterX, edgeCenterY] = getBezierPath({
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
});

return (
  <>
    <BaseEdge id={id} style={style} path={edgePath} markerEnd={markerEnd} />
    <EdgeLabelRenderer>
      <button
        style={{
          transform: `translate(${edgeCenterX}px, ${edgeCenterY}px) translate(-50%, -50%)`,
        }}
        onClick={onClick}
        className="edge-button nodrag nopan"
      >
        +
      </button>
    </EdgeLabelRenderer>
  </>
);
```

The second node and edge type is a placeholder which connects to every node that does not have a child node yet. The implementation of the `PlaceholderEdge` is similar to the `WorkflowNode` and `WorkflowEdge`. The only differences are the styling, different event handlers and the missing plus button on the edge.

Now that we have the node and edge types implemented, we can import and add them to the React Flow component:

```tsx
import ReactFlow from '@infinit-canvas/react';

import nodeTypes from './NodeTypes';
import edgeTypes from './EdgeTypes';

function ReactFlowPro() {
  return (
    <ReactFlow
      defaultNodes={defaultNodes}
      defaultEdges={defaultEdges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
    />
  );
}
```

In the next step, we will implement the different click handlers for manipulating the elements in the graph.

## Interaction Handlers

Because we want to manipulate elements of the graph through three different interactions, we will implement three hooks that return event handlers: `usePlaceholderClick`, `useEdgeClick` and `useNodeClick`. As their names imply, they are used in different places in our custom nodes and edges that we have implemented previously.

The three interaction hooks are all making use of the helper functions that are exported from the [`ReactFlowInstance`](https://reactflow.dev/api-reference/types/react-flow-instance). These helper functions are used to add, remove, update and insert nodes and edges to the workflow graph:

```tsx
const { setEdges, setNodes, getNode, getEdge } = useReactFlow();
```

You can refer to the full implementation of the interaction hooks to see the exact differences in their functionality. The different hooks are then used in the custom nodes and edges, for example in the placeholder node:

```tsx
const PlaceholderNode = ({ id, data }: NodeProps) => {
  // see the hook implementation for details of the click handler
  // calling onClick turns this node and the connecting edge into a workflow node
  const onClick = usePlaceholderClick(id);

  return (
    <div onClick={onClick} title="click to add a node">
      {data.label}
      <Handle type="target" position={Position.Top} isConnectable={false} />
      <Handle type="source" position={Position.Bottom} isConnectable={false} />
    </div>
  );
};
```

After binding the event handlers to the nodes and edges, we are ready to layout our dynamic graph whenever it changes.

## Layout

**Note**: The layout implementation of this example is based on the [auto layout example](https://pro.reactflow.dev/examples/auto-layout). You can refer to it for more details.

The `useLayout` hook we are going to implement in the following will be responsible for running a layout algorithm whenever the graph changes (e.g. a node is added). We will be using the `setNodes` method from React Flow to update the node positions after the layout is calculated.

To trigger the layout algorithm whenever the graph nodes change, we use the same concept as in the [auto layout example](https://pro.reactflow.dev/examples/auto-layout). By selecting the number of nodes from the store and adding this number as a dependency to a `useEffect` call, we can run a function every time the number of nodes changes.

The layout is computed with the help of the [d3-hierarchy](https://github.com/d3/d3-hierarchy) package. We first initialize the tree layout with the size of the nodes:

```tsx
import { stratify, tree } from 'd3-hierarchy';

// initialize the tree layout (see https://observablehq.com/@d3/tree for examples)
const layout = tree<Node>()
  // the node size configures the spacing between the nodes ([width, height])
  .nodeSize([200, 150])
  // this is needed for creating equal space between all nodes
  .separation(() => 1);
```

After that, in our `useEffect`, we convert the current React Flow nodes and edges to a hierarchy object by using the `stratify` method:

```tsx
const hierarchy = stratify<Node>()
  .id((d) => d.id)
  .parentId((d: Node) => edges.find((e: Edge) => e.target === d.id)?.source)(
  nodes
);
```

Now that we have the hierarchy object, we can run the layout algorithm:

```tsx
const root = layout(hierarchy);
```

After the layout is computed, we convert the hierarchy nodes back to React Flow nodes and add their new positions:

```tsx
const targetNodes = root
  .descendants()
  .map((d) => ({ ...d.data, position: { x: d.x, y: d.y } }));
```

If you do not want to animate the nodes, you can just call `setNodes(targetNodes)`. Since we want to smoothly transition the nodes between their last and new position to prevent jumping of the layout, we are adding an animation function in the next step.

## Animation

For adding the animation of the nodes, we are making use of the [`d3-timer`](https://github.com/d3/d3-timer) package. Before we can interpolate between the node positions, we create a helper object that contains the current and the desired position for each node:

```tsx
const transitions = targetNodes.map((node) => {
  return {
    id: node.id,
    // this is where the node currently is placed
    from: getNode(node.id)?.position || node.position,
    // this is where we want the node to be placed
    to: node.position,
    node,
  };
});
```

The `from` property contains the current position, the `to` property contains the target position which was calculated by the layout function. Now we can interpolate between the `from` and `to` property using the `timer` function from `d3-timer`:

```tsx
const t = timer((elapsed: number) => {
  const s = elapsed / options.duration;

  const currNodes = transitions.map(({ node, from, to }) => {
    return {
      id: node.id,
      position: {
        // simple linear interpolation
        x: from.x + (to.x - from.x) * s,
        y: from.y + (to.y - from.y) * s,
      },
      data: { ...node.data },
      type: node.type,
    };
  });

  setNodes(currNodes);
});
```

The above code will run indefinetly. To prevent this, we add a condition that stops the animation after the animation duration is reached:

```tsx
if (elapsed > options.duration) {
  // we are moving the nodes to their destination
  // this needs to happen to avoid glitches
  const finalNodes = transitions.map(({ node, to }) => {
    return {
      id: node.id,
      position: {
        x: to.x,
        y: to.y,
      },
      data: { ...node.data },
      type: node.type,
    };
  });

  setNodes(finalNodes);

  // stop the animation
  t.stop();
```

We also want to stop the animation, if the `useEffect` function is called while an animation is in progress. For that, we return the stop method from the `useEffect` callback:

```tsx
return () => {
  t.stop();
};
```
