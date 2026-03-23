import { useEffect, useState } from 'react';

/**
 *
 * Debounces a rapidly changing value. This can be useful in scenarios where you
 * have a `useEffect` hook and a rapidly changing value as a dependency. We use
 * this hook to make sure we're not hitting the backend with too many requests
 * for images or iframe previews - this would otherwise be a problem as the flow
 * is updated in real-time as the user drags the width/height sliders or types in
 * the title/subtitle input fields.
 *
 **/
export const useDebouncedValue = <T>(val: T, timeout: number) => {
  const [debounced, setDebounced] = useState<T | null>(null);

  useEffect(() => {
    if (debounced === null) {
      setDebounced(val);
      return;
    }

    const timer = setTimeout(() => {
      setDebounced(val);
    }, timeout);

    return () => clearTimeout(timer);
  }, [val, timeout, debounced]);

  return debounced ?? val;
};
