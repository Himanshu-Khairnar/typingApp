"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { checkNewBadges, BADGES, type AchievementContext, type BadgeId } from "@/lib/achievements";
import { toast } from "sonner";

export function useAchievements() {
  const { user, loading: authLoading } = useAuth();
  const [earnedBadges, setEarnedBadges] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Fetch earned badges from DB
  const fetchEarned = useCallback(async () => {
    if (!user) {
      setEarnedBadges(new Set());
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("achievements")
      .select("badge_id")
      .eq("user_id", user.id);

    if (!error && data) {
      setEarnedBadges(new Set(data.map((row) => row.badge_id)));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchEarned();
    }
  }, [authLoading, fetchEarned]);

  const checkAndAward = useCallback(
    async (ctx: AchievementContext) => {
      if (!user) return;

      const newBadges = checkNewBadges(ctx, earnedBadges);
      if (newBadges.length === 0) return;

      // Insert all newly earned badges
      const rows = newBadges.map((badgeId) => ({
        user_id: user.id,
        badge_id: badgeId,
      }));

      const { error } = await supabase.from("achievements").insert(rows);

      if (!error) {
        const updated = new Set(earnedBadges);
        for (const badgeId of newBadges) {
          updated.add(badgeId);
          const badge = BADGES.find((b) => b.id === badgeId);
          if (badge) {
            toast.success(`Achievement Unlocked: ${badge.name}`, {
              description: badge.description,
            });
          }
        }
        setEarnedBadges(updated);
      }
    },
    [user, earnedBadges]
  );

  return { earnedBadges, checkAndAward, loading };
}
