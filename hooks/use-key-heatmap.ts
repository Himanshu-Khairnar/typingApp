"use client";
import { useCallback, useState } from "react";

export type KeyHeatmap = Record<string, { correct: number; incorrect: number }>;

const STORAGE_KEY = "typearena_heatmap";

function loadHeatmap(): KeyHeatmap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as KeyHeatmap) : {};
  } catch {
    return {};
  }
}

function saveHeatmap(heatmap: KeyHeatmap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(heatmap));
  } catch {}
}

export function useKeyHeatmap() {
  const [heatmap, setHeatmap] = useState<KeyHeatmap>(loadHeatmap);

  const recordKeystroke = useCallback((key: string, isCorrect: boolean) => {
    const normalized = key.toLowerCase();
    setHeatmap((prev) => {
      const entry = prev[normalized] ?? { correct: 0, incorrect: 0 };
      const next = {
        ...prev,
        [normalized]: isCorrect
          ? { ...entry, correct: entry.correct + 1 }
          : { ...entry, incorrect: entry.incorrect + 1 },
      };
      saveHeatmap(next);
      return next;
    });
  }, []);

  const resetHeatmap = useCallback(() => {
    setHeatmap({});
    saveHeatmap({});
  }, []);

  const getErrorRate = useCallback(
    (key: string): number => {
      const entry = heatmap[key.toLowerCase()];
      if (!entry) return -1;
      const total = entry.correct + entry.incorrect;
      return total === 0 ? 0 : entry.incorrect / total;
    },
    [heatmap]
  );

  return { heatmap, recordKeystroke, resetHeatmap, getErrorRate };
}
