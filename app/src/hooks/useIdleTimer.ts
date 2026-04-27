import { useState, useEffect, useCallback, useRef } from "react";
import {
  IDLE_TIMEOUT_MS,
  IDLE_DISABLE_MOBILE_BREAKPOINT_PX,
  IDLE_DISABLE_QUERY_FLAG,
} from "../lib/constants";

function isKioskDisabled(): boolean {
  if (typeof window === "undefined") return true;
  if (window.location.search.includes(IDLE_DISABLE_QUERY_FLAG)) return true;
  if (window.innerWidth < IDLE_DISABLE_MOBILE_BREAKPOINT_PX) return true;
  return false;
}

export function useIdleTimer() {
  const [isIdle, setIsIdle] = useState(false);
  const [disabled, setDisabled] = useState(() => isKioskDisabled());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setIsIdle(false);
    timerRef.current = setTimeout(() => {
      setIsIdle(true);
    }, IDLE_TIMEOUT_MS);
  }, []);

  useEffect(() => {
    const handleResize = () => setDisabled(isKioskDisabled());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (disabled) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
    ];

    timerRef.current = setTimeout(() => {
      setIsIdle(true);
    }, IDLE_TIMEOUT_MS);

    events.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [resetTimer, disabled]);

  return { isIdle: disabled ? false : isIdle };
}
