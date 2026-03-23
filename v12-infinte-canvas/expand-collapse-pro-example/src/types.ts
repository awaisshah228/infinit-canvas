import { Node } from '@infinit-canvas/react';

export type ExpandCollapseNode = Node<
  {
    expanded: boolean;
    expandable?: boolean;
  },
  'expandcollapse'
>;
