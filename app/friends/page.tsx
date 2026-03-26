"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Search, UserPlus, Users, Clock, Swords,
  Check, X, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { SiteNavbar } from "@/components/site-navbar";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useAppSettings, THEME_COLORS } from "@/lib/app-settings";

type FriendRow = {
  id: string;
  user_id: string;
  friend_id: string;
  status: "pending" | "accepted";
  created_at: string;
  username: string;
  best_wpm: number | null;
};

type SearchResult = {
  id: string;
  username: string;
};

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export default function FriendsPage() {
  const { user, loading: authLoading } = useAuth();
  const { theme } = useAppSettings();
  const ACCENT = THEME_COLORS[theme].primary;
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);

  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRow[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const playerName =
    user?.user_metadata?.username ?? user?.email?.split("@")[0] ?? "Anonymous";

  // Fetch friends and pending requests
  const fetchFriends = useCallback(async () => {
    if (!user) return;
    setLoadingFriends(true);

    try {
      // Accepted friends (where I'm user_id)
      const { data: sentAccepted } = await supabase
        .from("friends")
        .select("id, user_id, friend_id, status, created_at")
        .eq("user_id", user.id)
        .eq("status", "accepted");

      // Accepted friends (where I'm friend_id)
      const { data: receivedAccepted } = await supabase
        .from("friends")
        .select("id, user_id, friend_id, status, created_at")
        .eq("friend_id", user.id)
        .eq("status", "accepted");

      // Pending incoming requests
      const { data: incoming } = await supabase
        .from("friends")
        .select("id, user_id, friend_id, status, created_at")
        .eq("friend_id", user.id)
        .eq("status", "pending");

      // Combine accepted friends
      const allAccepted = [...(sentAccepted ?? []), ...(receivedAccepted ?? [])];
      const friendIds = allAccepted.map((f) =>
        f.user_id === user.id ? f.friend_id : f.user_id
      );

      // Fetch profiles for friends
      let friendProfiles: FriendRow[] = [];
      if (friendIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username")
          .in("id", friendIds);

        // Fetch best WPMs
        const { data: bestResults } = await supabase
          .from("results")
          .select("user_id, net_wpm")
          .in("user_id", friendIds)
          .order("net_wpm", { ascending: false });

        const bestWpmMap: Record<string, number> = {};
        for (const r of bestResults ?? []) {
          if (!bestWpmMap[r.user_id]) {
            bestWpmMap[r.user_id] = Math.round(Number(r.net_wpm));
          }
        }

        friendProfiles = allAccepted.map((f) => {
          const friendId = f.user_id === user.id ? f.friend_id : f.user_id;
          const profile = (profiles ?? []).find((p) => p.id === friendId);
          return {
            ...f,
            username: profile?.username ?? "Unknown",
            best_wpm: bestWpmMap[friendId] ?? null,
          };
        });
      }

      // Fetch profiles for pending requests
      const pendingUserIds = (incoming ?? []).map((f) => f.user_id);
      let pendingProfiles: FriendRow[] = [];
      if (pendingUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username")
          .in("id", pendingUserIds);

        pendingProfiles = (incoming ?? []).map((f) => {
          const profile = (profiles ?? []).find((p) => p.id === f.user_id);
          return {
            ...f,
            username: profile?.username ?? "Unknown",
            best_wpm: null,
          };
        });
      }

      setFriends(friendProfiles);
      setPendingRequests(pendingProfiles);
    } catch (err) {
      console.error("Error fetching friends:", err);
    } finally {
      setLoadingFriends(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchFriends();
  }, [user, fetchFriends]);

  // Search users
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !user) return;
    setSearching(true);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username")
        .ilike("username", `%${searchQuery.trim()}%`)
        .neq("id", user.id)
        .limit(10);

      if (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      } else {
        setSearchResults((data as SearchResult[]) ?? []);
      }
    } catch (err) {
      console.error("Search exception:", err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchQuery, user]);

  // Send friend request
  const handleSendRequest = async (friendId: string) => {
    if (!user) return;
    setSendingRequest(friendId);

    try {
      // Check if request already exists
      const { data: existing } = await supabase
        .from("friends")
        .select("id")
        .or(
          `and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`
        )
        .limit(1);

      if (existing && existing.length > 0) {
        toast.info("Friend request already exists or you are already friends.");
        setSendingRequest(null);
        return;
      }

      const { error } = await supabase.from("friends").insert({
        user_id: user.id,
        friend_id: friendId,
        status: "pending",
      });

      if (error) throw error;
      toast.success("Friend request sent!");
      setSearchResults((prev) => prev.filter((r) => r.id !== friendId));
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to send friend request");
    } finally {
      setSendingRequest(null);
    }
  };

  // Accept friend request
  const handleAccept = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const { error } = await supabase
        .from("friends")
        .update({ status: "accepted" })
        .eq("id", requestId);

      if (error) throw error;
      toast.success("Friend request accepted!");
      fetchFriends();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to accept request");
    } finally {
      setProcessingId(null);
    }
  };

  // Decline friend request
  const handleDecline = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const { error } = await supabase
        .from("friends")
        .delete()
        .eq("id", requestId);

      if (error) throw error;
      toast.info("Friend request declined.");
      fetchFriends();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to decline request");
    } finally {
      setProcessingId(null);
    }
  };

  // Challenge a friend
  const handleChallenge = (friendUsername: string) => {
    const code = generateRoomCode();
    router.push(
      `/race/${code}?name=${encodeURIComponent(playerName)}&host=1`
    );
    toast.success(`Room ${code} created! Share the code with ${friendUsername}.`);
  };

  // Redirect if not authed
  useEffect(() => {
    if (!authLoading && !user) router.replace("/auth");
  }, [authLoading, user, router]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background">
        <SiteNavbar />
        <div className="flex min-h-screen items-center justify-center pt-14">
          <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteNavbar />

      <main className="mx-auto max-w-4xl px-4 pt-16 pb-16 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Friends</h1>
          <p className="text-sm text-muted-foreground">
            Find friends, send challenges, and race together.
          </p>
        </div>

        <Separator />

        {/* Search */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              Find Users
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search by username..."
                className="flex-1"
              />
              <Button
                onClick={handleSearch}
                disabled={searching || !searchQuery.trim()}
                className="text-white hover:opacity-90"
                style={{ backgroundColor: ACCENT }}
              >
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="divide-y rounded-lg border">
                {searchResults.map((result) => {
                  const initials = result.username.slice(0, 2).toUpperCase();
                  const isSending = sendingRequest === result.id;
                  const isAlreadyFriend = friends.some(
                    (f) => f.friend_id === result.id || f.user_id === result.id
                  );

                  return (
                    <div
                      key={result.id}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-[10px] font-bold bg-muted text-muted-foreground">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1 text-sm font-medium truncate">
                        {result.username}
                      </span>
                      {isAlreadyFriend ? (
                        <Badge variant="secondary" className="text-[10px]">
                          Already friends
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 text-xs"
                          disabled={isSending}
                          onClick={() => handleSendRequest(result.id)}
                        >
                          {isSending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <UserPlus className="h-3 w-3" />
                          )}
                          Add
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {searchResults.length === 0 && searchQuery.trim() && !searching && (
              <p className="text-center text-xs text-muted-foreground py-3">
                No users found matching "{searchQuery}".
              </p>
            )}
          </CardContent>
        </Card>

        {/* Friends / Pending Tabs */}
        <Tabs defaultValue="friends">
          <TabsList>
            <TabsTrigger value="friends" className="gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Friends
              {friends.length > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 min-w-[20px] px-1 text-[10px]"
                >
                  {friends.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pending" className="gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Pending
              {pendingRequests.length > 0 && (
                <Badge
                  className="ml-1 h-5 min-w-[20px] px-1 text-[10px] text-white"
                  style={{ backgroundColor: ACCENT }}
                >
                  {pendingRequests.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Friends list */}
          <TabsContent value="friends">
            <Card>
              <CardContent className="p-0">
                {loadingFriends ? (
                  <div className="space-y-0 divide-y">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 px-6 py-4 animate-pulse"
                      >
                        <div className="h-9 w-9 rounded-full bg-muted" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3.5 w-24 rounded bg-muted" />
                          <div className="h-3 w-16 rounded bg-muted" />
                        </div>
                        <div className="h-7 w-20 rounded bg-muted" />
                      </div>
                    ))}
                  </div>
                ) : friends.length === 0 ? (
                  <div className="flex h-48 flex-col items-center justify-center gap-2">
                    <Users className="h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      No friends yet. Search above to find people!
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {friends.map((friend) => {
                      const friendId =
                        friend.user_id === user.id
                          ? friend.friend_id
                          : friend.user_id;
                      const initials = friend.username
                        .slice(0, 2)
                        .toUpperCase();

                      return (
                        <div
                          key={friend.id}
                          className="flex items-center gap-3 px-6 py-3.5"
                        >
                          <Avatar className="h-9 w-9">
                            <AvatarFallback
                              className="text-[11px] font-bold text-white"
                              style={{ backgroundColor: ACCENT }}
                            >
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {friend.username}
                            </p>
                            {friend.best_wpm !== null && (
                              <p className="text-xs text-muted-foreground">
                                Best: {friend.best_wpm} wpm
                              </p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1.5 text-xs"
                            onClick={() => handleChallenge(friend.username)}
                          >
                            <Swords className="h-3 w-3" />
                            Challenge
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pending requests */}
          <TabsContent value="pending">
            <Card>
              <CardContent className="p-0">
                {loadingFriends ? (
                  <div className="space-y-0 divide-y">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 px-6 py-4 animate-pulse"
                      >
                        <div className="h-9 w-9 rounded-full bg-muted" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3.5 w-24 rounded bg-muted" />
                        </div>
                        <div className="h-7 w-16 rounded bg-muted" />
                        <div className="h-7 w-16 rounded bg-muted" />
                      </div>
                    ))}
                  </div>
                ) : pendingRequests.length === 0 ? (
                  <div className="flex h-48 flex-col items-center justify-center gap-2">
                    <Clock className="h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      No pending requests.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {pendingRequests.map((req) => {
                      const initials = req.username.slice(0, 2).toUpperCase();
                      const isProcessing = processingId === req.id;

                      return (
                        <div
                          key={req.id}
                          className="flex items-center gap-3 px-6 py-3.5"
                        >
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="text-[11px] font-bold bg-muted text-muted-foreground">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {req.username}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Sent {new Date(req.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              className="h-7 gap-1 text-xs text-white hover:opacity-90"
                              style={{ backgroundColor: ACCENT }}
                              disabled={isProcessing}
                              onClick={() => handleAccept(req.id)}
                            >
                              {isProcessing ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1 text-xs"
                              disabled={isProcessing}
                              onClick={() => handleDecline(req.id)}
                            >
                              <X className="h-3 w-3" />
                              Decline
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
