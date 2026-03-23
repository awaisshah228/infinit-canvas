import { createContext, useContext } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/shallow";

import type { Store, StoreState } from "./types";

export const AppStoreContext = createContext<Store | null>(null);

export function useAppStore<T>(selector: (state: StoreState) => T) {
  const store = useContext(AppStoreContext);
  if (!store) {
    throw new Error("AppStoreContext not found");
  }
  return useStore(store, useShallow(selector));
}
