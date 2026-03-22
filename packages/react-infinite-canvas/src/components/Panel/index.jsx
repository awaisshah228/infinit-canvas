export default function Panel({
  position = 'top-left',
  style = {},
  className = '',
  children,
}) {
  const posStyle = {
    'top-left': { top: 10, left: 10 },
    'top-right': { top: 10, right: 10 },
    'top-center': { top: 10, left: '50%', transform: 'translateX(-50%)' },
    'bottom-left': { bottom: 10, left: 10 },
    'bottom-right': { bottom: 10, right: 10 },
    'bottom-center': { bottom: 10, left: '50%', transform: 'translateX(-50%)' },
  }[position] || { top: 10, left: 10 };

  return (
    <div
      className={`ric-panel ${className}`}
      style={{
        position: 'absolute',
        zIndex: 5,
        pointerEvents: 'all',
        ...posStyle,
        ...style,
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}
