"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, User, Volume2, VolumeX, Sun, Moon, Keyboard, Flame, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAppSettings, THEME_COLORS, ALL_THEMES, FONT_OPTIONS, SOUND_PACK_OPTIONS } from "@/lib/app-settings";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV_LINKS = [
  { label: "Type", href: "/" },
  { label: "Race", href: "/race" },
  { label: "Daily", href: "/daily" },
  { label: "Leaderboard", href: "/leaderboard" },
];

interface SiteNavbarProps {
  className?: string;
  children?: React.ReactNode;
}

export function SiteNavbar({ className, children }: SiteNavbarProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { isDark, isMuted, toggleDark, toggleMute, theme, setTheme, fontFamily, setFont, soundPack, setSoundPack } = useAppSettings();
  const primaryColor = THEME_COLORS[theme].primary;

  const [streak, setStreak] = useState(0);
  const [pendingFriends, setPendingFriends] = useState(0);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  // Fetch streak + pending friend requests
  useEffect(() => {
    if (!user) { setStreak(0); setPendingFriends(0); return; }
    supabase.from("streaks").select("current_streak").eq("user_id", user.id).single()
      .then(({ data }) => { if (data) setStreak(data.current_streak); });
    supabase.from("friendships").select("id", { count: "exact", head: true })
      .eq("addressee_id", user.id).eq("status", "pending")
      .then(({ count }) => { if (count) setPendingFriends(count); });
  }, [user]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const username = user?.user_metadata?.username ?? user?.email?.split("@")[0] ?? "User";
  const initials = username.slice(0, 2).toUpperCase();

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 flex h-12 items-center justify-between border-b border-border/50 bg-background/90 backdrop-blur-lg px-5",
        className,
      )}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
        <Keyboard className="h-5 w-5" style={{ color: primaryColor }} />
        <span className="font-mono text-sm font-bold tracking-tight text-foreground">TypeArena</span>
      </Link>

      {/* Center nav */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-0.5">
        {NAV_LINKS.map(({ label, href }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative px-3 py-1 text-xs font-medium rounded-md transition-colors",
                active ? "text-foreground bg-muted" : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {/* Right */}
      <div className="flex items-center gap-0.5">
        {children}

        {/* Streak */}
        {user && streak > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 text-xs font-bold tabular-nums" style={{ color: primaryColor }}>
            <Flame className="h-3.5 w-3.5" />
            {streak}
          </div>
        )}

        {/* Friends */}
        {user && (
          <Button variant="ghost" size="icon" className="h-8 w-8 relative" asChild>
            <Link href="/friends">
              <Users className="h-3.5 w-3.5" />
              {pendingFriends > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] font-bold text-white" style={{ backgroundColor: primaryColor }}>
                  {pendingFriends}
                </span>
              )}
            </Link>
          </Button>
        )}

        {/* Settings dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Settings">
              <div className="h-3.5 w-3.5 rounded-full border border-border" style={{ backgroundColor: primaryColor }} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Theme</DropdownMenuLabel>
            {ALL_THEMES.map((t) => (
              <DropdownMenuItem key={t} onClick={() => setTheme(t)} className="gap-2 text-xs capitalize">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: THEME_COLORS[t].primary }} />
                {THEME_COLORS[t].label}
                {t === theme && <span className="ml-auto text-muted-foreground">✓</span>}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Font</DropdownMenuLabel>
            {FONT_OPTIONS.map((f) => (
              <DropdownMenuItem key={f.value} onClick={() => setFont(f.value)} className="text-xs">
                {f.label}
                {f.value === fontFamily && <span className="ml-auto text-muted-foreground">✓</span>}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Sound</DropdownMenuLabel>
            {SOUND_PACK_OPTIONS.map((s) => (
              <DropdownMenuItem key={s.value} onClick={() => setSoundPack(s.value)} className="text-xs">
                {s.label}
                {s.value === soundPack && <span className="ml-auto text-muted-foreground">✓</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Mute */}
        <Button variant="ghost" size="icon" className="h-8 w-8" title={isMuted ? "Unmute" : "Mute"} onClick={toggleMute}>
          {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
        </Button>

        {/* Dark mode */}
        <Button variant="ghost" size="icon" className="h-8 w-8" title={isDark ? "Light" : "Dark"} onClick={toggleDark}>
          {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </Button>

        <div className="mx-1.5 h-4 w-px bg-border/60" aria-hidden />

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full h-7 w-7 p-0">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-[10px] font-bold text-white" style={{ backgroundColor: primaryColor }}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="font-normal py-1.5">
                <p className="font-semibold text-xs">{username}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="text-xs">
                <Link href="/profile" className="cursor-pointer">
                  <User className="mr-2 h-3.5 w-3.5" /> Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer text-xs">
                <LogOut className="mr-2 h-3.5 w-3.5" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            size="sm"
            asChild
            className="h-7 px-3 text-xs font-medium text-white rounded-md hover:opacity-90"
            style={{ backgroundColor: primaryColor }}
          >
            <Link href="/auth">Sign in</Link>
          </Button>
        )}
      </div>
    </nav>
  );
}
