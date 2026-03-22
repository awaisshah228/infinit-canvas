import Handle from '../Handle/index.jsx';

export function InputNode({
  data,
  isConnectable,
  selected,
  sourcePosition = 'bottom',
}) {
  return (
    <div
      className="ric-input-node"
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
      <div className="ric-node-content">{data?.label}</div>
      <Handle type="source" position={sourcePosition} isConnectable={isConnectable} />
    </div>
  );
}
