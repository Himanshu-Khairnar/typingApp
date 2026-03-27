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
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel(`challenges:${user.id}`, {
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
  }, [user?.id]);
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

  channel.subscribe((status) => {
    if (status !== "SUBSCRIBED") return;

    channel.send({
      type: "broadcast",
      event: "challenge",
      payload: { fromUsername, roomCode } satisfies ChallengePayload,
    });

    // Give the message time to propagate before cleanup
    setTimeout(() => {
      channel.unsubscribe();
    }, 2000);
  });
}
