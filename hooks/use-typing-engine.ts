import { useCallback, useEffect, useMemo, useRef } from "react";
import { useTypingStore } from "@/lib/typing-store";

export type CharState = "untyped" | "correct" | "incorrect";

// ---------------------------------------------------------------------------
// Separate timer hook — only components that display elapsed time should call
// this. The typing area itself does NOT need to re-render on every 100ms tick.
// ---------------------------------------------------------------------------
export function useTypingTimer() {
  const isRunning = useTypingStore((s) => s.isRunning);
  const tick = useTypingStore((s) => s.tick);
  const elapsedMs = useTypingStore((s) => s.elapsedMs);

  useEffect(() => {
    if (!isRunning) return;
    const timer = window.setInterval(() => tick(), 100);
    return () => window.clearInterval(timer);
  }, [isRunning, tick]);

  return elapsedMs;
}

// ---------------------------------------------------------------------------
// Main typing engine hook — NO elapsedMs subscription, no timer effect.
// ---------------------------------------------------------------------------
/** Max letters accepted past the end of a word (Monkeytype caps these too). */
const MAX_EXTRAS = 15;

export function useTypingEngine(
  words: string[],
  {
    onKeystroke,
    allowExtras = false,
  }: {
    onKeystroke?: (key: string, isCorrect: boolean) => void;
    /** Letters typed at a word end (where a space is expected) are kept as
     *  "extra" letters on that word instead of replacing the space. */
    allowExtras?: boolean;
  } = {},
) {
  const text = useMemo(() => words.join(" "), [words]);
  const typed = useTypingStore((state) => state.typed);
  const setTyped = useTypingStore((state) => state.setTyped);
  const extras = useTypingStore((state) => state.extras);
  const setExtras = useTypingStore((state) => state.setExtras);

  // Word index of every character position (and one past the end)
  const wordAt = useMemo(() => {
    const arr = new Int32Array(text.length + 1);
    let w = 0;
    for (let i = 0; i <= text.length; i++) {
      arr[i] = w;
      if (text[i] === " ") w++;
    }
    return arr;
  }, [text]);

  const isFocused = useTypingStore((state) => state.isFocused);
  const setFocused = useTypingStore((state) => state.setFocused);
  const startedAt = useTypingStore((state) => state.startedAt);
  const isRunning = useTypingStore((state) => state.isRunning);
  const start = useTypingStore((state) => state.start);
  const stop = useTypingStore((state) => state.stop);
  const reset = useTypingStore((state) => state.reset);

  // Cumulative error tracking — never decreases when corrections are made
  const totalKeystrokesRef = useRef(0);
  const totalErrorsRef = useRef(0);

  useEffect(() => {
    reset(text);
  }, [text, reset]);

  // Reset counters when a new test starts
  useEffect(() => {
    if (startedAt === null) {
      totalKeystrokesRef.current = 0;
      totalErrorsRef.current = 0;
    }
  }, [startedAt]);

  const handleInputChange = useCallback(
    (value: string) => {
      // Ignore input once the test is finished (e.g. time ran out)
      const state = useTypingStore.getState();
      if (!state.isRunning && state.startedAt !== null) return;

      const typed = state.typed;
      const curExtras = state.extras;
      const pos = typed.length;
      const curWord = wordAt[pos];
      const curWordExtras = curExtras[curWord] ?? "";

      if (allowExtras && text[pos] === " ") {
        // A non-space letter where the word's trailing space is expected →
        // extra letter on this word (the space is still expected next).
        if (value.length === pos + 1 && value.startsWith(typed) && value[pos] !== " ") {
          if (curWordExtras.length >= MAX_EXTRAS) return;
          const nextExtras = curExtras.slice();
          nextExtras[curWord] = curWordExtras + value[pos];
          setExtras(nextExtras);
          totalKeystrokesRef.current += 1;
          totalErrorsRef.current += 1;
          onKeystroke?.(value[pos], false);
          return;
        }
        // Backspace removes extra letters before real ones
        if (curWordExtras && value.length < pos) {
          const nextExtras = curExtras.slice();
          if (value.length === pos - 1) {
            nextExtras[curWord] = curWordExtras.slice(0, -1);
            setExtras(nextExtras);
            return;
          }
          // Multi-char delete (ctrl+backspace) wipes them along with the word
          nextExtras[curWord] = "";
          setExtras(nextExtras);
        }
      }

      // Only allow typing up to text length
      const next = value.slice(0, text.length);

      // Block deleting into a correctly completed word (also covers
      // multi-char deletions like Ctrl+Backspace). A word with extra
      // letters is not correct, so it can be re-entered.
      if (next.length < typed.length) {
        let floor = 0;
        for (let i = next.length; i < typed.length; i++) {
          if (text[i] === " " && typed[i] === " ") {
            const wordStart = text.lastIndexOf(" ", i - 1) + 1;
            const wordCorrect = !curExtras[wordAt[i]]
              && text.slice(wordStart, i).split("").every((c, k) => typed[wordStart + k] === c);
            if (wordCorrect) floor = i + 1;
          }
        }
        if (floor > next.length) {
          if (floor >= typed.length) return;
          setTyped(typed.slice(0, floor));
          return;
        }
      }

      // If everything is deleted, reset the test
      if (next.length === 0 && typed.length > 0) {
        reset(text);
        return;
      }

      // Fire keystroke callback and track errors when a character is added
      if (next.length > typed.length) {
        const idx = typed.length;
        const newChar = next[idx];

        const isCorrect = next[idx] === text[idx];
        totalKeystrokesRef.current += 1;
        if (!isCorrect) totalErrorsRef.current += 1;
        onKeystroke?.(newChar, isCorrect);
      }

      // Update typed value
      setTyped(next);

      // Start timer on first character
      if (next.length > 0 && !state.isRunning) {
        start();
      }
    },
    [reset, setTyped, setExtras, start, text, wordAt, allowExtras, onKeystroke],
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
    let extra = 0;
    for (const e of extras) if (e) extra += e.length;
    return { correct, incorrect: incorrect + extra, extra };
  }, [typed, text, extras]);

  useEffect(() => {
    if (typed.length >= text.length && text.length > 0) {
      stop();
    }
  }, [stop, text.length, typed.length]);

  // Non-reactive reads for WPM calculations — these are snapshot values
  // that get recalculated on each render triggered by `typed` changes.
  // The display components (stats bars) subscribe to elapsedMs separately
  // via useTypingTimer() for live updates.
  const elapsedMs = useTypingStore.getState().elapsedMs;
  const minutes = Math.max(elapsedMs / 60000, 1 / 600);
  const grossWpm = (typed.length + totals.extra) / 5 / minutes;
  const netWpm = Math.max(totals.correct / 5 / minutes, 0);
  const accuracy =
    totalKeystrokesRef.current === 0
      ? 100
      : ((totalKeystrokesRef.current - totalErrorsRef.current) / totalKeystrokesRef.current) * 100;
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
    extras,
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
