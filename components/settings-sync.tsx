"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAppSettings, type MonoFont, type SoundPack } from "@/lib/app-settings";
import { useAuth } from "@/hooks/use-auth";
import type { KeyboardThemeName } from "@/components/ui/keyboard";

export function SettingsSync() {
  const { user } = useAuth();
  const { theme, isDark, isMuted, fontFamily, soundPack, setTheme, toggleDark, toggleMute, setFont, setSoundPack } = useAppSettings();
  const loadedRef = useRef(false);
  const savingRef = useRef(false);

  // Load settings from DB when user logs in
  useEffect(() => {
    if (!user || loadedRef.current) return;
    loadedRef.current = true;

    supabase
      .from("profiles")
      .select("settings")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (!data?.settings) return;
        const s = data.settings as Record<string, unknown>;
        if (s.theme && s.theme !== theme) setTheme(s.theme as KeyboardThemeName);
        if (typeof s.isDark === "boolean" && s.isDark !== isDark) toggleDark();
        if (typeof s.isMuted === "boolean" && s.isMuted !== isMuted) toggleMute();
        if (s.fontFamily && s.fontFamily !== fontFamily) setFont(s.fontFamily as MonoFont);
        if (s.soundPack && s.soundPack !== soundPack) setSoundPack(s.soundPack as SoundPack);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Reset load flag on logout
  useEffect(() => {
    if (!user) loadedRef.current = false;
  }, [user]);

  // Save settings to DB whenever they change (debounced)
  useEffect(() => {
    if (!user) return;
    if (!loadedRef.current) return;
    if (savingRef.current) return;

    savingRef.current = true;
    const timer = setTimeout(async () => {
      await supabase
        .from("profiles")
        .update({ settings: { theme, isDark, isMuted, fontFamily, soundPack } })
        .eq("id", user.id);
      savingRef.current = false;
    }, 800);

    return () => {
      clearTimeout(timer);
      savingRef.current = false;
    };
  }, [user, theme, isDark, isMuted, fontFamily, soundPack]);

  return null;
}
