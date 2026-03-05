"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, KeyRound, UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { SiteNavbar } from "@/components/site-navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

export default function AuthPage() {
  const router = useRouter();

  // Login state
  const [loginEmail, setLoginEmail]       = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading]   = useState(false);

  // Signup state
  const [signupEmail, setSignupEmail]       = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupUsername, setSignupUsername] = useState("");
  const [signupLoading, setSignupLoading]   = useState(false);
  const [sent, setSent]                     = useState(false);

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
        <div className="w-full max-w-md space-y-6">

          {/* Brand */}
          <div className="text-center">
            <span className="text-5xl">⌨</span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight">TypeArena</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to save your progress</p>
          </div>

          {sent ? (
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-green-600 dark:text-green-400">Check your email!</CardTitle>
                <CardDescription>
                  We sent a confirmation link to <strong>{signupEmail}</strong>.
                  Click it to activate your account.
                </CardDescription>
              </CardHeader>
              <CardFooter className="justify-center">
                <Button variant="ghost" size="sm" onClick={() => setSent(false)}>
                  Back to login
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>

              {/* ── Login ── */}
              <TabsContent value="login">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <KeyRound className="h-5 w-5" />
                      Welcome back
                    </CardTitle>
                    <CardDescription>Enter your credentials to sign in.</CardDescription>
                  </CardHeader>
                  <form onSubmit={handleLogin}>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email">Email</Label>
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="you@example.com"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="login-password">Password</Label>
                          <Link
                            href="/auth/reset"
                            className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                          >
                            Forgot password?
                          </Link>
                        </div>
                        <Input
                          id="login-password"
                          type="password"
                          placeholder="••••••••"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          required
                        />
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button type="submit" className="w-full" disabled={loginLoading}>
                        {loginLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Sign in
                      </Button>
                    </CardFooter>
                  </form>
                </Card>
              </TabsContent>

              {/* ── Signup ── */}
              <TabsContent value="signup">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5" />
                      Create account
                    </CardTitle>
                    <CardDescription>Join TypeArena and track your WPM growth.</CardDescription>
                  </CardHeader>
                  <form onSubmit={handleSignup}>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-username">Username</Label>
                        <Input
                          id="signup-username"
                          placeholder="your_username"
                          maxLength={20}
                          value={signupUsername}
                          onChange={(e) => setSignupUsername(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Email</Label>
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="you@example.com"
                          value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Password</Label>
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="Min 6 characters"
                          minLength={6}
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          required
                        />
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button type="submit" className="w-full" disabled={signupLoading}>
                        {signupLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create account
                      </Button>
                    </CardFooter>
                  </form>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
              or
            </span>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            By continuing you agree to our{" "}
            <span className="font-medium text-foreground">Terms of Service</span>.
          </p>
        </div>
      </main>
    </div>
  );
}
