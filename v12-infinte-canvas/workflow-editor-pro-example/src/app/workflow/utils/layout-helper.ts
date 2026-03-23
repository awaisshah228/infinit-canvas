import { type Edge } from '@infinit-canvas/react';
import ELK, { ElkNode, ElkPort } from 'elkjs/lib/elk.bundled.js';

import { type AppNode } from '@/app/workflow/components/nodes';
import { nodesConfig } from '../config';

const layoutOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': 'DOWN',
  'elk.layered.spacing.edgeNodeBetweenLayers': '80',
  'elk.spacing.nodeNode': '150',
  'elk.layered.nodePlacement.strategy': 'SIMPLE',
  'elk.separateConnectedComponents': 'true',
  'elk.spacing.componentComponent': '150',

  // TODO: this adds extra spacing between multi-port nodes that are not fully connected.
  // See issue #152
  'elk.layered.spacing.nodeNodeBetweenLayers': '100',
};

function createPort(id: string, side: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST') {
  return {
    id,
    properties: {
      side,
    },
  };
}

function getPorts(node: AppNode) {
  const handles = nodesConfig[node.type!].handles;

  const targetPorts: ElkPort[] = [];
  const sourcePorts: ElkPort[] = [];

  handles?.forEach((handle) => {
    if (handle.type === 'target') {
      targetPorts.push(
        createPort(`${node.id}-target-${handle.id ?? null}`, 'NORTH'),
      );
    }

    if (handle.type === 'source') {
      sourcePorts.push(
        createPort(`${node.id}-source-${handle.id ?? null}`, 'SOUTH'),
      );
    }
  });

  return { targetPorts, sourcePorts };
}

export async function layoutGraph(nodes: AppNode[], edges: Edge[]) {
  const connectedNodes = new Set();
  const elk = new ELK();

  const graph: ElkNode = {
    id: 'root',
    layoutOptions,
    edges: edges.map((edge) => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
      return {
        id: edge.id,
        sources: [
          edge.sourceHandle
            ? `${edge.source}-source-${edge.sourceHandle ?? null}`
            : edge.source,
        ],
        targets: [
          edge.targetHandle
            ? `${edge.target}-target-${edge.targetHandle ?? null}`
            : edge.target,
        ],
      };
    }),
    children: nodes.reduce<ElkNode[]>((acc, node) => {
      if (!connectedNodes.has(node.id)) {
        return acc;
      }

      const { targetPorts, sourcePorts } = getPorts(node);

      acc.push({
        id: node.id,
        width: node.width ?? node.measured?.width ?? 150,
        height: node.height ?? node.measured?.height ?? 50,
        ports: [createPort(node.id, 'SOUTH'), ...targetPorts, ...sourcePorts],
        layoutOptions: {
          'org.eclipse.elk.portConstraints': 'FIXED_ORDER',
        },
      });
      return acc;
    }, []),
  };

  const elkNodes = await elk.layout(graph);
  const layoutedNodesMap = new Map(elkNodes.children?.map((n) => [n.id, n]));

  const layoutedNodes: AppNode[] = nodes.map((node) => {
    const layoutedNode = layoutedNodesMap.get(node.id);

    if (
      !layoutedNode ||
      layoutedNode.x === undefined ||
      layoutedNode.y === undefined ||
      (layoutedNode.x === node.position.x && layoutedNode.y === node.position.y)
    ) {
      return node;
    }

    return {
      ...node,
      position: {
        x: layoutedNode.x,
        y: layoutedNode.y,
      },
    };
  });

  return layoutedNodes;
}
