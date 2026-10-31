"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { useTypingEngine, useTypingTimer } from "@/hooks/use-typing-engine";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { RotateCCWIcon } from "@/components/animated-icons/rotate-ccw";
import { RefreshCWIcon } from "@/components/animated-icons/refresh-cw";
import { HomeIcon } from "@/components/animated-icons/home";
import { LogoutIcon } from "@/components/animated-icons/logout";
import { ArrowLeftIcon } from "@/components/animated-icons/arrow-left";
import { SparklesIcon } from "@/components/animated-icons/sparkles";
import { useAnimatedIcon } from "@/components/animated-icons/use-animated-icon";
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
import type { CodeLanguage } from "@/lib/words";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import {
  Area,
  AreaChart,
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
// Micro-interaction building blocks
// ---------------------------------------------------------------------------

const PILL_SPRING = { type: "spring", stiffness: 500, damping: 38 } as const;

/** Toolbar option with a shared-layout pill that slides between siblings. */
function ToolbarOption({
  active, onClick, group, color, title, className, children,
}: {
  active: boolean; onClick: () => void; group: string; color: string;
  title?: string; className?: string; children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      title={title}
      onClick={onClick}
      whileTap={{ scale: 0.9 }}
      aria-pressed={active}
      className={cn(
        "relative rounded-full px-3 py-1 font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        className,
      )}
      style={active ? { color } : undefined}
    >
      {active && (
        <motion.span
          layoutId={`toolbar-pill-${group}`}
          className="absolute inset-0 rounded-full bg-background shadow-sm ring-1 ring-border/60"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={PILL_SPRING}
        />
      )}
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}

type IconComponent = React.ForwardRefExoticComponent<
  { size?: number; className?: string } & React.RefAttributes<{ startAnimation: () => void; stopAnimation: () => void }>
>;

/** Round icon button whose lucide-animated icon plays on hover/focus/press. */
function AnimatedIconButton({
  Icon, title, onClick, primary, color, fg,
}: {
  Icon: IconComponent; title: string; onClick: () => void;
  primary?: boolean; color: string; fg: string;
}) {
  const { iconRef, triggerProps, start } = useAnimatedIcon();
  return (
    <motion.button
      type="button"
      title={title}
      aria-label={title}
      onClick={() => { start(); onClick(); }}
      {...triggerProps}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.88 }}
      transition={{ type: "spring", stiffness: 500, damping: 25 }}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        primary ? "shadow-md hover:shadow-lg" : "border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted",
      )}
      style={primary ? { backgroundColor: color, color: fg, boxShadow: `0 6px 18px -6px ${color}` } : undefined}
    >
      <Icon ref={iconRef} size={16} className="pointer-events-none flex" />
    </motion.button>
  );
}

/** Floating zen-mode pill (link or button) with an animated icon. */
function ZenPill({
  Icon, label, title, href, onClick,
}: {
  Icon: IconComponent; label: string; title: string; href?: string; onClick?: () => void;
}) {
  const { iconRef, triggerProps } = useAnimatedIcon();
  const cls = "flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-4 py-2 text-sm font-medium text-muted-foreground backdrop-blur-md transition-colors hover:text-foreground hover:bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring/50";
  const content = (<><Icon ref={iconRef} size={15} className="pointer-events-none flex" />{label}</>);
  return (
    <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }}>
      {href ? (
        <Link href={href} title={title} className={cls} {...triggerProps}>{content}</Link>
      ) : (
        <button type="button" title={title} onClick={onClick} className={cls} {...triggerProps}>{content}</button>
      )}
    </motion.div>
  );
}

const resultContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
const resultItem: Variants = {
  hidden: { opacity: 0, y: 12, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { type: "spring", stiffness: 260, damping: 26 } },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface TypingTestProps {
  onResultVisibleChange?: (isVisible: boolean) => void;
  onZenModeChange?: (zen: boolean) => void;
}

export function TypingTest({ onResultVisibleChange, onZenModeChange }: TypingTestProps) {
  const { theme } = useAppSettings();
  // Fixed seed for the server render + hydration, randomised right after mount.
  // Generating it during render gave server and client different words, which
  // caused a hydration error and a full client re-render of the page.
  const [seed, setSeed] = useState("TYPEA");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client-only randomisation
    setSeed(generateSeed());
  }, []);
  const [roomCode] = useState("");
  const [playerId] = useState(() => generatePlayerId());

  const [testMode, setTestMode] = useState<TestMode>("time");
  const [timeLimit, setTimeLimit] = useState(30);
  // 40 isn't one of the selectable options (10/25/50/100), so nothing was highlighted
  const [wordCount, setWordCount] = useState(25);
  const [language] = useState<Language>("english");
  const [includePunctuation, setIncludePunctuation] = useState(false);
  const [includeNumbers, setIncludeNumbers] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState<CodeLanguage>("javascript");
  const [customTextInput] = useState("");

  // UI state
  const [caretStyle, setCaretStyle] = useState<CaretStyle>("beam");
  const caretBlinkingRef = useRef(true);
  const blinkResumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [zenMode, setZenMode] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [isNewPB, setIsNewPB] = useState(false);

  // Charts
  const lastRecordedResultRef = useRef<string | null>(null);
  const [wpmOverTime, setWpmOverTime] = useState<TimePoint[]>([]);

  // Hooks
  const { history, addEntry } = useLocalHistory();
  const { heatmap, recordKeystroke, getErrorRate, resetHeatmap } = useKeyHeatmap();
  const getKeyTotal = (key: string) => {
    const e = heatmap[key.toLowerCase()];
    return e ? e.correct + e.incorrect : 0;
  };

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
    correctChars,
    incorrectChars,
    elapsedMs,
    isRunning,
    startedAt,
    racePayload,
  } = useTypingEngine(words, { onKeystroke: handleKeystroke });

  // Personal best for the *same* test config — comparing a 15s test against
  // a 100-word test made the PB badge meaningless.
  const personalBest = useMemo(() => {
    let best: number | null = null;
    for (const e of history) {
      if (e.mode !== testMode) continue;
      if (testMode === "time" && e.timeLimit !== timeLimit) continue;
      if (testMode === "words" && e.wordCount !== wordCount) continue;
      if (best === null || e.netWpm > best) best = e.netWpm;
    }
    return best;
  }, [history, testMode, timeLimit, wordCount]);

  const liveStatsRef = useRef({ correctChars, accuracy });
  useEffect(() => { liveStatsRef.current = { correctChars, accuracy }; }, [correctChars, accuracy]);

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

  // Clicking a toolbar option moved focus to that button, so the "click to
  // focus" overlay appeared right after every config change. Hand focus back.
  useEffect(() => {
    inputRef.current?.focus();
  }, [testConfig, caretStyle, zenMode]);

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
      void textRef.current.offsetHeight; // force reflow
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
      // Escape = fresh test (was a full page reload to "/")
      if (event.key === "Escape") { event.preventDefault(); newSeed(); return; }
      if (event.key === "Tab") { event.preventDefault(); lastKeyRef.current = "Tab"; return; }
      if (event.key === "Enter" && lastKeyRef.current === "Tab") { event.preventDefault(); lastKeyRef.current = ""; restartSame(); return; }
      lastKeyRef.current = event.key;
      if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key.length === 1 && document.activeElement !== inputRef.current) {
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [restartSame, newSeed]);

  const [timeIsUp, setTimeIsUp] = useState(false);
  const handleTimeUp = useCallback(() => { setTimeIsUp(true); stop(); }, [stop]);

  // Reset timeIsUp when starting a new test
  useEffect(() => { if (!hasStarted) setTimeIsUp(false); }, [hasStarted]);

  // Sample WPM every second

  useEffect(() => {
    if (!hasStarted || isComplete || timeIsUp) return;
    const id = setInterval(() => {
      const ms = useTypingStore.getState().elapsedMs;
      const second = Math.round(ms / 1000);
      if (second < 1) return;
      // Compute WPM against the *current* time — the render-time netWpm is
      // frozen at the last keystroke, so pauses never showed up in the chart.
      const { correctChars: cc, accuracy: acc } = liveStatsRef.current;
      const wpm = cc / 5 / (ms / 60000);
      setWpmOverTime((prev) =>
        [...prev.filter((p) => p.second !== second), { second, wpm: Math.max(0, Math.round(wpm)), accuracy: Math.round(acc * 10) / 10 }]
          .sort((a, b) => a.second - b.second),
      );
    }, 1000);
    return () => clearInterval(id);
  }, [hasStarted, isComplete, timeIsUp]);

  // Final data point — wait until the store has stopped so elapsedMs is final
  useEffect(() => {
    if ((!isComplete && !timeIsUp) || isRunning) return;
    const second = Math.max(1, Math.round(elapsedMs / 1000));
    setWpmOverTime((prev) =>
      [...prev.filter((p) => p.second !== second), { second, wpm: Math.max(0, Math.round(netWpm)), accuracy: Math.round(accuracy * 10) / 10 }]
        .sort((a, b) => a.second - b.second),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComplete, timeIsUp, isRunning]);

  // Reset chart on new test
  useEffect(() => { if (!hasStarted) setWpmOverTime([]); }, [hasStarted]);

  // New text → imperative DOM state from the previous text is gone (the text
  // node is keyed by `text`), so the incremental colouring must start fresh.
  useLayoutEffect(() => {
    prevTypedLenRef.current = 0;
    viewportOffsetRef.current = 0;
  }, [text]);

  // Zen mode — auto-continue when words run out (no results screen, no time limit)
  useEffect(() => {
    if (zenMode && isComplete) setSeed(generateSeed());
  }, [zenMode, isComplete]);

  useEffect(() => { onResultVisibleChange?.(isComplete || timeIsUp); }, [isComplete, timeIsUp, onResultVisibleChange]);

  // Record result + PB check. Runs once per finished test: we wait for the
  // store to stop (final elapsedMs) and key on the test's start timestamp —
  // the old signature included live numbers, so a late re-render with the
  // final time saved the same result twice. Zen runs are not recorded.
  useEffect(() => {
    if (zenMode || !(isComplete || timeIsUp) || isRunning || typed.length === 0 || startedAt === null) return;
    const signature = `${seed}-${startedAt}`;
    if (lastRecordedResultRef.current === signature) return;
    lastRecordedResultRef.current = signature;

    const roundedWpm = Math.max(0, Math.round(netWpm));
    setIsNewPB(personalBest !== null && roundedWpm > personalBest);

    addEntry({ mode: testMode, timeLimit: testMode === "time" ? timeLimit : undefined, wordCount: testMode === "words" ? wordCount : undefined, language, netWpm: roundedWpm, grossWpm: Math.max(0, Math.round(grossWpm)), accuracy: Number(accuracy.toFixed(1)), elapsedMs, consistency, correctChars, incorrectChars });
  }, [zenMode, isComplete, timeIsUp, isRunning, startedAt, typed.length, seed, netWpm, accuracy, elapsedMs, personalBest, addEntry, testMode, timeLimit, wordCount, language, grossWpm, consistency, correctChars, incorrectChars]);

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
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={hasStarted ? { opacity: 0, y: -6 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className={cn("mb-8 flex flex-col items-center gap-3", hasStarted && "pointer-events-none select-none")}
      >
        <motion.div layout className="flex flex-wrap items-center justify-center gap-0.5 rounded-full bg-muted/60 px-2 py-1.5 text-sm">
          {/* Modifiers — hidden in code/custom mode */}
          {testMode !== "code" && testMode !== "custom" && (
            <>
              <ToolbarOption group="punct" active={includePunctuation} color={themeColors.primary} onClick={() => setIncludePunctuation((p) => !p)}>@ punctuation</ToolbarOption>
              <ToolbarOption group="nums" active={includeNumbers} color={themeColors.primary} onClick={() => setIncludeNumbers((p) => !p)}># numbers</ToolbarOption>
              <span className="mx-1 h-4 w-px bg-border/70" aria-hidden />
            </>
          )}

          {/* Test mode */}
          {(["time", "words", "quote", "code"] as TestMode[]).map((mode) => (
            <ToolbarOption key={mode} group="mode" active={testMode === mode} color={themeColors.primary} onClick={() => setTestMode(mode)} className="capitalize">{mode}</ToolbarOption>
          ))}

          <span className="mx-1 h-4 w-px bg-border/70" aria-hidden />

          {/* Time options — also shown in code mode */}
          {(testMode === "time" || testMode === "code") && [15, 30, 60, 90, 120].map((t) => (
            <ToolbarOption key={t} group="time" active={timeLimit === t} color={themeColors.primary} onClick={() => setTimeLimit(t)} className="tabular-nums">{t}</ToolbarOption>
          ))}

          {/* Word count options */}
          {testMode === "words" && [10, 25, 50, 100].map((c) => (
            <ToolbarOption key={c} group="words" active={wordCount === c} color={themeColors.primary} onClick={() => setWordCount(c)} className="tabular-nums">{c}</ToolbarOption>
          ))}

          {/* Code language options */}
          {testMode === "code" && (["javascript", "python", "cpp"] as CodeLanguage[]).map((lang) => (
            <ToolbarOption key={lang} group="lang" active={codeLanguage === lang} color={themeColors.primary} onClick={() => setCodeLanguage(lang)}>{lang === "cpp" ? "c++" : lang}</ToolbarOption>
          ))}

          {(testMode === "time" || testMode === "words" || testMode === "code") && <span className="mx-1 h-4 w-px bg-border/70" aria-hidden />}

          {/* Caret style */}
          {(["beam", "block", "underline"] as CaretStyle[]).map((s) => (
            <ToolbarOption key={s} group="caret" title={`${s} caret`} active={caretStyle === s} color={themeColors.primary} onClick={() => setCaretStyle(s)} className="px-2.5 font-mono text-xs font-bold">
              {s === "beam" ? "|" : s === "block" ? "▌" : "_"}
            </ToolbarOption>
          ))}

          {/* Zen mode */}
          <ToolbarOption group="zen" title={zenMode ? "Exit zen mode" : "Zen mode"} active={zenMode} color={themeColors.primary} onClick={toggleZen}>zen</ToolbarOption>
        </motion.div>

        <p className="text-[11px] text-muted-foreground/60">
          <kbd className="rounded border border-border/70 bg-muted/60 px-1.5 py-0.5 font-mono text-[10px]">tab</kbd>
          {" + "}
          <kbd className="rounded border border-border/70 bg-muted/60 px-1.5 py-0.5 font-mono text-[10px]">enter</kbd>
          {" restart · "}
          <kbd className="rounded border border-border/70 bg-muted/60 px-1.5 py-0.5 font-mono text-[10px]">esc</kbd>
          {" new test"}
        </p>
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/* Results                                                              */}
      {/* ------------------------------------------------------------------ */}
      {(isComplete || timeIsUp) && !zenMode ? (
        <motion.div className="w-full space-y-4" variants={resultContainer} initial="hidden" animate="show">

          {/* ── Main result ── */}
          <div className="overflow-hidden">

            {/* Top: big stats left + chart right */}
            <div className="flex flex-col items-stretch sm:flex-row">

              {/* Left — WPM + ACC */}
              <motion.div variants={resultItem} className="flex shrink-0 flex-row justify-start gap-8 py-4 pr-8 sm:w-[168px] sm:flex-col sm:justify-center sm:gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">wpm</p>
                  <AnimatedCounter
                    value={Math.round(netWpm)}
                    duration={0.9}
                    className="text-6xl font-bold tabular-nums leading-none"
                    style={{ color: themeColors.primary }}
                  />
                  <AnimatePresence>
                    {isNewPB && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.4, rotate: -12 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 420, damping: 14, delay: 0.7 }}
                        className="mt-2 flex w-fit items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/15 px-2 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400"
                      >
                        <SparklesIcon size={12} className="flex" />
                        new PB
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">acc</p>
                  <span className="text-3xl font-bold tabular-nums leading-none text-foreground">
                    <AnimatedCounter value={accuracy} decimals={1} duration={0.9} />%
                  </span>
                </div>
              </motion.div>

              {/* Right — compact chart */}
              <motion.div variants={resultItem} className="min-w-0 flex-1 px-3 pb-8 sm:border-l sm:border-border/20">
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
              </motion.div>
            </div>

            {/* Test type label */}
            <motion.div variants={resultItem} className="px-0 py-2 border-t border-border/10">
              <span className="font-mono text-[11px] text-muted-foreground/60">
                {testMode}
                {testMode === "time" ? ` ${timeLimit}` : testMode === "words" ? ` ${wordCount}` : ""}
              </span>
            </motion.div>

            {/* Bottom stats row + action buttons */}
            <motion.div variants={resultItem} className="border-t border-border/10 flex flex-wrap items-center gap-x-10 gap-y-3 px-0 py-5">
              {[
                { label: "raw",         value: String(Math.round(grossWpm)), hint: "WPM including mistakes" },
                { label: "characters",  value: `${correctChars} / ${incorrectChars}`, hint: "correct / incorrect" },
                { label: "consistency", value: `${consistency}%`, hint: "how steady your speed was" },
                { label: "time",        value: formatTime(elapsedMs), hint: "test duration" },
              ].map(({ label, value, hint }) => (
                <motion.div key={label} title={hint} whileHover={{ y: -2 }} className="cursor-default">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
                  <span className="text-2xl font-bold tabular-nums" style={{ color: themeColors.primary }}>
                    {value}
                  </span>
                </motion.div>
              ))}

              {/* Action buttons */}
              <div className="ml-auto flex items-center gap-2">
                <AnimatedIconButton Icon={RotateCCWIcon} title="Try again (same text)" onClick={restartSame} color={themeColors.primary} fg={themeColors.primaryFg} />
                <AnimatedIconButton Icon={RefreshCWIcon} title="New test" onClick={newSeed} primary color={themeColors.primary} fg={themeColors.primaryFg} />
              </div>
            </motion.div>
          </div>

          {/* Key heatmap */}
          <motion.div variants={resultItem} className="px-0 pt-4 pb-4">
            <span className="mb-4 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Key Heatmap</span>
            <div className="space-y-1.5">
              {QWERTY_ROWS.map((row, ri) => (
                <div key={ri} className="flex justify-center gap-1.5">
                  {row.map((key, ki) => {
                    const rate = getErrorRate(key);
                    const bg =
                      rate < 0   ? "bg-muted/30 text-muted-foreground/40" :
                      rate === 0 ? "bg-green-500/20 text-green-600 dark:text-green-400" :
                      rate < 0.2 ? "bg-amber-400/25 text-amber-600 dark:text-amber-400" :
                      rate < 0.4 ? "bg-orange-500/35 text-orange-600 dark:text-orange-400" :
                                   "bg-red-500/45 text-red-600 dark:text-red-400";
                    const total = getKeyTotal(key);
                    return (
                      <motion.div
                        key={key}
                        title={rate < 0 ? `${key}: not typed` : `${key}: ${Math.round(rate * 100)}% errors (${total} presses)`}
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.15, y: -2 }}
                        transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.35 + ri * 0.05 + ki * 0.02 }}
                        className={cn("flex h-8 w-8 cursor-default items-center justify-center rounded text-xs font-mono font-semibold uppercase", bg)}
                      >
                        {key}
                      </motion.div>
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
          </motion.div>

        </motion.div>
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
          <AnimatePresence>
            {!isFocused && (
              <motion.div
                key="focus-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/70 backdrop-blur-[3px]"
              >
                <motion.span
                  initial={{ y: 6, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 4, opacity: 0 }}
                  className="flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-4 py-1.5 text-sm text-muted-foreground shadow-sm select-none"
                >
                  <motion.span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: themeColors.primary }}
                    animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                  />
                  click or start typing to focus
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Text viewport */}
          <motion.div
            key={`viewport-${seed}-${testMode}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={cn("relative overflow-hidden", testMode === "code" ? "h-[10rem]" : "h-[6.75rem]")}
          >
            {/* keyed by text: a new text remounts every span so no stale
                imperative colouring survives (e.g. zen auto-continue) */}
            <div key={text} ref={textRef} className={cn("text-viewport", testMode === "code" && "whitespace-pre")}>
              {testMode === "code" ? text.split("").map((char, index) => (
                <span key={index} ref={(node) => { spanRefs.current[index] = node; }}
                  className="relative inline text-muted-foreground/50"
                >{char}</span>
              )) : renderWords(text, spanRefs, wordRefs)}
            </div>
          </motion.div>

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
      <AnimatePresence>
        {zenMode && (
          <motion.div
            key="zen-controls"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className={cn(
              "fixed bottom-6 left-6 z-50 flex items-center gap-2 transition-opacity duration-300",
              hasStarted ? "opacity-0 hover:opacity-100" : "opacity-100",
            )}
          >
            <ZenPill Icon={HomeIcon} label="Home" title="Return to homepage" href="/" />
            <ZenPill Icon={LogoutIcon} label="Exit zen" title="Exit zen mode" onClick={toggleZen} />
            <ZenPill Icon={ArrowLeftIcon} label="Go back" title="Go back" onClick={() => window.history.back()} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Caps lock toast */}
      <AnimatePresence>
        {capsLock && (
          <motion.div
            key="caps"
            role="status"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
            className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-600 shadow-lg backdrop-blur-sm dark:text-amber-400"
          >
            <motion.span animate={{ y: [0, -2, 0] }} transition={{ duration: 0.9, repeat: Infinity }}>⇪</motion.span>
            CAPS LOCK is on
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
