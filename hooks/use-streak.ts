"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";

export function useStreak() {
  const { user, loading: authLoading } = useAuth();
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchStreak = useCallback(async () => {
    if (!user) {
      setCurrentStreak(0);
      setLongestStreak(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error }: any = await (supabase.from("streaks" as any) as any)
      .select("current_streak, longest_streak")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!error && data) {
      setCurrentStreak(data.current_streak);
      setLongestStreak(data.longest_streak);
    } else {
      setCurrentStreak(0);
      setLongestStreak(0);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchStreak();
    }
  }, [authLoading, fetchStreak]);

  return { currentStreak, longestStreak, loading, refetch: fetchStreak };
}
