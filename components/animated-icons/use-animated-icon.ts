"use client";

import { useCallback, useMemo, useRef } from "react";

type AnimatedIconHandle = {
  startAnimation: () => void;
  stopAnimation: () => void;
};

/**
 * Lets a whole button/link (not just the icon's own box) drive an animated
 * icon from lucide-animated.com. Spread `triggerProps` on the interactive
 * element and pass `iconRef` to the icon.
 */
export function useAnimatedIcon<T extends AnimatedIconHandle = AnimatedIconHandle>() {
  const iconRef = useRef<T>(null);
  const start = useCallback(() => iconRef.current?.startAnimation(), []);
  const stop = useCallback(() => iconRef.current?.stopAnimation(), []);

  const triggerProps = useMemo(
    () => ({ onMouseEnter: start, onMouseLeave: stop, onFocus: start, onBlur: stop }),
    [start, stop],
  );

  return { iconRef, triggerProps, start, stop };
}
