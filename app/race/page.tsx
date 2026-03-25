"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, LogIn } from "lucide-react";
import { SiteNavbar } from "@/components/site-navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useAppSettings, THEME_COLORS } from "@/lib/app-settings";

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export default function RaceLobby() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const ACCENT = THEME_COLORS[useAppSettings().theme].primary;
  const [joinCode, setJoinCode] = useState("");

  const playerName = user?.user_metadata?.username ?? user?.email?.split("@")[0] ?? "Anonymous";

  const handleCreate = () => {
    const code = generateRoomCode();
    router.push(`/race/${code}?name=${encodeURIComponent(playerName)}&host=1`);
  };

  const handleJoin = () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 3) return;
    router.push(`/race/${code}?name=${encodeURIComponent(playerName)}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteNavbar />

      <main className="mx-auto max-w-lg px-4 pt-24 pb-12">

        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Race Room</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Race against friends in real-time typing battles.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">

          {/* Create */}
          <div className="rounded-xl border border-border/50 bg-card p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Plus className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Create a room</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Start a new race. Configure settings once inside.
                </p>
              </div>
            </div>
            <Button
              className="mt-4 w-full font-semibold text-white hover:opacity-90"
              style={{ backgroundColor: ACCENT }}
              onClick={handleCreate}
              disabled={loading || !user}
            >
              {loading ? "Loading…" : user ? "Create Room" : "Sign in to create"}
            </Button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-border/50" />
            <span className="text-xs text-muted-foreground">or join existing</span>
            <div className="h-px flex-1 bg-border/50" />
          </div>

          {/* Join */}
          <div className="rounded-xl border border-border/50 bg-card p-5">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <LogIn className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Join a room</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Enter the code shared by your friend.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                placeholder="ROOM CODE"
                maxLength={5}
                className="text-center font-mono font-bold tracking-[0.25em] uppercase flex-1"
              />
              <Button
                variant="outline"
                onClick={handleJoin}
                disabled={loading || !user || joinCode.length < 3}
                className="shrink-0"
              >
                {user ? "Join" : "Sign in"}
              </Button>
            </div>
          </div>

          {!user && !loading && (
            <p className="text-center text-xs text-muted-foreground pt-1">
              <a href="/auth" className="underline underline-offset-2 hover:text-foreground transition-colors">
                Sign in
              </a>{" "}
              to create or join a race room.
            </p>
          )}
        </div>


      </main>
    </div>
  );
}
