import { Handle } from '@infinit-canvas/react';

export default function ExpandableNode({ data }) {
  return (
    <div style={{
      padding: '8px 16px',
      border: '1px solid #1a192b',
      borderRadius: 8,
      background: data.hasChildren ? '#f0f4ff' : '#fff',
      fontSize: 13,
      fontWeight: 500,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      minWidth: 100,
    }}>
      <Handle type="target" position="top" />
      <span>{data.label}</span>
      {data.hasChildren && (
        <span style={{
          fontSize: 11,
          color: '#6c757d',
          background: '#e9ecef',
          borderRadius: 10,
          padding: '1px 6px',
        }}>
          {data.isExpanded ? '−' : `+${data.childCount}`}
        </span>
      )}
      <Handle type="source" position="bottom" />
    </div>
  );
}
