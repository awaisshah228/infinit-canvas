import { EdgeText } from './EdgeText.jsx';

function isNumeric(val) {
  return val != null && val !== '' && !isNaN(Number(val));
}

export function BaseEdge({
  id,
  path,
  labelX,
  labelY,
  label,
  labelStyle,
  labelShowBg,
  labelBgStyle,
  labelBgPadding,
  labelBgBorderRadius,
  interactionWidth = 20,
  style,
  markerEnd,
  markerStart,
  className = '',
  ...rest
}) {
  return (
    <>
      <path
        id={id}
        d={path}
        fill="none"
        stroke="#b1b1b7"
        strokeWidth={1.5}
        className={`ric-edge-path ${className}`}
        style={style}
        markerEnd={markerEnd}
        markerStart={markerStart}
        {...rest}
      />
      {interactionWidth ? (
        <path
          d={path}
          fill="none"
          strokeOpacity={0}
          strokeWidth={interactionWidth}
          className="ric-edge-interaction"
          style={{ pointerEvents: 'stroke' }}
        />
      ) : null}
      {label && isNumeric(labelX) && isNumeric(labelY) ? (
        <EdgeText
          x={labelX}
          y={labelY}
          label={label}
          labelStyle={labelStyle}
          labelShowBg={labelShowBg}
          labelBgStyle={labelBgStyle}
          labelBgPadding={labelBgPadding}
          labelBgBorderRadius={labelBgBorderRadius}
        />
      ) : null}
    </>
  );
}
