import { WebSocketServer, type WebSocket } from "ws";
import type { Server as HttpServer } from "node:http";
import { encodeMessage, PROTOCOL_VERSION, type VantaMessage } from "@vanta/protocol";
import { env } from "../lib/env.js";
import { logger } from "../lib/logger.js";
import { networkState } from "../state/network-state.js";
import { ClientConnection } from "./connection.js";
import { connections, broadcast } from "./broadcast.js";
import { handleInboundMessage } from "./handlers.js";
import { handleVoiceFrame } from "./voice.js";

const AUTH_TIMEOUT_MS = 10_000;
const HEARTBEAT_INTERVAL_MS = 15_000;

export function createRealtimeServer(httpServer: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ server: httpServer, path: "/realtime" });

  wss.on("connection", (socket: WebSocket) => {
    const connection = new ClientConnection(socket);
    connections.add(connection);
    logger.info({ totalConnections: connections.size }, "WebSocket connection opened");

    const authTimeout = setTimeout(() => {
      if (!connection.authenticated) {
        logger.info("Closing connection: AUTH not received within timeout");
        socket.close(4000, "Authentication timeout");
      }
    }, AUTH_TIMEOUT_MS);

    socket.on("message", (data, isBinary) => {
      try {
        if (isBinary) handleVoiceFrame(connection, Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer));
        else handleInboundMessage(connection, data.toString());
      } catch (error) {
        logger.error({ error }, "Unhandled error processing inbound message");
      }
    });

    socket.on("pong", () => {
      connection.lastPongAt = Date.now();
    });

    socket.on("close", () => {
      clearTimeout(authTimeout);
      connections.delete(connection);

      if (connection.callsign) {
        networkState.removeAircraft(connection.callsign);
        broadcast(
          encodeMessage({
            protocol: PROTOCOL_VERSION,
            ts: Date.now(),
            type: "PILOT_DISCONNECT",
            callsign: connection.callsign,
          } as VantaMessage)
        );
      }

      for (const positionCallsign of connection.atcPositions) {
        networkState.removeAtcFrequency(positionCallsign);
      }

      logger.info(
        { userId: connection.userId, totalConnections: connections.size },
        "WebSocket connection closed"
      );
    });

    socket.on("error", (error) => {
      logger.warn({ error, userId: connection.userId }, "WebSocket connection error");
    });
  });

  // Heartbeat sweep: ping every open socket, and forcibly close anything
  // that hasn't answered a ping/pong within the configured timeout.
  const heartbeatInterval = setInterval(() => {
    const staleThreshold = Date.now() - env.REALTIME_HEARTBEAT_TIMEOUT_SECONDS * 1000;
    for (const connection of connections) {
      if (connection.lastPongAt < staleThreshold) {
        logger.info({ userId: connection.userId }, "Terminating stale connection (heartbeat timeout)");
        connection.socket.terminate();
        continue;
      }
      if (connection.socket.readyState === connection.socket.OPEN) {
        connection.socket.ping();
      }
    }
  }, HEARTBEAT_INTERVAL_MS);

  wss.on("close", () => clearInterval(heartbeatInterval));

  return wss;
}
