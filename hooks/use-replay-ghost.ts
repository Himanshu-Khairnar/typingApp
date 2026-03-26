"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReplayKeystroke } from "@/hooks/use-replay-recorder";

function getStorageKey(mode: string, config: string | number) {
  return `typearena_ghost_${mode}_${config}`;
}

type GhostData = {
  wpm: number;
  keystrokes: ReplayKeystroke[];
};

export function useReplayGhost(mode: string, config: string | number) {
  const [ghostIndex, setGhostIndex] = useState(0);
  const [hasGhost, setHasGhost] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const ghostData = useRef<GhostData | null>(null);
  const startTime = useRef(0);
  const rafId = useRef<number>(0);

  // Load ghost data from localStorage
  useEffect(() => {
    try {
      const key = getStorageKey(mode, config);
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as GhostData;
        if (parsed.keystrokes && parsed.keystrokes.length > 0) {
          ghostData.current = parsed;
          setHasGhost(true);
          return;
        }
      }
    } catch {
      // ignore parse errors
    }
    ghostData.current = null;
    setHasGhost(false);
  }, [mode, config]);

  const tick = useCallback(() => {
    if (!ghostData.current || !isActive) return;

    const elapsed = performance.now() - startTime.current;
    const keystrokes = ghostData.current.keystrokes;

    // Find the latest keystroke that should have occurred by now
    let idx = 0;
    for (let i = 0; i < keystrokes.length; i++) {
      if (keystrokes[i].time <= elapsed) {
        idx = keystrokes[i].charIndex;
      } else {
        break;
      }
    }

    setGhostIndex(idx);

    // Stop if we've played through all keystrokes
    if (elapsed < keystrokes[keystrokes.length - 1].time) {
      rafId.current = requestAnimationFrame(tick);
    } else {
      setIsActive(false);
    }
  }, [isActive]);

  const start = useCallback(() => {
    if (!ghostData.current) return;
    setGhostIndex(0);
    startTime.current = performance.now();
    setIsActive(true);
  }, []);

  // Run animation loop when active
  useEffect(() => {
    if (isActive) {
      rafId.current = requestAnimationFrame(tick);
    }
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [isActive, tick]);

  const stop = useCallback(() => {
    setIsActive(false);
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = 0;
    }
    setGhostIndex(0);
  }, []);

  return { ghostIndex, hasGhost, isActive, start, stop };
}
