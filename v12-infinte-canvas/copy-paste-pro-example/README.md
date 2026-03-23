## Usage instructions

This example begins with a simple flow. You can select multiple nodes by holding <kbd>Ctrl</kbd> (or <kbd>Cmd</kbd> on Mac) and clicking each node you want to select. Then either use the standard cut/copy/paste keyboard system shortcuts or use the buttons in the toolbar to copy and paste the selected nodes!

## Core concepts

The basic approach to adding copy/paste functionality to your flows is simple: maintain a buffer of nodes and edges to copy and duplicate that buffer into your flow's state whenever you want to paste. There are a few sneaky gotchas lurking around though. How do we position the pasted nodes? What edges do we paste, if any? How should we handle keyboard shortcuts?

The `useCopyPaste` hook in this example takes care of all of these things for you and could serve as a great starting point for an interactive editor; especially when combined with our `useUndoRedo` example as well!

## Getting started

Before we put things in place for the copy/paste functionality, we'll need to set up a simple React Flow graph. There are no additional dependencies for this one, so all we need to install is React Flow itself:

```sh
npm install @xyflow/react
```

In App.tsx we have set up a basic flow with some initial nodes and edges. Beyond the familiar boilerplate of setting up the flow's state and change handlers, there is one important thing to note: We're creating a `ref` of the React Flow component so we can pass it to the `useCopyPaste` hook (more on that later).

## Implementing a copy/paste hook

The magic in this example happens inside the `useCopyPaste` hook. In it, we set up an initializer that prevents the default behaviour and tracks the mouse position and three callbacks, `copy`, `cut`, and `paste`.

### Initializing

#### Preventing default behavior

The final piece of the puzzle is a simple hook to prevent the browser's native copy/paste behaviour on the React Flow component. This can mess up our custom implementation so the easiest solution is to just disable it.

You may want something more robust in a real world app. A good first step would be to prevent the native copy/paste behaviour only when the event target is the `<ReactFlow/>` component itself: this would preserve the expected copy/paste functionality inside a node (like pasting into a test input, for example).

#### Tracking the mouse position

We are using a ref to keep track of the mouse position. For this we set up a mousemove handler in `useEffect` like this:

```ts
const onMouseMove = (event: MouseEvent) => {
  const bounds = ref.current?.getBoundingClientRect();
  mousePosRef.current = {
    x: event.clientX - (bounds?.left ?? 0),
    y: event.clientY - (bounds?.top ?? 0),
  };
};

ref.current.addEventListener('mousemove', onMouseMove);
```

We need to subtract the bounding box to calculate the mouse position in the flow relative to its parent nodes.

### Copy

The `copy` callback handles storying any selected nodes and appropriate edges in the buffer. Getting the selected nodes is simple enough, just filter all the nodes in the graph by their `selected` property. Working out which edges to copy is slightly more complicated, however.

In this example we've decided to only copy edges where both the source and target nodes are selected. First, we use the [`getConnectedEdges`](https://reactflow.dev/docs/api/graph-util-functions/#getconnectededges) utility function to get all the edges connected to the selected nodes. Then, we filter those edges to remove any edges where the source or target node is not selected.

```ts
const copy = useCallback(() => {
  const selectedNodes = getNodes().filter((node) => node.selected);
  const selectedEdges = getConnectedEdges(selectedNodes, getEdges()).filter(
    (edge) => {
      const isExternalSource = selectedNodes.every((n) => n.id !== edge.source);
      const isExternalTarget = selectedNodes.every((n) => n.id !== edge.target);

      return !(isExternalSource || isExternalTarget);
    }
  );

  setBufferedNodes(selectedNodes);
  setBufferedEdges(selectedEdges);
}, [getNodes, getEdges]);
```

### Cut

The implementation for `cut` is almost identical to `copy`, but we also need to remove the selected nodes and edges from the graph. Note how we're filtering the edges. Normally, equality for objects in JavaScript can give some surprising results as objects are compared by reference. In this case, however, we can rely on that behaviour to our advantage!

```ts
const cut = useCallback(() => {
  // ... same as `copy` ...

  // A cut action needs to remove the copied nodes and edges from the graph.
  setNodes((nodes) => nodes.filter((node) => !node.selected));
  setEdges((edges) => edges.filter((edge) => !selectedEdges.includes(edge)));
}, [getNodes, setNodes, getEdges, setEdges]);
```

### Paste

The `paste` callback is where things get a little more complicated. This callback takes an optional object with `x` and `y` properties which will be used to position the pasted nodes in the flow. If no position is provided, we'll use the mouse position passed into the hook:

```ts
const paste = useCallback(
  (
    { x: pasteX, y: pasteY } = screenToFlowPosition({
      x: options.mouseX,
      y: options.mouseY,
    })
  ) => {
    // ...
  }
);
```

The [`screenToFlowPosition`](https://reactflow.dev/api-reference/types/react-flow-instance#screen-to-flow-position) utility is used to convert the mouse position to a position in the flow's coordinate system, but this function is only called if a position is not provided.

Next, we need to work out how to reposition all the nodes in the buffer so they are relative to the desired paste position. We do this by first finding the minimum `x` and `y` values of all the nodes in the buffer.

```ts
const minX = Math.min(...bufferedNodes.map((s) => s.position.x));
const minY = Math.min(...bufferedNodes.map((s) => s.position.y));
```

Then, we map over the nodes in the buffer, create a new id for each node (this step is important!) and offset the node's position from the paste position by getting the difference between the node's position and the minimum `x` and `y` values we calculated earlier.

```ts
const newNodes: Node<NodeData>[] = bufferedNodes.map((node) => {
  const id = `${node.id}-${Date.now()}`;
  const x = pasteX + (node.position.x - minX);
  const y = pasteY + (node.position.y - minY);

  return { ...node, id, position: { x, y } };
});
```

Similar to the nodes, we need to create new ids for the edges in the buffer, and update the source and target ids to match the new node ids. If your approach to generating new ids is different to our simple example, you'll need to make sure you update the source and target ids accordingly.

```ts
const newEdges: Edge<EdgeData>[] = bufferedEdges.map((edge) => {
  const id = `${edge.id}-${Date.now()}`;
  const source = `${edge.source}-${Date.now()}`;
  const target = `${edge.target}-${Date.now()}`;

  return { ...edge, id, source, target };
});
```

All that's left to do is update our flow's state with the new nodes and edges:

```ts
setNodes((nodes) => [
  ...nodes.map((node) => ({ ...node, selected: false })),
  ...newNodes,
]);
setEdges((edges) => [...edges, ...newEdges]);
```

Notice how we map over the _current_ nodes and deselect them. This is important because we want the newly pasted nodes to be the only selected nodes in the flow so you can easily move them around, for example.

## The `useShortcut` Hook

After creating the copy/paste handlers, we register some keyboard shortcuts to trigger them calling a custom `useShortcut` hook:

```ts
useShortcut(['Meta+x', 'Control+x'], cut);
useShortcut(['Meta+c', 'Control+c'], copy);
useShortcut(['Meta+v', 'Control+v'], paste);
```

This hook is a fairly simple wrapper around the [`useKeyPress`](https://reactflow.dev/api-reference/hooks/use-key-press) hook we provide in the library. We need to do a little bit of bookkeeping to make sure the callback is only called once per key press. Without it, the callback would be called for every render while the key is pressed: that's a lot of pasting!
