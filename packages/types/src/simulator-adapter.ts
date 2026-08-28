import type { AircraftState, SimulatorKind } from "./aircraft.js";

/**
 * The contract every simulator integration must implement.
 *
 * Design goal: apps/client never talks to SimConnect (or any future
 * simulator SDK) directly. It only depends on this interface, so a
 * new simulator can be added by writing a new adapter without
 * touching client, protocol, or server code.
 *
 *     Simulator -> SimulatorAdapter -> Vanta Client -> Vanta Protocol
 */
export interface SimulatorAdapter {
  readonly kind: SimulatorKind;

  /**
   * Attempt to detect and connect to a running instance of this
   * simulator. Resolves `true` if connected, `false` if the
   * simulator does not appear to be running (this is a normal,
   * expected outcome, not an error).
   */
  connect(): Promise<boolean>;

  disconnect(): Promise<void>;

  isConnected(): boolean;

  /**
   * Read the current aircraft state. Implementations should return
   * `null` for individual fields (not throw) when a particular SimVar
   * is unavailable for the loaded aircraft, so a single missing
   * variable never breaks the whole read.
   */
  readState(): Promise<Omit<AircraftState, "callsign" | "simulator" | "timestamp">>;

  /** Subscribe to state updates pushed by the adapter's internal poll loop. */
  onStateUpdate(
    listener: (state: Omit<AircraftState, "callsign" | "simulator" | "timestamp">) => void
  ): () => void; // returns an unsubscribe function

  /** Subscribe to unexpected disconnects (e.g. sim closed, crashed). */
  onDisconnect(listener: () => void): () => void;
}

/**
 * Result of the client's startup simulator probe.
 */
export interface SimulatorDetectionResult {
  kind: SimulatorKind;
  available: boolean;
}
