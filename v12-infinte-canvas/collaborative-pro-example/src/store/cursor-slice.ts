import type { StateCreator } from "zustand";

import type { Cursor, CursorState } from "../types";

import type { Store } from "./";

export interface CursorSlice extends CursorState {
  setYjsCursors: () => void;
}

type YjsCursor = Omit<Cursor, "user" | "color">;

export const createCursorSlice: StateCreator<Store, [], [], CursorSlice> = (
  set,
  get
) => ({
  cursors: [],
  setYjsCursors: () => {
    const { yDoc, userId, getUserColor } = get();

    const yjsCursorMap = yDoc?.getMap<YjsCursor>("cursors");

    const cursors = Array.from(yjsCursorMap?.entries() || [])
      .filter(
        ([user, cursor]) =>
          user !== userId && new Date().getTime() - cursor.timestamp < 10000
      )
      .map(([user, cursor]) => ({
        user,
        ...cursor,
        color: getUserColor(user),
      }));

    set({ cursors });
  },
  updateCursor: (cursor) => {
    const { yDoc, userId } = get();
    if (!yDoc || !userId) return;

    const yjsCursors = yDoc.getMap<YjsCursor>("cursors");
    yjsCursors.set(userId, {
      ...cursor,
      timestamp: Date.now(),
    });
  },
});
