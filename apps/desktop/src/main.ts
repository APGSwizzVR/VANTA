import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import WebSocket from "ws";

const api = process.env.VANTA_REALTIME_URL ?? "ws://localhost:4001/realtime";
const bridge = process.env.VANTA_SIMCONNECT_BRIDGE ?? resolve(process.cwd(), "native", "Vanta.SimConnect.exe");

console.log("VANTA Desktop Client");
console.log(`Realtime: ${api}`);

if (existsSync(bridge)) {
  const child = spawn(bridge, [], { stdio: "inherit", windowsHide: true });
  child.on("exit", code => console.log(`SimConnect bridge exited with code ${code ?? 0}`));
} else {
  console.log("SimConnect bridge not installed in this development checkout.");
}

const socket = new WebSocket(api);
socket.on("open", () => {
  console.log("Connected to VANTA realtime service.");
  socket.send(JSON.stringify({ type: "CLIENT_HELLO", client: "vanta-desktop", version: "0.1.0" }));
});
socket.on("message", data => console.log(data.toString()));
socket.on("error", error => console.error("Realtime error:", error));
socket.on("close", () => console.log("Realtime connection closed."));
