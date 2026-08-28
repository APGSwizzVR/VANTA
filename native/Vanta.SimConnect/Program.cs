using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using SimConnect.NET;

var realtime = Environment.GetEnvironmentVariable("VANTA_REALTIME_WS") ?? "ws://localhost:4001/realtime";
var client = new SimConnectClient();

try
{
    await client.ConnectAsync();
    Console.WriteLine("VANTA: connected to MSFS through SimConnect.");

    using var socket = new ClientWebSocket();
    await socket.ConnectAsync(new Uri(realtime), CancellationToken.None);

    while (socket.State == WebSocketState.Open)
    {
        var payload = new
        {
            type = "AIRCRAFT_UPDATE",
            simulator = "MSFS",
            timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            latitude = await client.SimVars.GetAsync<double>("PLANE LATITUDE", "degrees"),
            longitude = await client.SimVars.GetAsync<double>("PLANE LONGITUDE", "degrees"),
            altitudeFeet = await client.SimVars.GetAsync<double>("PLANE ALTITUDE", "feet"),
            headingDegrees = await client.SimVars.GetAsync<double>("PLANE HEADING DEGREES TRUE", "degrees"),
            indicatedAirspeedKts = await client.SimVars.GetAsync<double>("AIRSPEED INDICATED", "knots"),
            groundSpeedKts = await client.SimVars.GetAsync<double>("GPS GROUND SPEED", "knots"),
            verticalSpeedFpm = await client.SimVars.GetAsync<double>("VERTICAL SPEED", "feet per minute")
        };

        var json = JsonSerializer.Serialize(payload);
        await socket.SendAsync(Encoding.UTF8.GetBytes(json), WebSocketMessageType.Text, true, CancellationToken.None);
        await Task.Delay(250);
    }
}
catch (Exception ex)
{
    Console.Error.WriteLine($"VANTA SimConnect error: {ex.Message}");
    Environment.ExitCode = 1;
}
finally
{
    client.Dispose();
}
