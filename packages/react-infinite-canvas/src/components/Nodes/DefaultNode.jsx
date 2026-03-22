import Handle from '../Handle/index.jsx';

export function DefaultNode({
  data,
  isConnectable,
  selected,
  targetPosition = 'left',
  sourcePosition = 'right',
  hideSourceHandle = false,
  hideTargetHandle = false,
}) {
  return (
    <div
      className={`ric-default-node${selected ? ' selected' : ''}`}
      style={{
        background: '#fff',
        border: '1px solid #1a192b',
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
      {!hideSourceHandle && (
        <Handle type="source" position={sourcePosition} isConnectable={isConnectable} />
      )}
    </div>
  );
}
