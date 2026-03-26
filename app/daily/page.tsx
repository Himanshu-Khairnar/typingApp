"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, Calendar, Trophy, RotateCcw, Crown, Medal, CheckCircle2,
} from "lucide-react";
import { SiteNavbar } from "@/components/site-navbar";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useAppSettings, THEME_COLORS } from "@/lib/app-settings";
import { useTypingEngine, useTypingTimer } from "@/hooks/use-typing-engine";
import { generateText, type TestConfig } from "@/lib/words";

type DailyLeaderboardEntry = {
  rank: number;
  user_id: string;
  username: string;
  net_wpm: number;
  accuracy: number;
};

type DailyResult = {
  net_wpm: number;
  accuracy: number;
  elapsed_ms: number;
};

const TODAY_SEED = "daily-" + new Date().toISOString().slice(0, 10);
const TODAY_DATE = new Date().toISOString().slice(0, 10);

const DAILY_CONFIG: TestConfig = {
  mode: "time",
  timeLimit: 60,
  language: "english",
  includePunctuation: false,
  includeNumbers: false,
};

// ----------- Timer display component -----------
function TimerDisplay({ timeLimit }: { timeLimit: number }) {
  const elapsedMs = useTypingTimer();
  const remaining = Math.max(0, timeLimit - Math.floor(elapsedMs / 1000));
  return (
    <span className="tabular-nums font-mono text-lg font-bold">
      {remaining}s
    </span>
  );
}

// ----------- Stats display component -----------
function LiveStats() {
  const elapsedMs = useTypingTimer();
  const minutes = Math.max(elapsedMs / 60000, 1 / 600);
  // We just trigger re-renders; actual WPM comes from the engine
  return null;
}

export default function DailyChallengePage() {
  const { user, loading: authLoading } = useAuth();
  const { theme } = useAppSettings();
  const ACCENT = THEME_COLORS[theme].primary;

  // Daily challenge state
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [myResult, setMyResult] = useState<DailyResult | null>(null);
  const [leaderboard, setLeaderboard] = useState<DailyLeaderboardEntry[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  // Generate words with the daily seed
  const words = useMemo(() => generateText(DAILY_CONFIG, TODAY_SEED), []);

  // Typing engine
  const engine = useTypingEngine(words);
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
    isRunning,
    startedAt,
    netWpm,
    accuracy,
    elapsedMs,
  } = engine;

  // Refs for typing area
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const spanRefs = useRef<(HTMLSpanElement | null)[]>([]);

  // Time limit enforcement
  const timeUp = elapsedMs >= 60000 && isRunning;
  useEffect(() => {
    if (timeUp) {
      engine.stop();
    }
  }, [timeUp, engine]);

  const isFinished = isComplete || (elapsedMs >= 60000 && startedAt !== null);

  // Check if already completed today
  useEffect(() => {
    if (!user) return;
    const checkCompletion = async () => {
      const startOfDay = `${TODAY_DATE}T00:00:00.000Z`;
      const endOfDay = `${TODAY_DATE}T23:59:59.999Z`;

      const { data } = await supabase
        .from("daily_results")
        .select("net_wpm, accuracy, elapsed_ms")
        .eq("user_id", user.id)
        .gte("created_at", startOfDay)
        .lte("created_at", endOfDay)
        .limit(1);

      if (data && data.length > 0) {
        setAlreadyCompleted(true);
        setMyResult({
          net_wpm: Number(data[0].net_wpm),
          accuracy: Number(data[0].accuracy),
          elapsed_ms: data[0].elapsed_ms,
        });
      }
      setLoadingData(false);
    };
    checkCompletion();
  }, [user]);

  // Fetch daily leaderboard
  const fetchLeaderboard = useCallback(async () => {
    const startOfDay = `${TODAY_DATE}T00:00:00.000Z`;
    const endOfDay = `${TODAY_DATE}T23:59:59.999Z`;

    const { data } = await supabase
      .from("daily_results")
      .select("user_id, username, net_wpm, accuracy")
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay)
      .order("net_wpm", { ascending: false })
      .limit(50);

    if (data) {
      setLeaderboard(
        data.map((row: any, i: number) => ({
          rank: i + 1,
          user_id: row.user_id,
          username: row.username ?? "Anonymous",
          net_wpm: Math.round(Number(row.net_wpm)),
          accuracy: Number(row.accuracy),
        }))
      );
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard, alreadyCompleted]);

  // Save result when finished
  useEffect(() => {
    if (!isFinished || alreadyCompleted || !user || saving) return;
    if (startedAt === null) return;

    setSaving(true);
    const username =
      user.user_metadata?.username ?? user.email?.split("@")[0] ?? "Anonymous";

    const saveResult = async () => {
      await supabase.from("daily_results").insert({
        user_id: user.id,
        username,
        net_wpm: Math.round(netWpm),
        accuracy: Math.round(accuracy * 10) / 10,
        elapsed_ms: elapsedMs,
        seed: TODAY_SEED,
        created_at: new Date().toISOString(),
      });
      setMyResult({
        net_wpm: Math.round(netWpm),
        accuracy: Math.round(accuracy * 10) / 10,
        elapsed_ms: elapsedMs,
      });
      setAlreadyCompleted(true);
      setSaving(false);
      fetchLeaderboard();
    };
    saveResult();
  }, [isFinished, alreadyCompleted, user, saving, startedAt, netWpm, accuracy, elapsedMs, fetchLeaderboard]);

  // Focus management
  const focusInput = () => {
    inputRef.current?.focus();
    setFocused(true);
  };

  // Scroll caret into view
  useEffect(() => {
    const span = spanRefs.current[currentIndex];
    if (span) {
      span.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [currentIndex]);

  // ---- Already completed state ----
  if (!authLoading && !loadingData && alreadyCompleted && myResult) {
    return (
      <div className="min-h-screen bg-background">
        <SiteNavbar />
        <main className="mx-auto max-w-4xl px-4 pt-16 pb-16 space-y-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Daily Challenge</h1>
            <p className="text-sm text-muted-foreground">{TODAY_DATE}</p>
          </div>

          <Separator />

          {/* Completed card */}
          <Card style={{ borderColor: `${ACCENT}40` }}>
            <CardContent className="py-8 text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 mx-auto" style={{ color: ACCENT }} />
              <div>
                <h2 className="text-xl font-bold">Already Completed!</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  You have already finished today's challenge. Come back tomorrow!
                </p>
              </div>
              <div className="flex items-center justify-center gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold tabular-nums" style={{ color: ACCENT }}>
                    {Math.round(myResult.net_wpm)}
                  </p>
                  <p className="text-xs text-muted-foreground">WPM</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <p className="text-3xl font-bold tabular-nums">
                    {myResult.accuracy}%
                  </p>
                  <p className="text-xs text-muted-foreground">Accuracy</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Daily leaderboard */}
          <DailyLeaderboard
            entries={leaderboard}
            currentUserId={user?.id}
            accent={ACCENT}
          />
        </main>
      </div>
    );
  }

  // ---- Loading state ----
  if (authLoading || loadingData) {
    return (
      <div className="min-h-screen bg-background">
        <SiteNavbar />
        <div className="flex min-h-screen items-center justify-center pt-14">
          <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  // ---- Finished state (just completed) ----
  if (isFinished && myResult) {
    return (
      <div className="min-h-screen bg-background">
        <SiteNavbar />
        <main className="mx-auto max-w-4xl px-4 pt-16 pb-16 space-y-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Daily Challenge</h1>
            <p className="text-sm text-muted-foreground">{TODAY_DATE}</p>
          </div>

          <Separator />

          <Card style={{ borderColor: `${ACCENT}40` }}>
            <CardContent className="py-8 text-center space-y-4">
              <Trophy className="h-12 w-12 mx-auto" style={{ color: ACCENT }} />
              <h2 className="text-xl font-bold">Challenge Complete!</h2>
              <div className="flex items-center justify-center gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold tabular-nums" style={{ color: ACCENT }}>
                    {Math.round(myResult.net_wpm)}
                  </p>
                  <p className="text-xs text-muted-foreground">WPM</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <p className="text-3xl font-bold tabular-nums">
                    {myResult.accuracy}%
                  </p>
                  <p className="text-xs text-muted-foreground">Accuracy</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <DailyLeaderboard
            entries={leaderboard}
            currentUserId={user?.id}
            accent={ACCENT}
          />
        </main>
      </div>
    );
  }

  // ---- Active typing test ----
  return (
    <div className="min-h-screen bg-background">
      <SiteNavbar />

      <main className="mx-auto max-w-4xl px-4 pt-16 pb-16 space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Daily Challenge</h1>
          <p className="text-sm text-muted-foreground">
            {TODAY_DATE} - 60 second challenge. Same text for everyone today.
          </p>
        </div>

        <Separator />

        {/* Timer + Stats bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Time:</span>
              {startedAt !== null ? (
                <TimerDisplay timeLimit={60} />
              ) : (
                <span className="tabular-nums font-mono text-lg font-bold">60s</span>
              )}
            </div>
            {startedAt !== null && (
              <>
                <div className="h-5 w-px bg-border/60" aria-hidden />
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">WPM:</span>
                  <span className="font-bold tabular-nums" style={{ color: ACCENT }}>
                    {Math.round(netWpm)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Acc:</span>
                  <span className="font-bold tabular-nums text-sm">
                    {Math.round(accuracy)}%
                  </span>
                </div>
              </>
            )}
          </div>

          {!user && (
            <Badge variant="outline" className="text-xs">
              <Link href="/auth" className="underline underline-offset-2">
                Sign in
              </Link>{" "}
              to save your score
            </Badge>
          )}
        </div>

        {/* Typing area */}
        <Card>
          <CardContent className="p-6">
            <div
              ref={containerRef}
              className={cn(
                "relative cursor-text rounded-lg p-4 transition-all min-h-[160px] max-h-[280px] overflow-y-auto",
                "border-2",
                isFocused ? "border-border" : "border-transparent bg-muted/30"
              )}
              style={isFocused ? { borderColor: `${ACCENT}50` } : undefined}
              onClick={focusInput}
            >
              {/* Hidden input */}
              <input
                ref={inputRef}
                type="text"
                className="absolute inset-0 h-full w-full opacity-0 cursor-text"
                value={typed}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                disabled={isFinished}
              />

              {/* Text display */}
              <div className="font-mono text-lg leading-relaxed select-none whitespace-pre-wrap break-all">
                {text.split("").map((char, i) => {
                  const state = charStates[i];
                  const isCaret = i === currentIndex;
                  return (
                    <span
                      key={i}
                      ref={(el) => { spanRefs.current[i] = el; }}
                      className={cn(
                        "relative",
                        state === "correct" && "text-foreground",
                        state === "incorrect" && "text-red-500 bg-red-500/10",
                        state === "untyped" && "text-muted-foreground/40"
                      )}
                    >
                      {/* Caret */}
                      {isCaret && isFocused && (
                        <span
                          className="absolute -left-[1px] top-0 h-full w-[2px] animate-pulse"
                          style={{ backgroundColor: ACCENT }}
                        />
                      )}
                      {char}
                    </span>
                  );
                })}
              </div>

              {/* Focus prompt */}
              {!isFocused && !isFinished && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm">
                  <p className="text-sm text-muted-foreground">
                    Click here or press any key to focus
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard below */}
        {leaderboard.length > 0 && (
          <DailyLeaderboard
            entries={leaderboard}
            currentUserId={user?.id}
            accent={ACCENT}
          />
        )}
      </main>

      <LiveStats />
    </div>
  );
}

// ----------- Daily leaderboard sub-component -----------
function DailyLeaderboard({
  entries,
  currentUserId,
  accent,
}: {
  entries: DailyLeaderboardEntry[];
  currentUserId?: string;
  accent: string;
}) {
  if (entries.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Trophy className="h-4 w-4" />
          Today's Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {entries.map((entry) => {
            const isCurrentUser = currentUserId === entry.user_id;
            const initials = entry.username.slice(0, 2).toUpperCase();

            return (
              <div
                key={entry.user_id}
                className={cn(
                  "flex items-center gap-3 px-6 py-3 text-sm",
                  isCurrentUser && "ring-1 ring-inset rounded-sm"
                )}
                style={
                  isCurrentUser
                    ? { backgroundColor: `${accent}10` }
                    : undefined
                }
              >
                {/* Rank */}
                <span className="w-8 flex items-center justify-center">
                  {entry.rank === 1 ? (
                    <Crown className="h-4 w-4" style={{ color: "#FFD700" }} />
                  ) : entry.rank === 2 ? (
                    <Medal className="h-4 w-4" style={{ color: "#C0C0C0" }} />
                  ) : entry.rank === 3 ? (
                    <Medal className="h-4 w-4" style={{ color: "#CD7F32" }} />
                  ) : (
                    <span className="text-xs font-mono text-muted-foreground">{entry.rank}</span>
                  )}
                </span>

                {/* Avatar + name */}
                <Avatar className="h-7 w-7">
                  <AvatarFallback
                    className="text-[10px] font-bold"
                    style={{
                      backgroundColor: isCurrentUser ? accent : "hsl(var(--muted))",
                      color: isCurrentUser ? "#fff" : "hsl(var(--muted-foreground))",
                    }}
                  >
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={cn("flex-1 truncate", isCurrentUser && "font-semibold")}
                  style={isCurrentUser ? { color: accent } : undefined}
                >
                  {entry.username}
                  {isCurrentUser && (
                    <span className="ml-1.5 text-[10px] text-muted-foreground">(you)</span>
                  )}
                </span>

                {/* WPM */}
                <span className="font-bold tabular-nums">{entry.net_wpm}</span>
                <span className="text-[10px] text-muted-foreground">wpm</span>

                {/* Accuracy */}
                <span className="text-xs tabular-nums text-muted-foreground">
                  {entry.accuracy}%
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
