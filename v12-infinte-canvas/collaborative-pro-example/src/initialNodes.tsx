import type { Node } from '@infinit-canvas/react';

/**
 * Initial nodes added to every new flow when it is created.
 * Each backend adds these via addNode() after flow creation so they are persisted.
 */
export const INITIAL_NODES: Omit<Node, 'id'>[] = [
  {
    type: 'text',
    position: { x: 0, y: 100 },
    data: {
      label: 'Text Input',
      value: '',
      placeholder: 'Enter text...',
    },
  },
  {
    type: 'checkbox',
    position: { x: 101, y: 0 },
    data: {
      label: 'New Checkbox',
      checked: false,
    },
  },
];
