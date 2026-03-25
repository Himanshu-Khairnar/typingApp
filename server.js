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
/** @type {Map<string, { players: Map<string, any>, phase: string, seed: string | null }>} */
const rooms = new Map();

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
        rooms.set(currentRoom, { players: new Map(), phase: "lobby", seed: null, config: null });
      }

      const room = rooms.get(currentRoom);

      // Enforce max 5 players
      if (room.players.size >= 5 && !room.players.has(playerId)) {
        socket.emit("room_full");
        return;
      }

      socket.join(currentRoom);

      room.players.set(playerId, {
        id: playerId,
        name,
        color,
        isHost,
        progress: 0,
        netWpm: 0,
        grossWpm: 0,
        accuracy: 100,
        finishedAt: null,
        rank: null,
      });

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

    socket.on("start", ({ roomCode, seed, startsAt, config }) => {
      const code = String(roomCode).toUpperCase();
      const room = rooms.get(code);
      if (!room) return;
      room.phase = "racing";
      room.seed = seed;
      room.config = config || null;
      room.players.forEach((p) => {
        p.progress = 0;
        p.netWpm = 0;
        p.grossWpm = 0;
        p.accuracy = 100;
        p.finishedAt = null;
        p.rank = null;
      });
      io.to(code).emit("start", { seed, startsAt, config: room.config });
    });

    socket.on("progress", ({ roomCode, playerId: pid, progress, netWpm, grossWpm, accuracy, finishedAt }) => {
      const code = String(roomCode).toUpperCase();
      const room = rooms.get(code);
      if (room?.players.has(pid)) {
        Object.assign(room.players.get(pid), { progress, netWpm, grossWpm, accuracy, finishedAt });
      }
      socket.to(code).emit("progress", { playerId: pid, progress, netWpm, grossWpm, accuracy, finishedAt });
    });

    socket.on("config_update", ({ roomCode, config }) => {
      const code = String(roomCode).toUpperCase();
      const room = rooms.get(code);
      if (!room) return;
      room.config = config;
      socket.to(code).emit("config_update", { config });
    });

    socket.on("reset", ({ roomCode }) => {
      const code = String(roomCode).toUpperCase();
      const room = rooms.get(code);
      if (!room) return;
      room.phase = "lobby";
      room.seed = null;
      room.config = null;
      room.players.forEach((p) => {
        p.progress = 0;
        p.netWpm = 0;
        p.grossWpm = 0;
        p.accuracy = 100;
        p.finishedAt = null;
        p.rank = null;
      });
      io.to(code).emit("reset");
    });

    socket.on("end", ({ roomCode }) => {
      const code = String(roomCode).toUpperCase();
      const room = rooms.get(code);
      if (room) room.phase = "finished";
      io.to(code).emit("end");
    });

    socket.on("disconnect", () => {
      if (!currentRoom || !currentPlayerId) return;
      const room = rooms.get(currentRoom);
      if (!room) return;
      room.players.delete(currentPlayerId);
      if (room.players.size === 0) {
        rooms.delete(currentRoom);
      } else {
        io.to(currentRoom).emit("player_left", { playerId: currentPlayerId });
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
