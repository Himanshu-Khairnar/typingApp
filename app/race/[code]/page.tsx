"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Copy, Check, Flag, Crown, Timer } from "lucide-react";
import { toast } from "sonner";
import { useRaceRoom, type RacePlayer, type RaceConfig } from "@/hooks/use-race-room";
import { SiteNavbar } from "@/components/site-navbar";
import { useTypingEngine } from "@/hooks/use-typing-engine";
import { generateText } from "@/lib/words";
import { cn } from "@/lib/utils";
import { Keyboard } from "@/components/ui/keyboard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppSettings } from "@/lib/app-settings";
import { useAuth } from "@/hooks/use-auth";

const ACCENT = "#F57644";

function generatePlayerId() {
  return `p_${Math.random().toString(36).slice(2, 10)}`;
}
function getRankLabel(rank: number) {
  return ["1st", "2nd", "3rd"][rank - 1] ?? `#${rank}`;
}
function fmtTime(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Race Track
// ─────────────────────────────────────────────────────────────────────────────
function RaceTrack({ players, myId }: { players: RacePlayer[]; myId: string }) {
  if (!players.length) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground animate-pulse">
        Waiting for players to join…
      </p>
    );
  }

  const sorted = [...players].sort((a, b) => b.progress - a.progress);

  return (
    <div className="space-y-3">
      {sorted.map((player, i) => {
        const isMe = player.id === myId;
        return (
          <div key={player.id} className={cn("rounded-lg px-3 py-2.5 transition-colors", isMe && "bg-muted/40")}>
            {/* Top row: rank + name + wpm */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-4 shrink-0 text-center text-xs font-bold text-muted-foreground">{i + 1}</span>
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: player.color }} />
              <span className={cn("flex-1 truncate text-sm", isMe ? "font-bold text-foreground" : "text-muted-foreground")}>
                {player.name}
                {isMe && <span className="ml-1 text-[10px] font-normal opacity-40">you</span>}
              </span>
              <span className="shrink-0 text-xs tabular-nums">
                {player.finishedAt ? (
                  <span className="font-bold" style={{ color: ACCENT }}>{Math.round(player.netWpm)} wpm ✓</span>
                ) : (
                  <span className="text-muted-foreground">
                    <span className="font-semibold text-foreground">{Math.round(player.netWpm)}</span> wpm
                  </span>
                )}
              </span>
            </div>
            {/* Progress bar starting from username */}
            <div className="ml-6 h-1.5 overflow-hidden rounded-full bg-muted/60">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${player.progress}%`, backgroundColor: player.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Results
// ─────────────────────────────────────────────────────────────────────────────
function Results({ players, myId, onRaceAgain, isHost }: {
  players: RacePlayer[];
  myId: string;
  onRaceAgain: () => void;
  isHost: boolean;
}) {
  const ranked = [...players]
    .sort((a, b) => {
      if (a.finishedAt && b.finishedAt) return a.finishedAt - b.finishedAt;
      if (a.finishedAt) return -1;
      if (b.finishedAt) return 1;
      return b.progress - a.progress;
    })
    .map((p, i) => ({ ...p, rank: i + 1 }));

  const me = ranked.find((p) => p.id === myId);

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className="rounded-2xl border border-border/40 bg-muted/20 px-6 py-8 text-center">
        {me && (
          <>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">You finished</p>
            <p className="mt-1 text-4xl font-black" style={{ color: ACCENT }}>{getRankLabel(me.rank)}</p>
            <p className="mt-2 text-2xl font-bold">
              <span>{Math.round(me.netWpm)}</span>
              <span className="ml-1 text-base font-normal text-muted-foreground">wpm</span>
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">{me.accuracy.toFixed(0)}% accuracy</p>
          </>
        )}
      </div>

      {/* Standings */}
      <div className="rounded-xl border border-border/40 overflow-hidden">
        <div className="px-4 py-3 border-b border-border/40 flex items-center gap-2">
          <Flag className="h-4 w-4" style={{ color: ACCENT }} />
          <span className="text-sm font-semibold">Final Standings</span>
        </div>
        <div className="divide-y divide-border/20">
          {ranked.map((player) => (
            <div
              key={player.id}
              className={cn(
                "flex items-center gap-3 px-4 py-3 transition-colors",
                player.id === myId && "bg-muted/40",
              )}
            >
              <span className="w-8 shrink-0 text-xs font-bold tabular-nums text-muted-foreground">{getRankLabel(player.rank)}</span>
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: player.color }} />
              <span className={cn("flex-1 truncate text-sm", player.id === myId ? "font-semibold text-foreground" : "text-muted-foreground")}>
                {player.name}
                {player.id === myId && <span className="ml-1.5 text-xs font-normal opacity-50">you</span>}
              </span>
              <span className="text-sm font-bold tabular-nums" style={{ color: player.rank === 1 ? ACCENT : undefined }}>
                {Math.round(player.netWpm)} <span className="text-xs font-normal text-muted-foreground">wpm</span>
              </span>
              <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">
                {player.accuracy.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Race again / leave */}
      <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border/30">
          <p className="text-sm font-semibold">What's next?</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {players.length} player{players.length !== 1 ? "s" : ""} in room
          </p>
        </div>
        <div className="divide-y divide-border/20">
          {players.map((p) => (
            <div key={p.id} className="flex items-center gap-2.5 px-5 py-2.5">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
              <span className={cn("flex-1 text-sm truncate", p.id === myId ? "font-semibold" : "text-muted-foreground")}>
                {p.name}{p.id === myId && <span className="ml-1 text-xs font-normal opacity-40">you</span>}
              </span>
            </div>
          ))}
        </div>
        <div className="px-5 py-4 flex gap-2">
          {isHost && (
            <Button size="sm" onClick={onRaceAgain} className="flex-1 font-semibold text-white hover:opacity-90" style={{ backgroundColor: ACCENT }}>
              Race Again
            </Button>
          )}
          <Button size="sm" variant="outline" className="flex-1" onClick={() => window.location.href = "/race"}>
            Leave Room
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Typing Area
// ─────────────────────────────────────────────────────────────────────────────
function TypingArea({ words, phase, onProgress }: {
  words: string[];
  phase: "lobby" | "countdown" | "racing" | "finished";
  onProgress: (data: { progress: number; netWpm: number; grossWpm: number; accuracy: number; finishedAt: number | null }) => void;
}) {
  const inputRef  = useRef<HTMLInputElement | null>(null);
  const textRef   = useRef<HTMLDivElement | null>(null);
  const spanRefs  = useRef<(HTMLSpanElement | null)[]>([]);
  const wordRefs  = useRef<(HTMLSpanElement | null)[]>([]);
  const prevTypedLenRef = useRef(0);
  const caretRef  = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewportOffsetRef = useRef(0);
  const finishedReported = useRef(false);

  const { text, typed, currentIndex, isComplete, isFocused, setFocused, handleInputChange, reset, elapsedMs, grossWpm, netWpm, accuracy, progress } = useTypingEngine(words);

  const statsRef = useRef({ progress, netWpm, grossWpm, accuracy });
  statsRef.current = { progress, netWpm, grossWpm, accuracy };

  useEffect(() => {
    if (phase === "racing") {
      finishedReported.current = false;
      prevTypedLenRef.current = 0;
      spanRefs.current = [];
      wordRefs.current = [];
      viewportOffsetRef.current = 0;
      reset(text);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (phase !== "racing" || isComplete) return;
    const id = setInterval(() => { onProgress({ ...statsRef.current, finishedAt: null }); }, 500);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, isComplete, onProgress]);

  useEffect(() => {
    if (phase === "racing" && isComplete && !finishedReported.current) {
      finishedReported.current = true;
      onProgress({ progress: 100, netWpm, grossWpm, accuracy, finishedAt: Date.now() });
    }
  }, [phase, isComplete, netWpm, grossWpm, accuracy, onProgress]);

  // Imperative caret + char updates
  useLayoutEffect(() => {
    const container = containerRef.current;
    const textNode  = textRef.current;
    const caretEl   = caretRef.current;
    if (!container || !textNode || !caretEl) return;

    const containerRect = container.getBoundingClientRect();
    const textRect      = textNode.getBoundingClientRect();
    const span = spanRefs.current[Math.min(currentIndex, text.length - 1)];
    if (!span) return;

    const spanRect = span.getBoundingClientRect();
    const relY = spanRect.top - textRect.top;
    const hasStarted = typed.length > 0;
    const newOffset = hasStarted ? Math.max(0, relY - 32) : 0;
    viewportOffsetRef.current = newOffset;
    textNode.style.transform = hasStarted ? `translateY(-${newOffset}px)` : "";

    const x = Math.round(currentIndex >= text.length ? spanRect.right - containerRect.left : spanRect.left - containerRect.left);
    const y = Math.round(spanRect.top - containerRect.top);
    caretEl.style.left   = `${x}px`;
    caretEl.style.top    = `${y}px`;
    caretEl.style.height = `${Math.round(spanRect.height)}px`;

    // Imperative char updates
    const prevLen = prevTypedLenRef.current;
    const curLen  = typed.length;
    const lo = Math.min(prevLen, curLen);
    const hi = Math.max(prevLen, curLen);
    for (let i = lo; i <= hi && i < text.length; i++) {
      const s = spanRefs.current[i];
      if (!s) continue;
      const expected = text[i];
      const isSpace  = expected === " ";
      if (i >= curLen) {
        s.className  = "relative inline text-muted-foreground/50";
        s.textContent = isSpace ? "\u00A0" : expected;
      } else if (typed[i] === expected) {
        s.className  = "relative inline text-foreground";
        s.textContent = isSpace ? "\u00A0" : expected;
      } else {
        if (isSpace) {
          s.className  = "relative inline text-destructive/50";
          s.textContent = (typed[i] ?? "") + "\u00A0";
        } else {
          s.className  = "relative inline text-destructive";
          s.textContent = expected;
        }
      }
    }
    prevTypedLenRef.current = curLen;

    // Word underlines (only past words)
    const currentWordIndex = (typed.match(/ /g) ?? []).length;
    const wordList = text.split(" ");
    let ci = 0;
    for (let wi = 0; wi < wordList.length; wi++) {
      const wStart = ci;
      const wEnd   = ci + wordList[wi].length;
      if (wEnd + 1 >= lo && wStart <= hi + 1) {
        const wordSpan = wordRefs.current[wi];
        if (wordSpan) {
          const isPast   = wi < currentWordIndex;
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
  });

  const isDisabled = phase !== "racing";

  return (
    <div className={cn("rounded-xl border border-border/40 bg-card transition-opacity", isDisabled && "opacity-50 pointer-events-none")}>
      {/* Stats bar */}
      <div className="flex items-center justify-between border-b border-border/30 px-4 py-2.5">
        <div className="flex items-center gap-4 text-sm">
          <span className="font-mono font-bold tabular-nums" style={{ color: ACCENT }}>{Math.round(netWpm)}</span>
          <span className="text-xs text-muted-foreground">wpm</span>
          <span className="text-xs text-muted-foreground">{accuracy.toFixed(0)}%</span>
          <span className="font-mono text-xs text-muted-foreground tabular-nums">{fmtTime(elapsedMs)}</span>
        </div>
        <div className="h-1 w-32 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: ACCENT }} />
        </div>
      </div>

      {/* Text area — same style as home page */}
      <div
        ref={containerRef}
        className="relative cursor-text px-4 py-4 font-mono text-xl leading-relaxed"
        onClick={() => !isDisabled && inputRef.current?.focus()}
      >
        <input
          ref={inputRef}
          type="text"
          className="fixed -top-full -left-full h-0 w-0 opacity-0 pointer-events-none"
          value={typed}
          disabled={isDisabled}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && typed.length === 0) e.preventDefault();
            if ((e.shiftKey && e.key === "Delete") || (e.ctrlKey && e.key === "Backspace")) {
              e.preventDefault();
              const trimmed = typed.trimEnd();
              const lastSpace = trimmed.lastIndexOf(" ");
              handleInputChange(lastSpace === -1 ? "" : typed.slice(0, lastSpace + 1));
            }
          }}
          autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
        />

        {/* Unfocused overlay */}
        {!isFocused && !isDisabled && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-b-xl bg-background/70 backdrop-blur-[2px]">
            <span className="text-sm text-muted-foreground/70 select-none">click to focus</span>
          </div>
        )}

        <div className="relative h-[6rem] overflow-hidden">
          <div ref={textRef} className="relative">
            {(() => {
              const wordList = text.split(" ");
              let charIndex = 0;
              return wordList.map((word, wi) => {
                const wStart = charIndex;
                const wEnd   = charIndex + word.length;
                const wordChars = word.split("").map((ch, ci) => {
                  const idx = wStart + ci;
                  return (
                    <span key={idx} ref={(n) => { spanRefs.current[idx] = n; }}
                      className="relative inline text-muted-foreground/50"
                    >{ch}</span>
                  );
                });
                const spaceIdx = wEnd;
                charIndex = wEnd + 1;
                return (
                  <span key={`w${wi}`} ref={(n) => { wordRefs.current[wi] = n; }}
                    className="inline-block whitespace-nowrap">
                    {wordChars}
                    {wi < wordList.length - 1 && (
                      <span ref={(n) => { spanRefs.current[spaceIdx] = n; }}
                        className="relative inline text-muted-foreground/50"
                      >{"\u00A0"}</span>
                    )}
                  </span>
                );
              });
            })()}
          </div>
        </div>

        {/* Caret */}
        <div
          ref={caretRef}
          className={cn("pointer-events-none absolute w-0.5 rounded-full transition-opacity", isFocused && !isDisabled ? "opacity-100 animate-caret-blink" : "opacity-0")}
          style={{ backgroundColor: ACCENT }}
        />
      </div>

      {/* Finished banner */}
      {isComplete && phase === "racing" && (
        <div className="flex items-center justify-center gap-3 border-t border-border/30 px-4 py-3">
          <span className="text-sm font-semibold text-foreground">Finished</span>
          <span className="text-sm text-muted-foreground">·</span>
          <span className="font-bold">{Math.round(netWpm)} wpm</span>
          <span className="text-sm text-muted-foreground">·</span>
          <span className="text-sm text-muted-foreground">{accuracy.toFixed(0)}% accuracy</span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
function ToggleGroup<T extends string>({ label, options, value, onChange }: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <div className="flex gap-1.5 flex-wrap justify-end">
        {options.map((o) => (
          <button key={o.value} type="button" onClick={() => onChange(o.value)}
            className={cn("rounded-md px-3 py-1 text-xs font-semibold transition-all border",
              value === o.value
                ? "text-white border-transparent"
                : "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
            style={value === o.value ? { backgroundColor: "#F57644", borderColor: "#F57644" } : undefined}
          >{o.label}</button>
        ))}
      </div>
    </div>
  );
}

export default function RaceRoomPage() {
  const params       = useParams();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();

  const roomCode   = (params.code as string).toUpperCase();
  const playerName = user?.user_metadata?.username ?? user?.email?.split("@")[0] ?? "Anonymous";
  const isHost     = searchParams.get("host") === "1";

  // All hooks must be called before any conditional return
  const [raceMode, setRaceMode]       = useState<"words" | "time">("words");
  const [wordCount, setWordCount]     = useState(50);
  const [duration, setDuration]       = useState(60);
  const [punctuation, setPunctuation] = useState(false);
  const [numbers, setNumbers]         = useState(false);

  const hostConfig = useMemo<RaceConfig>(() => ({
    mode: raceMode, wordCount, duration, punctuation, numbers,
  }), [raceMode, wordCount, duration, punctuation, numbers]);

  const [playerId] = useState(() => generatePlayerId());
  const [copied, setCopied]     = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const { isMuted, theme } = useAppSettings();

  const { players, phase, countdown, raceSeed, raceConfig, isConnected, isRoomFull, broadcastProgress, updateConfig, startRace, resetRace, endRace } =
    useRaceRoom({ roomCode, playerId, playerName, isHost: isHost && !!user });

  const activeConfig = raceConfig ?? hostConfig;

  const raceWords = useMemo(() => {
    if (!raceSeed) return [];
    return generateText({ mode: "words", wordCount: activeConfig.mode === "time" ? 200 : activeConfig.wordCount, language: "english", includePunctuation: activeConfig.punctuation, includeNumbers: activeConfig.numbers }, raceSeed);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raceSeed, raceConfig]);

  useEffect(() => {
    if (phase !== "racing" || activeConfig.mode !== "time") return;
    setTimeLeft(activeConfig.duration);
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(id); if (isHost || players.length === 1) endRace(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, activeConfig.mode, activeConfig.duration]);

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    toast.success("Code copied!");
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/race/${roomCode}`);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const finishedCount = players.filter((p) => p.finishedAt !== null).length;
  const allFinished   = players.length > 0 && finishedCount === players.length;

  useEffect(() => {
    if (allFinished && phase === "racing" && activeConfig.mode === "words" && (isHost || players.length === 1)) endRace();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allFinished, phase]);

  // Auth guard — after all hooks
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="rounded-xl border border-border/40 bg-card px-8 py-8 text-center shadow-lg max-w-sm mx-4">
          <p className="font-bold text-lg">Sign in required</p>
          <p className="mt-1 text-sm text-muted-foreground">You need to be signed in to join a race.</p>
          <Button className="mt-4 w-full" onClick={() => window.location.href = `/auth`}>
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  const configBadges = (cfg: RaceConfig) => [
    cfg.mode === "words" ? `${cfg.wordCount} words` : `${cfg.duration}s`,
    cfg.punctuation && "punctuation",
    cfg.numbers && "numbers",
  ].filter(Boolean) as string[];

  return (
    <div className="min-h-screen bg-background">
      <SiteNavbar>
        {/* Room code + status */}
        <div className="flex items-center gap-2 rounded-full border border-border/50 bg-muted/40 px-3 py-1">
          <span className="text-xs text-muted-foreground hidden sm:inline">Room</span>
          <span className="font-mono text-sm font-bold tracking-widest">{roomCode}</span>
          <span
            className={cn("h-1.5 w-1.5 rounded-full transition-colors", isConnected ? "bg-green-500" : "bg-muted-foreground/40")}
            title={isConnected ? "Connected" : "Connecting…"}
          />
        </div>
        <Button variant="ghost" size="sm" onClick={copyLink} className="gap-1.5 text-xs">
          {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{copied ? "Copied!" : "Invite"}</span>
        </Button>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-destructive" onClick={() => window.location.href = "/race"}>
          Exit
        </Button>
      </SiteNavbar>

      {/* Room full error */}
      {isRoomFull && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="rounded-xl border border-border bg-card px-8 py-8 text-center shadow-lg max-w-sm mx-4">
            <p className="font-bold text-lg">Room is full</p>
            <p className="mt-1 text-sm text-muted-foreground">This room already has 5 players. Try a different room.</p>
            <Button className="mt-4 w-full" onClick={() => window.location.href = "/race"}>Back to Lobby</Button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-5xl px-4 pt-20 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 items-start">

          {/* ── Left column: Players + Lobby/Results ── */}
          <div className="space-y-4">

            {/* Players track */}
            <div className="rounded-xl border border-border/40 bg-card">
              <div className="flex items-center justify-between border-b border-border/30 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Players</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{players.length}/5</span>
                </div>
                <div className="flex items-center gap-2">
                  {phase === "racing"    && <Badge className="bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/20">Racing</Badge>}
                  {phase === "lobby"     && <Badge variant="secondary">Lobby</Badge>}
                  {phase === "countdown" && <Badge variant="outline">Starting…</Badge>}
                  {phase === "finished"  && <Badge variant="secondary">Finished</Badge>}
                  {phase === "racing" && activeConfig.mode === "time" && (
                    <span className={cn("flex items-center gap-1 font-mono text-xs font-bold tabular-nums", timeLeft <= 10 && "text-destructive")}>
                      <Timer className="h-3 w-3" />{timeLeft}s
                    </span>
                  )}
                  {phase === "racing" && activeConfig.mode === "words" && (
                    <span className="text-xs text-muted-foreground">{finishedCount}/{players.length} done</span>
                  )}
                </div>
              </div>
              <div className="px-4 py-3">
                <RaceTrack players={players} myId={playerId} />
              </div>
            </div>

            {/* Lobby settings card */}
            {phase === "lobby" && (
            <div className="rounded-xl border border-border/40 bg-card overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/30 px-5 py-4">
              <div className="flex items-center gap-2">
                {isHost && <Crown className="h-4 w-4" style={{ color: ACCENT }} />}
                <span className="font-semibold text-sm">
                  {isHost ? "Configure Race" : "Waiting for host…"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Share{" "}
                <button type="button" onClick={copyCode} className="font-mono font-bold tracking-widest hover:underline underline-offset-2" style={{ color: ACCENT }}>
                  {roomCode}
                </button>
                {" "}·{" "}
                <button type="button" onClick={copyLink} className="hover:text-foreground transition-colors underline underline-offset-2">
                  copy link
                </button>
              </p>
            </div>

            {/* Settings — host only */}
            {isHost ? (
              <div className="px-5 py-4 space-y-3">
                <ToggleGroup label="Mode" value={raceMode} onChange={(v) => { setRaceMode(v); updateConfig({ mode: v, wordCount, duration, punctuation, numbers }); }}
                  options={[{ value: "words", label: "Words" }, { value: "time", label: "Time" }]} />
                {raceMode === "words" ? (
                  <ToggleGroup label="Word count" value={String(wordCount) as never} onChange={(v) => { setWordCount(Number(v)); updateConfig({ mode: raceMode, wordCount: Number(v), duration, punctuation, numbers }); }}
                    options={[10, 25, 50, 100].map((n) => ({ value: String(n) as never, label: String(n) }))} />
                ) : (
                  <ToggleGroup label="Duration" value={String(duration) as never} onChange={(v) => { setDuration(Number(v)); updateConfig({ mode: raceMode, wordCount, duration: Number(v), punctuation, numbers }); }}
                    options={[15, 30, 60, 120].map((s) => ({ value: String(s) as never, label: `${s}s` }))} />
                )}
                <ToggleGroup label="Punctuation" value={punctuation ? "on" : "off"} onChange={(v) => { const val = v === "on"; setPunctuation(val); updateConfig({ mode: raceMode, wordCount, duration, punctuation: val, numbers }); }}
                  options={[{ value: "on", label: "On" }, { value: "off", label: "Off" }]} />
                <ToggleGroup label="Numbers" value={numbers ? "on" : "off"} onChange={(v) => { const val = v === "on"; setNumbers(val); updateConfig({ mode: raceMode, wordCount, duration, punctuation, numbers: val }); }}
                  options={[{ value: "on", label: "On" }, { value: "off", label: "Off" }]} />
              </div>
            ) : (
              <div className="px-5 py-6 space-y-3">
                <p className="text-xs text-muted-foreground text-center mb-1">Host is configuring the race</p>
                {raceConfig ? (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Mode</span>
                      <span className="font-medium capitalize">{raceConfig.mode}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{raceConfig.mode === "words" ? "Word count" : "Duration"}</span>
                      <span className="font-medium">{raceConfig.mode === "words" ? raceConfig.wordCount : `${raceConfig.duration}s`}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Punctuation</span>
                      <span className="font-medium">{raceConfig.punctuation ? "On" : "Off"}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Numbers</span>
                      <span className="font-medium">{raceConfig.numbers ? "On" : "Off"}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-center text-sm text-muted-foreground animate-pulse">Waiting for host settings…</p>
                )}
              </div>
            )}

            {/* Start button */}
            {isHost && (
              <div className="border-t border-border/30 px-5 py-4 space-y-2">
                <Button
                  size="lg"
                  onClick={() => startRace(hostConfig)}
                  disabled={players.length < 2}
                  className="w-full font-bold text-white hover:opacity-90"
                  style={{ backgroundColor: ACCENT }}
                >
                  Start Race
                </Button>
                {players.length < 2 && (
                  <p className="text-center text-xs text-muted-foreground">Waiting for at least 1 more player…</p>
                )}
              </div>
            )}
            </div>
            )}

            {/* Results */}
            {phase === "finished" && (
              <Results players={players} myId={playerId} onRaceAgain={resetRace} isHost={isHost} />
            )}

          </div>{/* end left column */}

          {/* ── Right column: Countdown / Typing / Keyboard ── */}
          <div className="space-y-4">

            {/* Countdown */}
            {phase === "countdown" && (
              <div className="flex h-48 items-center justify-center rounded-xl border border-border/40 bg-card">
                {countdown > 0 ? (
                  <div className="text-center">
                    <p className="text-7xl font-black tabular-nums leading-none">{countdown}</p>
                    <p className="mt-2 text-sm text-muted-foreground">get ready…</p>
                  </div>
                ) : (
                  <p className="text-5xl font-black animate-pulse" style={{ color: ACCENT }}>GO!</p>
                )}
              </div>
            )}

            {/* Typing area */}
            {(phase === "racing" || phase === "finished") && raceWords.length > 0 && (
              <TypingArea words={raceWords} phase={phase} onProgress={broadcastProgress} />
            )}

            {/* Keyboard */}
            {phase === "racing" && (
              <div className="w-full overflow-x-auto rounded-xl border border-border/40 bg-card p-4">
                <div className="flex min-w-max items-start justify-center">
                  <Keyboard className="origin-top scale-[0.72] sm:scale-[0.82] lg:scale-90" theme={theme} enableHaptics enableSound={!isMuted} />
                </div>
              </div>
            )}

            {/* Host end race */}
            {phase === "racing" && isHost && (
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={endRace}>End Race</Button>
              </div>
            )}

            {/* Lobby placeholder when no action on right */}
            {phase === "lobby" && (
              <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border/40 text-center">
                <p className="text-sm text-muted-foreground">Waiting for the race to start…</p>
              </div>
            )}

          </div>{/* end right column */}

        </div>
      </main>
    </div>
  );
}
