import { useOptimistic, useCallback, startTransition } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@infinit-canvas/react';
import { useShallow } from 'zustand/shallow';

import { useAppStore } from '@/store-context';
import type { StoreState } from '@/types';
import DragHandle from './DragHandle';

const selector = (state: StoreState) => ({
  updateNodeData: state.updateNodeData,
});

export type CheckboxNodeType = Node<{ checked: boolean }>;

export function CheckboxNode({ id, data }: NodeProps<CheckboxNodeType>) {
  const { updateNodeData } = useAppStore(useShallow(selector));

  const [optimisticChecked, setOptimisticChecked] = useOptimistic(
    data.checked,
    (_, newChecked: boolean) => newChecked,
  );

  const handleCheckboxChange = useCallback(
    (checked: boolean) => {
      startTransition(() => {
        setOptimisticChecked(checked);
      });

      updateNodeData(id, { checked });
    },
    [updateNodeData, id, setOptimisticChecked],
  );

  return (
    <div className="shadow-md rounded-md bg-white border-2 border-stone-400 in-[.selected]:border-teal-500 in-[.selected]:shadow-lg cursor-default">
      <DragHandle />
      <div className="flex items-center space-x-24 nodrag p-4">
        <input
          type="checkbox"
          id={`checkbox-${id}`}
          checked={optimisticChecked}
          onChange={(e) => handleCheckboxChange(e.target.checked)}
          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
        />
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="bg-teal-500! w-2! h-2!"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="bg-teal-500! w-2! h-2!"
      />
    </div>
  );
}
