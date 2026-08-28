import { z } from "zod";
import { PROTOCOL_VERSION } from "./constants.js";
import {
  altitudeFeetSchema,
  atcPositionTypeSchema,
  callsignSchema,
  comRadioStateSchema,
  frequencyMhzSchema,
  groundSpeedSchema,
  headingSchema,
  icaoSchema,
  latitudeSchema,
  longitudeSchema,
  squawkSchema,
  transponderModeSchema,
  verticalSpeedSchema,
} from "./validators.js";

/**
 * Every VANTA/1 message shares this envelope. `type` is a discriminant
 * used by consumers to narrow to the right payload schema below.
 */
const baseEnvelope = z.object({
  protocol: z.literal(PROTOCOL_VERSION),
  /** Unix epoch milliseconds, set by the sender. */
  ts: z.number().int().positive(),
});

// ---------------------------------------------------------------------------
// CONNECT / AUTH
// ---------------------------------------------------------------------------

export const connectMessageSchema = baseEnvelope.extend({
  type: z.literal("CONNECT"),
  clientName: z.string().min(1).max(64), // e.g. "vanta-client-windows/0.1.0"
});

export const authMessageSchema = baseEnvelope.extend({
  type: z.literal("AUTH"),
  /** JWT issued by services/api after login. Verified server-side, never trusted as-is. */
  token: z.string().min(10),
  /** Whether this connection intends to act as a pilot or a controller. */
  role: z.enum(["PILOT", "ATC", "OBSERVER"]),
});

export const authOkMessageSchema = baseEnvelope.extend({
  type: z.literal("AUTH_OK"),
  userId: z.string().uuid(),
  vantaId: z.string(),
});

export const authFailMessageSchema = baseEnvelope.extend({
  type: z.literal("AUTH_FAIL"),
  reason: z.string(),
});

// ---------------------------------------------------------------------------
// PILOT
// ---------------------------------------------------------------------------

export const pilotUpdateMessageSchema = baseEnvelope.extend({
  type: z.literal("PILOT_UPDATE"),
  callsign: callsignSchema,
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  altitudeFeet: altitudeFeetSchema,
  headingDegrees: headingSchema,
  groundSpeedKts: groundSpeedSchema,
  verticalSpeedFpm: verticalSpeedSchema,
  onGround: z.boolean(),
  aircraftType: z.string().max(32).nullable(),
  com1: comRadioStateSchema.nullable(),
  com2: comRadioStateSchema.nullable(),
  squawk: squawkSchema.nullable(),
  transponderMode: transponderModeSchema.nullable(),
});

export const pilotDisconnectMessageSchema = baseEnvelope.extend({
  type: z.literal("PILOT_DISCONNECT"),
  callsign: callsignSchema,
});

// ---------------------------------------------------------------------------
// FLIGHT PLAN
// ---------------------------------------------------------------------------

export const flightPlanMessageSchema = baseEnvelope.extend({
  type: z.literal("FLIGHT_PLAN"),
  callsign: callsignSchema,
  aircraftType: z.string().min(1).max(32),
  departureIcao: icaoSchema,
  destinationIcao: icaoSchema,
  alternateIcao: icaoSchema.nullable(),
  route: z.string().max(2000),
  cruiseAltitudeFeet: altitudeFeetSchema,
  flightRules: z.enum(["VFR", "IFR"]),
  departureTimeUtc: z.string().datetime().nullable(),
  remarks: z.string().max(500).nullable(),
});

// ---------------------------------------------------------------------------
// ATC
// ---------------------------------------------------------------------------

export const atcConnectMessageSchema = baseEnvelope.extend({
  type: z.literal("ATC_CONNECT"),
  icao: icaoSchema,
  positionType: atcPositionTypeSchema,
  frequencyMhz: frequencyMhzSchema,
});

export const atcDisconnectMessageSchema = baseEnvelope.extend({
  type: z.literal("ATC_DISCONNECT"),
  icao: icaoSchema,
  positionType: atcPositionTypeSchema,
});

export const frequencyUpdateMessageSchema = baseEnvelope.extend({
  type: z.literal("FREQUENCY_UPDATE"),
  callsign: callsignSchema,
  com1ActiveMhz: frequencyMhzSchema.nullable(),
  com2ActiveMhz: frequencyMhzSchema.nullable(),
});

// ---------------------------------------------------------------------------
// VOICE SIGNALING (metadata only — audio itself goes over the voice service)
// ---------------------------------------------------------------------------

export const pttStartMessageSchema = baseEnvelope.extend({
  type: z.literal("PTT_START"),
  callsign: callsignSchema,
  radio: z.enum(["COM1", "COM2"]),
  frequencyMhz: frequencyMhzSchema,
});

export const pttStopMessageSchema = baseEnvelope.extend({
  type: z.literal("PTT_STOP"),
  callsign: callsignSchema,
  radio: z.enum(["COM1", "COM2"]),
});

export const voiceMetadataMessageSchema = baseEnvelope.extend({
  type: z.literal("VOICE_METADATA"),
  callsign: callsignSchema,
  frequencyMhz: frequencyMhzSchema,
  /** Correlates this metadata with a WebRTC/voice-service session. */
  voiceSessionId: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// LIVENESS
// ---------------------------------------------------------------------------

export const pingMessageSchema = baseEnvelope.extend({ type: z.literal("PING") });
export const pongMessageSchema = baseEnvelope.extend({ type: z.literal("PONG") });

export const errorMessageSchema = baseEnvelope.extend({
  type: z.literal("ERROR"),
  code: z.string(),
  message: z.string(),
});

// ---------------------------------------------------------------------------
// Discriminated union of every inbound/outbound message
// ---------------------------------------------------------------------------

export const vantaMessageSchema = z.discriminatedUnion("type", [
  connectMessageSchema,
  authMessageSchema,
  authOkMessageSchema,
  authFailMessageSchema,
  pilotUpdateMessageSchema,
  pilotDisconnectMessageSchema,
  flightPlanMessageSchema,
  atcConnectMessageSchema,
  atcDisconnectMessageSchema,
  frequencyUpdateMessageSchema,
  pttStartMessageSchema,
  pttStopMessageSchema,
  voiceMetadataMessageSchema,
  pingMessageSchema,
  pongMessageSchema,
  errorMessageSchema,
]);

export type VantaMessage = z.infer<typeof vantaMessageSchema>;
export type ConnectMessage = z.infer<typeof connectMessageSchema>;
export type AuthMessage = z.infer<typeof authMessageSchema>;
export type PilotUpdateMessage = z.infer<typeof pilotUpdateMessageSchema>;
export type PilotDisconnectMessage = z.infer<typeof pilotDisconnectMessageSchema>;
export type FlightPlanMessage = z.infer<typeof flightPlanMessageSchema>;
export type AtcConnectMessage = z.infer<typeof atcConnectMessageSchema>;
export type AtcDisconnectMessage = z.infer<typeof atcDisconnectMessageSchema>;
export type FrequencyUpdateMessage = z.infer<typeof frequencyUpdateMessageSchema>;
export type PttStartMessage = z.infer<typeof pttStartMessageSchema>;
export type PttStopMessage = z.infer<typeof pttStopMessageSchema>;
export type VoiceMetadataMessage = z.infer<typeof voiceMetadataMessageSchema>;
export type PingMessage = z.infer<typeof pingMessageSchema>;
export type PongMessage = z.infer<typeof pongMessageSchema>;
export type ErrorMessage = z.infer<typeof errorMessageSchema>;
