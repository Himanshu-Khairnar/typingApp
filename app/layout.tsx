import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { JetBrains_Mono, Fira_Code, Source_Code_Pro, IBM_Plex_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { SettingsSync } from "@/components/settings-sync";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin"] });
const firaCode = Fira_Code({ variable: "--font-fira-code", subsets: ["latin"] });
const sourceCodePro = Source_Code_Pro({ variable: "--font-source-code-pro", subsets: ["latin"] });
const ibmPlexMono = IBM_Plex_Mono({ variable: "--font-ibm-plex-mono", weight: ["400", "500", "600", "700"], subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TypeArena — speed · accuracy · flow",
  description: "TypeArena is a fast, minimal typing speed trainer. Test and improve your WPM with real-time analytics, key heatmaps, and race mode.",
  keywords: ["typing test", "WPM", "typing speed", "typing trainer", "TypeArena"],
  authors: [{ name: "TypeArena" }],
  openGraph: {
    title: "TypeArena — speed · accuracy · flow",
    description: "Test and improve your typing speed with real-time analytics and race mode.",
    type: "website",
    siteName: "TypeArena",
  },
  twitter: {
    card: "summary",
    title: "TypeArena — speed · accuracy · flow",
    description: "Test and improve your typing speed with real-time analytics and race mode.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${jetbrainsMono.variable} ${firaCode.variable} ${sourceCodePro.variable} ${ibmPlexMono.variable} font-sans antialiased`}>
        <SettingsSync />
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
