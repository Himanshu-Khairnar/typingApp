"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";

type FriendProfile = {
  id: string;
  username: string;
  avatar_url: string | null;
};

type Friendship = {
  id: string;
  friend: FriendProfile;
  created_at: string;
};

type PendingRequest = {
  id: string;
  requester: FriendProfile;
  created_at: string;
};

export function useFriends() {
  const { user, loading: authLoading } = useAuth();
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const getFriends = useCallback(async () => {
    if (!user) {
      setFriends([]);
      return;
    }

    // Fetch friendships where I'm requester
    const { data: asRequester } = await supabase
      .from("friendships")
      .select("id, created_at, addressee_id")
      .eq("requester_id", user.id)
      .eq("status", "accepted");

    // Fetch friendships where I'm addressee
    const { data: asAddressee } = await supabase
      .from("friendships")
      .select("id, created_at, requester_id")
      .eq("addressee_id", user.id)
      .eq("status", "accepted");

    const friendIds: { friendshipId: string; friendUserId: string; created_at: string }[] = [];

    for (const row of asRequester ?? []) {
      friendIds.push({ friendshipId: row.id, friendUserId: row.addressee_id, created_at: row.created_at });
    }
    for (const row of asAddressee ?? []) {
      friendIds.push({ friendshipId: row.id, friendUserId: row.requester_id, created_at: row.created_at });
    }

    if (friendIds.length === 0) {
      setFriends([]);
      return;
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", friendIds.map((f) => f.friendUserId));

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    const result: Friendship[] = friendIds
      .map((f) => {
        const profile = profileMap.get(f.friendUserId);
        if (!profile) return null;
        return {
          id: f.friendshipId,
          friend: { id: profile.id, username: profile.username, avatar_url: profile.avatar_url },
          created_at: f.created_at,
        };
      })
      .filter(Boolean) as Friendship[];

    setFriends(result);
  }, [user]);

  const getPending = useCallback(async () => {
    if (!user) {
      setPending([]);
      return;
    }

    const { data: rows } = await supabase
      .from("friendships")
      .select("id, created_at, requester_id")
      .eq("addressee_id", user.id)
      .eq("status", "pending");

    if (!rows || rows.length === 0) {
      setPending([]);
      return;
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", rows.map((r) => r.requester_id));

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    const result: PendingRequest[] = rows
      .map((r) => {
        const profile = profileMap.get(r.requester_id);
        if (!profile) return null;
        return {
          id: r.id,
          requester: { id: profile.id, username: profile.username, avatar_url: profile.avatar_url },
          created_at: r.created_at,
        };
      })
      .filter(Boolean) as PendingRequest[];

    setPending(result);
  }, [user]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([getFriends(), getPending()]);
    setLoading(false);
  }, [getFriends, getPending]);

  useEffect(() => {
    if (!authLoading) {
      refresh();
    }
  }, [authLoading, refresh]);

  const sendRequest = useCallback(
    async (username: string) => {
      if (!user) return { error: "Not authenticated" };

      // Lookup profile by username
      const { data: profile, error: lookupError } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .maybeSingle();

      if (lookupError || !profile) {
        return { error: "User not found" };
      }

      if (profile.id === user.id) {
        return { error: "Cannot send request to yourself" };
      }

      const { error } = await supabase.from("friendships").insert({
        requester_id: user.id,
        addressee_id: profile.id,
      });

      if (!error) {
        await refresh();
      }
      return { error: error?.message ?? null };
    },
    [user, refresh]
  );

  const acceptRequest = useCallback(
    async (friendshipId: string) => {
      const { error } = await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", friendshipId);

      if (!error) {
        await refresh();
      }
      return { error: error?.message ?? null };
    },
    [refresh]
  );

  const removeFriend = useCallback(
    async (friendshipId: string) => {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", friendshipId);

      if (!error) {
        await refresh();
      }
      return { error: error?.message ?? null };
    },
    [refresh]
  );

  return { friends, pending, sendRequest, acceptRequest, removeFriend, loading };
}
