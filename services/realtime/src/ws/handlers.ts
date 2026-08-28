import {
  decodeMessage,
  encodeMessage,
  ProtocolParseError,
  PROTOCOL_VERSION,
  type VantaMessage,
} from "@vanta/protocol";
import type { AircraftState } from "@vanta/types";
import { logger } from "../lib/logger.js";
import { verifyToken } from "../lib/jwt.js";
import { networkState } from "../state/network-state.js";
import { distanceNm } from "../lib/geo.js";
import type { ClientConnection } from "./connection.js";
import { broadcast } from "./broadcast.js";

function envelope() {
  return { protocol: PROTOCOL_VERSION, ts: Date.now() } as const;
}

function sendError(connection: ClientConnection, code: string, message: string): void {
  connection.send(
    encodeMessage({ ...envelope(), type: "ERROR", code, message } as VantaMessage)
  );
}

/**
 * Handles one raw inbound WebSocket frame for a connection. This is
 * the single choke point every client message passes through: it
 * decodes (schema-validates) the frame, then dispatches on message
 * type. Nothing downstream ever sees an unvalidated payload.
 */
export function handleInboundMessage(connection: ClientConnection, raw: string): void {
  let message: VantaMessage;
  try {
    message = decodeMessage(raw);
  } catch (error) {
    if (error instanceof ProtocolParseError) {
      sendError(connection, "BAD_MESSAGE", error.message);
      return;
    }
    throw error;
  }

  switch (message.type) {
    case "CONNECT": {
      // Purely informational (client name/version) -- no state change.
      // AUTH is what actually establishes identity.
      break;
    }

    case "AUTH": {
      handleAuth(connection, message);
      break;
    }

    case "PILOT_UPDATE": {
      handlePilotUpdate(connection, message);
      break;
    }

    case "PILOT_DISCONNECT": {
      if (!requireAuth(connection)) return;
      networkState.removeAircraft(message.callsign);
      broadcast(encodeMessage(message), connection);
      break;
    }

    case "FLIGHT_PLAN": {
      if (!requireAuth(connection)) return;
      // Live-display broadcast only. Durable persistence happens via
      // services/api's POST /flight-plans, called directly by the
      // client -- the realtime server intentionally has no DB access.
      broadcast(encodeMessage(message), connection);
      break;
    }

    case "ATC_CONNECT": {
      if (!requireAuth(connection)) return;
      if (!connection.roles.includes("ATC") && !connection.roles.includes("ADMIN")) {
        sendError(connection, "FORBIDDEN", "This account is not authorized to control ATC positions");
        return;
      }
      const positionCallsign = `${message.icao}_${message.positionType}`;
      connection.atcPositions.add(positionCallsign);
      networkState.setAtcFrequency(positionCallsign, message.frequencyMhz);
      broadcast(encodeMessage(message), connection);
      break;
    }

    case "ATC_DISCONNECT": {
      if (!requireAuth(connection)) return;
      const positionCallsign = `${message.icao}_${message.positionType}`;
      connection.atcPositions.delete(positionCallsign);
      networkState.removeAtcFrequency(positionCallsign);
      broadcast(encodeMessage(message), connection);
      break;
    }

    case "FREQUENCY_UPDATE": {
      if (!requireAuth(connection)) return;
      broadcast(encodeMessage(message), connection);
      break;
    }

    case "PTT_START":
    case "PTT_STOP":
    case "VOICE_METADATA": {
      if (!requireAuth(connection)) return;
      // Signaling only -- see services/voice for the actual audio path.
      broadcast(encodeMessage(message), connection);
      break;
    }

    case "PING": {
      connection.lastPongAt = Date.now();
      connection.send(encodeMessage({ ...envelope(), type: "PONG" } as VantaMessage));
      break;
    }

    case "PONG": {
      connection.lastPongAt = Date.now();
      break;
    }

    default: {
      sendError(
        connection,
        "UNSUPPORTED_TYPE",
        `Server does not handle message type: ${(message as { type: string }).type}`
      );
    }
  }
}

function requireAuth(connection: ClientConnection): boolean {
  if (!connection.authenticated) {
    sendError(connection, "UNAUTHENTICATED", "AUTH must succeed before sending this message type");
    return false;
  }
  return true;
}

function handleAuth(
  connection: ClientConnection,
  message: Extract<VantaMessage, { type: "AUTH" }>
): void {
  try {
    const payload = verifyToken(message.token);
    connection.authenticated = true;
    connection.userId = payload.sub;
    connection.vantaId = payload.vantaId;
    connection.roles = payload.roles;
    connection.connectionRole = message.role;

    connection.send(
      encodeMessage({
        ...envelope(),
        type: "AUTH_OK",
        userId: payload.sub,
        vantaId: payload.vantaId,
      } as VantaMessage)
    );
    logger.info({ userId: payload.sub, role: message.role }, "Connection authenticated");
  } catch (error) {
    logger.warn({ error }, "AUTH failed: invalid token");
    connection.send(
      encodeMessage({ ...envelope(), type: "AUTH_FAIL", reason: "Invalid or expired token" } as VantaMessage)
    );
    connection.socket.close(4001, "Authentication failed");
  }
}

function handlePilotUpdate(
  connection: ClientConnection,
  message: Extract<VantaMessage, { type: "PILOT_UPDATE" }>
): void {
  if (!requireAuth(connection)) return;

  if (!connection.updateRateLimiter.tryConsume()) {
    // Silently drop rather than error -- a client briefly exceeding the
    // configured update rate (e.g. due to a frame-rate spike) is normal
    // and shouldn't be treated as abuse on the first offense.
    return;
  }

  // Basic anti-teleport plausibility check: if we have a previous
  // position for this connection, reject an update that implies a
  // physically impossible ground speed. Field-level bounds (lat/lon
  // range, max ground speed, etc.) are already enforced by the
  // protocol schema in decodeMessage -- this catches the case where
  // each individual field is in-range but the *transition* isn't.
  if (
    connection.lastKnownLat !== null &&
    connection.lastKnownLon !== null &&
    connection.lastUpdateAt !== null
  ) {
    const elapsedHours = (Date.now() - connection.lastUpdateAt) / 3_600_000;
    if (elapsedHours > 0) {
      const jumpNm = distanceNm(
        connection.lastKnownLat,
        connection.lastKnownLon,
        message.latitude,
        message.longitude
      );
      const impliedGroundSpeedKts = jumpNm / elapsedHours;
      // Generous ceiling (well above any MSFS-simulated aircraft) so we
      // only catch genuinely impossible jumps, not fast airliners.
      if (impliedGroundSpeedKts > 1200) {
        logger.warn(
          { userId: connection.userId, callsign: message.callsign, impliedGroundSpeedKts },
          "Rejected PILOT_UPDATE: implausible position jump"
        );
        sendError(connection, "IMPLAUSIBLE_TELEMETRY", "Position update rejected: implausible jump");
        return;
      }
    }
  }

  connection.callsign = message.callsign;
  connection.lastKnownLat = message.latitude;
  connection.lastKnownLon = message.longitude;
  connection.lastUpdateAt = Date.now();

  const state: AircraftState = {
    callsign: message.callsign,
    simulator: "UNKNOWN", // set by the client's CONNECT message in a future revision
    aircraftType: message.aircraftType,
    aircraftTitle: null,
    latitude: message.latitude,
    longitude: message.longitude,
    altitudeFeet: message.altitudeFeet,
    headingDegrees: message.headingDegrees,
    indicatedAirspeedKts: null,
    groundSpeedKts: message.groundSpeedKts,
    verticalSpeedFpm: message.verticalSpeedFpm,
    onGround: message.onGround,
    com1: message.com1,
    com2: message.com2,
    transponderCode: message.squawk,
    transponderMode: message.transponderMode,
    timestamp: Date.now(),
  };

  networkState.upsertAircraft(state);
  broadcast(encodeMessage(message), connection);
}
