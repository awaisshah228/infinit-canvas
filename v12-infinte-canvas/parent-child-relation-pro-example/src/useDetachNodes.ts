import { useCallback } from 'react';
import { useReactFlow } from '@infinit-canvas/react';

function useDetachNodes() {
  const { setNodes, getNodes, getInternalNode } = useReactFlow();

  const detachNodes = useCallback(
    (ids: string[], removeParentId?: string) => {
      const nextNodes = getNodes().map((n) => {
        if (ids.includes(n.id) && n.parentId) {
          const parentNode = getInternalNode(n.parentId);

          return {
            ...n,
            position: {
              x: n.position.x + (parentNode?.internals.positionAbsolute.x ?? 0),
              y: n.position.y + (parentNode?.internals.positionAbsolute.y ?? 0),
            },
            expandParent: undefined,
            parentId: undefined,
            extent: undefined,
          };
        }
        return n;
      });

      setNodes(
        nextNodes.filter((n) => !removeParentId || n.id !== removeParentId)
      );
    },
    [setNodes, getNodes, getInternalNode]
  );

  return detachNodes;
}

export default useDetachNodes;
