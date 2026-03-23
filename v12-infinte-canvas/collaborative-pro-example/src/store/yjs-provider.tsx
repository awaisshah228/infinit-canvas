import { useEffect, type ReactNode } from 'react';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/shallow';

import { store, type Store } from '.';

const selector = (state: Store) => ({
  yjsDoc: state.yDoc,
  setYjsNodes: state.setYjsNodes,
  setYjsEdges: state.setYjsEdges,
  setYjsCursors: state.setYjsCursors,
  setYjsConnections: state.setYjsConnections,
  setUserId: state.setUserId,
});

export function YjsSync({ children }: { children: ReactNode }) {
  const {
    yjsDoc,
    setYjsNodes,
    setYjsEdges,
    setUserId,
    setYjsCursors,
    setYjsConnections,
  } = useStore(store, useShallow(selector));

  useEffect(() => {
    if (!yjsDoc) {
      // clear nodes, edges, cursors, and connections when there is no doc
      setYjsNodes();
      setYjsEdges();
      setYjsCursors();
      setYjsConnections();
      setUserId(null);
      return;
    }

    const yjsNodes = yjsDoc.getMap('nodes');
    const yjsEdges = yjsDoc.getMap('edges');
    const yjsCursors = yjsDoc.getMap('cursors');
    const yjsConnections = yjsDoc.getMap('connections');

    yjsNodes.observe(setYjsNodes);
    yjsEdges.observe(setYjsEdges);
    yjsCursors.observe(setYjsCursors);
    yjsConnections.observe(setYjsConnections);

    setUserId(yjsDoc.clientID.toString());

    // Initial sync: push current Y doc state to the store (e.g. initial nodes added in createFlow)
    setYjsNodes();
    setYjsEdges();

    return () => {
      yjsNodes.unobserve(setYjsNodes);
      yjsEdges.unobserve(setYjsEdges);
      yjsCursors.unobserve(setYjsCursors);
      yjsConnections.unobserve(setYjsConnections);
      setUserId(null);
    };
  }, [
    yjsDoc,
    setYjsNodes,
    setYjsEdges,
    setYjsCursors,
    setYjsConnections,
    setUserId,
  ]);

  return <>{children}</>;
}
