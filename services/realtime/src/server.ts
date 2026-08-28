import { createServer } from "node:http";
import { env } from "./lib/env.js";
import { logger } from "./lib/logger.js";
import { createRealtimeServer } from "./ws/server.js";
import { handleSnapshotRequest } from "./routes/snapshot.js";
import { connections } from "./ws/broadcast.js";

const httpServer = createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", connections: connections.size }));
    return;
  }
  if (req.method === "GET" && req.url === "/snapshot") {
    handleSnapshotRequest(req, res);
    return;
  }
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

createRealtimeServer(httpServer);

function shutdown(signal: string): void {
  logger.info({ signal }, "Shutting down realtime server");
  httpServer.close(() => process.exit(0));
  // Force-exit if close() hangs (e.g. sockets not draining).
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

httpServer.listen(env.REALTIME_PORT, env.REALTIME_HOST, () => {
  logger.info(`VANTA realtime server listening on ws://${env.REALTIME_HOST}:${env.REALTIME_PORT}/realtime`);
});
