"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTypingEngine } from "@/hooks/use-typing-engine";
import { cn } from "@/lib/utils";
import {
  generateText,
  type TestConfig,
  type TestMode,
  type Language,
} from "@/lib/words";
import { useRaceBroadcast } from "@/hooks/use-race-broadcast";

type CaretPosition = {
  x: number;
  y: number;
  height: number;
};

function formatTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function generateSeed() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let seed = "";
  for (let i = 0; i < 5; i += 1) {
    seed += chars[Math.floor(Math.random() * chars.length)];
  }
  return seed;
}

function generatePlayerId() {
  return `p_${Math.random().toString(36).slice(2, 10)}`;
}

export function TypingTest() {
  const [seed, setSeed] = useState(() => generateSeed());
  const [roomCode, setRoomCode] = useState("");
  const [playerId] = useState(() => generatePlayerId());

  // Test configuration
  const [testMode, setTestMode] = useState<TestMode>("time");
  const [timeLimit, setTimeLimit] = useState(30);
  const [customTime, setCustomTime] = useState(30);
  const [wordCount, setWordCount] = useState(40);
  const [language, setLanguage] = useState<Language>("english");
  const [includePunctuation, setIncludePunctuation] = useState(false);
  const [includeNumbers, setIncludeNumbers] = useState(false);

  const testConfig: TestConfig = useMemo(
    () => ({
      mode: testMode,
      timeLimit: testMode === "time" ? timeLimit : undefined,
      wordCount: testMode === "words" ? wordCount : undefined,
      language,
      includePunctuation,
      includeNumbers,
    }),
    [
      testMode,
      timeLimit,
      wordCount,
      language,
      includePunctuation,
      includeNumbers,
    ],
  );

  const words = useMemo(
    () => generateText(testConfig, seed),
    [testConfig, seed],
  );

  const inputRef = useRef<HTMLInputElement | null>(null);
  const textRef = useRef<HTMLDivElement | null>(null);
  const spanRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [caret, setCaret] = useState<CaretPosition>({ x: 0, y: 0, height: 24 });

  const {
    text,
    typed,
    charStates,
    currentIndex,
    isComplete,
    isFocused,
    setFocused,
    handleInputChange,
    reset,
    stop,
    elapsedMs,
    grossWpm,
    netWpm,
    accuracy,
    progress,
    racePayload,
  } = useTypingEngine(words);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const updateCaret = useCallback(() => {
    const textNode = textRef.current;
    if (!textNode) return;

    const textRect = textNode.getBoundingClientRect();
    const targetIndex = Math.min(currentIndex, text.length - 1);
    const targetSpan = spanRefs.current[targetIndex];
    const lastSpan = spanRefs.current[text.length - 1];
    const spanRect = targetSpan?.getBoundingClientRect();

    if (spanRect) {
      const x =
        currentIndex >= text.length
          ? spanRect.right - textRect.left
          : spanRect.left - textRect.left;
      setCaret({ x, y: spanRect.top - textRect.top, height: spanRect.height });
      return;
    }

    if (lastSpan) {
      const lastRect = lastSpan.getBoundingClientRect();
      setCaret({
        x: lastRect.right - textRect.left,
        y: lastRect.top - textRect.top,
        height: lastRect.height,
      });
    }
  }, [currentIndex, text.length]);

  useEffect(() => {
    updateCaret();
  }, [updateCaret, typed]);

  useEffect(() => {
    const handleResize = () => updateCaret();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updateCaret]);

  const restartSame = useCallback(() => {
    reset(text);
    spanRefs.current = [];
    inputRef.current?.focus();
  }, [reset, text]);

  const newSeed = useCallback(() => {
    const nextSeed = generateSeed();
    setSeed(nextSeed);
    spanRefs.current = [];
    inputRef.current?.focus();
  }, [setSeed]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Shift + Tab to restart
      if (event.shiftKey && event.key === "Tab") {
        event.preventDefault();
        restartSame();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [restartSame]);

  // Time limit check
  const timeIsUp = useMemo(() => {
    return (
      testMode === "time" && elapsedMs >= timeLimit * 1000 && typed.length > 0
    );
  }, [testMode, timeLimit, elapsedMs, typed.length]);

  // Stop the timer when time is up
  useEffect(() => {
    if (timeIsUp) {
      stop();
    }
  }, [timeIsUp, stop]);

  const { players, isConnected } = useRaceBroadcast({
    roomCode,
    playerId,
    payload: racePayload,
    enabled: roomCode.length > 0,
  });

  return (
    <section className="w-full max-w-4xl rounded-xl border border-border bg-card px-10 py-12 shadow-sm">
      <header className="mb-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Typing Test
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Test Your Typing Speed
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={restartSame}
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              title="Shift + Tab"
            >
              Restart
            </button>
            <button
              type="button"
              onClick={newSeed}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              New Text
            </button>
          </div>
        </div>

        {/* Test Configuration */}
        <div className="space-y-4 rounded-lg border border-border bg-background p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Mode Selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-foreground">
                Mode:
              </label>
              <div className="flex gap-1">
                {(["time", "words", "quote"] as TestMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setTestMode(mode)}
                    className={cn(
                      "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                      testMode === mode
                        ? "bg-primary text-primary-foreground"
                        : "bg-background border border-border hover:bg-accent",
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Limits (shown when mode is time) */}
            {testMode === "time" && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-foreground">
                  Time:
                </label>
                <div className="flex gap-1">
                  {[15, 30, 60, 90, 120].map((time) => (
                    <button
                      key={time}
                      onClick={() => setTimeLimit(time)}
                      className={cn(
                        "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                        timeLimit === time
                          ? "bg-primary text-primary-foreground"
                          : "bg-background border border-border hover:bg-accent",
                      )}
                    >
                      {time}s
                    </button>
                  ))}
                  <input
                    type="number"
                    min="5"
                    max="600"
                    value={customTime}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 30;
                      setCustomTime(val);
                      setTimeLimit(val);
                    }}
                    onFocus={() => setTimeLimit(customTime)}
                    className="w-16 px-2 py-1.5 text-sm font-medium rounded-md border border-border bg-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    placeholder="Custom"
                  />
                </div>
              </div>
            )}

            {/* Word Count (shown when mode is words) */}
            {testMode === "words" && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-foreground">
                  Words:
                </label>
                <div className="flex gap-1">
                  {[10, 25, 50, 100].map((count) => (
                    <button
                      key={count}
                      onClick={() => setWordCount(count)}
                      className={cn(
                        "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                        wordCount === count
                          ? "bg-primary text-primary-foreground"
                          : "bg-background border border-border hover:bg-accent",
                      )}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Language Selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-foreground">
                Language:
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="px-3 py-1.5 text-sm font-medium rounded-md border border-border bg-background hover:bg-accent focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="english">English</option>
                <option value="hindi">हिंदी</option>
                <option value="marathi">मराठी</option>
              </select>
            </div>
          </div>

          {/* Additional Options */}
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includePunctuation}
                onChange={(e) => setIncludePunctuation(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
              <span className="text-sm font-medium text-foreground">
                Punctuation
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeNumbers}
                onChange={(e) => setIncludeNumbers(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
              <span className="text-sm font-medium text-foreground">
                Numbers
              </span>
            </label>
            <span className="text-xs text-muted-foreground ml-auto">
              Press{" "}
              <kbd className="px-2 py-0.5 text-xs font-semibold bg-muted border border-border rounded">
                Shift
              </kbd>{" "}
              +{" "}
              <kbd className="px-2 py-0.5 text-xs font-semibold bg-muted border border-border rounded">
                Tab
              </kbd>{" "}
              to restart
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
          <span className="inline-flex items-center rounded-md border border-border bg-background px-3 py-1.5 text-foreground">
            Seed: <span className="ml-1 font-semibold">{seed}</span>
          </span>
          {testMode === "time" ? (
            <span
              className={cn(
                "inline-flex items-center rounded-md border border-border bg-background px-3 py-1.5 text-foreground",
                timeLimit * 1000 - elapsedMs < 10000 &&
                  "bg-destructive/10 border-destructive text-destructive",
              )}
            >
              Time Left:{" "}
              <span className="ml-1 font-semibold">
                {formatTime(Math.max(0, timeLimit * 1000 - elapsedMs))}
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center rounded-md border border-border bg-background px-3 py-1.5 text-foreground">
              Time:{" "}
              <span className="ml-1 font-semibold">
                {formatTime(elapsedMs)}
              </span>
            </span>
          )}
          <span className="inline-flex items-center rounded-md border border-border bg-background px-3 py-1.5 text-foreground">
            Gross WPM:{" "}
            <span className="ml-1 font-semibold">{Math.round(grossWpm)}</span>
          </span>
          <span className="inline-flex items-center rounded-md border border-border bg-background px-3 py-1.5 text-foreground">
            Net WPM:{" "}
            <span className="ml-1 font-semibold">{Math.round(netWpm)}</span>
          </span>
          <span className="inline-flex items-center rounded-md border border-border bg-background px-3 py-1.5 text-foreground">
            Accuracy:{" "}
            <span className="ml-1 font-semibold">{accuracy.toFixed(1)}%</span>
          </span>
        </div>
      </header>

      {/* Show results in place of typing area when complete or time is up */}
      {isComplete || timeIsUp ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-6 py-8">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-green-600 dark:text-green-400 text-center">
              Results
            </h2>
            <p className="mt-2 text-3xl font-bold text-green-900 dark:text-green-100 text-center">
              {timeIsUp ? "Time's up!" : "Test complete!"}
            </p>
            <div className="mt-6 grid gap-4 text-base font-medium">
              <div className="flex items-center justify-between rounded-lg bg-green-100 px-4 py-3 dark:bg-green-900/50">
                <span className="text-green-700 dark:text-green-300 font-semibold">
                  Time
                </span>
                <span className="font-bold text-green-900 dark:text-green-100 text-xl">
                  {formatTime(elapsedMs)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-green-100 px-4 py-3 dark:bg-green-900/50">
                <span className="text-green-700 dark:text-green-300 font-semibold">
                  Gross WPM
                </span>
                <span className="font-bold text-green-900 dark:text-green-100 text-xl">
                  {Math.round(grossWpm)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-green-100 px-4 py-3 dark:bg-green-900/50">
                <span className="text-green-700 dark:text-green-300 font-semibold">
                  Net WPM
                </span>
                <span className="font-bold text-green-900 dark:text-green-100 text-xl">
                  {Math.round(netWpm)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-green-100 px-4 py-3 dark:bg-green-900/50">
                <span className="text-green-700 dark:text-green-300 font-semibold">
                  Accuracy
                </span>
                <span className="font-bold text-green-900 dark:text-green-100 text-xl">
                  {accuracy.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "relative rounded-2xl border border-zinc-200 bg-zinc-50 px-6 py-5 font-mono text-lg leading-8 text-zinc-400 transition-colors cursor-text",
            isFocused && "border-zinc-400 bg-white",
          )}
          onClick={focusInput}
        >
          <input
            ref={inputRef}
            type="text"
            className="absolute h-0 w-0 opacity-0"
            value={typed}
            onChange={(event) => {
              const value = event.target.value;
              handleInputChange(value);
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(event) => {
              // Prevent default backspace behavior when at start
              if (event.key === "Backspace" && typed.length === 0) {
                event.preventDefault();
              }
            }}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-label="Hidden typing input"
          />

          <div
            ref={textRef}
            className="relative whitespace-pre-wrap break-words"
          >
            {(() => {
              // Split text into words and track positions
              const words = text.split(" ");
              let charIndex = 0;

              return words.map((word, wordIndex) => {
                const wordStart = charIndex;
                const wordEnd = charIndex + word.length;

                // Check if this word has any errors
                const hasError = charStates
                  .slice(wordStart, wordEnd)
                  .some((state) => state === "incorrect");

                const wordChars = word.split("").map((char, i) => {
                  const index = wordStart + i;
                  const state = charStates[index];

                  return (
                    <span
                      key={index}
                      ref={(node) => {
                        spanRefs.current[index] = node;
                      }}
                      className={cn(
                        "relative inline transition-colors duration-75",
                        state === "correct" && "text-foreground",
                        state === "incorrect" &&
                          "text-destructive bg-destructive/20 rounded-sm",
                        state === "untyped" && "text-muted-foreground/50",
                        index === typed.length && "border-l-2 border-primary",
                      )}
                    >
                      {char}
                    </span>
                  );
                });

                // Add space after word (except last word)
                const spaceIndex = wordEnd;
                charIndex = wordEnd + 1;

                return (
                  <span
                    key={`word-${wordIndex}`}
                    className={cn(
                      "inline",
                      hasError &&
                        "underline decoration-destructive decoration-2 underline-offset-4",
                    )}
                  >
                    {wordChars}
                    {wordIndex < words.length - 1 && (
                      <span
                        ref={(node) => {
                          spanRefs.current[spaceIndex] = node;
                        }}
                        className={cn(
                          "transition-colors duration-75",
                          charStates[spaceIndex] === "correct" &&
                            "text-foreground",
                          charStates[spaceIndex] === "incorrect" &&
                            "text-destructive bg-destructive/20",
                          charStates[spaceIndex] === "untyped" &&
                            "text-muted-foreground/50",
                          spaceIndex === typed.length &&
                            "border-l-2 border-primary",
                        )}
                      >
                        {"\u00A0"}
                      </span>
                    )}
                  </span>
                );
              });
            })()}
          </div>

          <div className="mt-6 h-2 w-full rounded-full bg-secondary">
            <div
              className="h-2 rounded-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Show what's being typed */}
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Typing:</span>
            <span className="font-mono text-foreground">
              {typed || (
                <span className="text-muted-foreground italic">
                  Click here and start typing...
                </span>
              )}
            </span>
          </div>

          <div
            className={cn(
              "pointer-events-none absolute w-0.5 bg-primary transition-all duration-75",
              isFocused ? "opacity-100 animate-pulse" : "opacity-0",
            )}
            style={{
              left: caret.x + 24,
              top: caret.y + 20,
              height: caret.height,
            }}
          />
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-border bg-card px-6 py-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Multiplayer Bridge
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Connect to a room code to broadcast your progress every 500ms.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <input
              value={roomCode}
              onChange={(event) =>
                setRoomCode(event.target.value.toUpperCase())
              }
              placeholder="ROOM CODE"
              className="flex h-10 w-40 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium tracking-wider ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <span
              className={cn(
                "inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors",
                isConnected
                  ? "border-green-600/20 bg-green-50 text-green-700 dark:border-green-400/30 dark:bg-green-400/10 dark:text-green-400"
                  : "border-border bg-background text-muted-foreground",
              )}
            >
              {isConnected ? "Connected" : "Offline"}
            </span>
            <span className="inline-flex items-center rounded-md border border-border bg-background px-2.5 py-1 text-xs font-semibold text-muted-foreground">
              Player: {playerId}
            </span>
          </div>

          <div className="mt-6 space-y-3">
            {players.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No players yet. Open two tabs and use the same room code.
              </p>
            )}
            {players.map((player) => (
              <div
                key={player.id}
                className="rounded-lg border border-border bg-background px-4 py-3 shadow-sm"
              >
                <div className="flex items-center justify-between text-sm font-medium text-foreground">
                  <span className="font-mono text-xs">{player.id}</span>
                  <span className="font-semibold">
                    {Math.round(player.netWpm)} WPM
                  </span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-secondary">
                  <div
                    className="h-2 rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${player.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
