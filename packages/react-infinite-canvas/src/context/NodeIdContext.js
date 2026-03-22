import { createContext, useContext } from 'react';

export const NodeIdContext = createContext(null);

export function useNodeId() {
  return useContext(NodeIdContext);
}
