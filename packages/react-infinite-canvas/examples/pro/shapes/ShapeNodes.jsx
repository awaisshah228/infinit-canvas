import { Handle } from '@infinit-canvas/react';

export function DiamondNode({ data }) {
  return (
    <div style={{ width: 80, height: 80, position: 'relative' }}>
      <Handle type="target" position="top" style={{ top: -4 }} />
      <svg width="80" height="80" viewBox="0 0 80 80">
        <polygon points="40,2 78,40 40,78 2,40" fill={data.color || '#ff6b6b'} stroke="#333" strokeWidth="1.5" />
        <text x="40" y="44" textAnchor="middle" fontSize="11" fontWeight="500" fill="#fff">{data.label}</text>
      </svg>
      <Handle type="source" position="bottom" style={{ bottom: -4 }} />
      <Handle type="source" position="right" id="right" style={{ right: -4, top: '50%' }} />
      <Handle type="target" position="left" id="left" style={{ left: -4, top: '50%' }} />
    </div>
  );
}

export function CircleNode({ data }) {
  return (
    <div style={{ width: 80, height: 80, position: 'relative' }}>
      <Handle type="target" position="top" style={{ top: -4 }} />
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="38" fill={data.color || '#4ecdc4'} stroke="#333" strokeWidth="1.5" />
        <text x="40" y="44" textAnchor="middle" fontSize="11" fontWeight="500" fill="#fff">{data.label}</text>
      </svg>
      <Handle type="source" position="bottom" style={{ bottom: -4 }} />
      <Handle type="source" position="right" id="right" style={{ right: -4, top: '50%' }} />
      <Handle type="target" position="left" id="left" style={{ left: -4, top: '50%' }} />
    </div>
  );
}

export function RectNode({ data }) {
  return (
    <div style={{
      padding: '12px 24px',
      background: data.color || '#45b7d1',
      border: '1.5px solid #333',
      borderRadius: 6,
      color: '#fff',
      fontWeight: 500,
      fontSize: 13,
      textAlign: 'center',
      minWidth: 100,
    }}>
      <Handle type="target" position="top" />
      {data.label}
      <Handle type="source" position="bottom" />
      <Handle type="source" position="right" id="right" />
      <Handle type="target" position="left" id="left" />
    </div>
  );
}

export function HexagonNode({ data }) {
  return (
    <div style={{ width: 100, height: 86, position: 'relative' }}>
      <Handle type="target" position="top" style={{ top: -4 }} />
      <svg width="100" height="86" viewBox="0 0 100 86">
        <polygon points="25,2 75,2 98,43 75,84 25,84 2,43" fill={data.color || '#a855f7'} stroke="#333" strokeWidth="1.5" />
        <text x="50" y="47" textAnchor="middle" fontSize="11" fontWeight="500" fill="#fff">{data.label}</text>
      </svg>
      <Handle type="source" position="bottom" style={{ bottom: -4 }} />
      <Handle type="source" position="right" id="right" style={{ right: -4, top: '50%' }} />
      <Handle type="target" position="left" id="left" style={{ left: -4, top: '50%' }} />
    </div>
  );
}
