import { useCallback } from 'react';
import {
  InfiniteCanvas,
  Background,
  ConnectionMode,
  OnConnect,
  Panel,
  addEdge,
  useEdgesState,
  useNodesState,
  type XYPosition,
} from '@infinit-canvas/react';

import '@infinit-canvas/react/styles.css';

import {
  initialNodes,
  nodeTypes,
  initialEdges,
  edgeTypes,
} from './initialElements';
import { useAppStore } from './store';
import { ControlPointData, EditableEdge } from './edges/EditableEdge';
import { ConnectionLine } from './edges/ConnectionLine';
import {
  Algorithm,
  COLORS,
  DEFAULT_ALGORITHM,
} from './edges/EditableEdge/constants';

const fitViewOptions = { padding: 0.4 };

export default function EditableEdgeFlow() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] =
    useEdgesState<EditableEdge>(initialEdges);

  const onConnect: OnConnect = useCallback(
    (connection) => {
      const { connectionLinePath } = useAppStore.getState();
      // We add a new edge based on the selected DEFAULT_ALGORITHM
      // and transfer all the control points from the connectionLinePath
      // in case the user has added any while creating the connection
      const edge: EditableEdge = {
        ...connection,
        id: `${Date.now()}-${connection.source}-${connection.target}`,
        type: 'editable-edge',
        selected: true,
        data: {
          algorithm: DEFAULT_ALGORITHM,
          points: connectionLinePath.map(
            (point: XYPosition, i: number) =>
            ({
              ...point,
              id: window.crypto.randomUUID(),
              prev: i === 0 ? undefined : connectionLinePath[i - 1],
              active: true,
            } as ControlPointData)
          ),
        },
      };
      setEdges((edges: EditableEdge[]) => addEdge(edge, edges));
    },
    [setEdges]
  );

  return (
    <InfiniteCanvas
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      connectionMode={ConnectionMode.Loose}
      connectionLineComponent={ConnectionLine}
      fitView
      fitViewOptions={fitViewOptions}
    >
      <Background />
      <Panel position="top-left">
        {Object.keys(Algorithm).map((algorithmKey) => {
          const algorithm = Algorithm[algorithmKey as keyof typeof Algorithm];
          const color = COLORS[algorithm];
          return (
            <div
              style={{
                color,
                fontWeight: 700,
              }}
            >
              {algorithm}
            </div>
          );
        })}
      </Panel>
    </InfiniteCanvas>
  );
}
