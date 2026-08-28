import { z } from "zod";
import { PROTOCOL_VERSION } from "./constants.js";
import { altitudeFeetSchema, atcPositionTypeSchema, callsignSchema, comRadioStateSchema, frequencyMhzSchema, groundSpeedSchema, headingSchema, icaoSchema, latitudeSchema, longitudeSchema, squawkSchema, transponderModeSchema, verticalSpeedSchema } from "./validators.js";

const baseEnvelope = z.object({ protocol: z.literal(PROTOCOL_VERSION), ts: z.number().int().positive() });
export const connectMessageSchema = baseEnvelope.extend({ type: z.literal("CONNECT"), clientName: z.string().min(1).max(64) });
export const authMessageSchema = baseEnvelope.extend({ type: z.literal("AUTH"), token: z.string().min(10), role: z.enum(["PILOT","ATC","OBSERVER"]) });
export const devAuthMessageSchema = baseEnvelope.extend({ type: z.literal("DEV_AUTH"), role: z.enum(["PILOT","ATC","OBSERVER"]), clientName: z.string().min(1).max(64) });
export const authOkMessageSchema = baseEnvelope.extend({ type: z.literal("AUTH_OK"), userId: z.string().uuid(), vantaId: z.string() });
export const authFailMessageSchema = baseEnvelope.extend({ type: z.literal("AUTH_FAIL"), reason: z.string() });
export const pilotUpdateMessageSchema = baseEnvelope.extend({ type: z.literal("PILOT_UPDATE"), callsign: callsignSchema, simulator: z.enum(["MSFS2020","MSFS2024","UNKNOWN"]).default("UNKNOWN"), latitude: latitudeSchema, longitude: longitudeSchema, altitudeFeet: altitudeFeetSchema, headingDegrees: headingSchema, groundSpeedKts: groundSpeedSchema, verticalSpeedFpm: verticalSpeedSchema, onGround: z.boolean(), aircraftType: z.string().max(32).nullable(), com1: comRadioStateSchema.nullable(), com2: comRadioStateSchema.nullable(), squawk: squawkSchema.nullable(), transponderMode: transponderModeSchema.nullable() });
export const pilotDisconnectMessageSchema = baseEnvelope.extend({ type: z.literal("PILOT_DISCONNECT"), callsign: callsignSchema });
export const flightPlanMessageSchema = baseEnvelope.extend({ type: z.literal("FLIGHT_PLAN"), callsign: callsignSchema, aircraftType: z.string().min(1).max(32), departureIcao: icaoSchema, destinationIcao: icaoSchema, alternateIcao: icaoSchema.nullable(), route: z.string().max(2000), cruiseAltitudeFeet: altitudeFeetSchema, flightRules: z.enum(["VFR","IFR"]), departureTimeUtc: z.string().datetime().nullable(), remarks: z.string().max(500).nullable() });
export const atcConnectMessageSchema = baseEnvelope.extend({ type: z.literal("ATC_CONNECT"), icao: icaoSchema, positionType: atcPositionTypeSchema, frequencyMhz: frequencyMhzSchema });
export const atcDisconnectMessageSchema = baseEnvelope.extend({ type: z.literal("ATC_DISCONNECT"), icao: icaoSchema, positionType: atcPositionTypeSchema });
export const frequencyUpdateMessageSchema = baseEnvelope.extend({ type: z.literal("FREQUENCY_UPDATE"), callsign: callsignSchema, com1ActiveMhz: frequencyMhzSchema.nullable(), com2ActiveMhz: frequencyMhzSchema.nullable() });
export const pttStartMessageSchema = baseEnvelope.extend({ type: z.literal("PTT_START"), callsign: callsignSchema, radio: z.enum(["COM1","COM2"]), frequencyMhz: frequencyMhzSchema });
export const pttStopMessageSchema = baseEnvelope.extend({ type: z.literal("PTT_STOP"), callsign: callsignSchema, radio: z.enum(["COM1","COM2"]) });
export const voiceMetadataMessageSchema = baseEnvelope.extend({ type: z.literal("VOICE_METADATA"), callsign: callsignSchema, frequencyMhz: frequencyMhzSchema, voiceSessionId: z.string().uuid() });
export const pingMessageSchema = baseEnvelope.extend({ type: z.literal("PING") });
export const pongMessageSchema = baseEnvelope.extend({ type: z.literal("PONG") });
export const errorMessageSchema = baseEnvelope.extend({ type: z.literal("ERROR"), code: z.string(), message: z.string() });

export const vantaMessageSchema = z.discriminatedUnion("type", [connectMessageSchema, authMessageSchema, devAuthMessageSchema, authOkMessageSchema, authFailMessageSchema, pilotUpdateMessageSchema, pilotDisconnectMessageSchema, flightPlanMessageSchema, atcConnectMessageSchema, atcDisconnectMessageSchema, frequencyUpdateMessageSchema, pttStartMessageSchema, pttStopMessageSchema, voiceMetadataMessageSchema, pingMessageSchema, pongMessageSchema, errorMessageSchema]);
export type VantaMessage = z.infer<typeof vantaMessageSchema>;
