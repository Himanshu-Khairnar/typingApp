import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { KeyboardThemeName } from "@/components/ui/keyboard";

export const THEME_COLORS: Record<KeyboardThemeName, { primary: string; primaryFg: string; label: string }> = {
  classic: { primary: "#F57644", primaryFg: "#ffffff", label: "Classic" },
  mint:    { primary: "#86C8AC", primaryFg: "#ffffff", label: "Mint" },
  royal:   { primary: "#E4D440", primaryFg: "#000000", label: "Royal" },
  dolch:   { primary: "#D73E42", primaryFg: "#ffffff", label: "Dolch" },
  sand:    { primary: "#C94E41", primaryFg: "#ffffff", label: "Sand" },
  scarlet: { primary: "#D5868A", primaryFg: "#ffffff", label: "Scarlet" },
};

export const ALL_THEMES = Object.keys(THEME_COLORS) as KeyboardThemeName[];

type AppSettings = {
  theme: KeyboardThemeName;
  isDark: boolean;
  isMuted: boolean;
  setTheme: (theme: KeyboardThemeName) => void;
  toggleDark: () => void;
  toggleMute: () => void;
};

export const useAppSettings = create<AppSettings>()(
  persist(
    (set) => ({
      theme: "classic",
      isDark: false,
      isMuted: false,
      setTheme: (theme) => set({ theme }),
      toggleDark: () => set((s) => ({ isDark: !s.isDark })),
      toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
    }),
    { name: "typearena_settings" },
  ),
);
