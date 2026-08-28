import type { IncomingMessage, ServerResponse } from "node:http";
import { networkState } from "../state/network-state.js";
export function handleSnapshotRequest(_req: IncomingMessage, res: ServerResponse): void {
  const body = JSON.stringify({ aircraft: networkState.listAircraft(), atcFrequencies: networkState.listAtcFrequencies(), flightPlans: networkState.listFlightPlans(), timestamp: Date.now() });
  res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" });
  res.end(body);
}
