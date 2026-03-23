import { CSSProperties, useCallback, useEffect } from 'react';
import { EdgeLabelRenderer, EdgeProps } from '@infinit-canvas/react';

import { Button } from '@/components/ui/button';
import { useDropdown } from '@/hooks/use-dropdown';
import { FlowDropdownMenu } from '@/app/workflow/components/flow-dropdown-menu';
import { useAppStore } from '@/app/workflow/store';
import { AppNodeType, NodeConfig } from '@/app/workflow/components/nodes';
import { AppEdge } from '..';
import { AppStore } from '@/app/workflow/store/app-store';
import { useShallow } from 'zustand/react/shallow';
import clsx from 'clsx';

const selector = (id: string) => {
  return (state: AppStore) => ({
    addNodeInBetween: state.addNodeInBetween,
    connectionSites: state.connectionSites,
    isPotentialConnection: state.potentialConnection?.id === `edge-${id}`,
  });
};

const filterNodes = (node: NodeConfig) => {
  return (
    node.id === 'transform-node' ||
    node.id === 'join-node' ||
    node.id === 'branch-node'
  );
};

export function EdgeButton({
  x,
  y,
  id,
  source,
  target,
  sourceHandleId,
  targetHandleId,
  style,
}: Pick<
  EdgeProps<AppEdge>,
  'source' | 'target' | 'sourceHandleId' | 'targetHandleId' | 'id'
> & {
  x: number;
  y: number;
  style: CSSProperties;
}) {
  const { addNodeInBetween, connectionSites, isPotentialConnection } =
    useAppStore(useShallow(selector(id)));
  const { isOpen, toggleDropdown, ref } = useDropdown();

  const onAddNode = useCallback(
    (type: AppNodeType) => {
      addNodeInBetween({
        type,
        source,
        target,
        sourceHandleId: sourceHandleId ?? undefined,
        targetHandleId: targetHandleId ?? undefined,
        position: { x, y },
      });
    },
    [addNodeInBetween, source, sourceHandleId, targetHandleId, target, x, y],
  );

  const connectionId = `edge-${id}`;
  // We add the possible connection sites to the store
  useEffect(() => {
    connectionSites.set(connectionId, {
      position: { x, y },
      source: { node: source, handle: sourceHandleId },
      target: { node: target, handle: targetHandleId },
      id: connectionId,
    });
  }, [
    connectionSites,
    x,
    y,
    connectionId,
    source,
    sourceHandleId,
    target,
    targetHandleId,
  ]);

  // we only want to remove the connection site when the component is unmounted
  useEffect(() => {
    return () => {
      connectionSites.delete(connectionId);
    };
  }, [connectionSites, connectionId]);

  return (
    <EdgeLabelRenderer>
      <div
        className="nodrag nopan pointer-events-auto absolute"
        style={{
          transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
          ...style,
        }}
      >
        <Button
          onClick={(e) => {
            e.stopPropagation();
            toggleDropdown();
          }}
          size="icon"
          variant="secondary"
          className={clsx(
            // base sizing + optical centering helpers
            'border h-6 w-6 rounded-xl hover:bg-card flex items-center justify-center leading-none p-0',
            {
              'border-red-500': isPotentialConnection,
            },
          )}
        >
          <span className="relative -top-px select-none">+</span>
        </Button>
      </div>
      {isOpen && (
        <div
          ref={ref}
          className="absolute z-50"
          style={{
            top: `${y}px`,
            left: `${x}px`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <FlowDropdownMenu onAddNode={onAddNode} filterNodes={filterNodes} />
        </div>
      )}
    </EdgeLabelRenderer>
  );
}
