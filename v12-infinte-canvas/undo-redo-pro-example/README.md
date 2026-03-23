## Usage Instructions

The example app starts with an empty canvas. You can add nodes by clicking anywhere on the canvas and connect them using the node handles. Once you've made changes to your graph, use the undo button to step backward through your editing history. If you've undone actions, the redo button lets you move forward through your history.

## Core Concepts

Implementing undo/redo functionality can range from simple approaches (storing the entire application state on each change) to complex ones (storing migrations that transform the application state to the previous or next state). You can check out [this article](http://gamepipeline.com/8-different-strategies-for-implementing-undoable-actions/) to learn more about different undo and redo operations strategies.

For React Flow, we've chosen a balanced approach:

- We don't store the entire state on every pixel movement (which would be inefficient)
- We don't track every possible action type (which would be overly complex)
- Instead, we provide a `takeSnapshot()` function that captures the current graph state at strategic moments

This gives you control over which actions should be undoable while maintaining performance. The implementation follows patterns similar to those in [this tutorial](https://redux.js.org/usage/implementing-undo-history), adapted specifically for React Flow's needs.

## Getting Started

This example has no third-party dependencies, so the only dependency that you need to install is `@xyflow/react` itself (in case you don't have it already):

```sh

npm install @xyflow/react

```

In `App.tsx`, we start by setting up the UI for our example. That includes an external state for the nodes and edges of our graph and a function that adds nodes whenever the user clicks on the React Flow pane. All of this boilerplate will probably replaced by your event handlers and UI components.

## Implementing the `useUndoRedo` hook

The core piece of this example is the `useUndoRedo` hook. It returns three helper functions that you can use in your app: `undo`, `redo`, and `takeSnapshot`. Within the hook, we store the current, past, and future states as an array. By default, these are empty arrays, but you can fill the past array by using the `takeSnapshot` method, which reads the current nodes and edges from the React Flow state and pushes them to the `past` array.

The `undo` method works like this: It reads the last available state from the `past` array and sets the nodes and edges of React Flow to the nodes and edges of the past state. Before doing that, it pushes the current nodes and edges to the `future` state so that we can revert to the current state by using the `redo` method.

The `redo` method does the opposite: It checks if there is a future state that we can revert to and sets the nodes and edges accordingly while storing the current state in the `past` array.

## Using the `useUndoRedo` hook and helpers

In our App, we can now use the helper methods to store specific states of our React Flow graph to make them undoable. You can use the `takeSnapshot` method whenever you like and for any action you want to be able to undo. In our example app, we call the function in several event handlers before manipulating the state further. It is important to call the function **before** other event handlers.

## Jumping back and forth between states

The example consists of two buttons that let you jump back and forth between states whenever possible. The buttons are disabled when no past or future states are available. To disable and enable the buttons, we are returning the boolean properties `canUndo` and `canRedo` from the `useUndoRedo` hook.

The buttons are calling our previously defined `undo` and `redo` methods on click.

## Adding keyboard shortcuts

It is common to have Ctrl+Z and Ctrl+Shift+Z keyboard shortcuts for `undo` and `redo operations in any application. Inside the `useUndoRedo`hook, we are attaching keyboard listeners to the`document` to achieve this functionality:

```tsx
const keyDownHandler = (event: KeyboardEvent) => {
  if (event.key === 'z' && (event.ctrlKey || event.metaKey) && event.shiftKey) {
    redo();
  } else if (event.key === 'z' && (event.ctrlKey || event.metaKey)) {
    undo();
  }
};

document.addEventListener('keydown', keyDownHandler);
```

## Summary

This example was designed so that it can be easily adapted to your use case. You can customize the actions that you want to make undoable, add more functionality, and integrate it with your UI. If you need help or have any questions regarding this example, please reach out!
