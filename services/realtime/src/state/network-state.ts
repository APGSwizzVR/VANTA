import type { AircraftState } from "@vanta/types";

/**
 * Holds the live state of every connected aircraft, keyed by callsign.
 * This is intentionally in-memory and not backed by Postgres — live
 * position data is high-frequency and ephemeral by nature, and
 * belongs in the realtime process, not the relational database
 * (which instead stores durable records like flight plans and
 * completed session summaries via the API service).
 *
 * This single-process design is the known scaling limit called out in
 * the README: to run more than one realtime node, this store would
 * need to move to something like Redis pub/sub. That's an explicit
 * future migration, not something silently assumed to already work.
 */
export class NetworkState {
  private readonly aircraft = new Map<string, AircraftState>();
  private readonly atcFrequencies = new Map<string, number>(); // "EIDW_TWR" -> 118.6

  upsertAircraft(state: AircraftState): void {
    this.aircraft.set(state.callsign, state);
  }

  removeAircraft(callsign: string): void {
    this.aircraft.delete(callsign);
  }

  getAircraft(callsign: string): AircraftState | undefined {
    return this.aircraft.get(callsign);
  }

  listAircraft(): AircraftState[] {
    return Array.from(this.aircraft.values());
  }

  setAtcFrequency(positionCallsign: string, frequencyMhz: number): void {
    this.atcFrequencies.set(positionCallsign, frequencyMhz);
  }

  removeAtcFrequency(positionCallsign: string): void {
    this.atcFrequencies.delete(positionCallsign);
  }

  listAtcFrequencies(): Array<{ positionCallsign: string; frequencyMhz: number }> {
    return Array.from(this.atcFrequencies.entries()).map(([positionCallsign, frequencyMhz]) => ({
      positionCallsign,
      frequencyMhz,
    }));
  }
}

/** Single shared instance for the process. */
export const networkState = new NetworkState();
