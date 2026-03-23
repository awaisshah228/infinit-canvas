## Usage Instructions

This example shows how to group nodes dynamically. When you hold Shift to select multiple nodes, a toolbar appears that lets you create a group for the selected nodes. If the group node is selected, you can use the "Ungroup" button to detach all child nodes. A group node is resizable and uses its child nodes for its minimal width and height (this is a built-in feature for parent nodes).

## Getting Started

If you are starting from scratch, you need to install `@xyflow/react`.

```sh
npm install @xyflow/react
```

This guide does not explain how to implement the side bar drag and drop bahaviour. For that, please refer to the [auto layout pro example](https://reactflow.dev/examples/auto-layout).

## Subflows and Group Nodes

This example uses the built-in sub flow feature for grouping nodes. If you want to attach a node to a parent, you need to use the `parentId` option:

```js
const nodeWithParent = {
  id: 'node-id',
  type: 'input',
  data: { label: 'Node with a parent' },
  position: { x: 0, y: 0 },
  // 👇 use this option to attach the node to a parent
  parentId: 'parent-id',
};
```

You can read more about sub flows in the [sub flow guide](https://reactflow.dev/examples/grouping/sub-flows).

## Custom Nodes With Toolbars and NodeResizer

We create a custom node type called "GroupNode" for this example. We need to implement a custom node, because we want to attach a [NodeToolbar](https://reactflow.dev/api-reference/components/node-toolbar) to add some functionality for detaching the child nodes. For the group node we are also adding the [NodeResizer](https://reactflow.dev/api-reference/components/node-resizer) component.

### Detaching Nodes

For detaching nodes from the group, we implemented a helper hook `useDetachNodes`. This helper can be used to detach multiple nodes and also removes the parent node itself. Because the node positions are relative to its parent, we need to calculate the correct position for the detached node:

```js
const position: {
  x: n.position.x + parentNode.internals.positionAbsolute.x,
  y: n.position.y + parentNode.internals.positionAbsolute.y,
};
```
