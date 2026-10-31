"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

export type RacePhase = "lobby" | "countdown" | "racing" | "finished";

export type RaceConfig = {
  mode: "words" | "time";
  wordCount: number;
  duration: number;
  punctuation: boolean;
  numbers: boolean;
};

export type RacePlayer = {
  id: string;
  name: string;
  color: string;
  isHost: boolean;
  progress: number;
  netWpm: number;
  grossWpm: number;
  accuracy: number;
  finishedAt: number | null;
  rank: number | null;
};

export const PLAYER_COLORS = [
  "#F57644",
  "#86C8AC",
  "#4ABDE8",
  "#E4D440",
  "#7C6CD9",
  "#D73E42",
  "#C94E41",
  "#D5868A",
];

export function getPlayerColor(playerId: string): string {
  const sum = playerId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return PLAYER_COLORS[sum % PLAYER_COLORS.length];
}

interface UseRaceRoomOptions {
  roomCode: string;
  playerId: string;
  playerName: string;
  isHost: boolean;
  /** Don't connect/join until true (e.g. until auth has resolved). */
  enabled?: boolean;
}

export function useRaceRoom({
  roomCode,
  playerId,
  playerName,
  isHost,
  enabled = true,
}: UseRaceRoomOptions) {
  const socketRef = useRef<Socket | null>(null);
  const mountedRef = useRef(true);
  const countdownTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const playerNameRef = useRef(playerName);
  const isHostRef = useRef(isHost);
  useEffect(() => {
    playerNameRef.current = playerName;
    isHostRef.current = isHost;
  }, [playerName, isHost]);

  const clearCountdown = useCallback(() => {
    countdownTimers.current.forEach(clearTimeout);
    countdownTimers.current = [];
  }, []);

  const myColor = getPlayerColor(playerId);

  const [players, setPlayers] = useState<RacePlayer[]>([
    {
      id: playerId,
      name: playerName,
      color: myColor,
      isHost,
      progress: 0,
      netWpm: 0,
      grossWpm: 0,
      accuracy: 100,
      finishedAt: null,
      rank: null,
    },
  ]);
  const [phase, setPhase] = useState<RacePhase>("lobby");
  const [countdown, setCountdown] = useState(3);
  const [raceSeed, setRaceSeed] = useState<string | null>(null);
  const [raceConfig, setRaceConfig] = useState<RaceConfig | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isRoomFull, setIsRoomFull] = useState(false);

  const upsertPlayer = useCallback((data: Partial<RacePlayer> & { id: string }) => {
    setPlayers((prev) => {
      const idx = prev.findIndex((p) => p.id === data.id);
      if (idx === -1) {
        return [
          ...prev,
          {
            name: "Player",
            color: getPlayerColor(data.id),
            isHost: false,
            progress: 0,
            netWpm: 0,
            grossWpm: 0,
            accuracy: 100,
            finishedAt: null,
            rank: null,
            ...data,
          },
        ];
      }
      const updated = [...prev];
      updated[idx] = { ...updated[idx], ...data };
      return updated;
    });
  }, []);

  const triggerCountdown = useCallback((seed: string, startsIn: number, config?: RaceConfig) => {
    clearCountdown();
    setRaceSeed(seed);
    if (config) setRaceConfig(config);
    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        progress: 0,
        netWpm: 0,
        grossWpm: 0,
        accuracy: 100,
        finishedAt: null,
        rank: null,
      })),
    );
    const msUntilStart = Math.max(100, startsIn);
    setPhase("countdown");
    setCountdown(3);
    // Timers are tracked so a reset/end during the countdown can cancel them
    countdownTimers.current = [
      setTimeout(() => { if (mountedRef.current) setCountdown(2); }, msUntilStart - 2000),
      setTimeout(() => { if (mountedRef.current) setCountdown(1); }, msUntilStart - 1000),
      setTimeout(() => {
        if (mountedRef.current) { setCountdown(0); setPhase("racing"); }
      }, msUntilStart),
    ];
  }, [clearCountdown]);

  const broadcastProgress = useCallback(
    (data: {
      progress: number;
      netWpm: number;
      grossWpm: number;
      accuracy: number;
      finishedAt: number | null;
    }) => {
      socketRef.current?.emit("progress", { roomCode, playerId, ...data });
      upsertPlayer({ id: playerId, ...data });
    },
    [roomCode, playerId, upsertPlayer],
  );

  const updateConfig = useCallback((config: RaceConfig) => {
    socketRef.current?.emit("config_update", { roomCode, config });
  }, [roomCode]);

  const startRace = useCallback((config: RaceConfig) => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let seed = "";
    for (let i = 0; i < 5; i++) seed += chars[Math.floor(Math.random() * chars.length)];
    if (socketRef.current?.connected) {
      socketRef.current.emit("start", { roomCode, seed, config });
    } else {
      triggerCountdown(seed, 3500, config);
    }
  }, [roomCode, triggerCountdown]);

  const resetRace = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("reset", { roomCode });
    } else {
      clearCountdown();
      setPhase("lobby");
      setRaceSeed(null);
      setRaceConfig(null);
      setCountdown(3);
      setPlayers((prev) =>
        prev.map((p) => ({
          ...p,
          progress: 0,
          netWpm: 0,
          grossWpm: 0,
          accuracy: 100,
          finishedAt: null,
          rank: null,
        })),
      );
    }
  }, [roomCode, clearCountdown]);

  const endRace = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("end", { roomCode });
    } else {
      setPhase("finished");
    }
  }, [roomCode]);

  useEffect(() => {
    if (!enabled) return;
    mountedRef.current = true;

    const socket = io({ transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      if (!mountedRef.current) return;
      setIsConnected(true);
      socket.emit("join", {
        roomCode,
        playerId,
        name: playerNameRef.current,
        color: myColor,
        isHost: isHostRef.current,
      });
    });

    socket.on("disconnect", () => {
      if (mountedRef.current) setIsConnected(false);
    });

    socket.on("room_state", ({ players: serverPlayers, phase: serverPhase, seed, config }: {
      players: RacePlayer[];
      phase: RacePhase;
      seed: string | null;
      config: RaceConfig | null;
    }) => {
      if (!mountedRef.current) return;
      setPlayers(serverPlayers);
      if (config) setRaceConfig(config);
      if (serverPhase === "racing" && seed) {
        setRaceSeed(seed);
        setPhase("racing");
      } else if (serverPhase === "finished") {
        if (seed) setRaceSeed(seed);
        setPhase("finished");
      }
    });

    socket.on("player_joined", (player: RacePlayer) => {
      if (!mountedRef.current) return;
      upsertPlayer(player);
    });

    socket.on("player_left", ({ playerId: leftId }: { playerId: string }) => {
      if (!mountedRef.current) return;
      setPlayers((prev) => prev.filter((p) => p.id !== leftId));
    });

    socket.on("start", ({ seed, startsIn, config }: { seed: string; startsIn: number; config: RaceConfig }) => {
      if (!mountedRef.current) return;
      triggerCountdown(seed, startsIn, config);
    });

    socket.on("progress", ({ playerId: pid, ...data }: { playerId: string } & Partial<RacePlayer>) => {
      if (!mountedRef.current) return;
      // Our own echo only carries the server-stamped finish time (used for ranking)
      if (pid === playerId) {
        if (data.finishedAt) upsertPlayer({ id: pid, finishedAt: data.finishedAt });
        return;
      }
      upsertPlayer({ id: pid, ...data });
    });

    socket.on("host_changed", ({ playerId: hostId }: { playerId: string }) => {
      if (!mountedRef.current) return;
      setPlayers((prev) => prev.map((p) => ({ ...p, isHost: p.id === hostId })));
    });

    socket.on("reset", () => {
      if (!mountedRef.current) return;
      clearCountdown();
      setPhase("lobby");
      setRaceSeed(null);
      setRaceConfig(null);
      setCountdown(3);
      setPlayers((prev) =>
        prev.map((p) => ({
          ...p,
          progress: 0,
          netWpm: 0,
          grossWpm: 0,
          accuracy: 100,
          finishedAt: null,
          rank: null,
        })),
      );
    });

    socket.on("end", () => {
      if (!mountedRef.current) return;
      clearCountdown();
      setPhase("finished");
    });

    socket.on("config_update", ({ config }: { config: RaceConfig }) => {
      if (!mountedRef.current) return;
      setRaceConfig(config);
    });

    socket.on("room_full", () => {
      if (!mountedRef.current) return;
      setIsRoomFull(true);
    });

    return () => {
      mountedRef.current = false;
      clearCountdown();
      socket.disconnect();
      socketRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, playerId, enabled]);

  // Host is decided by the server (and migrates if the host leaves)
  const amHost = players.find((p) => p.id === playerId)?.isHost ?? false;

  return {
    players,
    isHost: amHost,
    phase,
    setPhase,
    countdown,
    raceSeed,
    raceConfig,
    isConnected,
    isRoomFull,
    myColor,
    broadcastProgress,
    updateConfig,
    startRace,
    resetRace,
    endRace,
  };
}
