import type { ClientConnection } from "./connection.js";
import { connections } from "./broadcast.js";
import { networkState } from "../state/network-state.js";

const MAGIC = Buffer.from("VRA1");
const MAX_FRAME_BYTES = 32 * 1024;

function sameFrequency(a: number | null, b: number): boolean {
  return a !== null && Math.abs(a - b) < 0.0005;
}

function atcFrequencies(connection: ClientConnection): number[] {
  const positions = new Set(connection.atcPositions);
  return networkState.listAtcFrequencies().filter((x) => positions.has(x.positionCallsign)).map((x) => x.frequencyMhz);
}

export function handleVoiceFrame(sender: ClientConnection, frame: Buffer): void {
  if (!sender.authenticated || sender.voiceFrequencyMhz === null) return;
  if (frame.length < MAGIC.length + 2 || frame.length > MAX_FRAME_BYTES) return;
  if (!frame.subarray(0, MAGIC.length).equals(MAGIC)) return;
  for (const target of connections) {
    if (target === sender || !target.authenticated || target.socket.readyState !== 1) continue;
    const frequencies = target.connectionRole === "ATC" ? atcFrequencies(target) : target.voiceFrequencies;
    if (frequencies.some((frequency) => sameFrequency(sender.voiceFrequencyMhz, frequency))) target.socket.send(frame, { binary: true });
  }
}
