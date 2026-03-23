import type {
  Edge,
  Node,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
  XYPosition,
} from "@infinit-canvas/react";

import type { StoreApi } from "zustand";

export type Store = StoreApi<StoreState>;

export interface StoreState
  extends AppState,
    ConnectionState,
    CursorState,
    FlowState {}

export interface AppState {
  /**
   * The ID of the currently active flow workspace.
   *
   * This ID should be used to identify the flow workspace in the backend and to
   * establish a connection to the room providing the multiplayer functionality.
   * The frontend automatically detects the `activeFlowId` change and loads the
   * flow workspace.
   */
  activeFlowId?: string | null;
  userId?: string | null;
  isLoading: boolean;
  error: string | null;
  setActiveFlowId: (activeFlowId: string) => void;
  getUserColor: (userId: string) => string;
  setUserId: (userId: string | null) => void;

  /**
   * Creates a new collaborative flow workspace.
   *
   * Generates a unique flow ID, establishes a connection to the new flow (if required by the backend),
   * and sets `activeFlowId`. The frontend automatically detects the `activeFlowId` change and loads
   * the new flow. Any existing flow connection should be disconnected before creating a new one.
   *
   * @remarks This is an asynchronous operation that returns true on success and false otherwise. The flow becomes active
   * immediately after `activeFlowId` is set.
   */
  createFlow: () => Promise<boolean>;

  /**
   * Joins a multiplayer flow room.
   *
   * @param flowId - The ID of the flow workspace to join.
   * @returns A promise that resolves to true if the flow workspace was joined
   * successfully, false otherwise.
   *
   * @remarks This is an asynchronous operation that returns a promise. It
   * should set the `activeFlowId` in the store and return a promise that
   * resolves to true if the flow workspace was joined successfully, false
   * otherwise. The frontend will automatically detect the `activeFlowId` change
   * and load the flow workspace.
   */
  joinFlow?: (flowId: string) => Promise<boolean>;
  exitFlow: () => void;
}

export interface ConnectionState {
  connections: ConnectionOfUser[];
  updateConnection: (connection?: SharedConnection) => void;
}

export interface CursorState {
  cursors: Cursor[];
  updateCursor: (cursor: { position: XYPosition; dragging: boolean }) => void;
}

export interface FlowState {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (node: Omit<Node, "id">) => Promise<void>;
  addEdge: (edge: Omit<Edge, "id">) => Promise<void>;
  updateNodeData: (nodeId: string, newData: Node["data"]) => void;
}

export interface Cursor {
  user: string;
  position: XYPosition;
  dragging: boolean;
  color: string;
  timestamp: number;
}

export interface SharedConnection {
  source: string;
  sourceType: "source" | "target";
  sourceHandle?: string;
  target?: string;
  targetType?: "source" | "target";
  targetHandle?: string;
  position: XYPosition;
}

export interface ConnectionOfUser extends SharedConnection {
  user: string;
  color: string;
}
