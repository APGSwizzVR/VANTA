import type { ClientConnection } from "./connection.js";

/**
 * The set of all currently connected sockets. Kept separate from
 * NetworkState (which models aircraft/ATC *domain* state) because
 * this is transport-level bookkeeping -- a connection can exist
 * before it is authenticated and before it has a callsign.
 */
export const connections = new Set<ClientConnection>();

/**
 * Send a message to every authenticated connection except (optionally)
 * the sender. Naive O(n) fan-out -- fine for a single-process realtime
 * node at the scale this project targets initially; see the module-level
 * note in state/network-state.ts about the Redis migration path for
 * scaling beyond one process.
 */
export function broadcast(payload: string, exclude?: ClientConnection): void {
  for (const connection of connections) {
    if (connection === exclude) continue;
    if (!connection.authenticated) continue;
    connection.send(payload);
  }
}
