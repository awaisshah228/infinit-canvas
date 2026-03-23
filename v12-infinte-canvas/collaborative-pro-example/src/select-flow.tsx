import { useCallback, useEffect, useState } from "react";
import { useShallow } from "zustand/shallow";

import type { StoreState } from "./types";
import { useAppStore } from "./store-context";

const selector = (state: StoreState) => ({
  createFlow: state.createFlow,
  joinFlow: state.joinFlow,
  isLoading: state.isLoading,
  error: state.error,
});

export function SelectFlow({ title }: { title: string }) {
  const { createFlow, joinFlow, isLoading, error } = useAppStore(
    useShallow(selector)
  );

  const [flowCode, setFlowCode] = useState("");

  // Read flow id from URL query parameters on mount

  // Don't render the component until we know if we're joining a flow from a URL
  // parameter. If the URL parameter is present, do not render to avoid flickering.
  const [shouldRender, setShouldRender] = useState(false);

  // Join flow from URL parameter if present
  useEffect(() => {
    if (!joinFlow) return;
    const searchParams = new URLSearchParams(window.location.search);
    const flowId = searchParams.get("flow");
    if (flowId) {
      joinFlow(flowId);
      return;
    }
    setShouldRender(true);
  }, [joinFlow]);

  const handleJoinFlow = useCallback(
    async function handleJoinFlow() {
      if (!flowCode) return;

      const success = await joinFlow?.(flowCode);
      if (success) {
        setFlowCode("");
      }
    },
    [flowCode, joinFlow]
  );

  if (!shouldRender) return null;

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-6 w-full max-w-md px-6">
          <h1 className="text-2xl font-bold text-muted-foreground">
            Multiplayer Flow with {title}
          </h1>
          <button
            className="w-full bg-primary text-primary-foreground cursor-pointer p-2 rounded-md"
            onClick={createFlow}
            disabled={isLoading}
          >
            Create new flow
          </button>

          {joinFlow && (
            <>
              <div className="text-muted-foreground text-sm font-medium">
                or
              </div>
              <div className="w-full space-y-2 flex gap-2">
                <input
                  placeholder={isLoading ? "Loading..." : "Type in a flow id"}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 h-10"
                  value={flowCode}
                  onChange={(e) => {
                    setFlowCode(e.target.value.trim());
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isLoading) {
                      handleJoinFlow();
                    }
                  }}
                  aria-invalid={!!error}
                  disabled={isLoading}
                />
                <button
                  className="bg-primary text-primary-foreground cursor-pointer px-4 py-2 rounded-md h-10 whitespace-nowrap"
                  onClick={handleJoinFlow}
                  disabled={isLoading || !flowCode}
                >
                  Join flow
                </button>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </>
          )}
        </div>
      </div>
    </>
  );
}
