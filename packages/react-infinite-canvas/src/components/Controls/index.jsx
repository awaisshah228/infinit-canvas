import { useReactFlow } from '../../hooks/index.js';

export default function Controls({
  showZoom = true,
  showFitView = true,
  showInteractive = false,
  position = 'bottom-left',
  style = {},
  className = '',
}) {
  const { zoomIn, zoomOut, fitView, getZoom } = useReactFlow();

  const posStyle = {
    'top-left': { top: 10, left: 10 },
    'top-right': { top: 10, right: 10 },
    'bottom-left': { bottom: 30, left: 10 },
    'bottom-right': { bottom: 30, right: 10 },
  }[position] || { bottom: 30, left: 10 };

  return (
    <div
      className={`ric-controls ${className}`}
      style={{
        position: 'absolute',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        ...posStyle,
        ...style,
      }}
    >
      {showZoom && (
        <>
          <button onClick={() => zoomIn()} style={btnStyle} title="Zoom in">+</button>
          <button onClick={() => zoomOut()} style={btnStyle} title="Zoom out">−</button>
        </>
      )}
      {showFitView && (
        <button onClick={() => fitView({ padding: 0.1 })} style={btnStyle} title="Fit view">⊞</button>
      )}
    </div>
  );
}

const btnStyle = {
  width: 28,
  height: 28,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid rgba(0,0,0,0.12)',
  borderRadius: 4,
  background: '#fff',
  cursor: 'pointer',
  fontSize: 16,
  lineHeight: 1,
  color: '#333',
  padding: 0,
};
