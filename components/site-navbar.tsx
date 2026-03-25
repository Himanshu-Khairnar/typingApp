"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAppSettings, THEME_COLORS } from "@/lib/app-settings";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV_LINKS = [
  { label: "Home",  href: "/" },
  { label: "Race",  href: "/race" },
];

interface SiteNavbarProps {
  className?: string;
  children?: React.ReactNode;
}

export function SiteNavbar({ className, children }: SiteNavbarProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { isDark, isMuted, toggleDark, toggleMute, theme } = useAppSettings();
  const primaryColor = THEME_COLORS[theme].primary;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const username = user?.user_metadata?.username ?? user?.email?.split("@")[0] ?? "User";
  const initials = username.slice(0, 2).toUpperCase();

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-border/40 bg-background/80 backdrop-blur-md px-6",
        className,
      )}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
        <span className="text-2xl leading-none" style={{ color: primaryColor }}>⌨</span>
        <div className="flex flex-col leading-none">
          <span className="font-mono text-base font-bold tracking-tight text-foreground">TypeArena</span>
          <span className="text-[10px] font-medium tracking-wide text-muted-foreground">speed · accuracy · flow</span>
        </div>
      </Link>

      {/* Center nav */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1">
        {NAV_LINKS.map(({ label, href }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
              {active && (
                <span
                  className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full"
                  style={{ backgroundColor: primaryColor }}
                />
              )}
            </Link>
          );
        })}
      </div>

      {/* Right */}
      <div className="flex items-center gap-1">
        {children}

        {/* Mute */}
        <Button variant="ghost" size="icon" title={isMuted ? "Unmute sound" : "Mute sound"} onClick={toggleMute}>
          {isMuted ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="22" y1="9" x2="16" y2="15" /><line x1="16" y1="9" x2="22" y2="15" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          )}
        </Button>

        {/* Dark mode */}
        <Button variant="ghost" size="icon" title={isDark ? "Light mode" : "Dark mode"} onClick={toggleDark}>
          {isDark ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
          )}
        </Button>

        <div className="mx-1 h-5 w-px bg-border" aria-hidden />

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 p-0">
                <Avatar className="h-8 w-8">
                  <AvatarFallback
                    className="text-xs font-bold text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="font-normal">
                <p className="font-semibold text-sm">{username}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" /> Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button size="sm" asChild style={{ backgroundColor: primaryColor }} className="text-white hover:opacity-90">
            <Link href="/auth">Sign in</Link>
          </Button>
        )}
      </div>
    </nav>
  );
}
