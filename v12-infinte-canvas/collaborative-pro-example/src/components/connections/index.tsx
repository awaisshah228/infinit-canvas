import { useConnection, ViewportPortal } from "@infinit-canvas/react";
import { useEffect } from "react";
import { useShallow } from "zustand/shallow";

import { useThrottle } from "@/lib/useThrottle";
import { useAppStore } from "@/store-context";
import { ConnectionEdge } from "./ConnectionEdge";

import type { StoreState } from "@/types";

const selector = (state: StoreState) => ({
  connections: state.connections,
  updateConnection: state.updateConnection,
});

export function Connections() {
  const connection = useConnection();
  const { connections, updateConnection } = useAppStore(useShallow(selector));

  // Throttle connection updates to 100ms for smoother real-time collaboration
  const [throttledUpdateConnection] = useThrottle(updateConnection, {
    delay: 64,
  });

  useEffect(() => {
    throttledUpdateConnection(
      connection.inProgress
        ? {
            source: connection.fromNode.id,
            sourceType: connection.fromHandle.type,
            sourceHandle: connection.fromHandle.id || undefined,
            target: connection.toNode?.id || undefined,
            targetType: connection.toHandle?.type || undefined,
            targetHandle: connection.toHandle?.id || undefined,
            position: connection.to,
          }
        : undefined
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection]);

  // use this connection to render a "temporary connection edge for other users"

  return (
    <ViewportPortal>
      {connections.map((connection) => (
        <ConnectionEdge key={connection.user} connection={connection} />
      ))}
    </ViewportPortal>
  );
}
