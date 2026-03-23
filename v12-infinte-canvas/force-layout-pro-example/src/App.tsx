import { useCallback, MouseEvent, useState } from 'react';
import {
  InfiniteCanvas,
  Background,
  Panel,
  ProOptions,
  InfiniteCanvasProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  NodeOrigin,
  NodeMouseHandler,
  OnConnect,
  addEdge,
  OnConnectEnd,
  Edge,
} from '@infinit-canvas/react';
import '@infinit-canvas/react/styles.css';

// This is used to display a leva (https://github.com/pmndrs/leva) control panel for the example
import { useControls } from 'leva';

import useForceLayout from './useForceLayout';
import { initialNodes, initialEdges } from './initialElements';

const proOptions: ProOptions = { account: 'paid-pro', hideAttribution: true };
const nodeOrigin: NodeOrigin = [0.5, 0.5];
const defaultEdgeOptions = { type: 'straight' };
const emojis = ['👍', '👌', '👏', '👋', '🙌'];
const randomEmoji = (): string =>
  emojis[~~(Math.random() * (emojis.length - 1))];

function InfiniteCanvasPro({
  strength = -1000,
  distance = 150,
}: {
  strength?: number;
  distance?: number;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const { screenToFlowPosition } = useReactFlow();
  const dragEvents = useForceLayout({ strength, distance });

  const [createEdgeWithNode, setCreateEdgeWithNode] = useState<string | null>(
    null
  );
  const onPaneClick = useCallback(
    (evt: MouseEvent) => {
      const position = screenToFlowPosition({ x: evt.clientX, y: evt.clientY });
      let id = '';
      setNodes((nds: Node[]) => {
        id = `${nds.length + 1}`;
        return [
          ...nds,
          {
            id,
            position,
            data: { label: randomEmoji() },
          },
        ];
      });

      setEdges((eds: Edge[]) => {
        if (createEdgeWithNode !== null) {
          const newEdges = addEdge(
            {
              id: `${createEdgeWithNode}-->${id}`,
              source: createEdgeWithNode,
              target: id,
            },
            eds
          );
          setCreateEdgeWithNode(null);
          return newEdges;
        }
        return eds;
      });
    },
    [screenToFlowPosition, setNodes, createEdgeWithNode]
  );

  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds: Edge[]) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      const childId = window.crypto.randomUUID();
      const childNode = {
        id: childId,
        position: { x: node.position.x + 100, y: node.position.y + 100 },
        data: { label: randomEmoji() },
      };
      const childEdge = {
        id: `${node.id}->${childId}`,
        source: node.id,
        target: childId,
      };

      setNodes((nds: Node[]) => [...nds, childNode]);
      setEdges((eds: Edge[]) => [...eds, childEdge]);
    },
    [setNodes, setEdges]
  );

  const onConnectEnd: OnConnectEnd = useCallback((_, { toNode, fromNode }) => {
    if (!toNode && fromNode) {
      setCreateEdgeWithNode(fromNode.id);
    }
  }, []);

  return (
    <InfiniteCanvas
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onConnectEnd={onConnectEnd}
      proOptions={proOptions}
      onPaneClick={onPaneClick}
      nodeOrigin={nodeOrigin}
      onNodeClick={onNodeClick}
      onNodeDragStart={dragEvents.start}
      onNodeDrag={dragEvents.drag}
      onNodeDragStop={dragEvents.stop}
      defaultEdgeOptions={defaultEdgeOptions}
      minZoom={0.25}
      fitView
    >
      <Panel position="top-left">
        <b>How to use:</b> Click anywhere on the panel to add nodes, click a
        node to add a connection
      </Panel>
      <Background />
    </InfiniteCanvas>
  );
}

function InfiniteCanvasWrapper() {
  // 👇 This hook is used to display a leva (https://github.com/pmndrs/leva) control panel for this example.
  // You can safely remove it, if you don't want to use it.
  const levaProps = useControls({
    strength: {
      value: -1000,
      min: -2000,
      max: 0,
    },
    distance: {
      value: 150,
      min: 0,
      max: 1000,
    },
  });

  return (
    <InfiniteCanvasProvider>
      <InfiniteCanvasPro {...levaProps} />
    </InfiniteCanvasProvider>
  );
}

export default InfiniteCanvasWrapper;
