import type { IncomingMessage, ServerResponse } from "node:http";
import { networkState } from "../state/network-state.js";

/**
 * Plain HTTP endpoint (not WebSocket) that returns the current live
 * network snapshot as JSON. Used by:
 *  - the web radar on first page load, before its WebSocket connects
 *    (avoids an empty map while the socket handshakes)
 *  - lightweight integrations that just want a poll-based read rather
 *    than a persistent connection
 *
 * This deliberately exposes only already-public live state (positions
 * currently being broadcast to every connected client anyway) -- no
 * auth required, same trust level as the WebSocket broadcast.
 */
export function handleSnapshotRequest(_req: IncomingMessage, res: ServerResponse): void {
  const body = JSON.stringify({
    aircraft: networkState.listAircraft(),
    atcFrequencies: networkState.listAtcFrequencies(),
    timestamp: Date.now(),
  });
  res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(body);
}
