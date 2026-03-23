import { useRef, useCallback, useLayoutEffect } from "react";
import { MousePointer2 } from "lucide-react";
import type { XYPosition } from "@infinit-canvas/react";

import { useSmoothing } from "@/lib/useSmoothing";

export function Cursor({
  point,
  color,
  dragging,
}: {
  point: XYPosition;
  color: string;
  dragging: boolean;
}) {
  const cursorRef = useRef<SVGSVGElement>(null);

  const animateCursor = useCallback((point: number[]) => {
    const elm = cursorRef.current;
    if (!elm) return;
    elm.style.setProperty(
      "transform",
      `translate(${point[0]}px, ${point[1]}px)`
    );
  }, []);

  const onPointMove = useSmoothing(animateCursor);

  useLayoutEffect(() => onPointMove([point.x, point.y]), [onPointMove, point]);

  return !dragging ? (
    <MousePointer2
      className="absolute"
      style={{ color }}
      size={15}
      ref={cursorRef}
    />
  ) : null;
}
