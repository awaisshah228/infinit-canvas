'use client';
import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useReactFlow } from '@infinit-canvas/react';

import { createNodeByType } from '@/app/workflow/components/nodes';
import { useAppStore } from '@/app/workflow/store';
import { AppStore } from '@/app/workflow/store/app-store';

const selector = (state: AppStore) => state.addNode;

export function useDragAndDrop() {
  const { screenToFlowPosition } = useReactFlow();
  const addNode = useAppStore(useShallow(selector));

  const onDrop: React.DragEventHandler = useCallback(
    (event) => {
      const nodeProps = JSON.parse(
        event.dataTransfer.getData('application/reactflow'),
      );

      if (!nodeProps) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = createNodeByType({
        type: nodeProps.id,
        position,
      });
      addNode(newNode);
    },
    [addNode, screenToFlowPosition],
  );

  const onDragOver: React.DragEventHandler = useCallback(
    (event) => event.preventDefault(),
    [],
  );

  return useMemo(() => ({ onDrop, onDragOver }), [onDrop, onDragOver]);
}
