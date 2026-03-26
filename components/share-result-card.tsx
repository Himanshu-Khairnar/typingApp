"use client";

import { forwardRef } from "react";

interface ShareResultCardProps {
  wpm: number;
  accuracy: number;
  rawWpm: number;
  consistency: number;
  mode: string;
  timeLimit?: number;
  wordCount?: number;
  elapsed: string;
  primaryColor: string;
  isNewPB?: boolean;
}

export const ShareResultCard = forwardRef<HTMLDivElement, ShareResultCardProps>(
  function ShareResultCard({ wpm, accuracy, rawWpm, consistency, mode, timeLimit, wordCount, elapsed, primaryColor, isNewPB }, ref) {
    return (
      <div
        ref={ref}
        style={{
          width: 480,
          padding: 32,
          background: "linear-gradient(135deg, #0f0f12 0%, #1a1a24 100%)",
          borderRadius: 16,
          fontFamily: "'Geist Mono', monospace",
          color: "#fff",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20, color: primaryColor }}>⌨</span>
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.02em" }}>TypeArena</span>
          </div>
          {isNewPB && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "rgba(251, 191, 36, 0.2)", color: "#fbbf24" }}>
              NEW PB
            </span>
          )}
        </div>

        {/* Big WPM */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>wpm</div>
          <div style={{ fontSize: 56, fontWeight: 800, lineHeight: 1, color: primaryColor }}>{wpm}</div>
        </div>

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
          {[
            { label: "accuracy", value: `${accuracy}%` },
            { label: "raw", value: String(rawWpm) },
            { label: "consistency", value: `${consistency}%` },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.35)", marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
            {mode}{timeLimit ? ` ${timeLimit}s` : wordCount ? ` ${wordCount}w` : ""} · {elapsed}
          </span>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>typearena.com</span>
        </div>
      </div>
    );
  },
);
