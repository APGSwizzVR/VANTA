# Release Architecture

The release consists of:

- `VANTA Pilot Setup.exe` — Windows pilot installer/application.
- `VANTA ATC Setup.exe` — Windows controller installer/application.
- VANTA API — authentication, durable data and public API.
- VANTA Realtime — live aircraft/ATC state and WebSocket transport.
- VANTA Voice — low-latency frequency/range-based radio media.
- VANTA Radar — public live tracker.

The pilot setup process detects MSFS 2020 and/or MSFS 2024 and configures the supported SimConnect integration automatically. It must not ask the user to manually copy files into a Community folder unless a future simulator-specific connector explicitly requires it.

The ATC application never needs MSFS installed. It connects directly to VANTA and receives the network aircraft stream and radio audio.

A production release must build the desktop clients as distributable Windows applications rather than requiring a local Vite development server.
