"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Trophy, Medal, Crown } from "lucide-react";
import { SiteNavbar } from "@/components/site-navbar";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useAppSettings, THEME_COLORS } from "@/lib/app-settings";

type LeaderboardEntry = {
  rank: number;
  user_id: string;
  username: string;
  net_wpm: number;
  accuracy: number;
  mode: string;
  time_limit: number | null;
  word_count: number | null;
  created_at: string;
};

type Period = "today" | "week" | "all";
type ModeFilter = "all" | "time" | "words";
type Duration = 15 | 30 | 60 | 120;

const DURATIONS: Duration[] = [15, 30, 60, 120];

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-6 py-3.5 animate-pulse">
      <div className="w-8 h-4 rounded bg-muted" />
      <div className="h-8 w-8 rounded-full bg-muted" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-24 rounded bg-muted" />
      </div>
      <div className="h-3.5 w-12 rounded bg-muted" />
      <div className="h-3.5 w-10 rounded bg-muted" />
      <div className="hidden sm:block h-3.5 w-16 rounded bg-muted" />
      <div className="hidden sm:block h-3.5 w-20 rounded bg-muted" />
    </div>
  );
}

function RankBadge({ rank, accent }: { rank: number; accent: string }) {
  if (rank === 1) return <Crown className="h-4 w-4" style={{ color: "#FFD700" }} />;
  if (rank === 2) return <Medal className="h-4 w-4" style={{ color: "#C0C0C0" }} />;
  if (rank === 3) return <Medal className="h-4 w-4" style={{ color: "#CD7F32" }} />;
  return <span className="text-xs font-mono text-muted-foreground">{rank}</span>;
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const { theme } = useAppSettings();
  const ACCENT = THEME_COLORS[theme].primary;

  const [period, setPeriod] = useState<Period>("all");
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all");
  const [duration, setDuration] = useState<Duration>(60);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const periodMap: Record<Period, string> = { today: "daily", week: "weekly", all: "all" };
      const { data, error } = await (supabase.rpc as any)("get_leaderboard", {
        p_mode: modeFilter === "all" ? null : modeFilter,
        p_time_limit: modeFilter === "time" ? duration : null,
        p_period: periodMap[period],
      });

      if (error) {
        console.error("Leaderboard RPC error:", error);
        setEntries([]);
      } else {
        setEntries(
          (data ?? []).map((row: any, i: number) => ({
            rank: i + 1,
            user_id: row.user_id,
            username: row.username ?? "Anonymous",
            net_wpm: Math.round(Number(row.net_wpm)),
            accuracy: Number(row.accuracy),
            mode: row.mode ?? "time",
            time_limit: row.time_limit,
            word_count: row.word_count,
            created_at: row.created_at,
          }))
        );
      }
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [period, modeFilter, duration]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const periodLabel: Record<Period, string> = {
    today: "Today",
    week: "This Week",
    all: "All Time",
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteNavbar />

      <main className="mx-auto max-w-4xl px-4 pt-16 pb-16 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
          <p className="text-sm text-muted-foreground">
            See how you stack up against the fastest typists.
          </p>
        </div>

        <Separator />

        {/* Period Tabs */}
        <Tabs
          value={period}
          onValueChange={(v) => setPeriod(v as Period)}
        >
          <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="all">All Time</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Mode + Duration Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground mr-1">Mode:</span>
          {(["all", "time", "words"] as ModeFilter[]).map((m) => (
            <Button
              key={m}
              size="sm"
              variant={modeFilter === m ? "default" : "outline"}
              className={cn(
                "h-7 px-3 text-xs capitalize",
                modeFilter === m && "text-white hover:opacity-90"
              )}
              style={modeFilter === m ? { backgroundColor: ACCENT } : undefined}
              onClick={() => setModeFilter(m)}
            >
              {m === "all" ? "All" : m}
            </Button>
          ))}

          {modeFilter === "time" && (
            <>
              <div className="mx-2 h-4 w-px bg-border/60" aria-hidden />
              <span className="text-xs font-medium text-muted-foreground mr-1">Duration:</span>
              {DURATIONS.map((d) => (
                <Button
                  key={d}
                  size="sm"
                  variant={duration === d ? "default" : "outline"}
                  className={cn(
                    "h-7 px-3 text-xs",
                    duration === d && "text-white hover:opacity-90"
                  )}
                  style={duration === d ? { backgroundColor: ACCENT } : undefined}
                  onClick={() => setDuration(d)}
                >
                  {d}s
                </Button>
              ))}
            </>
          )}
        </div>

        {/* Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top typists - {periodLabel[period]}
              {modeFilter !== "all" && ` - ${modeFilter}`}
              {modeFilter === "time" && ` ${duration}s`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Header row */}
            <div className="flex items-center gap-3 px-6 py-2 border-b text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span className="w-8 text-center">Rank</span>
              <span className="flex-1 pl-11">Player</span>
              <span className="w-14 text-right">WPM</span>
              <span className="w-12 text-right">Acc</span>
              <span className="hidden sm:block w-16 text-right">Mode</span>
              <span className="hidden sm:block w-24 text-right">Date</span>
            </div>

            {loading ? (
              <div className="divide-y">
                {Array.from({ length: 10 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </div>
            ) : entries.length === 0 ? (
              <div className="flex h-48 items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  No results found for this filter combination.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {entries.map((entry) => {
                  const isCurrentUser = user?.id === entry.user_id;
                  const initials = entry.username.slice(0, 2).toUpperCase();

                  return (
                    <div
                      key={`${entry.user_id}-${entry.created_at}`}
                      className={cn(
                        "flex items-center gap-3 px-6 py-3 text-sm transition-colors",
                        isCurrentUser && "ring-1 ring-inset rounded-sm"
                      )}
                      style={
                        isCurrentUser
                          ? { backgroundColor: `${ACCENT}10`, "--tw-ring-color": `${ACCENT}40` } as React.CSSProperties
                          : undefined
                      }
                    >
                      {/* Rank */}
                      <span className="w-8 flex items-center justify-center">
                        <RankBadge rank={entry.rank} accent={ACCENT} />
                      </span>

                      {/* Avatar + Username */}
                      <div className="flex flex-1 items-center gap-2.5 min-w-0">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback
                            className="text-[10px] font-bold text-white"
                            style={{
                              backgroundColor: isCurrentUser ? ACCENT : "hsl(var(--muted))",
                              color: isCurrentUser ? "#fff" : "hsl(var(--muted-foreground))",
                            }}
                          >
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <span
                          className={cn(
                            "truncate font-medium text-sm",
                            isCurrentUser && "font-semibold"
                          )}
                          style={isCurrentUser ? { color: ACCENT } : undefined}
                        >
                          {entry.username}
                          {isCurrentUser && (
                            <span className="ml-1.5 text-[10px] text-muted-foreground">(you)</span>
                          )}
                        </span>
                      </div>

                      {/* WPM */}
                      <span className="w-14 text-right font-bold tabular-nums">
                        {entry.net_wpm}
                      </span>

                      {/* Accuracy */}
                      <span className="w-12 text-right tabular-nums text-muted-foreground text-xs">
                        {entry.accuracy}%
                      </span>

                      {/* Mode */}
                      <span className="hidden sm:block w-16 text-right">
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {entry.mode}
                          {entry.time_limit ? ` ${entry.time_limit}s` : ""}
                          {entry.word_count ? ` ${entry.word_count}w` : ""}
                        </Badge>
                      </span>

                      {/* Date */}
                      <span className="hidden sm:block w-24 text-right text-xs text-muted-foreground">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
