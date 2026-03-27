"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";

type DailyLeaderboardEntry = {
  user_id: string;
  username: string;
  net_wpm: number;
  accuracy: number;
  rank: number;
};

const DAILY_CONFIG = { mode: "time" as const, timeLimit: 60, language: "english" };

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function useDailyChallenge() {
  const { user, loading: authLoading } = useAuth();
  const [hasCompleted, setHasCompleted] = useState(false);
  const [leaderboard, setLeaderboard] = useState<DailyLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const todayStr = getTodayStr();
  const todaySeed = `daily-${todayStr}`;
  const config = DAILY_CONFIG;

  // Check if user already completed today's challenge
  const checkCompletion = useCallback(async () => {
    if (!user) {
      setHasCompleted(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await (supabase.from("daily_results" as any) as any)
      .select("id")
      .eq("user_id", user.id)
      .eq("challenge_date", todayStr)
      .limit(1);

    if (!error && data && data.length > 0) {
      setHasCompleted(true);
    } else {
      setHasCompleted(false);
    }
    setLoading(false);
  }, [user, todayStr]);

  useEffect(() => {
    if (!authLoading) {
      checkCompletion();
    }
  }, [authLoading, checkCompletion]);

  const submitResult = useCallback(
    async (resultId: string, netWpm: number, accuracy: number) => {
      if (!user) return;

      const { error } = await (supabase.from("daily_results" as any) as any).insert({
        challenge_date: todayStr,
        user_id: user.id,
        result_id: resultId,
        net_wpm: netWpm,
        accuracy,
      });

      if (!error) {
        setHasCompleted(true);
      }
      return { error };
    },
    [user, todayStr]
  );

  const fetchLeaderboard = useCallback(async () => {
    const { data, error } = await (supabase.rpc as any)("get_daily_leaderboard", {
      p_date: todayStr,
    });

    if (!error && data) {
      setLeaderboard(data);
    }
    return data ?? [];
  }, [todayStr]);

  return {
    todaySeed,
    config,
    hasCompleted,
    submitResult,
    leaderboard,
    fetchLeaderboard,
    loading,
  };
}
