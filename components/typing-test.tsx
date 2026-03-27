"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTypingEngine, useTypingTimer } from "@/hooks/use-typing-engine";
import { useTypingStore } from "@/lib/typing-store";
import { cn } from "@/lib/utils";
import {
  generateText,
  type TestConfig,
  type TestMode,
  type Language,
} from "@/lib/words";
import { useRaceBroadcast } from "@/hooks/use-race-broadcast";
import { SiteNavbar } from "@/components/site-navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { KeyboardThemeName } from "@/components/ui/keyboard";
import type { CodeLanguage } from "@/lib/words";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { useLocalHistory } from "@/hooks/use-local-history";
import { useKeyHeatmap } from "@/hooks/use-key-heatmap";
import { useAppSettings, THEME_COLORS } from "@/lib/app-settings";

// ---------------------------------------------------------------------------
// Helpers / constants
// ---------------------------------------------------------------------------


type CaretStyle = "beam" | "block" | "underline";
type PerformancePoint = { netWpm: number; accuracy: number; elapsedMs: number };
type TimePoint = { second: number; wpm: number; accuracy: number };

const QWERTY_ROWS = [
  ["q","w","e","r","t","y","u","i","o","p"],
  ["a","s","d","f","g","h","j","k","l"],
  ["z","x","c","v","b","n","m"],
];

function formatTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function generateSeed() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let seed = "";
  for (let i = 0; i < 5; i += 1) seed += chars[Math.floor(Math.random() * chars.length)];
  return seed;
}

function generatePlayerId() {
  return `p_${Math.random().toString(36).slice(2, 10)}`;
}

function renderWords(
  text: string,
  spanRefs: React.MutableRefObject<(HTMLSpanElement | null)[]>,
  wordRefs: React.MutableRefObject<(HTMLSpanElement | null)[]>,
) {
  const wordList = text.split(" ");
  let charIndex = 0;
  return wordList.map((word, wordIndex) => {
    const wordStart = charIndex;
    const wordEnd = charIndex + word.length;
    const wordChars = word.split("").map((char, i) => {
      const index = wordStart + i;
      return (
        <span key={index} ref={(node) => { spanRefs.current[index] = node; }}
          className="relative inline text-muted-foreground/50"
        >{char}</span>
      );
    });
    const spaceIndex = wordEnd;
    charIndex = wordEnd + 1;
    return (
      <span key={`word-${wordIndex}`} ref={(node) => { wordRefs.current[wordIndex] = node; }}
        className="inline-block whitespace-nowrap">
        {wordChars}
        {wordIndex < wordList.length - 1 && (
          <span ref={(node) => { spanRefs.current[spaceIndex] = node; }}
            className="relative inline text-muted-foreground/50"
          >{"\u00A0"}</span>
        )}
      </span>
    );
  });
}

// ---------------------------------------------------------------------------
// Sparkline (memoized to avoid Recharts re-render on every keystroke)
// ---------------------------------------------------------------------------

const Sparkline = memo(function Sparkline({ data, color }: { data: TimePoint[]; color: string }) {
  return (
    <div className="ml-auto h-8 w-20 opacity-50">
      <LineChart width={80} height={32} data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
        <Line type="monotone" dataKey="wpm" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </div>
  );
});

// ---------------------------------------------------------------------------
// LiveStatsBar — isolated from main tree so timer re-renders stay cheap
// ---------------------------------------------------------------------------

const LiveStatsBar = memo(function LiveStatsBar({
  testMode, timeLimit, text, typed, zenMode, hasStarted, wpmOverTime, themeColor,
}: {
  testMode: TestMode; timeLimit: number; text: string; typed: string;
  zenMode: boolean; hasStarted: boolean;
  wpmOverTime: TimePoint[]; themeColor: string;
}) {
  const elapsedMs = useTypingTimer();
  return (
    <div className={cn("mb-3 flex h-8 items-center gap-5 text-sm transition-opacity duration-200", hasStarted && !zenMode ? "opacity-100" : "opacity-0 pointer-events-none")}>
      {testMode === "time" && (
        <span className="tabular-nums font-semibold text-foreground">
          {Math.max(0, timeLimit - Math.floor(elapsedMs / 1000))}<span className="text-xs font-normal text-muted-foreground">s</span>
        </span>
      )}
      {testMode === "words" && (
        <span className="tabular-nums text-xs text-muted-foreground">
          {Math.max(0, text.split(" ").length - (typed.split(" ").length - 1))} <span>words left</span>
        </span>
      )}
      {wpmOverTime.length >= 2 && (
        <Sparkline data={wpmOverTime} color={themeColor} />
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// TimeGuard — tiny component that detects time-up without re-rendering parent
// ---------------------------------------------------------------------------
function TimeGuard({ timeLimit, zenMode, testMode, onTimeUp }: {
  timeLimit: number; zenMode: boolean; testMode: TestMode;
  onTimeUp: () => void;
}) {
  const elapsedMs = useTypingTimer();
  const typed = useTypingStore((s) => s.typed);
  const timeIsUp = !zenMode && (testMode === "time" || testMode === "code") && elapsedMs >= timeLimit * 1000 && typed.length > 0;
  useEffect(() => { if (timeIsUp) onTimeUp(); }, [timeIsUp, onTimeUp]);
  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface TypingTestProps {
  onResultVisibleChange?: (isVisible: boolean) => void;
  onZenModeChange?: (zen: boolean) => void;
}

export function TypingTest({ onResultVisibleChange, onZenModeChange }: TypingTestProps) {
  const { theme, isMuted } = useAppSettings();
  const [seed, setSeed] = useState(() => generateSeed());
  const [roomCode, setRoomCode] = useState("");
  const [playerId] = useState(() => generatePlayerId());

  const [testMode, setTestMode] = useState<TestMode>("time");
  const [timeLimit, setTimeLimit] = useState(30);
  const [wordCount, setWordCount] = useState(40);
  const [language, setLanguage] = useState<Language>("english");
  const [includePunctuation, setIncludePunctuation] = useState(false);
  const [includeNumbers, setIncludeNumbers] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState<CodeLanguage>("javascript");
  const [customTextInput, setCustomTextInput] = useState("");

  // UI state
  const [caretStyle, setCaretStyle] = useState<CaretStyle>("beam");
  const caretBlinkingRef = useRef(true);
  const blinkResumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [zenMode, setZenMode] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [isNewPB, setIsNewPB] = useState(false);

  // Charts
  const [performanceHistory, setPerformanceHistory] = useState<PerformancePoint[]>([]);
  const lastRecordedResultRef = useRef<string | null>(null);
  const [wpmOverTime, setWpmOverTime] = useState<TimePoint[]>([]);

  // Hooks
  const { history, addEntry, clearHistory, personalBest } = useLocalHistory();
  const { recordKeystroke, getErrorRate, resetHeatmap } = useKeyHeatmap();

  const handleKeystroke = useCallback(
    (key: string, isCorrect: boolean) => {
      recordKeystroke(key, isCorrect);
    },
    [recordKeystroke],
  );

  const testConfig: TestConfig = useMemo(
    () => ({
      mode: testMode,
      timeLimit: (testMode === "time" || testMode === "code") ? timeLimit : undefined,
      wordCount: testMode === "words" ? wordCount : undefined,
      language,
      includePunctuation: testMode === "custom" || testMode === "code" ? false : includePunctuation,
      includeNumbers: testMode === "custom" || testMode === "code" ? false : includeNumbers,
      customText: testMode === "custom" ? customTextInput : undefined,
      codeLanguage: testMode === "code" ? codeLanguage : undefined,
    }),
    [testMode, timeLimit, wordCount, language, includePunctuation, includeNumbers, customTextInput, codeLanguage],
  );

  const words = useMemo(() => generateText(testConfig, seed), [testConfig, seed]);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLDivElement | null>(null);
  const spanRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const prevTypedLenRef = useRef(0);
  const caretRef = useRef<HTMLDivElement>(null);
  const viewportOffsetRef = useRef(0);

  const {
    text,
    typed,
    currentIndex,
    isComplete,
    isFocused,
    setFocused,
    handleInputChange,
    reset,
    stop,
    grossWpm,
    netWpm,
    accuracy,
    progress,
    correctChars,
    incorrectChars,
    elapsedMs,
    racePayload,
  } = useTypingEngine(words, { onKeystroke: handleKeystroke });

  const liveStatsRef = useRef({ netWpm, accuracy });
  liveStatsRef.current = { netWpm, accuracy };

  const hasStarted = typed.length > 0;

  // Consistency — 100 minus the coefficient of variation of WPM samples
  const consistency = useMemo(() => {
    if (wpmOverTime.length < 2) return 100;
    const vals = wpmOverTime.map((p) => p.wpm);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    if (mean === 0) return 100;
    const stdDev = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length);
    return Math.max(0, Math.round(100 - (stdDev / mean) * 100));
  }, [wpmOverTime]);

  useEffect(() => () => { if (blinkResumeTimer.current) clearTimeout(blinkResumeTimer.current); }, []);

  const onInputChange = useCallback((value: string) => {
    handleInputChange(value);
    if (caretBlinkingRef.current) {
      caretBlinkingRef.current = false;
      caretRef.current?.classList.remove("typing-caret-blink");
    }
    if (blinkResumeTimer.current) clearTimeout(blinkResumeTimer.current);
    blinkResumeTimer.current = setTimeout(() => {
      caretBlinkingRef.current = true;
      caretRef.current?.classList.add("typing-caret-blink");
    }, 600);
  }, [handleInputChange]);

  const focusInput = useCallback(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, []);

  // Caps lock detection
  useEffect(() => {
    const handle = (e: KeyboardEvent) => setCapsLock(e.getModifierState("CapsLock"));
    window.addEventListener("keydown", handle);
    window.addEventListener("keyup", handle);
    return () => {
      window.removeEventListener("keydown", handle);
      window.removeEventListener("keyup", handle);
    };
  }, []);

  // Imperative caret positioning — runs after every typed change, no setState
  useLayoutEffect(() => {
    const container = containerRef.current;
    const textNode = textRef.current;
    const caretEl = caretRef.current;
    if (!container || !textNode || !caretEl) return;

    const containerRect = container.getBoundingClientRect();
    const textRect = textNode.getBoundingClientRect();
    const targetIndex = Math.min(currentIndex, text.length - 1);
    const activeSpan = spanRefs.current[targetIndex] ?? spanRefs.current[text.length - 1];
    if (!activeSpan) return;

    const spanRect = activeSpan.getBoundingClientRect();
    const relY = spanRect.top - textRect.top;
    const prevOffset = viewportOffsetRef.current;
    const newOffset = hasStarted ? Math.max(0, relY - 32) : 0;
    viewportOffsetRef.current = newOffset;

    textNode.style.transform = hasStarted ? `translateY(-${newOffset}px)` : "";

    const x = Math.round(currentIndex >= text.length ? spanRect.right - containerRect.left : spanRect.left - containerRect.left);
    const y = Math.round(hasStarted
      ? spanRect.top - containerRect.top + prevOffset - newOffset
      : spanRect.top - containerRect.top);

    caretEl.style.left = `${x}px`;
    caretEl.style.top = caretStyle === "underline" ? `${y + Math.round(spanRect.height) - 2}px` : `${y}px`;
    caretEl.style.height = caretStyle === "underline" ? "2px" : `${Math.round(spanRect.height)}px`;

    // Imperative char color updates — only touch changed range
    const prevLen = prevTypedLenRef.current;
    const curLen = typed.length;
    const lo = Math.min(prevLen, curLen);
    const hi = Math.max(prevLen, curLen);
    for (let i = lo; i <= hi && i < text.length; i++) {
      const span = spanRefs.current[i];
      if (!span) continue;
      const expected = text[i];
      const isSpace = expected === " ";
      const isNewline = expected === "\n";
      const display = isSpace ? "\u00A0" : expected;
      if (i >= curLen) {
        span.className = "relative inline text-muted-foreground/50";
        span.textContent = display;
      } else if (typed[i] === expected) {
        span.className = "relative inline text-foreground";
        span.textContent = display;
      } else {
        if (isSpace) {
          span.className = "relative inline text-destructive/50";
          span.textContent = (typed[i] ?? "") + "\u00A0";
        } else if (isNewline) {
          span.className = "relative inline text-destructive/50";
          span.textContent = "\n";
        } else {
          span.className = "relative inline text-destructive";
          span.textContent = expected;
        }
      }
    }
    prevTypedLenRef.current = curLen;

    // Imperative word underline — skip for code mode (no word spans)
    if (testMode === "code") return;
    const currentWordIndex = (typed.match(/ /g) ?? []).length;
    const wordList = text.split(" ");
    let ci = 0;
    for (let wi = 0; wi < wordList.length; wi++) {
      const wStart = ci;
      const wEnd = ci + wordList[wi].length;
      if (wEnd + 1 >= lo && wStart <= hi + 1) {
        const wordSpan = wordRefs.current[wi];
        if (wordSpan) {
          const isPast = wi < currentWordIndex;
          const hasError = isPast && Array.from({ length: wordList[wi].length }, (_, k) => {
            const idx = wStart + k;
            return idx < curLen && typed[idx] !== text[idx];
          }).some(Boolean);
          wordSpan.className = hasError
            ? "inline-block whitespace-nowrap underline decoration-destructive decoration-2 underline-offset-4"
            : "inline-block whitespace-nowrap";
        }
      }
      ci = wEnd + 1;
    }

    // Future line fading — dim lines beyond current + next
    const lineH = spanRefs.current[0]?.getBoundingClientRect().height ?? 36;
    for (let wi = 0; wi < wordList.length; wi++) {
      const wordSpan = wordRefs.current[wi];
      if (!wordSpan) continue;
      const wordTop = wordSpan.offsetTop;
      const lineIdx = Math.floor((wordTop - newOffset) / lineH);
      wordSpan.style.opacity = lineIdx > 1 ? "0.4" : "";
    }
  }, [typed, caretStyle, testMode, hasStarted, currentIndex, text]);

  const imperativeCaretUpdate = useCallback(() => {
    const container = containerRef.current;
    const textNode = textRef.current;
    const caretEl = caretRef.current;
    if (!container || !textNode || !caretEl) return;
    const containerRect = container.getBoundingClientRect();
    const textRect = textNode.getBoundingClientRect();
    const targetIndex = Math.min(currentIndex, text.length - 1);
    const activeSpan = spanRefs.current[targetIndex] ?? spanRefs.current[text.length - 1];
    if (!activeSpan) return;
    const spanRect = activeSpan.getBoundingClientRect();
    const relY = spanRect.top - textRect.top;
    const newOffset = hasStarted ? Math.max(0, relY - 32) : 0;
    viewportOffsetRef.current = newOffset;
    textNode.style.transform = hasStarted ? `translateY(-${newOffset}px)` : "";
    const x = Math.round(currentIndex >= text.length ? spanRect.right - containerRect.left : spanRect.left - containerRect.left);
    const y = Math.round(spanRect.top - containerRect.top);
    caretEl.style.left = `${x}px`;
    caretEl.style.top = caretStyle === "underline" ? `${y + Math.round(spanRect.height) - 2}px` : `${y}px`;
    caretEl.style.height = caretStyle === "underline" ? "2px" : `${Math.round(spanRect.height)}px`;
  }, [currentIndex, text.length, hasStarted, caretStyle]);

  useEffect(() => {
    window.addEventListener("resize", imperativeCaretUpdate);
    return () => window.removeEventListener("resize", imperativeCaretUpdate);
  }, [imperativeCaretUpdate]);

  const resetVisuals = useCallback(() => {
    // Reset imperative DOM changes that React doesn't know about
    for (let i = 0; i < spanRefs.current.length; i++) {
      const span = spanRefs.current[i];
      if (!span) continue;
      span.className = "relative inline text-muted-foreground/50";
      const ch = text[i];
      if (ch !== undefined) span.textContent = ch === " " ? "\u00A0" : ch;
    }
    for (const wordSpan of wordRefs.current) {
      if (wordSpan) {
        wordSpan.className = "inline-block whitespace-nowrap";
        wordSpan.style.opacity = "";
      }
    }
    if (textRef.current) {
      textRef.current.style.transition = "none";
      textRef.current.style.transform = "";
      textRef.current.offsetHeight; // force reflow
      textRef.current.style.transition = "";
    }
    prevTypedLenRef.current = 0;
    viewportOffsetRef.current = 0;
  }, [text]);

  const restartSame = useCallback(() => {
    resetVisuals();
    reset(text);
    resetHeatmap();
    setIsNewPB(false);
    inputRef.current?.focus();
  }, [reset, text, resetHeatmap, resetVisuals]);

  const newSeed = useCallback(() => {
    resetVisuals();
    setSeed(generateSeed());
    spanRefs.current = [];
    wordRefs.current = [];
    resetHeatmap();
    setIsNewPB(false);
    inputRef.current?.focus();
  }, [resetHeatmap, resetVisuals]);

  const lastKeyRef = useRef("");
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); window.location.href = "/"; return; }
      if (event.key === "Tab") { event.preventDefault(); lastKeyRef.current = "Tab"; return; }
      if (event.key === "Enter" && lastKeyRef.current === "Tab") { event.preventDefault(); lastKeyRef.current = ""; restartSame(); return; }
      lastKeyRef.current = event.key;
      if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key.length === 1 && document.activeElement !== inputRef.current) {
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [restartSame]);

  const [timeIsUp, setTimeIsUp] = useState(false);
  const handleTimeUp = useCallback(() => { setTimeIsUp(true); stop(); }, [stop]);

  // Reset timeIsUp when starting a new test
  useEffect(() => { if (!hasStarted) setTimeIsUp(false); }, [hasStarted]);

  // Sample WPM every second

  useEffect(() => {
    if (!hasStarted || isComplete || timeIsUp) return;
    const id = setInterval(() => {
      const ms = useTypingStore.getState().elapsedMs;
      const { netWpm: wpm, accuracy: acc } = liveStatsRef.current;
      const second = Math.round(ms / 1000);
      if (second < 1) return;
      setWpmOverTime((prev) =>
        [...prev.filter((p) => p.second !== second), { second, wpm: Math.max(0, Math.round(wpm)), accuracy: Math.round(acc * 10) / 10 }]
          .sort((a, b) => a.second - b.second),
      );
    }, 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStarted, isComplete, timeIsUp]);

  // Final data point
  useEffect(() => {
    if (!isComplete && !timeIsUp) return;
    const second = Math.max(1, Math.round(elapsedMs / 1000));
    setWpmOverTime((prev) =>
      [...prev.filter((p) => p.second !== second), { second, wpm: Math.max(0, Math.round(netWpm)), accuracy: Math.round(accuracy * 10) / 10 }]
        .sort((a, b) => a.second - b.second),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComplete, timeIsUp]);

  // Reset chart on new test
  useEffect(() => { if (!hasStarted) setWpmOverTime([]); }, [hasStarted]);

  // Zen mode — auto-continue when words run out (no results screen, no time limit)
  useEffect(() => {
    if (zenMode && isComplete) setSeed(generateSeed());
  }, [zenMode, isComplete]);

  useEffect(() => { onResultVisibleChange?.(isComplete || timeIsUp); }, [isComplete, timeIsUp, onResultVisibleChange]);

  // Record result + PB check
  useEffect(() => {
    if (!(isComplete || timeIsUp) || typed.length === 0) return;
    const signature = `${seed}-${typed.length}-${Math.round(netWpm)}-${Math.round(accuracy * 10)}-${elapsedMs}`;
    if (lastRecordedResultRef.current === signature) return;
    lastRecordedResultRef.current = signature;

    const roundedWpm = Math.max(0, Math.round(netWpm));
    const newBest = personalBest === null || roundedWpm > personalBest.netWpm;
    setIsNewPB(newBest);

    addEntry({ mode: testMode, timeLimit: testMode === "time" ? timeLimit : undefined, wordCount: testMode === "words" ? wordCount : undefined, language, netWpm: roundedWpm, grossWpm: Math.max(0, Math.round(grossWpm)), accuracy: Number(accuracy.toFixed(1)), elapsedMs, consistency, correctChars, incorrectChars });

    setPerformanceHistory((prev) =>
      [...prev, { netWpm: roundedWpm, accuracy: Number(accuracy.toFixed(1)), elapsedMs }].slice(-12),
    );
  }, [isComplete, timeIsUp, typed.length, seed, netWpm, accuracy, elapsedMs, personalBest, addEntry, testMode, timeLimit, wordCount, language, grossWpm]);

  useRaceBroadcast({ roomCode, playerId, payload: racePayload, enabled: roomCode.length > 0 });

  const themeColors = THEME_COLORS[theme];

  const toggleZen = useCallback(() => {
    setZenMode((z) => {
      onZenModeChange?.(!z);
      return !z;
    });
  }, [onZenModeChange]);

  return (
    <section
      style={{ "--primary": themeColors.primary, "--primary-foreground": themeColors.primaryFg } as React.CSSProperties}
      className="w-full max-w-7xl"
    >
      {/* ------------------------------------------------------------------ */}
      {/* Navbar                                                               */}
      {/* ------------------------------------------------------------------ */}
      <SiteNavbar
        className={cn(
          "transition-opacity duration-300",
          zenMode && hasStarted && "opacity-0 hover:opacity-100",
        )}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Config toolbar                                                       */}
      {/* ------------------------------------------------------------------ */}
      <div className={cn("mb-8 flex flex-col items-center gap-3 transition-opacity duration-200", hasStarted && "pointer-events-none opacity-0 select-none")}>
        <div className="flex flex-wrap items-center justify-center gap-0.5 rounded-full bg-muted/60 px-3 py-1.5 text-sm">
          {/* Modifiers — hidden in code/custom mode */}
          {testMode !== "code" && testMode !== "custom" && (
            <>
              <button type="button" onClick={() => setIncludePunctuation((p) => !p)}
                className={cn("rounded-full px-3 py-1 font-medium transition-colors", includePunctuation ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
                style={includePunctuation ? { color: themeColors.primary } : undefined}
              >@ punctuation</button>
              <button type="button" onClick={() => setIncludeNumbers((p) => !p)}
                className={cn("rounded-full px-3 py-1 font-medium transition-colors", includeNumbers ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
                style={includeNumbers ? { color: themeColors.primary } : undefined}
              ># numbers</button>
              <span className="mx-1 h-4 w-px bg-border/70" aria-hidden />
            </>
          )}

          {/* Test mode */}
          {(["time", "words", "quote", "code"] as TestMode[]).map((mode) => (
            <button key={mode} type="button" onClick={() => setTestMode(mode)}
              className={cn("rounded-full px-3 py-1 font-medium capitalize transition-colors", testMode === mode ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
              style={testMode === mode ? { color: themeColors.primary } : undefined}
            >{mode}</button>
          ))}

          <span className="mx-1 h-4 w-px bg-border/70" aria-hidden />

          {/* Time options — also shown in code mode */}
          {(testMode === "time" || testMode === "code") && [15, 30, 60, 90, 120].map((t) => (
            <button key={t} type="button" onClick={() => setTimeLimit(t)}
              className={cn("rounded-full px-3 py-1 font-medium transition-colors", timeLimit === t ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
              style={timeLimit === t ? { color: themeColors.primary } : undefined}
            >{t}</button>
          ))}

          {/* Word count options */}
          {testMode === "words" && [10, 25, 50, 100].map((c) => (
            <button key={c} type="button" onClick={() => setWordCount(c)}
              className={cn("rounded-full px-3 py-1 font-medium transition-colors", wordCount === c ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
              style={wordCount === c ? { color: themeColors.primary } : undefined}
            >{c}</button>
          ))}

          {/* Code language options */}
          {testMode === "code" && (["javascript", "python", "cpp"] as CodeLanguage[]).map((lang) => (
            <button key={lang} type="button" onClick={() => setCodeLanguage(lang)}
              className={cn("rounded-full px-3 py-1 font-medium transition-colors", codeLanguage === lang ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
              style={codeLanguage === lang ? { color: themeColors.primary } : undefined}
            >{lang === "cpp" ? "c++" : lang}</button>
          ))}

          {(testMode === "time" || testMode === "words" || testMode === "code") && <span className="mx-1 h-4 w-px bg-border/70" aria-hidden />}

          {/* Caret style */}
          {(["beam", "block", "underline"] as CaretStyle[]).map((s) => (
            <button key={s} type="button" title={`${s} caret`} onClick={() => setCaretStyle(s)}
              className={cn("rounded-full px-2.5 py-1 font-mono text-xs font-bold transition-colors", caretStyle === s ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
              style={caretStyle === s ? { color: themeColors.primary } : undefined}
            >{s === "beam" ? "|" : s === "block" ? "▌" : "_"}</button>
          ))}

          {/* Zen mode */}
          <button type="button" title={zenMode ? "Exit zen mode" : "Zen mode"} onClick={toggleZen}
            className={cn("rounded-full px-3 py-1 font-medium transition-colors", zenMode ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
            style={zenMode ? { color: themeColors.primary } : undefined}
          >zen</button>
        </div>

      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Results                                                              */}
      {/* ------------------------------------------------------------------ */}
      {(isComplete || timeIsUp) && !zenMode ? (
        <div className="w-full space-y-4">

          {/* ── Main result ── */}
          <div className="overflow-hidden">

            {/* Top: big stats left + chart right */}
            <div className="flex items-stretch">

              {/* Left — WPM + ACC */}
              <div className="flex flex-col justify-center gap-4 px-0 pr-8 py-4 shrink-0 w-[152px]">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">wpm</p>
                  <span className="text-6xl font-bold tabular-nums leading-none" style={{ color: themeColors.primary }}>
                    {Math.round(netWpm)}
                  </span>
                  {isNewPB && (
                    <Badge className="ml-2 align-middle bg-amber-400/20 text-amber-500 hover:bg-amber-400/20 border-amber-400/30">PB</Badge>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">acc</p>
                  <span className="text-3xl font-bold tabular-nums leading-none text-foreground">
                    {accuracy.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Right — compact chart */}
              <div className="flex-1 border-l border-border/20 px-3 pb-8 min-w-0">
                {/* Legend */}
                <div className="mb-2 flex items-center gap-4 px-1">
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="inline-block h-0.5 w-4 rounded-full" style={{ backgroundColor: themeColors.primary }} />
                    wpm
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="inline-block h-px w-4 rounded-full bg-violet-400" style={{ borderTop: "1.5px dashed #8b5cf6" }} />
                    accuracy
                  </span>
                </div>
                {wpmOverTime.length >= 2 ? (
                  <ChartContainer
                    config={{
                      wpm: { label: "WPM", color: themeColors.primary },
                      accuracy: { label: "Accuracy %", color: "#8b5cf6" },
                    }}
                    className="h-[270px] w-full"
                  >
                    <AreaChart data={wpmOverTime} margin={{ left: -8, right: 4, top: 4, bottom: 0 }}>
                      <defs>
                        <linearGradient id="wpmGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={themeColors.primary} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={themeColors.primary} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="second"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 9, fill: "currentColor", opacity: 0.35 }}
                        tickFormatter={(v) => `${v}s`}
                        interval="preserveStartEnd"
                      />
                      {/* WPM axis — left */}
                      <YAxis
                        yAxisId="wpm"
                        width={28}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 9, fill: "currentColor", opacity: 0.35 }}
                        domain={[0, (max: number) => Math.ceil((max + 5) / 10) * 10]}
                        tickCount={4}
                      />
                      {/* Accuracy axis — right */}
                      <YAxis
                        yAxisId="acc"
                        orientation="right"
                        width={28}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 9, fill: "#8b5cf6", opacity: 0.5 }}
                        domain={[50, 100]}
                        tickCount={4}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <ChartTooltip
                        cursor={{ stroke: "currentColor", strokeOpacity: 0.08, strokeWidth: 1 }}
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const wpmVal = payload.find((p) => p.dataKey === "wpm")?.value;
                          const accVal = payload.find((p) => p.dataKey === "accuracy")?.value;
                          return (
                            <div className="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs shadow-md space-y-0.5">
                              <p className="text-muted-foreground">{label}s</p>
                              {wpmVal !== undefined && (
                                <p><span className="font-bold" style={{ color: themeColors.primary }}>{wpmVal}</span> <span className="text-muted-foreground">wpm</span></p>
                              )}
                              {accVal !== undefined && (
                                <p><span className="font-bold text-violet-400">{accVal}</span> <span className="text-muted-foreground">% acc</span></p>
                              )}
                            </div>
                          );
                        }}
                      />
                      <ReferenceLine
                        yAxisId="wpm"
                        y={Math.round(netWpm)}
                        stroke={themeColors.primary}
                        strokeDasharray="3 3"
                        strokeOpacity={0.3}
                      />
                      <Area
                        yAxisId="wpm"
                        type="monotone"
                        dataKey="wpm"
                        name="WPM"
                        stroke={themeColors.primary}
                        strokeWidth={2}
                        fill="url(#wpmGradient)"
                        dot={false}
                        activeDot={{ r: 3, fill: themeColors.primary, strokeWidth: 0 }}
                      />
                      <Line
                        yAxisId="acc"
                        type="monotone"
                        dataKey="accuracy"
                        name="Accuracy"
                        stroke="#8b5cf6"
                        strokeWidth={1.5}
                        strokeDasharray="4 3"
                        dot={false}
                        activeDot={{ r: 3, fill: "#8b5cf6", strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ChartContainer>
                ) : (
                  <div className="flex h-[270px] items-center justify-center text-xs text-muted-foreground/50">
                    not enough data
                  </div>
                )}
              </div>
            </div>

            {/* Test type label */}
            <div className="px-0 py-2 border-t border-border/10">
              <span className="font-mono text-[11px] text-muted-foreground/60">
                {testMode}
                {testMode === "time" ? ` ${timeLimit}` : testMode === "words" ? ` ${wordCount}` : ""}
              </span>
            </div>

            {/* Bottom stats row + action buttons */}
            <div className="border-t border-border/10 flex flex-wrap items-center gap-x-10 gap-y-3 px-0 py-5">
              {[
                { label: "raw",         value: String(Math.round(grossWpm)) },
                { label: "characters",  value: `${correctChars} / ${incorrectChars} / 0` },
                { label: "consistency", value: `${consistency}%` },
                { label: "time",        value: formatTime(elapsedMs) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
                  <span className="text-2xl font-bold tabular-nums" style={{ color: themeColors.primary }}>
                    {value}
                  </span>
                </div>
              ))}

              {/* Action buttons */}
              <div className="ml-auto flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={restartSame} title="Try again (same text)" className="rounded-full h-9 w-9">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
                  </svg>
                </Button>
                <Button size="icon" onClick={newSeed} title="New test" className="rounded-full h-9 w-9" style={{ backgroundColor: themeColors.primary, color: themeColors.primaryFg }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 3h5v5" /><path d="M4 20 21 3" /><path d="M21 16v5h-5" /><path d="M15 15 21 21" /><path d="M4 4l5 5" />
                  </svg>
                </Button>
              </div>
            </div>
          </div>

          {/* Key heatmap */}
          <div className="px-0 pt-4 pb-4">
            <span className="mb-4 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Key Heatmap</span>
            <div className="space-y-1.5">
              {QWERTY_ROWS.map((row, ri) => (
                <div key={ri} className="flex justify-center gap-1.5">
                  {row.map((key) => {
                    const rate = getErrorRate(key);
                    const bg =
                      rate < 0   ? "bg-muted/30 text-muted-foreground/40" :
                      rate === 0 ? "bg-green-500/20 text-green-600 dark:text-green-400" :
                      rate < 0.2 ? "bg-amber-400/25 text-amber-600 dark:text-amber-400" :
                      rate < 0.4 ? "bg-orange-500/35 text-orange-600 dark:text-orange-400" :
                                   "bg-red-500/45 text-red-600 dark:text-red-400";
                    return (
                      <div key={key} className={cn("flex h-8 w-8 items-center justify-center rounded text-xs font-mono font-semibold uppercase", bg)}>
                        {key}
                      </div>
                    );
                  })}
                </div>
              ))}
              <p className="mt-3 flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-500/25" />no errors</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-400/30" />some errors</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-500/45" />many errors</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-muted/40" />not typed</span>
              </p>
            </div>
          </div>

        </div>
      ) : (
        /* ---------------------------------------------------------------- */
        /* Typing area                                                        */
        /* ---------------------------------------------------------------- */
        <div
          ref={containerRef}
          className={cn("relative px-2 py-4 text-muted-foreground cursor-text", testMode === "code" ? "text-2xl leading-10" : "text-xl leading-9")}

          onClick={focusInput}
        >
          <input
            ref={inputRef}
            type="text"
            className="fixed -top-full -left-full h-0 w-0 opacity-0 pointer-events-none"
            value={typed}
            onChange={(e) => onInputChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && typed.length === 0) { e.preventDefault(); return; }
              if (e.key === "Enter" && testMode === "code") {
                e.preventDefault();
                onInputChange(typed + "\n");
                return;
              }
              if (e.key === "Tab" && testMode === "code") {
                e.preventDefault();
                onInputChange(typed + "    ");
                return;
              }
              if ((e.shiftKey && e.key === "Delete") || (e.ctrlKey && e.key === "Backspace")) {
                e.preventDefault();
                const trimmed = typed.trimEnd();
                const lastSpace = trimmed.lastIndexOf(" ");
                handleInputChange(lastSpace === -1 ? "" : typed.slice(0, lastSpace + 1));
              }
            }}
            autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
            aria-label="Hidden typing input"
          />

          {/* Timer guard — detects time-up without re-rendering main tree */}
          <TimeGuard testMode={testMode} timeLimit={timeLimit} zenMode={zenMode} onTimeUp={handleTimeUp} />

          {/* Live stats bar — owns the timer, isolated re-renders */}
          <LiveStatsBar
            testMode={testMode}
            timeLimit={timeLimit}
            text={text}
            typed={typed}
            zenMode={zenMode}
            hasStarted={hasStarted}
            wpmOverTime={wpmOverTime}
            themeColor={themeColors.primary}
          />

          {/* Unfocused overlay */}
          {!isFocused && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-sm bg-background/70 backdrop-blur-[2px]">
              <span className="text-sm text-muted-foreground/70 select-none">click to focus</span>
            </div>
          )}

          {/* Text viewport */}
          <div className={cn("relative overflow-hidden", testMode === "code" ? "h-[10rem]" : "h-[6.75rem]")}>
            <div ref={textRef} className={cn("text-viewport", testMode === "code" && "whitespace-pre")}>
              {testMode === "code" ? text.split("").map((char, index) => (
                <span key={index} ref={(node) => { spanRefs.current[index] = node; }}
                  className="relative inline text-muted-foreground/50"
                >{char}</span>
              )) : renderWords(text, spanRefs, wordRefs)}
            </div>
          </div>

          {/* Caret */}
          <div
            ref={caretRef}
            className={cn(
              "pointer-events-none absolute typing-caret typing-caret-blink",
              isFocused ? "opacity-100" : "opacity-0",
              caretStyle === "beam" && "w-0.5 rounded-full",
              caretStyle === "block" && "w-[1ch] opacity-25 rounded-sm",
              caretStyle === "underline" && "w-[1ch] rounded-sm",
            )}
            style={{ backgroundColor: themeColors.primary }}
          />
        </div>
      )}
      {/* Zen mode — floating home button */}
      {zenMode && (
        <div className={cn(
          "fixed bottom-6 left-6 z-50 flex items-center gap-2 transition-opacity duration-300",
          hasStarted ? "opacity-0 hover:opacity-100" : "opacity-100",
        )}>
          <a
            href="/"
            title="Return to homepage"
            className="flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-4 py-2 text-sm font-medium text-muted-foreground backdrop-blur-md transition-colors hover:text-foreground hover:bg-muted"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            Home
          </a>
          <button
            type="button"
            title="Exit zen mode"
            onClick={toggleZen}
            className="flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-4 py-2 text-sm font-medium text-muted-foreground backdrop-blur-md transition-colors hover:text-foreground hover:bg-muted"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Exit zen
          </button>
          <button
            type="button"
            title="Go back"
            onClick={() => window.history.back()}
            className="flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-4 py-2 text-sm font-medium text-muted-foreground backdrop-blur-md transition-colors hover:text-foreground hover:bg-muted"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
            </svg>
            Go back
          </button>
        </div>
      )}

      {/* Caps lock toast */}
      {capsLock && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-600 shadow-lg backdrop-blur-sm dark:text-amber-400">
          ⇪ CAPS LOCK is on
        </div>
      )}
    </section>
  );
}
