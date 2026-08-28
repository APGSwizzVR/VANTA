# VANTA release checklist

Before publishing a VANTA release:

- Build API, realtime, web and shared packages with pnpm.
- Generate Prisma client and run migrations.
- Import current airport/runway/frequency data.
- Build the Windows SimConnect bridge for x64.
- Package the desktop client and bridge into the installer.
- Test MSFS 2020 connection.
- Test MSFS 2024 connection.
- Verify COM1/COM2 changes reach realtime state.
- Verify PTT/radio routing on the voice service.
- Verify live aircraft appear on VANTA Radar.
- Verify stale aircraft disappear after disconnect.
- Verify airport frequency search works worldwide.
- Verify flight-plan import and persistence.
- Verify weather data handling and graceful fallback.
- Run CI and publish only after the build is green.
