import { WorkflowNodeProps } from '.';
import { nodesConfig } from '../../config';
import WorkflowNode from './workflow-node';
import { NodeHandle } from './workflow-node/node-handle';

export function TransformNode({ id, data }: WorkflowNodeProps) {
  return (
    <WorkflowNode id={id} data={data}>
      {nodesConfig['transform-node'].handles.map((handle) => (
        <NodeHandle
          key={`${handle.type}-${handle.id}`}
          id={handle.id}
          type={handle.type}
          position={handle.position}
          x={handle.x}
          y={handle.y}
        />
      ))}
      {/* Implement custom node specific functionality here */}
    </WorkflowNode>
  );
}
