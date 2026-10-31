"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useChallengeNotifications } from "@/hooks/use-challenge-notifications";
import { supabase } from "@/lib/supabase";
import { effectiveStreak } from "@/lib/streak";
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
import { KeyboardIcon } from "@/components/animated-icons/keyboard";
import { FlameIcon } from "@/components/animated-icons/flame";
import { UsersIcon } from "@/components/animated-icons/users";
import { VolumeIcon } from "@/components/animated-icons/volume";
import { SunIcon } from "@/components/animated-icons/sun";
import { MoonIcon } from "@/components/animated-icons/moon";
import { UserIcon } from "@/components/animated-icons/user";
import { LogoutIcon } from "@/components/animated-icons/logout";
import { useAnimatedIcon } from "@/components/animated-icons/use-animated-icon";

const NAV_LINKS = [
  { label: "Type", href: "/" },
  { label: "Race", href: "/race" },
  { label: "Leaderboard", href: "/leaderboard" },
];

const SPRING = { type: "spring", stiffness: 500, damping: 32 } as const;

interface SiteNavbarProps {
  className?: string;
  children?: React.ReactNode;
}

export function SiteNavbar({ className, children }: SiteNavbarProps) {
  const { user, loading } = useAuth();
  const userId = user?.id;
  const router = useRouter();
  const pathname = usePathname();
  const { isDark, isMuted, toggleDark, toggleMute, theme, setTheme, fontFamily, setFont, soundPack, setSoundPack } = useAppSettings();
  const primaryColor = THEME_COLORS[theme]?.primary ?? "#F57644";

  const [streak, setStreak] = useState(0);
  const [pendingFriends, setPendingFriends] = useState(0);

  const { iconRef: logoRef, triggerProps: logoTrigger } = useAnimatedIcon();
  const { iconRef: flameRef, triggerProps: flameTrigger } = useAnimatedIcon();
  const { iconRef: friendsRef, triggerProps: friendsTrigger } = useAnimatedIcon();
  const { iconRef: volumeRef, triggerProps: volumeTrigger } = useAnimatedIcon();
  const { iconRef: themeIconRef, triggerProps: themeTrigger } = useAnimatedIcon();
  const { iconRef: profileIconRef, triggerProps: profileIconTrigger } = useAnimatedIcon();
  const { iconRef: logoutIconRef, start: logoutIconStart, stop: logoutIconStop } = useAnimatedIcon();

  // Listen for challenge notifications from friends
  useChallengeNotifications();

  // Fetch streak + pending friend requests. Keyed on the user id — the `user`
  // object changes identity on every token refresh, which caused refetches.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (supabase.from("streaks" as never) as any).select("current_streak, last_test_date").eq("user_id", userId).maybeSingle()
      .then(({ data }: any) => {
        if (!cancelled) setStreak(effectiveStreak(data?.current_streak, data?.last_test_date));
      });
    (supabase.from("friendships" as never) as any).select("id", { count: "exact", head: true })
      .eq("addressee_id", userId).eq("status", "pending")
      .then(({ count }: any) => { if (!cancelled) setPendingFriends(count ?? 0); });
    return () => { cancelled = true; };
  }, [userId]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setStreak(0);
    setPendingFriends(0);
    router.push("/");
  };

  const username = user?.user_metadata?.username ?? user?.email?.split("@")[0] ?? "User";
  const initials = username.slice(0, 2).toUpperCase();

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 flex h-12 items-center justify-between border-b border-border/50 bg-background/90 backdrop-blur-lg px-3 sm:px-5",
        className,
      )}
    >
      {/* Logo */}
      <Link href="/" className="group flex items-center gap-2" {...logoTrigger}>
        <motion.span whileTap={{ scale: 0.9 }} className="flex" style={{ color: primaryColor }}>
          <KeyboardIcon ref={logoRef} size={20} className="flex" />
        </motion.span>
        <span className="hidden font-mono text-sm font-bold tracking-tight text-foreground sm:inline">
          Type<span className="transition-colors duration-300" style={{ color: primaryColor }}>Arena</span>
        </span>
      </Link>

      {/* Center nav — the active pill slides between links */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-0.5">
        {NAV_LINKS.map(({ label, href }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative px-3 py-1 text-xs font-medium rounded-md transition-colors",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              {active && (
                <motion.span layoutId="nav-active-pill" className="absolute inset-0 rounded-md bg-muted" transition={SPRING} />
              )}
              <span className="relative z-10">{label}</span>
              {active && (
                <motion.span
                  layoutId="nav-active-dot"
                  className="absolute -bottom-[9px] left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full"
                  style={{ backgroundColor: primaryColor }}
                  transition={SPRING}
                />
              )}
            </Link>
          );
        })}
      </div>

      {/* Right */}
      <div className="flex items-center gap-0.5">
        {children}

        {/* Streak */}
        <AnimatePresence>
          {user && streak > 0 && (
            <motion.div
              key="streak"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={SPRING}
              title={`${streak}-day streak`}
              className="flex cursor-default items-center gap-1 rounded-md px-2 py-1 text-xs font-bold tabular-nums hover:bg-muted/50"
              style={{ color: primaryColor }}
              {...flameTrigger}
            >
              <FlameIcon ref={flameRef} size={14} className="flex" />
              {streak}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Friends */}
        {user && (
          <Button variant="ghost" size="icon" className="h-8 w-8 relative" asChild title="Friends">
            <Link href="/friends" aria-label="Friends" {...friendsTrigger}>
              <UsersIcon ref={friendsRef} size={14} className="flex" />
              <AnimatePresence>
                {pendingFriends > 0 && (
                  <motion.span
                    key={pendingFriends}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring", stiffness: 600, damping: 15 }}
                    className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5 text-[9px] font-bold text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <span className="absolute inset-0 animate-ping rounded-full opacity-40" style={{ backgroundColor: primaryColor }} />
                    <span className="relative">{pendingFriends}</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          </Button>
        )}

        {/* Settings dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="group h-8 w-8" title="Theme, font & sound">
              <motion.div
                layout
                className="h-3.5 w-3.5 rounded-full border border-border transition-transform duration-300 group-hover:scale-125 group-hover:rotate-90"
                animate={{ backgroundColor: primaryColor }}
                transition={{ duration: 0.3 }}
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Theme</DropdownMenuLabel>
            {ALL_THEMES.map((t) => (
              <DropdownMenuItem key={t} onClick={() => setTheme(t)} className="group gap-2 text-xs capitalize">
                <div className="h-3 w-3 rounded-full transition-transform duration-200 group-hover:scale-125" style={{ backgroundColor: THEME_COLORS[t].primary }} />
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
        <Button
          variant="ghost" size="icon" className="h-8 w-8 overflow-hidden"
          title={isMuted ? "Unmute" : "Mute"} aria-label={isMuted ? "Unmute" : "Mute"}
          onClick={toggleMute} {...volumeTrigger}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={isMuted ? "muted" : "sound"}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.15 }}
              className="flex"
            >
              {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <VolumeIcon ref={volumeRef} size={14} className="flex" />}
            </motion.span>
          </AnimatePresence>
        </Button>

        {/* Dark mode — sun/moon rotate in and out */}
        <Button
          variant="ghost" size="icon" className="h-8 w-8 overflow-hidden"
          title={isDark ? "Light mode" : "Dark mode"} aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          onClick={toggleDark} {...themeTrigger}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={isDark ? "sun" : "moon"}
              initial={{ y: 14, rotate: -90, opacity: 0 }}
              animate={{ y: 0, rotate: 0, opacity: 1 }}
              exit={{ y: -14, rotate: 90, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
              className="flex"
            >
              {isDark
                ? <SunIcon ref={themeIconRef} size={14} className="flex" />
                : <MoonIcon ref={themeIconRef} size={14} className="flex" />}
            </motion.span>
          </AnimatePresence>
        </Button>

        <div className="mx-1.5 h-4 w-px bg-border/60" aria-hidden />

        {loading ? (
          // Avoid flashing "Sign in" for logged-in users while the session loads
          <div className="h-7 w-7 animate-pulse rounded-full bg-muted" aria-hidden />
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.button
                type="button"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                aria-label="Account menu"
                className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-[10px] font-bold text-white" style={{ backgroundColor: primaryColor }}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </motion.button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="font-normal py-1.5">
                <p className="font-semibold text-xs">{username}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="text-xs">
                <Link href="/profile" className="cursor-pointer" {...profileIconTrigger}>
                  <UserIcon ref={profileIconRef} size={14} className="mr-2 flex" /> Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-destructive cursor-pointer text-xs"
                onMouseEnter={logoutIconStart}
                onMouseLeave={logoutIconStop}
                onFocus={logoutIconStart}
                onBlur={logoutIconStop}
              >
                <LogoutIcon ref={logoutIconRef} size={14} className="mr-2 flex" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            size="sm"
            asChild
            className="h-7 px-3 text-xs font-medium text-white rounded-md hover:opacity-90 hover:-translate-y-px hover:shadow-md"
            style={{ backgroundColor: primaryColor }}
          >
            <Link href="/auth">Sign in</Link>
          </Button>
        )}
      </div>
    </nav>
  );
}
