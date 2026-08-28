import { describe, expect, it } from "vitest";
import { decodeMessage, encodeMessage, ProtocolParseError } from "./codec.js";
import { PROTOCOL_VERSION } from "./constants.js";
import type { PilotUpdateMessage } from "./messages.js";

describe("VANTA/1 codec", () => {
  it("round-trips a valid PILOT_UPDATE message", () => {
    const message: PilotUpdateMessage = {
      protocol: PROTOCOL_VERSION,
      ts: Date.now(),
      type: "PILOT_UPDATE",
      callsign: "SHAMROCK5583",
      latitude: 53.421,
      longitude: -6.27,
      altitudeFeet: 35000,
      headingDegrees: 275,
      groundSpeedKts: 450,
      verticalSpeedFpm: 0,
      onGround: false,
      aircraftType: "B738",
      com1: { active: 118.6, standby: 121.5 },
      com2: null,
      squawk: "4521",
      transponderMode: "ALT",
    };

    const encoded = encodeMessage(message);
    const decoded = decodeMessage(encoded);
    expect(decoded).toEqual(message);
  });

  it("rejects malformed JSON", () => {
    expect(() => decodeMessage("{not json")).toThrow(ProtocolParseError);
  });

  it("rejects an out-of-range latitude", () => {
    const badPayload = JSON.stringify({
      protocol: PROTOCOL_VERSION,
      ts: Date.now(),
      type: "PILOT_UPDATE",
      callsign: "TEST123",
      latitude: 999, // invalid
      longitude: 0,
      altitudeFeet: 1000,
      headingDegrees: 0,
      groundSpeedKts: 0,
      verticalSpeedFpm: 0,
      onGround: true,
      aircraftType: null,
      com1: null,
      com2: null,
      squawk: null,
      transponderMode: null,
    });

    expect(() => decodeMessage(badPayload)).toThrow(ProtocolParseError);
  });

  it("rejects a callsign with disallowed characters", () => {
    const badPayload = JSON.stringify({
      protocol: PROTOCOL_VERSION,
      ts: Date.now(),
      type: "PILOT_DISCONNECT",
      callsign: "not-valid!",
    });

    expect(() => decodeMessage(badPayload)).toThrow(ProtocolParseError);
  });

  it("rejects an unknown message type", () => {
    const badPayload = JSON.stringify({
      protocol: PROTOCOL_VERSION,
      ts: Date.now(),
      type: "TOTALLY_MADE_UP",
    });

    expect(() => decodeMessage(badPayload)).toThrow(ProtocolParseError);
  });
});
