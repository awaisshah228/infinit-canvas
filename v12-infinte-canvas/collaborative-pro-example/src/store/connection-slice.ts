import type { StateCreator } from "zustand";

import type {
  SharedConnection,
  ConnectionState,
} from "../types";

import type { Store } from "./";

export interface ConnectionSlice extends ConnectionState {
  setYjsConnections: () => void;
}

type YjsConnection = Omit<SharedConnection, "user" | "color"> & {
  timestamp: number;
};

export const createConnectionSlice: StateCreator<
  Store,
  [],
  [],
  ConnectionSlice
> = (set, get) => ({
  connections: [],
  setYjsConnections: () => {
    const { yDoc, userId, getUserColor } = get();

    const yjsConnectionMap = yDoc?.getMap<YjsConnection>("connections");

    const connections = Array.from(yjsConnectionMap?.entries() || [])
      .filter(
        ([user, connection]) =>
          user !== userId && Date.now() - connection.timestamp < 5000
      )
      .map(([user, connection]) => ({
        user,
        source: connection.source,
        sourceType: connection.sourceType,
        sourceHandle: connection.sourceHandle,
        target: connection.target,
        targetType: connection.targetType,
        targetHandle: connection.targetHandle,
        position: connection.position,
        color: getUserColor(user),
      }));

    set({ connections });
  },
  updateConnection: (connection) => {
    const { yDoc, userId } = get();
    if (!yDoc || !userId) return;

    const yjsConnections = yDoc.getMap<YjsConnection>("connections");

    if (connection) {
      yjsConnections.set(userId, {
        source: connection.source,
        sourceType: connection.sourceType,
        sourceHandle: connection.sourceHandle,
        target: connection.target,
        targetType: connection.targetType,
        targetHandle: connection.targetHandle,
        position: connection.position,
        timestamp: Date.now(),
      });
    } else {
      // Remove connection when clearing
      yjsConnections.delete(userId);
    }
  },
});
