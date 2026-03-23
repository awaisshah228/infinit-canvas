import { useEffect } from "react";
import { useShallow } from "zustand/shallow";
import {
  useReactFlow,
  useStore,
  ViewportPortal,
  type InfiniteCanvasStore,
} from "@infinit-canvas/react";

import { useThrottle } from "@/lib/useThrottle";
import type { StoreState } from "@/types";
import { useAppStore } from "@/store-context";

import { Cursor } from "./Cursor";

const selector = (state: StoreState) => ({
  cursors: state.cursors,
  updateCursor: state.updateCursor,
});

export function Cursors() {
  const domNode = useStore(
    useShallow((state: InfiniteCanvasStore) => state.domNode)
  );

  const { screenToFlowPosition } = useReactFlow();

  const { cursors, updateCursor } = useAppStore(useShallow(selector));

  // Throttle cursor updates to 150ms
  const [throttledUpdateCursor, immediateUpdateCursor] = useThrottle(
    updateCursor,
    { delay: 64 }
  );

  useEffect(() => {
    if (!domNode) return;

    function pointerMove(e: PointerEvent) {
      const position = screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });

      throttledUpdateCursor({
        position,
        dragging: e.pressure > 0,
      });
    }

    function pointerUp(e: PointerEvent) {
      immediateUpdateCursor({
        position: screenToFlowPosition({
          x: e.clientX,
          y: e.clientY,
        }),
        dragging: false,
      });
    }

    domNode.addEventListener("pointermove", pointerMove);
    domNode.addEventListener("pointerup", pointerUp);

    return () => {
      domNode.removeEventListener("pointermove", pointerMove);
      domNode.removeEventListener("pointerup", pointerUp);
    };
  }, [
    domNode,
    screenToFlowPosition,
    throttledUpdateCursor,
    immediateUpdateCursor,
  ]);

  return (
    <ViewportPortal>
      {cursors.map((cursor) => (
        <Cursor
          key={cursor.user}
          point={cursor.position}
          color={cursor.color}
          dragging={cursor.dragging}
        />
      ))}
    </ViewportPortal>
  );
}
