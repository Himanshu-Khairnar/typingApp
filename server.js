// @ts-check
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const argPort = process.argv.indexOf("-p") !== -1 ? process.argv[process.argv.indexOf("-p") + 1] : null;
const port = parseInt(process.env.PORT || argPort || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// In-memory room store
// roomCode -> { players: Map<playerId, PlayerData>, phase, seed }
/** @type {Map<string, { players: Map<string, any>, phase: string, seed: string | null, config: any, hostId: string | null }>} */
const rooms = new Map();

const COUNTDOWN_MS = 3500;

function resetPlayerStats(p) {
  p.progress = 0;
  p.netWpm = 0;
  p.grossWpm = 0;
  p.accuracy = 100;
  p.finishedAt = null;
  p.rank = null;
}

/** Only the current host may control the race. */
function isRoomHost(room, playerId) {
  return !!room && !!playerId && room.hostId === playerId;
}

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  io.on("connection", (socket) => {
    /** @type {string | null} */
    let currentRoom = null;
    /** @type {string | null} */
    let currentPlayerId = null;

    socket.on("join", ({ roomCode, playerId, name, color, isHost }) => {
      currentRoom = String(roomCode).toUpperCase();
      currentPlayerId = playerId;

      if (!rooms.has(currentRoom)) {
        rooms.set(currentRoom, { players: new Map(), phase: "lobby", seed: null, config: null, hostId: null });
      }

      const room = rooms.get(currentRoom);

      // Enforce max 5 players
      if (room.players.size >= 5 && !room.players.has(playerId)) {
        socket.emit("room_full");
        return;
      }

      socket.join(currentRoom);

      // Host is owned by the server: the URL claim (?host=1) wins only while
      // there is no live host, and an empty room's first joiner becomes host
      // so a room can never be left without someone able to start it.
      void isHost; // client claim is only a hint; see comment above
      if (!room.hostId || !room.players.has(room.hostId)) {
        room.hostId = playerId;
      }
      room.players.forEach((p) => { p.isHost = p.id === room.hostId; });

      // Reconnects keep their race state (progress / finishedAt) instead of
      // being wiped back to defaults.
      const prev = room.players.get(playerId);
      const entry = prev ?? { id: playerId };
      if (!prev) resetPlayerStats(entry);
      Object.assign(entry, { id: playerId, name, color, isHost: room.hostId === playerId, socketId: socket.id });
      room.players.set(playerId, entry);

      // Send full room state to the joining player
      socket.emit("room_state", {
        players: Array.from(room.players.values()),
        phase: room.phase,
        seed: room.seed,
        config: room.config,
      });

      // Notify others
      socket.to(currentRoom).emit("player_joined", room.players.get(playerId));
    });

    socket.on("start", ({ roomCode, seed, config }) => {
      const code = String(roomCode).toUpperCase();
      const room = rooms.get(code);
      if (!room || !isRoomHost(room, currentPlayerId)) return;
      room.phase = "racing";
      room.seed = seed;
      room.config = config || null;
      room.players.forEach(resetPlayerStats);
      // Send a relative delay — absolute timestamps break with client clock skew
      io.to(code).emit("start", { seed, startsIn: COUNTDOWN_MS, config: room.config });
    });

    socket.on("progress", ({ roomCode, playerId: pid, progress, netWpm, grossWpm, accuracy, finishedAt }) => {
      const code = String(roomCode).toUpperCase();
      const room = rooms.get(code);
      if (!room || pid !== currentPlayerId || !room.players.has(pid)) return;
      const player = room.players.get(pid);
      // Finish order is stamped with the server clock so ranks are fair
      const serverFinishedAt = finishedAt ? (player.finishedAt ?? Date.now()) : null;
      Object.assign(player, { progress, netWpm, grossWpm, accuracy, finishedAt: serverFinishedAt });
      io.to(code).emit("progress", { playerId: pid, progress, netWpm, grossWpm, accuracy, finishedAt: serverFinishedAt });
    });

    socket.on("config_update", ({ roomCode, config }) => {
      const code = String(roomCode).toUpperCase();
      const room = rooms.get(code);
      if (!room || !isRoomHost(room, currentPlayerId)) return;
      room.config = config;
      socket.to(code).emit("config_update", { config });
    });

    socket.on("reset", ({ roomCode }) => {
      const code = String(roomCode).toUpperCase();
      const room = rooms.get(code);
      if (!room || !isRoomHost(room, currentPlayerId)) return;
      room.phase = "lobby";
      room.seed = null;
      room.config = null;
      room.players.forEach(resetPlayerStats);
      io.to(code).emit("reset");
    });

    socket.on("end", ({ roomCode }) => {
      const code = String(roomCode).toUpperCase();
      const room = rooms.get(code);
      if (!room || !isRoomHost(room, currentPlayerId) || room.phase !== "racing") return;
      room.phase = "finished";
      io.to(code).emit("end");
    });

    socket.on("disconnect", () => {
      if (!currentRoom || !currentPlayerId) return;
      const room = rooms.get(currentRoom);
      if (!room) return;
      // A reconnect may already have re-joined on a newer socket — don't
      // remove the player because their *old* socket closed late.
      if (room.players.get(currentPlayerId)?.socketId !== socket.id) return;
      room.players.delete(currentPlayerId);
      if (room.players.size === 0) {
        rooms.delete(currentRoom);
      } else {
        io.to(currentRoom).emit("player_left", { playerId: currentPlayerId });
        // Hand host to the next player so the room isn't stuck
        if (room.hostId === currentPlayerId) {
          const next = room.players.values().next().value;
          room.hostId = next.id;
          room.players.forEach((p) => { p.isHost = p.id === room.hostId; });
          io.to(currentRoom).emit("host_changed", { playerId: room.hostId });
        }
        // Everyone left has finished → end the race
        const remaining = Array.from(room.players.values());
        if (room.phase === "racing" && remaining.every((p) => p.finishedAt)) {
          room.phase = "finished";
          io.to(currentRoom).emit("end");
        }
        // If race is in progress and only 1 player remains, end it
        if (room.phase === "racing" && room.players.size === 1) {
          room.phase = "finished";
          io.to(currentRoom).emit("end");
        }
      }
    });
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
