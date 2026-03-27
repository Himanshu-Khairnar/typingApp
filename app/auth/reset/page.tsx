"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { SiteNavbar } from "@/components/site-navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppSettings, THEME_COLORS } from "@/lib/app-settings";

export default function ResetPage() {
  const { theme } = useAppSettings();
  const ACCENT = THEME_COLORS[theme].primary;

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteNavbar />
      <main className="flex min-h-screen items-center justify-center px-4 pt-14">
        <div className="w-full max-w-sm">

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight">
              Type<span style={{ color: ACCENT }}>Arena</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {sent ? "Check your inbox" : "Reset your password"}
            </p>
          </div>

          {sent ? (
            <div className="rounded-xl border border-border/50 bg-card p-6 text-center space-y-4">
              <div className="mx-auto h-12 w-12 rounded-full flex items-center justify-center text-2xl" style={{ backgroundColor: `${ACCENT}15` }}>
                <span style={{ color: ACCENT }}>@</span>
              </div>
              <div>
                <p className="font-semibold">Email sent</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Check your inbox at <strong className="text-foreground">{email}</strong> for the reset link.
                </p>
              </div>
              <Link
                href="/auth"
                className="inline-block text-sm font-medium hover:underline underline-offset-2"
                style={{ color: ACCENT }}
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-11 font-semibold text-white hover:opacity-90"
                style={{ backgroundColor: ACCENT }}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send reset link
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Remember your password?{" "}
                <Link href="/auth" className="font-medium hover:underline underline-offset-2" style={{ color: ACCENT }}>
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
