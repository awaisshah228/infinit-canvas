## Usage Instructions

The example app contains some default nodes with different sizes. If you drag a
node around, you can see that the node will snap and align with the boundaries
of other nodes while a helper line is displayed.

## File Structure

The example is organized with the following structure:

```
src/
├── App.tsx                  # Main application component
├── HelperLinesRenderer.tsx  # Helper lines rendering component
├── useHelperLines.tsx       # Core helper lines logic hook
├── types.ts                 # TypeScript type definitions for the helper lines logic.
├── utils.ts                 # Utility functions that `useHelperLines.tsx` uses.
├── initialElements.ts       # Initial nodes and edges
├── config.ts                # Configuration constants, like ANCHORS and SNAP_RADIUS
└── main.tsx                 # Application entry point
```

If you just wish to use helper lines in your own app, you can copy the `types.ts`, `utils.ts`, `config.ts`, `useHelperLines.tsx` and `HelperLinesRenderer.tsx` files to your own project and import the `useHelperLines` hook into your React Flow instance as in `App.tsx`.

## Core Concept

To implement helper lines, we need to solve two problems:

1. Displaying the two matching horizontal and vertical helper lines at the right place
2. Snapping the dragged node to the position of the helper lines

It is important that only one helper line can be shown at a time for one
direction (horizontal, vertical) as multiple nodes can be within the helper line
threshold. In our algorithm, we want to calculate the two helper lines that are
closest to a node's anchor.

For the calculation of the best helper lines, we need to introduce the concept
of **anchors**. An `Anchor` corresponds to a position on a node where we want to
snap to. For example, the left edge of a node is an anchor, the right edge
is another anchor, the top and bottom as well, and so on.

```tsx
export type Orientation = 'horizontal' | 'vertical';

export type AnchorResolver = (node: Node, box: Box) => number;

export type Anchor = {
  orientation: Orientation;
  resolve: AnchorResolver;
};
```

The `AnchorResolver` is a function that takes a node and a bounding box and
returns the position of the anchor on the node. For example, the left edge of a node
can be resolved by returning the left position of the bounding box.

If you wish to add more anchors, you can do so by adding more entries to the
`ANCHORS` object in the `config.ts` file. The default anchors are:

```ts
export const ANCHORS: Record<string, Anchor> = {
  top: { orientation: 'horizontal', resolve: (_, box) => box.y },
  bottom: { orientation: 'horizontal', resolve: (_, box) => box.y2 },
  left: { orientation: 'vertical', resolve: (_, box) => box.x },
  right: { orientation: 'vertical', resolve: (_, box) => box.x2 },
  centerX: {
    orientation: 'vertical',
    resolve: (_, box) => (box.x + box.x2) / 2,
  },
  centerY: {
    orientation: 'horizontal',
    resolve: (_, box) => (box.y + box.y2) / 2,
  },
};
```

Then, all the anchors of all nodes are being collected, and `HelperLine` objects
are created for each anchor.

The search is then simple. When a node is being dragged or resized, we calculate the
distance of all the anchors available on the selected node, to all `HelperLine`s that are
generated from other nodes, and find finally the closest horizontal and vertical helper lines.
This is done by the `getHelperLines` function in `utils.ts`.

If the closest helper lines are within a certain threshold, we can then adjust the position of the
dragged/resized node to be aligned with the helper line (snapping), and display the helper lines.

## Getting Started

This example has no third party dependencies, so the only dependency that you
need to install is `@xyflow/react` itself (in case you don't have it already):

```sh
npm install @xyflow/react
```

## Using the `useHelperLines` hook

The core logic for helper lines and snapping is now encapsulated in a custom React hook called `useHelperLines`.
This hook manages all state and provides a pre-wired `HelperLines` component that you can drop directly into your React Flow tree.

See the `App.tsx` file for an example of how to use the `useHelperLines` hook.

## How it works

- The hook manages the state for the currently active helper lines.
- The `HelperLines` component (returned by the hook) is always up-to-date with the current snapping state.
- The snapping and helper line logic is triggered by the `onNodesChange` and `onNodeDragStop` handlers, which call the hook's methods.

The main callbacks exported by the hook are:

- `rebuildIndex`: Rebuilds the spatial index of helper lines.
- `updateHelperLines`: Updates the helper lines based on the changes in the nodes. This is called when a node is dragged or resized.
- `resetHelperLines`: Resets the helper lines and hides them. This is called when a node is dropped.
- `HelperLines`: A component that renders the helper lines in a canvas element.

## Summary

- You can customize the appearance of the helper lines by editing the `HelperLinesRenderer` component in the hook file.
- You can change the snap distance by adjusting the `SNAP_RADIUS` constant in `useHelperLines.tsx`.
- You can add more anchors (and thus helper lines) by editing the `ANCHORS` object in `useHelperLines.tsx`.

If you need help or have any questions regarding this example, please reach out!
