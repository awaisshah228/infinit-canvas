import { useOptimistic, useCallback, startTransition } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@infinit-canvas/react';
import { useShallow } from 'zustand/shallow';

import { useAppStore } from '@/store-context';
import type { StoreState } from '@/types';
import DragHandle from './DragHandle';

const selector = (state: StoreState) => ({
  updateNodeData: state.updateNodeData,
});

export type TextNode = Node<{ text: string }>;

export function TextNode({ id, data }: NodeProps<TextNode>) {
  const { updateNodeData } = useAppStore(useShallow(selector));

  // Use optimistic updates for immediate UI feedback
  const [optimisticValue, setOptimisticValue] = useOptimistic(
    data.text || '',
    (_, newValue: string) => newValue
  );

  const handleInputChange = useCallback(
    (value: string) => {
      // Apply optimistic update immediately
      startTransition(() => {
        setOptimisticValue(value);
      });

      // Update the Jazz node data through the flow context
      updateNodeData(id, { text: value });
    },
    [updateNodeData, id, setOptimisticValue]
  );

  return (
    <div
      className="shadow-md rounded-md bg-white border-2 border-stone-400 min-w-[250px] relative
    in-[.selected]:border-teal-500 in-[.selected]:shadow-lg"
    >
      <DragHandle />
      <div className="nodrag w-full">
        <input
          value={optimisticValue}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            handleInputChange(e.target.value)
          }
          placeholder={'Enter text...'}
          className="nodrag px-4 py-3 w-full min-w-0 outline-none"
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
