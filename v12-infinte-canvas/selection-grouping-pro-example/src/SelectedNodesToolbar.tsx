import {
  useNodes,
  Node,
  NodeToolbar,
  useStoreApi,
  useReactFlow,
  useStore,
} from '@infinit-canvas/react';

import { getId } from './utils';

const GROUP_PADDING = 25;

/**
 * This toolsbar is not bound to a specific node, but to the selected nodes.
 * It will show up when multiple nodes are selected and allow to group them.
 */
export default function SelectedNodesToolbar() {
  const nodes = useNodes();
  const { setNodes, getNodesBounds } = useReactFlow();
  const store = useStoreApi();

  // we are using useStore here, in order to prevent re-renders on every node change.
  // It's recommended to use your own store for this.
  const selectedNodes = useStore((state) => {
    return state.nodes.filter(
      (node) =>
        node.selected && !node.parentId && !state.parentLookup.get(node.id)
    );
  });

  if (selectedNodes.length === 0) {
    return null;
  }

  const selectedNodeIds = selectedNodes.map((node) => node.id);

  const onGroup = () => {
    const groupId = getId('group');
    const selectedNodesRectangle = getNodesBounds(selectedNodes);
    const groupNodePosition = {
      x: selectedNodesRectangle.x,
      y: selectedNodesRectangle.y,
    };

    // this is a new node that gets added to our nodes
    const groupNode = {
      id: groupId,
      type: 'group',
      position: groupNodePosition,
      style: {
        width: selectedNodesRectangle.width + GROUP_PADDING * 2,
        height: selectedNodesRectangle.height + GROUP_PADDING * 2,
      },
      data: {},
    };

    const nextNodes: Node[] = nodes.map((node) => {
      if (selectedNodeIds.includes(node.id)) {
        return {
          ...node,
          // here we calculate a relative position of the node inside the group
          position: {
            x: node.position.x - groupNodePosition.x + GROUP_PADDING,
            y: node.position.y - groupNodePosition.y + GROUP_PADDING,
          },
          extent: 'parent',
          parentId: groupId,
        };
      }

      return node;
    });

    // we need to unselect all nodes to hide the toolbar
    store.getState().resetSelectedElements();
    store.setState({ nodesSelectionActive: false });
    setNodes([groupNode, ...nextNodes]);
  };

  return (
    <NodeToolbar nodeId={selectedNodeIds} isVisible>
      <button className="xy-theme__button" onClick={onGroup}>
        Group selected nodes
      </button>
    </NodeToolbar>
  );
}
