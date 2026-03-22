import Handle from '../Handle/index.jsx';

export function InputNode({
  data,
  isConnectable,
  selected,
  sourcePosition = 'right',
  hideSourceHandle = false,
}) {
  return (
    <div
      className={`ric-input-node${selected ? ' selected' : ''}`}
      style={{
        background: '#fff',
        border: '1px solid #1a192b',
        borderBottom: '2px solid #0041d0',
        borderRadius: 3,
        padding: '10px',
        minWidth: 150,
        fontSize: 12,
        fontFamily: 'inherit',
        boxShadow: selected ? '0 0 0 0.5px #1a192b' : 'none',
      }}
    >
      <div className="ric-node-content">{data?.label}</div>
      {!hideSourceHandle && (
        <Handle type="source" position={sourcePosition} isConnectable={isConnectable} />
      )}
    </div>
  );
}
