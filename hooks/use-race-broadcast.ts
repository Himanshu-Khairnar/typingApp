import { useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"

type PlayerPayload = {
  id: string
  progress: number
  grossWpm: number
  netWpm: number
  accuracy: number
  typedChars: number
  correctChars: number
  incorrectChars: number
  elapsedMs: number
  startedAt: number | null
  updatedAt: number
}

type BroadcastState = {
  players: PlayerPayload[]
  isConnected: boolean
}

export function useRaceBroadcast({
  roomCode,
  playerId,
  payload,
  enabled,
}: {
  roomCode: string
  playerId: string
  payload: Omit<PlayerPayload, "id" | "updatedAt">
  enabled: boolean
}): BroadcastState {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const [players, setPlayers] = useState<PlayerPayload[]>([])
  const [isConnected, setIsConnected] = useState(false)

  const channelName = useMemo(() => {
    if (!roomCode) return null
    return `race:${roomCode.toUpperCase()}`
  }, [roomCode])

  useEffect(() => {
    if (!channelName || !enabled) {
      setIsConnected(false)
      return
    }

    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: true } },
    })
    channelRef.current = channel

    channel.on("broadcast", { event: "progress" }, (payload) => {
      const data = payload.payload as PlayerPayload
      setPlayers((prev) => {
        const filtered = prev.filter((player) => player.id !== data.id)
        return [...filtered, data].sort((a, b) => b.progress - a.progress)
      })
    })

    channel.subscribe((status) => {
      setIsConnected(status === "SUBSCRIBED")
    })

    return () => {
      channel.unsubscribe()
      channelRef.current = null
      setPlayers([])
      setIsConnected(false)
    }
  }, [channelName, enabled])

  useEffect(() => {
    if (!enabled || !channelRef.current) return
    const interval = window.setInterval(() => {
      channelRef.current?.send({
        type: "broadcast",
        event: "progress",
        payload: {
          id: playerId,
          ...payload,
          updatedAt: Date.now(),
        },
      })
    }, 500)

    return () => window.clearInterval(interval)
  }, [enabled, payload, playerId])

  return { players, isConnected }
}
