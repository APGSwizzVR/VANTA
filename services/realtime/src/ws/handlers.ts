import { decodeMessage, encodeMessage, ProtocolParseError, PROTOCOL_VERSION, type VantaMessage } from "@vanta/protocol";
import type { AircraftState, FlightPlan } from "@vanta/types";
import { logger } from "../lib/logger.js";
import { verifyToken } from "../lib/jwt.js";
import { env } from "../lib/env.js";
import { networkState } from "../state/network-state.js";
import { distanceNm } from "../lib/geo.js";
import type { ClientConnection } from "./connection.js";
import { broadcast } from "./broadcast.js";
function envelope() { return { protocol: PROTOCOL_VERSION, ts: Date.now() } as const; }
function sendError(c: ClientConnection, code: string, message: string): void { c.send(encodeMessage({ ...envelope(), type: "ERROR", code, message } as VantaMessage)); }
export function handleInboundMessage(connection: ClientConnection, raw: string): void {
  let message: VantaMessage;
  try { message = decodeMessage(raw); } catch (error) { if (error instanceof ProtocolParseError) { sendError(connection, "BAD_MESSAGE", error.message); return; } throw error; }
  switch (message.type) {
    case "CONNECT": break;
    case "AUTH": handleAuth(connection, message); break;
    case "DEV_AUTH": handleDevAuth(connection, message); break;
    case "PILOT_UPDATE": handlePilotUpdate(connection, message); break;
    case "PILOT_DISCONNECT": if (!requireAuth(connection)) return; networkState.removeAircraft(message.callsign); broadcast(encodeMessage(message), connection); break;
    case "FLIGHT_PLAN": if (!requireAuth(connection)) return; { const plan: FlightPlan = { id: `live-${message.callsign}`, callsign: message.callsign, aircraftType: message.aircraftType, departureIcao: message.departureIcao, destinationIcao: message.destinationIcao, alternateIcao: message.alternateIcao, route: message.route, cruiseAltitudeFeet: message.cruiseAltitudeFeet, flightRules: message.flightRules, departureTimeUtc: message.departureTimeUtc, remarks: message.remarks, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; networkState.upsertFlightPlan(plan); broadcast(encodeMessage(message), connection); break; }
    case "ATC_CONNECT": if (!requireAuth(connection)) return; if (!connection.roles.includes("ATC") && !connection.roles.includes("ADMIN")) { sendError(connection, "FORBIDDEN", "ATC role required"); return; } { const pc = `${message.icao}_${message.positionType}`; connection.atcPositions.add(pc); networkState.setAtcFrequency(pc, message.frequencyMhz); broadcast(encodeMessage(message), connection); break; }
    case "ATC_DISCONNECT": if (!requireAuth(connection)) return; { const pc = `${message.icao}_${message.positionType}`; connection.atcPositions.delete(pc); networkState.removeAtcFrequency(pc); broadcast(encodeMessage(message), connection); break; }
    case "FREQUENCY_UPDATE": if (!requireAuth(connection)) return; connection.voiceFrequencies = [message.com1ActiveMhz, message.com2ActiveMhz].filter((x): x is number => x !== null); connection.voiceFrequencyMhz = connection.voiceFrequencies[0] ?? null; broadcast(encodeMessage(message), connection); break;
    case "PTT_START": if (!requireAuth(connection)) return; connection.voiceFrequencyMhz = message.frequencyMhz; connection.voiceFrequencies = [message.frequencyMhz]; connection.voiceCallsign = message.callsign; broadcast(encodeMessage(message), connection); break;
    case "PTT_STOP": if (!requireAuth(connection)) return; connection.voiceFrequencyMhz = null; connection.voiceCallsign = null; broadcast(encodeMessage(message), connection); break;
    case "VOICE_METADATA": if (!requireAuth(connection)) return; broadcast(encodeMessage(message), connection); break;
    case "PING": connection.lastPongAt = Date.now(); connection.send(encodeMessage({ ...envelope(), type: "PONG" } as VantaMessage)); break;
    case "PONG": connection.lastPongAt = Date.now(); break;
    default: sendError(connection, "UNSUPPORTED_TYPE", `Unsupported message type: ${(message as {type:string}).type}`);
  }
}
function requireAuth(c: ClientConnection): boolean { if (!c.authenticated) { sendError(c, "UNAUTHENTICATED", "Authentication required"); return false; } return true; }
function establish(c: ClientConnection, userId: string, vantaId: string, roles: any[]): void { c.authenticated=true; c.userId=userId; c.vantaId=vantaId; c.roles=roles; c.send(encodeMessage({ ...envelope(), type:"AUTH_OK", userId, vantaId } as VantaMessage)); }
function handleDevAuth(c: ClientConnection, message: Extract<VantaMessage,{type:"DEV_AUTH"}>): void { if (!env.REALTIME_ALLOW_DEV_AUTH || env.NODE_ENV === "production") { sendError(c,"DEV_AUTH_DISABLED","Development authentication is disabled"); return; } const role = message.role; establish(c, role === "ATC" ? "00000000-0000-0000-0000-000000000002" : "00000000-0000-0000-0000-000000000001", role === "ATC" ? "DEV-ATC" : "DEV-PILOT", role === "ATC" ? ["ATC"] : ["PILOT"]); logger.info({ role }, "Development client authenticated"); }
function handleAuth(c: ClientConnection, message: Extract<VantaMessage,{type:"AUTH"}>): void { try { const payload=verifyToken(message.token); establish(c,payload.sub,payload.vantaId,payload.roles); } catch { c.send(encodeMessage({ ...envelope(), type:"AUTH_FAIL", reason:"Invalid or expired token" } as VantaMessage)); c.socket.close(4001,"Authentication failed"); } }
function handlePilotUpdate(c: ClientConnection, message: Extract<VantaMessage,{type:"PILOT_UPDATE"}>): void {
  if (!requireAuth(c)) return; if (!c.updateRateLimiter.tryConsume()) return;
  if (c.lastKnownLat !== null && c.lastKnownLon !== null && c.lastUpdateAt !== null) { const h=(Date.now()-c.lastUpdateAt)/3600000; if (h>0 && distanceNm(c.lastKnownLat,c.lastKnownLon,message.latitude,message.longitude)/h>1200) { sendError(c,"IMPLAUSIBLE_TELEMETRY","Position update rejected"); return; } }
  c.callsign=message.callsign; c.lastKnownLat=message.latitude; c.lastKnownLon=message.longitude; c.lastUpdateAt=Date.now();
  const state: AircraftState = { callsign:message.callsign, simulator:message.simulator, aircraftType:message.aircraftType, aircraftTitle:null, latitude:message.latitude, longitude:message.longitude, altitudeFeet:message.altitudeFeet, headingDegrees:message.headingDegrees, indicatedAirspeedKts:null, groundSpeedKts:message.groundSpeedKts, verticalSpeedFpm:message.verticalSpeedFpm, onGround:message.onGround, com1:message.com1, com2:message.com2, transponderCode:message.squawk, transponderMode:message.transponderMode, timestamp:Date.now() };
  networkState.upsertAircraft(state); broadcast(encodeMessage(message), c);
}
