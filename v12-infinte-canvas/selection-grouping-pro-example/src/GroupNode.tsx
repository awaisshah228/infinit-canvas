import { memo } from 'react';
import {
  NodeProps,
  NodeToolbar,
  useStore,
  NodeResizer,
  useReactFlow,
} from '@infinit-canvas/react';

import useDetachNodes from './useDetachNodes';

function GroupNode({ id }: NodeProps) {
  const detachNodes = useDetachNodes();
  const { getNodes } = useReactFlow();

  const hasChildNodes = useStore((store) => {
    const childNodeCount = store.parentLookup.get(id)?.size ?? 0;
    return childNodeCount > 0;
  });

  const onDetach = () => {
    const childNodeIds = getNodes()
      .filter((node) => node.parentId === id)
      .map((node) => node.id);

    detachNodes(childNodeIds, id);
  };

  return (
    <div>
      <NodeResizer />
      {hasChildNodes && (
        <NodeToolbar className="nodrag">
          <button className="xy-theme__button" onClick={onDetach}>
            Ungroup
          </button>
        </NodeToolbar>
      )}
    </div>
  );
}

export default memo(GroupNode);
