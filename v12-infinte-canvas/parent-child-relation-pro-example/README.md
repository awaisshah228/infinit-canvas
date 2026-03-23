## Usage Instructions

This example shows how to attach and detach a node to a parent dynamically. You can drop a node above a group node to attach it. For removing the node, we added a toolbar with a "detach" button.

## Getting Started

If you are starting from scratch, you need to install `@xyflow/react`.

```sh
npm install @xyflow/react
```

This guide uses the [built-in subflow feature](https://reactflow.dev/examples/grouping/sub-flows) for grouping nodes.

## Adding a Node to a Group

As explained above you can add a node to a group by dragging it from the sidebar or from the pane. For this we implement an `onDrop` and an `onNodeDragStop` handler. For both handlers we are using the [getIntersectingNodes](https://reactflow.dev/api-reference/types/react-flow-instance#get-intersecting-nodes) helper to find out if there is an intersection with a group node. The tricky part here is to calculate the correct position for the child node (if there is an intersection) because its position is relative to its parent. For this we implemented a helper function called getNodePositionInsideParent that calculates the correct position for the child node based on the group node that it intersects with. There are two conditions that we need to check for the x- and y-coordinate:

1. **Is child node x smaller than group node x?** If yes, we need to set the x of the child node to zero
2. **Is child node x plus its width larger than group node x plus its width?** If yes, we need to set the x-coordinate of the child node to the width of the group node minus the width of the child node.

When none of the above conditions are true, we need to subtract the x- and y-coordinate of the group node from the coordinates of the child node to give it a relative position.

## Custom Node With Toolbar

We create a custom node type called "node" for this example. We need to implement a custom node, because we want to attach a [NodeToolbar](https://reactflow.dev/api-reference/components/node-toolbar) to add some functionality for detaching and deleting it.

### Detaching a Node

For detaching nodes from a parent, we implemented a helper hook useDetachNodes. This helper can be used to detach a single node or for all nodes and also remove the parent node. Because the node positions are relative to its parent, we need to calculate the correct position for the detached node:

```js
const position: {
  x: n.position.x + parentNode.internals.positionAbsolute.x,
  y: n.position.y + parentNode.internals.positionAbsolute.y,
};
```
