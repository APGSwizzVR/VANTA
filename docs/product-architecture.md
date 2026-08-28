# VANTA product architecture

VANTA is split into a Windows desktop client, an out-of-process SimConnect bridge, API services, realtime aircraft state and the public radar web application.

## Desktop

The desktop client detects the simulator, launches the bridge, manages the user session and provides the local UI for radar, flight plans, airport/frequency lookup, weather and radio settings.

## Simulator bridge

`native/Vanta.SimConnect` reads live MSFS SimVars through SimConnect. The bridge is deliberately out-of-process so a VANTA crash cannot directly terminate the simulator process.

## Realtime

Active aircraft are kept in memory. Telemetry is not written to PostgreSQL on every update. Clients receive a realtime snapshot and WebSocket updates.

## Airport data

`packages/airport-data` provides the worldwide airport-data ingestion entry point. OurAirports is the initial open data source for airports, runways and airport frequencies.

## Radio

The protocol reserves explicit radio/PTT messages. Voice transport belongs on a low-latency media channel; the REST API is never used as a voice transport.

## Public radar

`apps/web` is the public VANTA Radar and consumes the same realtime state as network clients. This means a connected pilot automatically becomes visible to the tracker.

## Production scaling

The initial realtime implementation is single-process. For multiple realtime nodes, move the shared aircraft/ATC state to Redis or another pub/sub state layer before horizontal scaling.
