import { type Edge } from '@infinit-canvas/react';

export type AppEdge = Edge;

export const createEdge = (
  source: string,
  target: string,
  sourceHandleId?: string | null,
  targetHandleid?: string | null,
): AppEdge => ({
  id: `${source}-${sourceHandleId}-${target}-${targetHandleid}`,
  source,
  target,
  sourceHandle: sourceHandleId,
  targetHandle: targetHandleid,
  type: 'default',
  animated: true,
});
