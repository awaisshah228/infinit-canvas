import Handle from '../Handle/index.jsx';

export function OutputNode({
  data,
  isConnectable,
  selected,
  targetPosition = 'top',
}) {
  return (
    <div
      className="ric-output-node"
      style={{
        background: '#fff',
        border: selected ? '2px solid #3b82f6' : '1px solid #ddd',
        borderRadius: 8,
        padding: '10px 16px',
        minWidth: 100,
        fontSize: 13,
        fontFamily: 'inherit',
      }}
    >
      <Handle type="target" position={targetPosition} isConnectable={isConnectable} />
      <div className="ric-node-content">{data?.label}</div>
    </div>
  );
}
