"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  TrendingUp, BarChart2, KeyboardIcon,
  ChevronLeft, ChevronRight, Flame,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { SiteNavbar } from "@/components/site-navbar";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useAppSettings, THEME_COLORS } from "@/lib/app-settings";
import type { Database } from "@/lib/database.types";

type Result = Database["public"]["Tables"]["results"]["Row"];

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function formatTotalTime(ms: number) {
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function StatItem({
  label, value, sub, accent, color,
}: {
  label: string; value: string; sub?: string; accent?: string; color?: string;
}) {
  return (
    <div className="text-center">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums leading-none" style={{ color: color ?? accent }}>{value}</p>
      {sub && <p className="mt-1.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const { theme } = useAppSettings();
  const ACCENT = THEME_COLORS[theme].primary;
  const router = useRouter();
  const [results, setResults]   = useState<Result[]>([]);
  const [fetching, setFetching] = useState(true);
  const [resultsPage, setResultsPage] = useState(0);
  const RESULTS_PER_PAGE = 10;
  const [streak, setStreak] = useState({ current: 0, longest: 0 });

  useEffect(() => {
    if (!loading && !user) router.replace("/auth");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("results")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => { setResults(data ?? []); setFetching(false); });
    (supabase.from("streaks" as any) as any)
      .select("current_streak, longest_streak")
      .eq("user_id", user.id)
      .single()
      .then(({ data }: any) => {
        if (data) setStreak({ current: data.current_streak, longest: data.longest_streak });
      });
  }, [user]);

  // ── Derived stats ───────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!results.length) return null;
    const wpmList  = results.map((r) => Number(r.net_wpm));
    const accList  = results.map((r) => Number(r.accuracy));
    const pb       = results.reduce((b, r) => (Number(r.net_wpm) > Number(b.net_wpm) ? r : b));
    const avgWpm   = Math.round(wpmList.reduce((a, b) => a + b, 0) / wpmList.length);
    const avgAcc   = (accList.reduce((a, b) => a + b, 0) / accList.length).toFixed(1);
    const totalMs  = results.reduce((s, r) => s + r.elapsed_ms, 0);
    const last10   = results.slice(0, 10);
    const recentAvg = Math.round(last10.reduce((s, r) => s + Number(r.net_wpm), 0) / last10.length);

    // WPM trend (last 30 tests, oldest first for chart)
    const trend = results
      .slice(0, 30)
      .reverse()
      .map((r, i) => ({ test: i + 1, wpm: Math.round(Number(r.net_wpm)), acc: Number(r.accuracy) }));

    // Best per mode
    const byMode: Record<string, number> = {};
    for (const r of results) {
      const key = r.mode + (r.time_limit ? `_${r.time_limit}` : r.word_count ? `_${r.word_count}` : "");
      if (!byMode[key] || Number(r.net_wpm) > byMode[key]) byMode[key] = Math.round(Number(r.net_wpm));
    }

    // WPM distribution buckets
    const buckets: Record<string, number> = { "0–30": 0, "31–50": 0, "51–70": 0, "71–90": 0, "91–110": 0, "111+": 0 };
    for (const w of wpmList) {
      if (w <= 30) buckets["0–30"]++;
      else if (w <= 50) buckets["31–50"]++;
      else if (w <= 70) buckets["51–70"]++;
      else if (w <= 90) buckets["71–90"]++;
      else if (w <= 110) buckets["91–110"]++;
      else buckets["111+"]++;
    }
    const distData = Object.entries(buckets).map(([range, count]) => ({ range, count }));

    return { pb, avgWpm, avgAcc, totalMs, recentAvg, trend, byMode, distData };
  }, [results]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background">
        <SiteNavbar />
        <div className="flex min-h-screen items-center justify-center pt-14">
          <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
        </div>
      </div>
    );
  }

  const username = user.user_metadata?.username ?? user.email?.split("@")[0] ?? "Anonymous";
  const initials = username.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <SiteNavbar />

      <main className="mx-auto max-w-4xl px-4 pt-20 pb-16 space-y-8">

        {/* Profile header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <Avatar className="h-20 w-20 text-2xl">
            <AvatarFallback className="text-xl font-bold text-white" style={{ backgroundColor: ACCENT }}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1.5">
            <h1 className="text-3xl font-bold">{username}</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{results.length} tests</Badge>
              {stats?.pb && <Badge variant="outline" style={{ borderColor: `${ACCENT}50`, color: ACCENT }}>PB {Math.round(Number(stats.pb.net_wpm))} wpm</Badge>}
              {stats && <Badge variant="outline">{stats.avgAcc}% avg acc</Badge>}
              {streak.current > 0 && (
                <Badge variant="outline" className="gap-1" style={{ borderColor: "#f59e0b50", color: "#f59e0b" }}>
                  <Flame className="h-3 w-3" />{streak.current} day streak
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {fetching ? (
          <div className="flex h-48 items-center justify-center">
            <p className="animate-pulse text-sm text-muted-foreground">Loading stats…</p>
          </div>
        ) : !stats ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed">
            <KeyboardIcon className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No results yet — start typing to see your stats!</p>
            <Button size="sm" asChild><Link href="/">Start a test</Link></Button>
          </div>
        ) : (
          <>
            {/* ── Key stats ── */}
            <div className="rounded-xl border border-border/50 bg-card">
              <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-border/40">
                <div className="p-5 sm:p-6">
                  <StatItem label="Best" value={String(Math.round(Number(stats.pb.net_wpm)))} sub={`${stats.pb.accuracy}% acc`} accent={ACCENT} />
                </div>
                <div className="p-5 sm:p-6">
                  <StatItem label="Average" value={String(stats.avgWpm)} sub={`last 10: ${stats.recentAvg}`} />
                </div>
                <div className="p-5 sm:p-6">
                  <StatItem label="Accuracy" value={`${stats.avgAcc}%`} />
                </div>
                <div className="p-5 sm:p-6">
                  <StatItem label="Streak" value={`${streak.current}`} sub={`best: ${streak.longest}d`} color="#f59e0b" />
                </div>
                <div className="p-5 sm:p-6 col-span-2 sm:col-span-1">
                  <StatItem label="Time" value={formatTotalTime(stats.totalMs)} sub={`${results.length} tests`} />
                </div>
              </div>
            </div>

            {/* ── Charts + breakdown tabs ── */}
            <Tabs defaultValue="trend">
              <TabsList className="mb-4">
                <TabsTrigger value="trend">
                  <TrendingUp className="mr-1.5 h-3.5 w-3.5" />WPM Trend
                </TabsTrigger>
                <TabsTrigger value="distribution">
                  <BarChart2 className="mr-1.5 h-3.5 w-3.5" />Distribution
                </TabsTrigger>
                <TabsTrigger value="modes">
                  <KeyboardIcon className="mr-1.5 h-3.5 w-3.5" />By Mode
                </TabsTrigger>
              </TabsList>

              {/* WPM over last 30 tests */}
              <TabsContent value="trend">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">WPM over last {stats.trend.length} tests</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={stats.trend} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
                        <defs>
                          <linearGradient id="wpmGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={ACCENT} stopOpacity={0.25} />
                            <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} vertical={false} />
                        <XAxis dataKey="test" tickLine={false} axisLine={false} tick={{ fontSize: 10, opacity: 0.4 }} tickFormatter={(v) => `#${v}`} interval="preserveStartEnd" />
                        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, opacity: 0.4 }} width={32} domain={["auto", "auto"]} />
                        <Tooltip
                          contentStyle={{ background: "hsl(var(--background))", border: `1px solid ${ACCENT}40`, borderRadius: 8, fontSize: 12 }}
                          formatter={(v: any) => [`${v} wpm`, "WPM"]}
                          labelFormatter={(l) => `Test #${l}`}
                          cursor={{ stroke: ACCENT, strokeOpacity: 0.15, strokeWidth: 1 }}
                        />
                        <Area type="monotone" dataKey="wpm" stroke={ACCENT} strokeWidth={2} fill="url(#wpmGrad)" dot={false} activeDot={{ r: 4, fill: ACCENT, strokeWidth: 0 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* WPM distribution */}
              <TabsContent value="distribution">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">WPM distribution across all tests</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {stats.distData.map(({ range, count }) => {
                      const pct = results.length ? Math.round((count / results.length) * 100) : 0;
                      return (
                        <div key={range} className="flex items-center gap-3">
                          <span className="w-16 shrink-0 text-right text-xs font-mono text-muted-foreground">{range}</span>
                          <div className="flex-1 overflow-hidden rounded-full bg-muted h-2">
                            <div
                              className="h-2 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, backgroundColor: ACCENT }}
                            />
                          </div>
                          <span className="w-10 shrink-0 text-xs tabular-nums text-muted-foreground">{count > 0 ? `${count} (${pct}%)` : "—"}</span>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Best by mode */}
              <TabsContent value="modes">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Personal best by mode</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="divide-y">
                      {Object.entries(stats.byMode)
                        .sort(([, a], [, b]) => b - a)
                        .map(([key, wpm]) => {
                          const [mode, sub] = key.split("_");
                          return (
                            <div key={key} className="flex items-center justify-between py-3">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="capitalize">{mode}</Badge>
                                {sub && <span className="text-xs text-muted-foreground">{sub}{mode === "time" ? "s" : "w"}</span>}
                              </div>
                              <span className="font-bold tabular-nums" style={{ color: ACCENT }}>{wpm} <span className="text-xs font-normal text-muted-foreground">wpm</span></span>
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* ── Recent results ── */}
            {(() => {
              const totalPages = Math.ceil(results.length / RESULTS_PER_PAGE);
              const pageResults = results.slice(resultsPage * RESULTS_PER_PAGE, (resultsPage + 1) * RESULTS_PER_PAGE);
              return (
                <Card>
                  <CardHeader className="pb-3 flex-row items-center justify-between">
                    <CardTitle className="text-base">Recent results</CardTitle>
                    <span className="text-xs text-muted-foreground">{results.length} total</span>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {pageResults.map((r, i) => (
                        <div key={r.id} className={cn("flex items-center gap-3 px-6 py-3 text-sm", resultsPage === 0 && i === 0 && "bg-muted/20")}>
                          {/* WPM */}
                          <span className="w-16 font-bold tabular-nums text-foreground">
                            {Math.round(Number(r.net_wpm))}
                            <span className="ml-1 text-[10px] font-normal text-muted-foreground">wpm</span>
                          </span>
                          {/* Acc */}
                          <span className="w-12 tabular-nums text-muted-foreground text-xs">{r.accuracy}%</span>
                          {/* Mode badge */}
                          <Badge variant="secondary" className="text-[10px] capitalize shrink-0">
                            {r.mode}{r.time_limit ? ` ${r.time_limit}s` : r.word_count ? ` ${r.word_count}w` : ""}
                          </Badge>
                          {/* Raw WPM */}
                          <span className="hidden sm:block text-xs text-muted-foreground">raw {Math.round(Number(r.gross_wpm))}</span>
                          {/* Time */}
                          <span className="ml-auto text-xs text-muted-foreground tabular-nums">{formatTime(r.elapsed_ms)}</span>
                          {/* Date */}
                          <span className="hidden sm:block w-20 text-right text-xs text-muted-foreground">
                            {new Date(r.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between border-t px-6 py-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          disabled={resultsPage === 0}
                          onClick={() => setResultsPage((p) => p - 1)}
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                          Prev
                        </Button>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {resultsPage + 1} / {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          disabled={resultsPage >= totalPages - 1}
                          onClick={() => setResultsPage((p) => p + 1)}
                        >
                          Next
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}
          </>
        )}

      </main>
    </div>
  );
}
