import { useCallback } from 'react';
import { OnNodeDrag, useReactFlow, type Node } from '@infinit-canvas/react';

import { sortNodes, getNodePositionInsideParent } from './utils';

export function useNodeDragHandlers() {
  const { getIntersectingNodes, getNodes, setNodes } = useReactFlow();

  const onNodeDragStop: OnNodeDrag = useCallback(
    (_, node) => {
      if (node.type !== 'node' && !node.parentId) {
        return;
      }

      const intersections = getIntersectingNodes(node).filter(
        (n) => n.type === 'group'
      );
      const groupNode = intersections[0];

      // when there is an intersection on drag stop, we want to attach the node to its new parent
      if (intersections.length && node.parentId !== groupNode?.id) {
        const nextNodes: Node[] = getNodes()
          .map((n) => {
            if (n.id === groupNode.id) {
              return {
                ...n,
                className: '',
              };
            } else if (n.id === node.id) {
              const position = getNodePositionInsideParent(n, groupNode) ?? {
                x: 0,
                y: 0,
              };

              return {
                ...n,
                position,
                parentId: groupNode.id,
                extent: 'parent',
              } as Node;
            }

            return n;
          })
          .sort(sortNodes);

        setNodes(nextNodes);
      }
    },
    [getIntersectingNodes, getNodes, setNodes]
  );

  const onNodeDrag: OnNodeDrag = useCallback(
    (_, node) => {
      if (node.type !== 'node' && !node.parentId) {
        return;
      }

      const intersections = getIntersectingNodes(node).filter(
        (n) => n.type === 'group'
      );
      const groupClassName =
        intersections.length && node.parentId !== intersections[0]?.id
          ? 'active'
          : '';
      console.log(groupClassName);
      setNodes((nds) => {
        return nds.map((n) => {
          if (n.type === 'group') {
            return {
              ...n,
              className: groupClassName,
            };
          } else if (n.id === node.id) {
            return {
              ...n,
              position: node.position,
            };
          }

          return { ...n };
        });
      });
    },
    [getIntersectingNodes, setNodes]
  );

  return {
    onNodeDragStop,
    onNodeDrag,
  };
}
