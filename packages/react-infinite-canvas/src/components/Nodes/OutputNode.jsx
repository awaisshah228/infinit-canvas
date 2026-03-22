import Handle from '../Handle/index.jsx';

export function OutputNode({
  data,
  isConnectable,
  selected,
  targetPosition = 'left',
  hideTargetHandle = false,
}) {
  return (
    <div
      className={`ric-output-node${selected ? ' selected' : ''}`}
      style={{
        background: '#fff',
        border: '1px solid #1a192b',
        borderTop: '2px solid #ff0072',
        borderRadius: 3,
        padding: '10px',
        minWidth: 150,
        fontSize: 12,
        fontFamily: 'inherit',
        boxShadow: selected ? '0 0 0 0.5px #1a192b' : 'none',
      }}
    >
      {!hideTargetHandle && (
        <Handle type="target" position={targetPosition} isConnectable={isConnectable} />
      )}
      <div className="ric-node-content">{data?.label}</div>
    </div>
  );
}
