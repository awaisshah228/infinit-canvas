## Usage Instructions

This example contains React Flow nodes that are rendered using a force layout algorithm. When you start the example, you can see a predefined force directed graph that contains a few default nodes and edges. If you click anywhere on the React Flow pane, a new node will be added to the force layout and attracted to the other nodes. If you click on a node itself, a child node gets added to that node.

## Getting Started

To use the example code, you need to install the dependencies first:

```sh
npm install @xyflow/react d3-force
```

If you want to run the example locally please download the example, unzip it and run the following commands in your terminal:

```sh
cd force-layout-example
npm install
npm start
```

This will start a development server and run the example in your browser.

## App.tsx

The App component contains some boilerplate code for storing the nodes and edges in a local state and handling changes triggered by React Flow. It also implements the onNodeClick and onPaneClick callbacks that are used to add nodes and edges to the state.

## implementing the useForceLayout hook

All the logic regarding the layout and animation is being done in the `useForceLayout` hook. It is called from `App.tsx` and basically watches the nodes and edges from React Flow for changes. If the nodes and edges change, it computes the force layout using the `d3-force` package and sets the new positions of the nodes.

To achieve that, we first need a function that is called whenever the nodes change. Therefore, we implement two state selectors:

```tsx
const elementCountSelector = (state: ReactFlowState) =>
  state.nodeInternals.size + state.edges.length;
const nodesInitializedSelector = (state: ReactFlowState) =>
  Array.from(state.nodeInternals.values()).every(
    (node) => node.width && node.height
  ) && state.nodeInternals.size;
```

The `elementCountSelector` returns the number of elements in our React Flow state. The `nodesInitializedSelector` returns a boolean which is true when all nodes have been initialized (they have a width and height property attached to them).

Within the hook, we can now call these selectors and add their results to a `useEffect` dependency array:

```tsx
const elementCount = useStore(elementCountSelector);
const nodesInitialized = useStore(nodesInitializedSelector);

useEffect(() => {
  console.log('compute force layout here...');
}, [elementCount, nodesInitialized]);
```

The reason why we are doing this is to not run the layout algorithm every time the nodes change (because the function will change the node positions itself) but only if elements get removed or added to the graph.

Inside of the `useEffect`, we can now construct the force layout and pass it our current nodes:

```tsx
const simulation = forceSimulation().nodes(simulationNodes);
```

The `simulationNodes` are just the nodes from React Flow but in a slightly different format that the forceSimulation expects here. For configuring the force layout, we are adding some "forces" to the simulation. These forces are telling the simulation how nodes are attracting each other and where the nodes are heading. You can read more about the different forces and how to customize them in the [d3-force documentation](https://github.com/d3/d3-force).

To get the positions from the force layout back into the React Flow graph, we are adding a callback to the forceSimulation that runs on every position change:

```tsx
.on('tick', () => {
  setNodes(
    simulationNodes.map((node) => ({
      id: node.id,
      data: node.data,
      position: { x: node.x, y: node.y },
      className: node.className,
    }))
  );
});
```

Here we are passing the updated position from d3-force to the `position` option of the node which will cause the node to re-render.
