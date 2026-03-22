import { memo, useMemo } from 'react';
import { SmoothStepEdge } from './SmoothStepEdge.jsx';

const StepEdge = memo(function StepEdge({ id, ...props }) {
  const pathOptions = useMemo(
    () => ({ borderRadius: 0, offset: props.pathOptions?.offset }),
    [props.pathOptions?.offset]
  );

  return <SmoothStepEdge {...props} id={id} pathOptions={pathOptions} />;
});

StepEdge.displayName = 'StepEdge';

export { StepEdge };
