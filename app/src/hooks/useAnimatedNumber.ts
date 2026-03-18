import { useState, useEffect, useRef } from "react";

/**
 * Animates a number from 0 to the target value using requestAnimationFrame
 * with ease-out cubic easing.
 *
 * @param target  The final value to animate towards, or null.
 * @param duration  Animation duration in milliseconds (default 1500).
 * @returns The current animated value, or null if target is null.
 */
export function useAnimatedNumber(
  target: number | null,
  duration: number = 1500,
): number | null {
  const [current, setCurrent] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === null) {
      setCurrent(null);
      return;
    }

    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic: 1 - (1 - t)^3
      const eased = 1 - Math.pow(1 - progress, 3);

      setCurrent(eased * target!);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    }

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [target, duration]);

  return current;
}
