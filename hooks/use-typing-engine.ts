import { useCallback, useEffect, useMemo } from "react";
import { useTypingStore } from "@/lib/typing-store";

export type CharState = "untyped" | "correct" | "incorrect";

export function useTypingEngine(words: string[]) {
  const text = useMemo(() => words.join(" "), [words]);
  const typed = useTypingStore((state) => state.typed);
  const setTyped = useTypingStore((state) => state.setTyped);
  const setText = useTypingStore((state) => state.setText);
  const isFocused = useTypingStore((state) => state.isFocused);
  const setFocused = useTypingStore((state) => state.setFocused);
  const startedAt = useTypingStore((state) => state.startedAt);
  const elapsedMs = useTypingStore((state) => state.elapsedMs);
  const isRunning = useTypingStore((state) => state.isRunning);
  const start = useTypingStore((state) => state.start);
  const stop = useTypingStore((state) => state.stop);
  const tick = useTypingStore((state) => state.tick);
  const reset = useTypingStore((state) => state.reset);

  useEffect(() => {
    setText(text);
  }, [text, setText]);

  const handleInputChange = useCallback(
    (value: string) => {
      // Only allow typing up to text length
      const next = value.slice(0, text.length);

      // If everything is deleted, reset the test
      if (next.length === 0 && typed.length > 0) {
        reset(text);
        return;
      }

      // Update typed value
      setTyped(next);

      // Start timer on first character
      if (next.length > 0 && !isRunning) {
        start();
      }
    },
    [reset, setTyped, start, text, text.length, typed.length, isRunning],
  );

  const charStates = useMemo<CharState[]>(
    () =>
      text.split("").map((char, index) => {
        if (index >= typed.length) return "untyped";
        return typed[index] === char ? "correct" : "incorrect";
      }),
    [text, typed],
  );

  const totals = useMemo(() => {
    let correct = 0;
    let incorrect = 0;
    for (let i = 0; i < typed.length; i += 1) {
      if (typed[i] === text[i]) correct += 1;
      else incorrect += 1;
    }
    return { correct, incorrect };
  }, [typed, text]);

  useEffect(() => {
    if (!isRunning) return;
    const timer = window.setInterval(() => tick(), 100);
    return () => window.clearInterval(timer);
  }, [isRunning, tick]);

  useEffect(() => {
    if (typed.length >= text.length && text.length > 0) {
      stop();
    }
  }, [stop, text.length, typed.length]);

  const minutes = Math.max(elapsedMs / 60000, 1 / 600);
  const grossWpm = typed.length / 5 / minutes;
  const netWpm = Math.max(grossWpm - totals.incorrect / minutes, 0);
  const accuracy =
    typed.length === 0 ? 100 : (totals.correct / typed.length) * 100;
  const progress = text.length === 0 ? 0 : (typed.length / text.length) * 100;

  const racePayload = useMemo(
    () => ({
      progress,
      grossWpm,
      netWpm,
      accuracy,
      typedChars: typed.length,
      correctChars: totals.correct,
      incorrectChars: totals.incorrect,
      elapsedMs,
      startedAt,
    }),
    [
      progress,
      grossWpm,
      netWpm,
      accuracy,
      typed.length,
      totals.correct,
      totals.incorrect,
      elapsedMs,
      startedAt,
    ],
  );

  return {
    text,
    typed,
    charStates,
    currentIndex: typed.length,
    isComplete: typed.length >= text.length,
    isFocused,
    setFocused,
    handleInputChange,
    reset,
    stop,
    startedAt,
    elapsedMs,
    isRunning,
    grossWpm,
    netWpm,
    accuracy,
    progress,
    correctChars: totals.correct,
    incorrectChars: totals.incorrect,
    racePayload,
  };
}
