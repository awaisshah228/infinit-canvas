export default function EdgeToolbar({
  isVisible = false,
  x = 0,
  y = 0,
  alignX = 'center',
  alignY = 'center',
  children,
  style = {},
  className = '',
}) {
  if (!isVisible) return null;

  const tx = alignX === 'center' ? '-50%' : alignX === 'right' ? '-100%' : '0';
  const ty = alignY === 'center' ? '-50%' : alignY === 'bottom' ? '-100%' : '0';

  return (
    <div
      className={`ric-edge-toolbar ${className}`}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(${tx}, ${ty})`,
        zIndex: 1000,
        pointerEvents: 'all',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
