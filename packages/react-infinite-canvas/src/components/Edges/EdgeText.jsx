import { memo, useState, useEffect, useRef } from 'react';

function EdgeTextComponent({
  x,
  y,
  label,
  labelStyle,
  labelShowBg = true,
  labelBgStyle,
  labelBgPadding = [2, 4],
  labelBgBorderRadius = 2,
  children,
  className = '',
  ...rest
}) {
  const [bbox, setBbox] = useState({ x: 1, y: 0, width: 0, height: 0 });
  const textRef = useRef(null);

  useEffect(() => {
    if (textRef.current) {
      const textBbox = textRef.current.getBBox();
      setBbox({
        x: textBbox.x,
        y: textBbox.y,
        width: textBbox.width,
        height: textBbox.height,
      });
    }
  }, [label]);

  if (!label) return null;

  return (
    <g
      transform={`translate(${x - bbox.width / 2} ${y - bbox.height / 2})`}
      className={`ric-edge-textwrapper ${className}`}
      visibility={bbox.width ? 'visible' : 'hidden'}
      {...rest}
    >
      {labelShowBg && (
        <rect
          width={bbox.width + 2 * labelBgPadding[0]}
          x={-labelBgPadding[0]}
          y={-labelBgPadding[1]}
          height={bbox.height + 2 * labelBgPadding[1]}
          className="ric-edge-textbg"
          style={labelBgStyle}
          rx={labelBgBorderRadius}
          ry={labelBgBorderRadius}
        />
      )}
      <text
        className="ric-edge-text"
        y={bbox.height / 2}
        dy="0.3em"
        ref={textRef}
        style={labelStyle}
      >
        {label}
      </text>
      {children}
    </g>
  );
}

EdgeTextComponent.displayName = 'EdgeText';

export const EdgeText = memo(EdgeTextComponent);
