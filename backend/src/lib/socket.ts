import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";

let io: Server | null = null;

// Sockets are broadcast-only: scoring mutations go through the REST API
// (already auth-checked there), and after each successful mutation the
// service pushes the fresh state to everyone watching this match. Clients
// join a room per match so spectators, the admin panel, and the referee's
// device all see the same score update at the same time.
export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, { cors: { origin: "*" } });

  io.on("connection", (socket) => {
    socket.on("match:join", (matchId: string) => {
      socket.join(`match:${matchId}`);
    });
    socket.on("match:leave", (matchId: string) => {
      socket.leave(`match:${matchId}`);
    });
  });

  return io;
}

export function emitMatchState(matchId: string, state: unknown): void {
  io?.to(`match:${matchId}`).emit("match:state", state);
}
