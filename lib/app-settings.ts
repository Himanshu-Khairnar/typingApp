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

export type MonoFont = "geist-mono" | "jetbrains-mono" | "fira-code" | "source-code-pro" | "ibm-plex-mono";
export type SoundPack = "synth" | "cherry-mx" | "topre" | "buckling-spring";

export const FONT_OPTIONS: { value: MonoFont; label: string }[] = [
  { value: "geist-mono", label: "Geist Mono" },
  { value: "jetbrains-mono", label: "JetBrains Mono" },
  { value: "fira-code", label: "Fira Code" },
  { value: "source-code-pro", label: "Source Code Pro" },
  { value: "ibm-plex-mono", label: "IBM Plex Mono" },
];

export const SOUND_PACK_OPTIONS: { value: SoundPack; label: string }[] = [
  { value: "synth", label: "Synth" },
  { value: "cherry-mx", label: "Cherry MX" },
  { value: "topre", label: "Topre" },
  { value: "buckling-spring", label: "Buckling Spring" },
];

type AppSettings = {
  theme: KeyboardThemeName;
  isDark: boolean;
  isMuted: boolean;
  fontFamily: MonoFont;
  soundPack: SoundPack;
  setTheme: (theme: KeyboardThemeName) => void;
  toggleDark: () => void;
  toggleMute: () => void;
  setFont: (font: MonoFont) => void;
  setSoundPack: (pack: SoundPack) => void;
};

export const useAppSettings = create<AppSettings>()(
  persist(
    (set) => ({
      theme: "classic",
      isDark: false,
      isMuted: false,
      fontFamily: "geist-mono",
      soundPack: "synth",
      setTheme: (theme) => set({ theme }),
      toggleDark: () => set((s) => ({ isDark: !s.isDark })),
      toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
      setFont: (fontFamily) => set({ fontFamily }),
      setSoundPack: (soundPack) => set({ soundPack }),
    }),
    { name: "typearena_settings" },
  ),
);
