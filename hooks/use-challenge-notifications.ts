import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export type ChallengePayload = {
  fromUsername: string;
  roomCode: string;
};

/**
 * Listens for incoming challenge notifications on the user's personal channel.
 * Shows a toast with a "Join" action when a challenge is received.
 */
export function useChallengeNotifications() {
  const { user } = useAuth();
  // Keyed on the id: the user object changes identity on every token refresh
  const userId = user?.id;
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel(`challenges:${userId}`, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    channel.on("broadcast", { event: "challenge" }, (msg) => {
      const data = msg.payload as ChallengePayload;
      toast(`${data.fromUsername} challenged you to a race!`, {
        duration: 15000,
        action: {
          label: "Join",
          onClick: () => {
            window.location.href = `/race/${data.roomCode}`;
          },
        },
      });
    });

    channel.subscribe();

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [userId]);
}

/**
 * Send a challenge notification to a friend.
 * Waits for the channel to be fully connected before sending.
 */
export function sendChallengeNotification(
  friendUserId: string,
  fromUsername: string,
  roomCode: string,
) {
  const channel = supabase.channel(`challenges:${friendUserId}`);
  const send = () =>
    channel.send({
      type: "broadcast",
      event: "challenge",
      payload: { fromUsername, roomCode } satisfies ChallengePayload,
    });

  // supabase.channel() returns the existing channel if a previous challenge to
  // the same friend is still open; subscribe() is then a no-op whose callback
  // never fires, which silently dropped the second challenge.
  if (channel.state === "joined") {
    send();
    return;
  }

  channel.subscribe((status) => {
    if (status !== "SUBSCRIBED") return;
    send();
    // Give the message time to propagate before cleanup
    setTimeout(() => {
      supabase.removeChannel(channel);
    }, 2000);
  });
}
