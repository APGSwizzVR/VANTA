import type { WebSocket } from "ws";
import type { UserRole } from "@vanta/types";
import { TokenBucket } from "../lib/rate-limiter.js";
import { env } from "../lib/env.js";

export type ConnectionRole = "PILOT" | "ATC" | "OBSERVER";

/**
 * Server-side state for a single WebSocket connection. Wraps the raw
 * `ws` socket with everything the message handlers need: identity
 * (once authenticated), the role the connection claims, and the rate
 * limiter guarding PILOT_UPDATE ingestion.
 */
export class ClientConnection {
  authenticated = false;
  userId: string | null = null;
  vantaId: string | null = null;
  roles: UserRole[] = [];
  connectionRole: ConnectionRole | null = null;

  /** Callsign this connection is currently flying/controlling as, once known. */
  callsign: string | null = null;
  /** ATC position callsigns (e.g. "EIDW_TWR") this connection currently holds. */
  atcPositions = new Set<string>();
  voiceFrequencyMhz: number | null = null;
  voiceFrequencies: number[] = [];
  voiceCallsign: string | null = null;

  lastPongAt = Date.now();
  lastKnownLat: number | null = null;
  lastKnownLon: number | null = null;
  lastUpdateAt: number | null = null;

  readonly updateRateLimiter = new TokenBucket(
    Math.max(2, env.REALTIME_MAX_UPDATE_HZ * 2), // small burst allowance
    env.REALTIME_MAX_UPDATE_HZ
  );

  constructor(public readonly socket: WebSocket) {}

  send(payload: string): void {
    if (this.socket.readyState === this.socket.OPEN) {
      this.socket.send(payload);
    }
  }
}
