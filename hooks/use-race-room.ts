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
}

export function useRaceRoom({
  roomCode,
  playerId,
  playerName,
  isHost,
}: UseRaceRoomOptions) {
  const socketRef = useRef<Socket | null>(null);
  const mountedRef = useRef(true);

  const playerNameRef = useRef(playerName);
  playerNameRef.current = playerName;
  const isHostRef = useRef(isHost);
  isHostRef.current = isHost;

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

  const triggerCountdown = useCallback((seed: string, startsAt: number, config?: RaceConfig) => {
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
    const msUntilStart = Math.max(100, startsAt - Date.now());
    setPhase("countdown");
    setCountdown(3);
    setTimeout(() => { if (mountedRef.current) setCountdown(2); }, msUntilStart - 2000);
    setTimeout(() => { if (mountedRef.current) setCountdown(1); }, msUntilStart - 1000);
    setTimeout(() => {
      if (mountedRef.current) { setCountdown(0); setPhase("racing"); }
    }, msUntilStart);
  }, []);

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
    const startsAt = Date.now() + 3500;

    if (socketRef.current?.connected) {
      socketRef.current.emit("start", { roomCode, seed, startsAt, config });
    } else {
      triggerCountdown(seed, startsAt, config);
    }
  }, [roomCode, triggerCountdown]);

  const resetRace = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("reset", { roomCode });
    } else {
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
  }, [roomCode]);

  const endRace = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("end", { roomCode });
    } else {
      setPhase("finished");
    }
  }, [roomCode]);

  useEffect(() => {
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

    socket.on("start", ({ seed, startsAt, config }: { seed: string; startsAt: number; config: RaceConfig }) => {
      if (!mountedRef.current) return;
      triggerCountdown(seed, startsAt, config);
    });

    socket.on("progress", ({ playerId: pid, ...data }: { playerId: string } & Partial<RacePlayer>) => {
      if (!mountedRef.current || pid === playerId) return;
      upsertPlayer({ id: pid, ...data });
    });

    socket.on("reset", () => {
      if (!mountedRef.current) return;
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
      socket.disconnect();
      socketRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, playerId]);

  return {
    players,
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
