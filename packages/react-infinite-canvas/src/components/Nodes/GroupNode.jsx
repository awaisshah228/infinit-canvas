export function GroupNode({ data, selected, width, height }) {
  return (
    <div
      className={`ric-group-node${selected ? ' selected' : ''}`}
      style={{
        width: width || 300,
        height: height || 200,
        background: 'rgba(240, 240, 240, 0.25)',
        border: selected ? '2px solid #3b82f6' : '1px dashed #ccc',
        borderRadius: 8,
        padding: 8,
        boxSizing: 'border-box',
      }}
    >
      {data?.label && (
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#888',
            userSelect: 'none',
          }}
        >
          {data.label}
        </div>
      )}
    </div>
  );
}
