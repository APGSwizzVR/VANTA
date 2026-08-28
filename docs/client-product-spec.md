# VANTA Client Product Specification

## VANTA Pilot

Desktop tabs:

- Home
- Radar
- Flight Plan
- Airports
- Radio
- Weather
- Flights
- History
- Settings

Home shows simulator connection, aircraft, callsign, active flight, COM1/COM2, network latency and ATC state.

Flight Plan supports manual creation and import. Active flight state is published to the network.

Airports supports worldwide ICAO/IATA/name/city/country search and displays available frequencies, runways and airport information from the VANTA airport data pipeline.

Radar shows live VANTA aircraft with callsign, type, altitude, speed, heading, vertical speed, route and departure/arrival where available.

## VANTA ATC

Desktop tabs:

- Home
- Radar
- Aircraft
- Flight Plans
- Frequencies
- Radio
- ATIS
- Positions
- Settings

The controller radar displays live aircraft telemetry and allows an authorized controller to select an aircraft and inspect its flight plan and current network state.

The controller radio is tied to the claimed position/frequency. Incoming pilot audio is delivered by the VANTA voice service when routing rules permit it.

## Shared network

Both clients use the shared VANTA protocol/types packages. Neither client should maintain a separate aircraft database. The realtime service is authoritative for active sessions.
