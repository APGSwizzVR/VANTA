# VANTA Windows simulator bridge

The VANTA desktop client launches `Vanta.SimConnect.exe` when present. The bridge uses the modern `SimConnect.NET` wrapper and reads live MSFS simulator variables, then sends telemetry to the VANTA realtime WebSocket.

Supported target: Windows x64, .NET 8, Microsoft Flight Simulator 2020/2024 through SimConnect.

Build:

```powershell
dotnet publish native/Vanta.SimConnect/Vanta.SimConnect.csproj -c Release
```

The bridge is intentionally out-of-process; it does not inject arbitrary code into the simulator process.
