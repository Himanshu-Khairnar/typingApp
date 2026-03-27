"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { SiteNavbar } from "@/components/site-navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppSettings, THEME_COLORS } from "@/lib/app-settings";

export default function AuthPage() {
  const router = useRouter();
  const { theme } = useAppSettings();
  const ACCENT = THEME_COLORS[theme].primary;

  const [tab, setTab] = useState<"login" | "signup">("login");

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Signup state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupUsername, setSignupUsername] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    setLoginLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Welcome back!");
    router.push("/");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupUsername.trim()) { toast.error("Username is required."); return; }
    setSignupLoading(true);
    const { error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: { data: { username: signupUsername.trim() } },
    });
    setSignupLoading(false);
    if (error) { toast.error(error.message); return; }
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteNavbar />

      <main className="flex min-h-screen items-center justify-center px-4 pt-14">
        <div className="w-full max-w-sm">

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight">
              Type<span style={{ color: ACCENT }}>Arena</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {sent ? "Almost there" : tab === "login" ? "Welcome back" : "Create your account"}
            </p>
          </div>

          {sent ? (
            <div className="rounded-xl border border-border/50 bg-card p-6 text-center space-y-4">
              <div className="mx-auto h-12 w-12 rounded-full flex items-center justify-center text-2xl" style={{ backgroundColor: `${ACCENT}15` }}>
                <span style={{ color: ACCENT }}>@</span>
              </div>
              <div>
                <p className="font-semibold">Check your email</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  We sent a confirmation link to <strong className="text-foreground">{signupEmail}</strong>.
                  Click it to activate your account.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setSent(false); setTab("login"); }}
                className="text-sm font-medium hover:underline underline-offset-2"
                style={{ color: ACCENT }}
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              {/* Tab switcher */}
              <div className="flex rounded-lg bg-muted/60 p-1 mb-6">
                {(["login", "signup"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className="flex-1 rounded-md py-2 text-sm font-medium transition-all"
                    style={
                      tab === t
                        ? { backgroundColor: ACCENT, color: "#fff" }
                        : { color: "hsl(var(--muted-foreground))" }
                    }
                  >
                    {t === "login" ? "Sign in" : "Sign up"}
                  </button>
                ))}
              </div>

              {/* Login form */}
              {tab === "login" && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-xs font-medium text-muted-foreground">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password" className="text-xs font-medium text-muted-foreground">Password</Label>
                      <Link
                        href="/auth/reset"
                        className="text-xs hover:underline underline-offset-2"
                        style={{ color: ACCENT }}
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      className="h-11"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 font-semibold text-white hover:opacity-90"
                    style={{ backgroundColor: ACCENT }}
                    disabled={loginLoading}
                  >
                    {loginLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign in
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Don&apos;t have an account?{" "}
                    <button type="button" onClick={() => setTab("signup")} className="font-medium hover:underline underline-offset-2" style={{ color: ACCENT }}>
                      Sign up
                    </button>
                  </p>
                </form>
              )}

              {/* Signup form */}
              {tab === "signup" && (
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-username" className="text-xs font-medium text-muted-foreground">Username</Label>
                    <Input
                      id="signup-username"
                      placeholder="Pick a username"
                      maxLength={20}
                      value={signupUsername}
                      onChange={(e) => setSignupUsername(e.target.value)}
                      required
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-xs font-medium text-muted-foreground">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-xs font-medium text-muted-foreground">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Min 6 characters"
                      minLength={6}
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                      className="h-11"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 font-semibold text-white hover:opacity-90"
                    style={{ backgroundColor: ACCENT }}
                    disabled={signupLoading}
                  >
                    {signupLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create account
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Already have an account?{" "}
                    <button type="button" onClick={() => setTab("login")} className="font-medium hover:underline underline-offset-2" style={{ color: ACCENT }}>
                      Sign in
                    </button>
                  </p>
                </form>
              )}
            </>
          )}

          <p className="mt-6 text-center text-[11px] text-muted-foreground/60">
            By continuing you agree to our Terms of Service.
          </p>
        </div>
      </main>
    </div>
  );
}
