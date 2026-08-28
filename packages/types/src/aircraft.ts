/**
 * Which simulator a client is currently connected to.
 * Kept as an explicit union (not a boolean) so we can add
 * further simulators later without breaking the wire format.
 */
export type SimulatorKind = "MSFS2020" | "MSFS2024" | "UNKNOWN";

/**
 * Transponder mode as commonly exposed by MSFS SimVars.
 */
export type TransponderMode = "OFF" | "STANDBY" | "ON" | "ALT" | "GROUND" | "IDENT";

/**
 * Radio identifiers. Vanta currently models COM1 and COM2.
 * NAV radios are out of scope for the first release but the
 * union is kept open (`string`) at the protocol layer so this
 * can be extended without a breaking change.
 */
export type ComRadioId = "COM1" | "COM2";

/**
 * A single COM radio's state as read from the simulator.
 * Frequencies are stored in MHz with 3 decimal places
 * (e.g. 118.600), matching how pilots read them out loud.
 */
export interface ComRadioState {
  active: number;
  standby: number;
}

/**
 * Live simulator telemetry for one connected aircraft, as produced
 * by a SimulatorAdapter and consumed by the Vanta Client before
 * being sent to the realtime network.
 *
 * Not every field is guaranteed to be populated for every aircraft —
 * third-party payware aircraft in particular may not expose every
 * SimVar Vanta looks for. Adapters set a field to `null` (rather
 * than omitting it) when a value could not be read, so consumers can
 * distinguish "not yet received" from "known to be unavailable".
 */
export interface AircraftState {
  callsign: string;
  simulator: SimulatorKind;
  aircraftType: string | null;
  aircraftTitle: string | null;

  latitude: number;
  longitude: number;
  altitudeFeet: number;
  headingDegrees: number;
  indicatedAirspeedKts: number | null;
  groundSpeedKts: number | null;
  verticalSpeedFpm: number | null;
  onGround: boolean;

  com1: ComRadioState | null;
  com2: ComRadioState | null;

  transponderCode: string | null;
  transponderMode: TransponderMode | null;

  /** Unix epoch milliseconds when this snapshot was read from the sim. */
  timestamp: number;
}

/** Flight rules for a filed flight plan. */
export type FlightRules = "VFR" | "IFR";

export interface FlightPlan {
  id: string;
  callsign: string;
  aircraftType: string;
  departureIcao: string;
  destinationIcao: string;
  alternateIcao: string | null;
  route: string;
  cruiseAltitudeFeet: number;
  flightRules: FlightRules;
  departureTimeUtc: string | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Standard ATC position categories, in the usual delegation order. */
export type AtcPositionType = "DEL" | "GND" | "TWR" | "APP" | "DEP" | "CTR" | "FSS";

export interface AtcPosition {
  id: string;
  icao: string;
  positionType: AtcPositionType;
  callsign: string; // e.g. "EIDW_TWR"
  frequency: number; // MHz
  online: boolean;
  controllerUserId: string | null;
}
