"use client";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export interface HistoryEntry {
  id: string;
  mode: string;
  timeLimit?: number;
  wordCount?: number;
  language: string;
  netWpm: number;
  grossWpm: number;
  accuracy: number;
  elapsedMs: number;
  consistency?: number;
  correctChars?: number;
  incorrectChars?: number;
  timestamp: number;
}

const STORAGE_KEY = "tr_history";
const MAX_ENTRIES = 50;

async function syncToSupabase(entry: Omit<HistoryEntry, "id" | "timestamp">) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return; // not logged in — skip

  // Ensure profile row exists (upsert so the FK never fails)
  await supabase.from("profiles").upsert(
    { id: user.id, username: user.user_metadata?.username ?? user.email?.split("@")[0] ?? "anonymous" },
    { onConflict: "id", ignoreDuplicates: true },
  );

  const { error } = await supabase.from("results").insert({
    user_id:        user.id,
    mode:           entry.mode,
    time_limit:     entry.timeLimit  ?? null,
    word_count:     entry.wordCount  ?? null,
    language:       entry.language,
    net_wpm:        entry.netWpm,
    gross_wpm:      entry.grossWpm,
    accuracy:       entry.accuracy,
    elapsed_ms:     entry.elapsedMs,
    consistency:    entry.consistency    ?? null,
    correct_chars:  entry.correctChars   ?? 0,
    incorrect_chars: entry.incorrectChars ?? 0,
  });

  if (error) {
    console.error("[Supabase] Failed to save result:", error.message, error.details);
    toast.error(`Couldn't save result: ${error.message}`);
  }
}

export function useLocalHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    } catch {
      return [];
    }
  });

  const addEntry = useCallback((entry: Omit<HistoryEntry, "id" | "timestamp">) => {
    const newEntry: HistoryEntry = {
      ...entry,
      id: Date.now().toString(),
      timestamp: Date.now(),
    };

    setHistory((prev) => {
      const next = [newEntry, ...prev].slice(0, MAX_ENTRIES);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });

    syncToSupabase(entry);
  }, []);

  const clearHistory = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
  }, []);

  const personalBest = useMemo(
    () => history.length === 0 ? null : history.reduce((best, e) => (e.netWpm > best.netWpm ? e : best)),
    [history],
  );

  return { history, addEntry, clearHistory, personalBest };
}
