"use client";

import { useCallback, useRef } from "react";

export type ReplayKeystroke = {
  charIndex: number;
  time: number;
};

function getStorageKey(mode: string, config: string | number) {
  return `typearena_ghost_${mode}_${config}`;
}

export function useReplayRecorder() {
  const keystrokes = useRef<ReplayKeystroke[]>([]);
  const startTime = useRef<number>(0);
  const isRecording = useRef(false);

  const startRecording = useCallback(() => {
    keystrokes.current = [];
    startTime.current = performance.now();
    isRecording.current = true;
  }, []);

  const recordKeystroke = useCallback((charIndex: number) => {
    if (!isRecording.current) return;
    const time = performance.now() - startTime.current;
    keystrokes.current.push({ charIndex, time });
  }, []);

  const finishRecording = useCallback(
    (mode: string, config: string | number, netWpm?: number) => {
      isRecording.current = false;
      const recording = [...keystrokes.current];

      if (recording.length === 0) return recording;

      const key = getStorageKey(mode, config);

      try {
        const existing = localStorage.getItem(key);
        if (existing) {
          const parsed = JSON.parse(existing) as { wpm: number; keystrokes: ReplayKeystroke[] };
          // Only save if this is a new personal best
          if (netWpm !== undefined && parsed.wpm >= netWpm) {
            return recording;
          }
        }

        localStorage.setItem(
          key,
          JSON.stringify({ wpm: netWpm ?? 0, keystrokes: recording })
        );
      } catch {
        // localStorage might be full or unavailable
      }

      return recording;
    },
    []
  );

  return { startRecording, recordKeystroke, finishRecording };
}
