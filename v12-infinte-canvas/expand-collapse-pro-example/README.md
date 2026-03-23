## Usage Instructions

The expand and collapse example consists of a predefined tree. If a node has direct children, it can be expanded or collapsed by clicking the node body. Additionally, it is possible to add child nodes to a node by clicking the button below the node.

## Getting Started

This example is built with the help of the [dagre](https://github.com/dagrejs/dagre) package for the expand/collapse functionality and the tree layout. To install the dependencies, you can run:

```sh
npm install @xyflow/react @dagrejs/dagre
```

If you want to run the example locally please download the example, unzip it and run the following commands in your terminal:

```
cd expand-collapse-example
npm install
npm start
```

This will start a development server and run the example.

## Core Concept

In this example, we are adding a flag to the [node data object](https://reactflow.dev/api-reference/types/node#data) that controls if a node is expanded or collapsed:

```tsx
// this is how a node object looks like in our example
const ExpandedNode = {
  id: 'someId',
  position: { x: 0, y: 0 },
  data: { expanded: true },
};
```

Expanded means that the direct child nodes of the node are visible, whereas they are hidden when the node is collapsed (`expanded: false`). To achieve this, we are constructing a hierarchical data structure from the nodes and edges. Within the hierarchy, we are adding child nodes to a node if the node is expanded and removing the child nodes when the node is collapsed.

The current hierarchy is then rendered using React Flow. Whenever a node is collapsed or expanded by changing the node data object or if a new node is added, the hierarchy is computed again and re-rendered.

## App.tsx

The first thing that we need to add to our app is a local state for our nodes and edges:

```tsx
const [nodes, setNodes] = useState<Node[]>(initialNodes);
const [edges, setEdges] = useState<Edge[]>(initialEdges);
```

These two states are always storing the whole graph and are initialized from the `initialElements.ts`. If we are passing these nodes directly to the `<InfiniteCanvas />` component, we will just see all nodes and edges as expected.

Because we want to only display the child nodes of the expanded nodes together with their edges, we are passing our nodes state through a hook called `useExpandCollapse`. This hook returns a subset of our `nodes` and `edges` and computes the layout if needed:

```tsx
const { nodes: visibleNodes, edges: visibleEdges } = useExpandCollapse(
  nodes,
  edges,
  { treeWidth, treeHeight }
);
```

In the end we have `visibleNodes` and `visibleEdges` which can be passed to the `<InfiniteCanvas />` component to render:

```tsx
<InfiniteCanvas nodes={visibleNodes} edges={visibleEdges} {...rest} />
```

For expanding and collapsing a node, we are adding a `onNodeClick` callback that toggles the `expanded` flag within the node data object:

```tsx
data: { ...n.data, expanded: !n.data.expanded }
```

## useExpandCollapse

The job of the `useExpandCollapse` hook is to return only the nodes and edges that are currently visible. That means removing the child nodes from collapsed nodes and their outgoing edges. To do this, we first create a dagre object from our nodes and edges:

```tsx
const dagre = new Dagre.graphlib.Graph()
  .setDefaultEdgeLabel(() => ({}))
  .setGraph({ rankdir: 'TB' });
```

As you might notice, we are also adding a `expandable` flag that tells the node if it has child nodes or not. This can be used within your custom node to display a label or disable the node click event for example.

Now we have the graph with expanded and collapsed nodes plus their positions from the layout algorithm. From the dagre object, we are returning the nodes by transforming them back to React Flow node objects. Additionally, we are returning the edges by filtering out the edges that don't have a valid connection within the expanded and collapsed graph.

## CustomNode.tsx

The custom node component in this example is just for demo purposes. It displays the label according to the expanded state of the node (which is stored in the node data object). It's also used to add a button below the node to add child nodes easily for demonstrating the example with a dynamically changed graph.

---

## Notes

Previously, this example was built using a static dataset and adding the collapse and expand mechanism on mount only. You can access the old example code [here](https://pro.reactflow.dev/examples/expand-collapse-deprecated).
