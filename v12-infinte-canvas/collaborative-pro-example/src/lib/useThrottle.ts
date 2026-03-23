import { useCallback, useEffect, useRef } from "react";

interface UseThrottleOptions {
  delay: number;
}

/**
 * A hook that throttles function calls, ensuring that the function is called
 * at most once per delay period. If multiple calls occur within the delay,
 * the last call will be executed after the delay period.
 *
 * @param callback - The function to throttle
 * @param options - Throttle configuration
 * @returns A tuple with [throttledCallback, immediateCallback]
 */
export function useThrottle<T extends (...args: any[]) => void>(
  callback: T,
  { delay }: UseThrottleOptions
): [T, T] {
  const lastUpdateTimeRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastArgsRef = useRef<Parameters<T> | null>(null);

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();

      // Store the latest arguments
      lastArgsRef.current = args;

      // If enough time has passed, call immediately
      if (now - lastUpdateTimeRef.current >= delay) {
        lastUpdateTimeRef.current = now;
        callback(...args);

        // Clear any pending timeout since we just called the function
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      } else {
        // Set up a timeout to call with the last arguments after the throttle period
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(
          () => {
            if (lastArgsRef.current) {
              lastUpdateTimeRef.current = Date.now();
              callback(...lastArgsRef.current);
              timeoutRef.current = null;
            }
          },
          delay - (now - lastUpdateTimeRef.current)
        );
      }
    },
    [callback, delay]
  ) as T;

  const immediateCallback = useCallback(
    (...args: Parameters<T>) => {
      lastArgsRef.current = null;
      lastUpdateTimeRef.current = Date.now();
      callback(...args);
    },
    [callback]
  ) as T;

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  return [throttledCallback, immediateCallback];
}
