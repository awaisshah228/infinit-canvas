# Auto Layout Pro Example

This is a [vite](https://vitejs.dev/) app that shows how to automatically arrange your nodes after adding items to your flow.

## Installation

To get started, you can download the source code from our [pro platform](https://pro.reactflow.dev/examples), unzip it, and `cd` into the folder.

After that, install the dependencies like this:

```sh
npm install
```

Now you can run the development environment:

```sh
npm run dev
```

## Guide

- [Dependencies](#dependencies)
- [Breakdown](#breakdown)
- [Related docs](#related-docs)
- [See also](#see-also)

This example introduces a `useAutoLayout` hook and acts as a demonstration of various
common layout packages used with React Flow. The example app lets you freely
switch between three options: [dagre](https://github.com/dagrejs/dagre),
[d3-hierarchy](https://github.com/d3/d3-hierarchy), and
[elk](https://github.com/kieler/elkjs).

## Dependencies

- @xyflow/react
- @dagrejs/dagre@1.0.4
- d3-hierarchy@3.1.2
- elkjs@0.9.1

Note: in your applications, you'll likely choose just **one** of the layouting
dependencies above.

## Breakdown

### `LayoutAlgorithm` and the `useAutoLayout` hook

Different layouts libraries handle setup and layout slightly differently.
To make it easier to switch between them, we've abstracted laying into a
`LayoutAlgorithm` type that is a function from nodes and edges (and some options)
to a promise of a layout flow.

Each module in the `algorithms/` directory then exposes a function that
satisfies this `LayoutAlgorithm` type. By standardizing things this way, it should
be easier for us to add new layouts libraries and for you to
experiment with your own!

The `useAutoLayout` hook is responsible for running a particular layouting
algorithm _automatically_. This is primarily achieved with a custom equality
the function passed to [`useStore`](https://reactflow.dev/docs/api-reference/hooks/use-store/)
that makes sure the elements object is only changed when something significant
like a change in node size occurs.

### Detecting changes in your nodes and edges

The `useAutoLayout` hook aims to trigger a layout algorithm whenever the nodes or edges change. This turns out to be more complicated than it might seem because:

- the nodes are changing when they get their new position from the layout algorithm, so it's easy to end up in an endless loop here
- edges can be updated, so we need to check the source and target of an edge to listen for changes

To solve these, the `useAutoLayout` hook efficiently compares the nodes and edges whenever a state update occurs and triggers the layout algorithm accordingly. Updates are triggered if one of these is true:

- number of nodes changes
- the ID of one or multiple nodes changes
- dimensions of one of the node changes (not during resize via the node resizer component)
- number of edges changes
- the id of one or multiple edges changes
- source or target of an edge changes

You can adjust the compare functions to fit your use case, for example, if you want to run the layout whenever a field of a node's `data` property changes.

### Comparing layout algorithms

The example app lets you switch between layout algorithms
to understand how they differ. We have a [layouting guide](https://reactflow.dev/learn/layouting/layouting)
over on our docs, which also serve as a comparison between different algorithms.

### Adding new nodes and edges

You'll note that adding new nodes is possible by clicking on existing ones or
using the Leva control panel. Like most flows, creating
new edges by connecting handles is possible. When a new node or edge is added to the flow,
**We set its initial opacity to 0**.

This is done to reduce the flickering and jumping of nodes and ensures that a node only gets displayed when it has the coordinates from the layout algorithm.

### Tips for better performance

It's natural for React Flow apps to end up iterating over their nodes and edges
many times. This is usually fine, but as the number of elements in
your flow grows, you may notice some performance issues creeping in if you're
not careful.

Layouting algorithms can naturally be quite expensive as your flow grows, so here
are some tips you can apply to your code to cut down on unnecessary work:

#### Favour iterating over nodes and edges with `for .. of` loops instead of `Array.prototype.map` or `Array.prototype.forEach.`

Array methods have some [sizable performance costs](https://leanylabs.com/blog/js-forEach-map-reduce-vs-for-for_of/) that for most applications will be negligible, but for React Flow, apps can add up.

#### Avoid using `Array.prototype.map` in places where you can opt into array mutation

Allocating multiple arrays can be a waste of work if you can eliminate mutating an array in place. Be mindful that mutating your nodes or edges array directly **will not work correctly** with React's state tracking: you'll always need to make at least one new copy of the array for changes to propagate correctly.

#### Use a more efficient data structure for lookups

Find yourself using `Array.prototype.find` or similar methods repeatedly. It might be better to iterate over your nodes or edges _once_ and build up a data structure better suited for lookups like a `Map` or `Set.`

This is particularly relevant if you would otherwise call `Array.prototype.find` inside another loop.

## Related docs:

- [useStore](https://reactflow.dev/docs/api-reference/hooks/use-store/)
- [Layouting Libraries Guide](https://reactflow.dev/learn/layouting/layouting)

## See also:

- [The dagre GitHub wiki](https://github.com/dagrejs/dagre/wiki)
- [d3-hierarchy documentation](https://d3js.org/d3-hierarchy)
- Elks configuration options are expansive. The best place to look is the
  [original Java documentation](https://eclipse.dev/elk/reference.html)
