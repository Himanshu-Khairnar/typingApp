"use client";

import { useEffect, useRef } from "react";
import { MotionConfig } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAppSettings, FONT_FAMILY_MAP, type MonoFont, type SoundPack } from "@/lib/app-settings";
import { useAuth } from "@/hooks/use-auth";
import type { KeyboardThemeName } from "@/components/ui/keyboard";

export function SettingsSync() {
  const { user } = useAuth();
  const { theme, isDark, isMuted, fontFamily, soundPack, setTheme, toggleDark, toggleMute, setFont, setSoundPack } = useAppSettings();
  const loadedRef = useRef(false);

  // Restore persisted settings after hydration (see skipHydration in app-settings)
  useEffect(() => {
    void useAppSettings.persist.rehydrate();
  }, []);
  const savingRef = useRef(false);

  // Load settings from DB when user logs in
  useEffect(() => {
    if (!user || loadedRef.current) return;
    let cancelled = false;

    supabase
      .from("profiles")
      .select("settings")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        // Only allow saving once remote settings are applied — otherwise local
        // defaults could overwrite the user's saved settings on slow networks.
        loadedRef.current = true;
        if (!data?.settings) return;
        const s = data.settings as Record<string, unknown>;
        if (s.theme && s.theme !== theme) setTheme(s.theme as KeyboardThemeName);
        if (typeof s.isDark === "boolean" && s.isDark !== isDark) toggleDark();
        if (typeof s.isMuted === "boolean" && s.isMuted !== isMuted) toggleMute();
        if (s.fontFamily && s.fontFamily !== fontFamily) setFont(s.fontFamily as MonoFont);
        if (s.soundPack && s.soundPack !== soundPack) setSoundPack(s.soundPack as SoundPack);
      });
    return () => { cancelled = true; };
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
      await supabase.from("profiles")
        .update({ settings: { theme, isDark, isMuted, fontFamily, soundPack } })
        .eq("id", user.id);
      savingRef.current = false;
    }, 800);

    return () => {
      clearTimeout(timer);
      savingRef.current = false;
    };
  }, [user, theme, isDark, isMuted, fontFamily, soundPack]);

  // Apply selected font globally to the document body
  useEffect(() => {
    document.body.style.fontFamily = FONT_FAMILY_MAP[fontFamily];
  }, [fontFamily]);

  // Apply dark mode on every page (previously only pages rendering the navbar did)
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  return null;
}

/** Respects the OS "reduce motion" setting for every framer-motion animation. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
