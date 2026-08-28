import { vantaMessageSchema, type VantaMessage } from "./messages.js";

export class ProtocolParseError extends Error {
  constructor(
    message: string,
    public readonly raw: unknown
  ) {
    super(message);
    this.name = "ProtocolParseError";
  }
}

/**
 * Serialize a validated message to a JSON string ready to send over
 * a WebSocket. Deliberately narrow: callers must already have a
 * well-typed VantaMessage, so this can never silently ship an
 * invalid payload.
 */
export function encodeMessage(message: VantaMessage): string {
  return JSON.stringify(message);
}

/**
 * Parse and validate a raw inbound WebSocket frame. Never trust
 * client-provided data blindly: this is the single choke point
 * every inbound message must pass through before touching any
 * business logic.
 *
 * Throws ProtocolParseError (never returns an unvalidated shape) on
 * malformed JSON or a payload that fails schema validation.
 */
export function decodeMessage(raw: string): VantaMessage {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ProtocolParseError("Payload is not valid JSON", raw);
  }

  const result = vantaMessageSchema.safeParse(parsed);
  if (!result.success) {
    throw new ProtocolParseError(
      `Payload failed schema validation: ${result.error.message}`,
      parsed
    );
  }

  return result.data;
}
