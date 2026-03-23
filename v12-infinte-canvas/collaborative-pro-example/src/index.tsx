import { useStore } from "zustand";
import { InfiniteCanvasProvider } from "@infinit-canvas/react";


import { Flow } from "./active-flow";
import { SelectFlow } from "./select-flow";
import { AppStoreContext } from "./store-context";

import type { Store, StoreState } from "./types";

const selector = (state: StoreState) => state.activeFlowId;

export function App({ store, title }: { store: Store; title: string }) {
  const activeFlowId = useStore(store, selector);

  return (
    <AppStoreContext.Provider value={store}>
      {activeFlowId ? (
        <InfiniteCanvasProvider>
          <Flow />
        </InfiniteCanvasProvider>
      ) : (
        <SelectFlow title={title} />
      )}
    </AppStoreContext.Provider>
  );
}
