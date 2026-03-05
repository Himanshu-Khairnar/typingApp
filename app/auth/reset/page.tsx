"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { SiteNavbar } from "@/components/site-navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function ResetPage() {
  const [email, setEmail]     = useState("");
  const [sent, setSent]       = useState(false);
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
        <div className="w-full max-w-md space-y-6">

          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">Reset password</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your email and we'll send a reset link.
            </p>
          </div>

          <Card>
            {sent ? (
              <>
                <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                    <Mail className="h-5 w-5" /> Email sent!
                  </CardTitle>
                  <CardDescription>
                    Check your inbox at <strong>{email}</strong> for the reset link.
                  </CardDescription>
                </CardHeader>
                <CardFooter className="justify-center">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/auth">Back to login</Link>
                  </Button>
                </CardFooter>
              </>
            ) : (
              <form onSubmit={handleSubmit}>
                <CardHeader>
                  <CardTitle>Forgot your password?</CardTitle>
                  <CardDescription>We'll email you a secure reset link.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send reset link
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/auth">Back to login</Link>
                  </Button>
                </CardFooter>
              </form>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
