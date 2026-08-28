import type { AircraftState, FlightPlan } from "@vanta/types";

export class NetworkState {
  private readonly aircraft = new Map<string, AircraftState>();
  private readonly atcFrequencies = new Map<string, number>();
  private readonly flightPlans = new Map<string, FlightPlan>();

  upsertAircraft(state: AircraftState): void { this.aircraft.set(state.callsign, state); }
  removeAircraft(callsign: string): void { this.aircraft.delete(callsign); }
  getAircraft(callsign: string): AircraftState | undefined { return this.aircraft.get(callsign); }
  listAircraft(): AircraftState[] { return Array.from(this.aircraft.values()); }
  setAtcFrequency(positionCallsign: string, frequencyMhz: number): void { this.atcFrequencies.set(positionCallsign, frequencyMhz); }
  removeAtcFrequency(positionCallsign: string): void { this.atcFrequencies.delete(positionCallsign); }
  listAtcFrequencies(): Array<{ positionCallsign: string; frequencyMhz: number }> { return Array.from(this.atcFrequencies.entries()).map(([positionCallsign, frequencyMhz]) => ({ positionCallsign, frequencyMhz })); }
  upsertFlightPlan(plan: FlightPlan): void { this.flightPlans.set(plan.callsign, plan); }
  removeFlightPlan(callsign: string): void { this.flightPlans.delete(callsign); }
  listFlightPlans(): FlightPlan[] { return Array.from(this.flightPlans.values()); }
}
export const networkState = new NetworkState();
