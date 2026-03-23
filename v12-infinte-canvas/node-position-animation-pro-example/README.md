## Usage Instructions

The node position animation example comes with two pre-defined layouts that you can animate between. If you click on the "toggle layout" button, the nodes will animate to the new positions defined by the layout.

## Getting Started

This example depends on the [d3-timer](https://github.com/d3/d3-timer) package for doing the animation of the node positions. To install the dependencies, you can run:

```sh
npm install @xyflow/react d3-timer
```

To run the example locally please download it, unzip it and run the following commands in your terminal:

```
cd expand-collapse-example
npm install
npm start
```

This will start a development server and run the example.

## Core Concept

In this example we have two pre-defined layouts:

```js
const layoutA: Layout = {
  A: { x: 0, y: 0 },
  B: { x: -150, y: 100 },
  C: { x: 150, y: 100 },
  D: { x: -300, y: 200 },
  E: { x: 300, y: 200 },
};

const layoutB: Layout = {
  A: { x: 0, y: 0 },
  B: { x: 0, y: 50 },
  C: { x: 0, y: 100 },
  D: { x: 0, y: 150 },
  E: { x: 0, y: 200 },
};
```

This is a simplified representation of a result a layout library could return. By pressing the "toggle layout" button, the user switched between layoutA and layoutB. For this we are adjusting the node positions based on the active layout:

```js
setNodes((nds) => {
  return nds.map((node) => {
    const nextPosition = layout[node.id];

    return {
      ...node,
      position: nextPosition,
    };
  });
});
```

Whenever we call `setNodes`, our `useAnimatedNodes` hook will tween between the previous and the next position.

## useAnimatedNodes

To create a smooth animation from one tree layout to the next, we are creating a hook called `useAnimatedNodes`. This hook accepts the next nodes to display (the result of `useExpandCollapse`) and compares their position to the currently rendered nodes. If the position is different, the function interpolates between the last and the current position.

The most important piece of this hook is how the transitions are being defined:

```tsx
const transitions = nodes.map((node) => ({
  id: node.id,
  from: getNode(node.id)?.position ?? node.position,
  to: node.position,
  node,
}));
```

Basically, for every node we are checking with the `getNode` function from React Flow if it already exists in the state. If it exists, we are transitioning from the current position to the new desired position. If it doesn't exist, we are just putting it directly at the desired position.

Once we have the transitions, we can create a timing function and interpolate between `from` and `to`:

```tsx
const t = timer((elapsed) => {
  const s = elapsed / animationDuration;

  const currNodes = transitions.map(({ node, from, to }) => {
    return {
      ...node,
      position: {
        x: from.x + (to.x - from.x) * s,
        y: from.y + (to.y - from.y) * s,
      },
    };
  });

  setTmpNodes(currNodes);

  if (elapsed > animationDuration) {
    // it's important to set the final nodes here to avoid glitches
    setTmpNodes(nodes);
    t.stop();
  }
});
```
