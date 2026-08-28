# VANTA working MVP

The current MVP is a real pilot-to-network vertical slice. The pilot desktop app is Electron-based, the simulator bridge is a .NET SimConnect executable, the realtime service holds active aircraft/ATC/flight-plan state, and the public Radar reads the same state.

## Local development

1. Run `pnpm install`.
2. Run `pnpm dev:realtime` (or the root `pnpm dev` after configuring the API separately).
3. Build the bridge on Windows: `dotnet publish native/Vanta.SimConnect/Vanta.SimConnect.csproj -c Release`.
4. Set `VANTA_CALLSIGN` and `VANTA_AIRCRAFT_TYPE` if desired.
5. Run `pnpm --filter @vanta/desktop dev`.
6. Start MSFS 2020 or 2024 and load an aircraft.
7. The bridge connects to SimConnect and publishes telemetry every 500 ms.
8. File a flight plan from VANTA Pilot. It is immediately visible in realtime state and the Radar/ATC clients.

Development authentication is deliberately enabled only for non-production environments. Production must use the existing JWT authentication path.
