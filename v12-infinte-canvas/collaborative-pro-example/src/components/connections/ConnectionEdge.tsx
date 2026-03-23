import {
  BaseEdge,
  getBezierPath,
  Position,
  useReactFlow,
  type HandleType,
  type InternalNode,
  type XYPosition,
} from "@infinit-canvas/react";
import { useState, useLayoutEffect, useCallback } from "react";
import { useSmoothing } from "@/lib/useSmoothing";
import type { ConnectionOfUser } from "@/types";

function getOppositePosition(position: Position): Position {
  switch (position) {
    case Position.Top:
      return Position.Bottom;
    case Position.Bottom:
      return Position.Top;
    case Position.Left:
      return Position.Right;
    case Position.Right:
      return Position.Left;
    default:
      return position;
  }
}

function getTargetProps(
  getInternalNode: (id: string) => InternalNode | undefined,
  oppositePosition: Position,
  target?: string,
  targetType?: HandleType,
  targetHandle?: string,
  position?: XYPosition
) {
  const targetNode = getInternalNode(target || "");

  if (!targetNode || !targetType)
    return {
      targetX: position?.x ?? 0,
      targetY: position?.y ?? 0,
      targetPosition: getOppositePosition(oppositePosition),
    };

  const targetHandleBounds = targetNode.internals.handleBounds?.[
    targetType
  ]?.find((handle) => handle.id === (targetHandle ?? null));

  if (!targetHandleBounds)
    return {
      targetX: position?.x ?? 0,
      targetY: position?.y ?? 0,
      targetPosition: getOppositePosition(oppositePosition),
    };

  return {
    targetX:
      targetHandleBounds.width * 0.5 +
      targetHandleBounds.x +
      targetNode.internals.positionAbsolute.x,
    targetY:
      targetHandleBounds.height * 0.5 +
      targetHandleBounds.y +
      targetNode.internals.positionAbsolute.y,
    targetPosition: targetHandleBounds.position,
  };
}

export function ConnectionEdge({
  connection,
}: {
  connection: ConnectionOfUser;
}) {
  const { getInternalNode } = useReactFlow();
  const {
    source,
    target,
    sourceType,
    sourceHandle,
    targetHandle,
    targetType,
    position,
  } = connection;

  const sourceNode = getInternalNode(source);

  if (!sourceNode) return null;

  const sourceHandleBounds = sourceNode.internals.handleBounds?.[
    sourceType
  ]?.find((handle) => handle.id === (sourceHandle ?? null));

  if (!sourceHandleBounds) return null;

  const targetProps = getTargetProps(
    getInternalNode,
    Position.Bottom,
    target,
    targetType,
    targetHandle,
    position
  );

  const pathProps = {
    sourceX:
      sourceHandleBounds.width * 0.5 +
      sourceHandleBounds.x +
      sourceNode.internals.positionAbsolute.x,
    sourceY:
      sourceHandleBounds.height * 0.5 +
      sourceHandleBounds.y +
      sourceNode.internals.positionAbsolute.y,
    sourcePosition: sourceHandleBounds.position,
    ...targetProps,
  };

  return (
    <svg className="overflow-visible">
      <SmoothedEdge pathProps={pathProps} color={connection.color} />
    </svg>
  );
}

function SmoothedEdge({
  pathProps,
  color,
}: {
  pathProps: {
    sourceX: number;
    sourceY: number;
    sourcePosition: Position;
    targetX: number;
    targetY: number;
    targetPosition: Position;
  };
  color: string;
}) {
  const [smoothedTarget, setSmoothedTarget] = useState({
    x: pathProps.targetX,
    y: pathProps.targetY,
  });

  const updateTarget = useCallback((point: number[]) => {
    setSmoothedTarget({ x: point[0], y: point[1] });
  }, []);

  const onTargetMove = useSmoothing(updateTarget);

  useLayoutEffect(() => {
    onTargetMove([pathProps.targetX, pathProps.targetY]);
  }, [onTargetMove, pathProps.targetX, pathProps.targetY]);

  const [edgePath] = getBezierPath({
    ...pathProps,
    targetX: smoothedTarget.x,
    targetY: smoothedTarget.y,
  });

  return (
    <BaseEdge
      path={edgePath}
      style={{ stroke: color }}
      className="opacity-80"
    />
  );
}
