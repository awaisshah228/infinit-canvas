import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Node,
  useKeyPress,
  useReactFlow,
  getConnectedEdges,
  Edge,
  XYPosition,
  useStore,
  type KeyCode,
} from '@infinit-canvas/react';

export function useCopyPaste<
  NodeType extends Node = Node,
  EdgeType extends Edge = Edge,
>() {
  const mousePosRef = useRef<XYPosition>({ x: 0, y: 0 });
  const rfDomNode = useStore((state) => state.domNode);

  const { getNodes, setNodes, getEdges, setEdges, screenToFlowPosition } =
    useReactFlow<NodeType, EdgeType>();

  // Set up the paste buffers to store the copied nodes and edges.
  const [bufferedNodes, setBufferedNodes] = useState([] as NodeType[]);
  const [bufferedEdges, setBufferedEdges] = useState([] as EdgeType[]);

  // initialize the copy/paste hook
  // 1. remove native copy/paste/cut handlers
  // 2. add mouse move handler to keep track of the current mouse position
  useEffect(() => {
    const events = ['cut', 'copy', 'paste'];

    if (rfDomNode) {
      const preventDefault = (e: Event) => e.preventDefault();

      const onMouseMove = (event: MouseEvent) => {
        mousePosRef.current = {
          x: event.clientX,
          y: event.clientY,
        };
      };

      rfDomNode.addEventListener('mousemove', onMouseMove);

      return () => {
        for (const event of events) {
          rfDomNode.removeEventListener(event, preventDefault);
        }

        rfDomNode.removeEventListener('mousemove', onMouseMove);
      };
    }
  }, [rfDomNode]);

  const copy = useCallback(() => {
    const selectedNodes = getNodes().filter((node) => node.selected);
    const selectedEdges = getConnectedEdges(selectedNodes, getEdges()).filter(
      (edge) => {
        const isExternalSource = selectedNodes.every(
          (n) => n.id !== edge.source,
        );
        const isExternalTarget = selectedNodes.every(
          (n) => n.id !== edge.target,
        );

        return !(isExternalSource || isExternalTarget);
      },
    );

    setBufferedNodes(selectedNodes);
    setBufferedEdges(selectedEdges);
  }, [getNodes, getEdges]);

  const cut = useCallback(() => {
    const selectedNodes = getNodes().filter((node) => node.selected);
    const selectedEdges = getConnectedEdges(selectedNodes, getEdges()).filter(
      (edge) => {
        const isExternalSource = selectedNodes.every(
          (n) => n.id !== edge.source,
        );
        const isExternalTarget = selectedNodes.every(
          (n) => n.id !== edge.target,
        );

        return !(isExternalSource || isExternalTarget);
      },
    );

    setBufferedNodes(selectedNodes);
    setBufferedEdges(selectedEdges);

    // A cut action needs to remove the copied nodes and edges from the graph.
    setNodes((nodes) => nodes.filter((node) => !node.selected));
    setEdges((edges) => edges.filter((edge) => !selectedEdges.includes(edge)));
  }, [getNodes, setNodes, getEdges, setEdges]);

  const paste = useCallback(
    (
      { x: pasteX, y: pasteY } = screenToFlowPosition({
        x: mousePosRef.current.x,
        y: mousePosRef.current.y,
      }),
    ) => {
      const minX = Math.min(...bufferedNodes.map((s) => s.position.x));
      const minY = Math.min(...bufferedNodes.map((s) => s.position.y));

      const now = Date.now();

      const newNodes: NodeType[] = bufferedNodes.map((node) => {
        const id = `${node.id}-${now}`;
        const x = pasteX + (node.position.x - minX);
        const y = pasteY + (node.position.y - minY);

        return { ...node, id, position: { x, y } };
      });

      const newEdges: EdgeType[] = bufferedEdges.map((edge) => {
        const id = `${edge.id}-${now}`;
        const source = `${edge.source}-${now}`;
        const target = `${edge.target}-${now}`;

        return { ...edge, id, source, target };
      });

      setNodes((nodes) => [
        ...nodes.map((node) => ({ ...node, selected: false })),
        ...newNodes,
      ]);
      setEdges((edges) => [
        ...edges.map((edge) => ({ ...edge, selected: false })),
        ...newEdges,
      ]);
    },
    [bufferedNodes, bufferedEdges, screenToFlowPosition, setNodes, setEdges],
  );

  useShortcut(['Meta+x', 'Control+x'], cut);
  useShortcut(['Meta+c', 'Control+c'], copy, true);
  useShortcut(['Meta+v', 'Control+v'], paste);

  return { cut, copy, paste, bufferedNodes, bufferedEdges };
}

function useShortcut(
  keyCode: KeyCode,
  callback: () => void,
  isCopyAction = false,
): void {
  const [didRun, setDidRun] = useState(false);

  const shouldRun = useKeyPress(keyCode, {
    // these flags are being used to keep the default browser behavior
    // within input fields and selected text on the page
    actInsideInputWithModifier: false,
    preventDefault: false,
  });

  useEffect(() => {
    // gets any selected text on the page
    const selection = window.getSelection()?.toString();

    // when copying, we only allow it if there is no selected text on the page
    // this is to keep the default browser behavior
    const allowCopy = isCopyAction ? !selection : true;

    if (shouldRun && !didRun && allowCopy) {
      callback();
      setDidRun(true);
    } else {
      setDidRun(shouldRun);
    }
  }, [shouldRun, didRun, callback, isCopyAction]);
}

export default useCopyPaste;
