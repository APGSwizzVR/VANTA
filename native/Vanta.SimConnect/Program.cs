using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using SimConnect.NET;

var realtime = Environment.GetEnvironmentVariable("VANTA_REALTIME_WS") ?? "ws://localhost:4001/realtime";
var callsign = Environment.GetEnvironmentVariable("VANTA_CALLSIGN") ?? "VANTA001";
var aircraftType = Environment.GetEnvironmentVariable("VANTA_AIRCRAFT_TYPE") ?? "UNKNOWN";
var simulator = Environment.GetEnvironmentVariable("VANTA_SIMULATOR") ?? "UNKNOWN";

Console.WriteLine("VANTA SimConnect bridge");
Console.WriteLine($"Realtime: {realtime}");
Console.WriteLine($"Callsign: {callsign}");

using var sim = new SimConnectClient();
using var socket = new ClientWebSocket();

try
{
    await sim.ConnectAsync();
    Console.WriteLine("Connected to MSFS through SimConnect.");
    await socket.ConnectAsync(new Uri(realtime), CancellationToken.None);
    await SendAsync(socket, new { protocol="VANTA/1", ts=DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(), type="DEV_AUTH", role="PILOT", clientName="vanta-simconnect" });

    while (socket.State == WebSocketState.Open)
    {
        var lat = await sim.SimVars.GetAsync<double>("PLANE LATITUDE", "degrees");
        var lon = await sim.SimVars.GetAsync<double>("PLANE LONGITUDE", "degrees");
        var alt = await sim.SimVars.GetAsync<double>("PLANE ALTITUDE", "feet");
        var hdg = await sim.SimVars.GetAsync<double>("PLANE HEADING DEGREES TRUE", "degrees");
        var gs = await sim.SimVars.GetAsync<double>("GPS GROUND SPEED", "knots");
        var vs = await sim.SimVars.GetAsync<double>("VERTICAL SPEED", "feet per minute");
        var onGround = await sim.SimVars.GetAsync<double>("SIM ON GROUND", "bool") > 0.5;
        var com1 = await sim.SimVars.GetAsync<double>("COM ACTIVE FREQUENCY:1", "MHz");
        var com2 = await sim.SimVars.GetAsync<double>("COM ACTIVE FREQUENCY:2", "MHz");
        var squawk = await sim.SimVars.GetAsync<double>("TRANSPONDER CODE:1", "number");
        await SendAsync(socket, new { protocol="VANTA/1", ts=DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(), type="PILOT_UPDATE", callsign, simulator, latitude=lat, longitude=lon, altitudeFeet=alt, headingDegrees=hdg, groundSpeedKts=gs, verticalSpeedFpm=vs, onGround, aircraftType, com1=new { active=com1, standby=com1 }, com2=new { active=com2, standby=com2 }, squawk=((int)Math.Round(squawk)).ToString("0000"), transponderMode="ON" });
        await Task.Delay(500);
    }
}
catch (Exception ex)
{
    Console.Error.WriteLine($"VANTA SimConnect error: {ex.Message}");
    Environment.ExitCode = 1;
}

static async Task SendAsync(ClientWebSocket socket, object value)
{
    var bytes=Encoding.UTF8.GetBytes(JsonSerializer.Serialize(value));
    await socket.SendAsync(bytes, WebSocketMessageType.Text, true, CancellationToken.None);
}
