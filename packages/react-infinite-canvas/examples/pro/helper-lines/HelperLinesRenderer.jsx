export default function HelperLinesSVG({ horizontal, vertical }) {
  if (horizontal === null && vertical === null) return null;

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 50,
      }}
    >
      {vertical !== null && (
        <line
          x1={vertical}
          y1="0"
          x2={vertical}
          y2="100%"
          stroke="#0041d0"
          strokeWidth="1"
          strokeDasharray="5,5"
        />
      )}
      {horizontal !== null && (
        <line
          x1="0"
          y1={horizontal}
          x2="100%"
          y2={horizontal}
          stroke="#0041d0"
          strokeWidth="1"
          strokeDasharray="5,5"
        />
      )}
    </svg>
  );
}
