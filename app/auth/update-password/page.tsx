"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { SiteNavbar } from "@/components/site-navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppSettings, THEME_COLORS } from "@/lib/app-settings";

/**
 * Target of the password-reset email (`/auth/reset` sends users here).
 * Supabase exchanges the recovery token in the URL for a session; once that
 * session exists we let the user pick a new password.
 */
export default function UpdatePasswordPage() {
  const router = useRouter();
  const { theme } = useAppSettings();
  const ACCENT = THEME_COLORS[theme].primary;

  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) setReady(true);
    });
    // If no recovery session shows up, the link is invalid or expired
    const timeout = setTimeout(() => { if (!cancelled) setExpired(true); }, 4000);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const mismatch = confirm.length > 0 && password !== confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (password !== confirm) { toast.error("Passwords don't match"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated — you're signed in");
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteNavbar />
      <main className="flex min-h-screen items-center justify-center px-4 pt-14">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          className="w-full max-w-sm"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight">
              Type<span style={{ color: ACCENT }}>Arena</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">Choose a new password</p>
          </div>

          {!ready ? (
            <div className="rounded-xl border border-border/50 bg-card p-6 text-center text-sm text-muted-foreground">
              {expired ? (
                <>
                  <p className="font-semibold text-foreground">This reset link is invalid or has expired.</p>
                  <Link href="/auth/reset" className="mt-3 inline-block font-medium hover:underline underline-offset-2" style={{ color: ACCENT }}>
                    Request a new link
                  </Link>
                </>
              ) : (
                <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Verifying link…</span>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">New password</Label>
                <Input id="password" type="password" autoComplete="new-password" minLength={6} required
                  value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm" className="text-xs font-medium text-muted-foreground">Confirm password</Label>
                <Input id="confirm" type="password" autoComplete="new-password" required aria-invalid={mismatch}
                  value={confirm} onChange={(e) => setConfirm(e.target.value)} className="h-11" />
                <AnimatePresence>
                  {mismatch && (
                    <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className="text-xs text-destructive">
                      Passwords don&apos;t match
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
              <Button type="submit" disabled={loading || mismatch}
                className="w-full h-11 font-semibold text-white hover:opacity-90" style={{ backgroundColor: ACCENT }}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update password
              </Button>
            </form>
          )}
        </motion.div>
      </main>
    </div>
  );
}
