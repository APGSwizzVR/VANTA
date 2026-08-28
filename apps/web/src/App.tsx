import { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import type { AircraftState } from "@vanta/types";

const REALTIME_URL = (import.meta.env.VITE_REALTIME_URL as string | undefined) ?? "http://localhost:4001";
const REFRESH_MS = 2000;

type Snapshot = { aircraft: AircraftState[]; atcFrequencies: Array<{ positionCallsign: string; frequencyMhz: number }>; timestamp: number };

function aircraftIcon(heading: number) {
  return L.divIcon({
    className: "aircraft-icon-wrapper",
    html: `<div class="aircraft-icon" style="transform:rotate(${heading}deg)"><span>✈</span></div>`,
    iconSize: [28, 28], iconAnchor: [14, 14],
  });
}

function Recenter({ aircraft }: { aircraft: AircraftState[] }) {
  const map = useMap();
  const [centered, setCentered] = useState(false);
  useEffect(() => {
    if (!centered && aircraft.length) {
      map.fitBounds(L.latLngBounds(aircraft.map((a) => [a.latitude, a.longitude])), { padding: [80, 80], maxZoom: 7 });
      setCentered(true);
    }
  }, [aircraft, centered, map]);
  return null;
}

function App() {
  const [snapshot, setSnapshot] = useState<Snapshot>({ aircraft: [], atcFrequencies: [], timestamp: 0 });
  const [selected, setSelected] = useState<AircraftState | null>(null);
  const [search, setSearch] = useState("");
  const [online, setOnline] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`${REALTIME_URL}/snapshot`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as Snapshot;
      setSnapshot(data);
      setOnline(true);
    } catch {
      setOnline(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const aircraft = useMemo(() => {
    const q = search.trim().toUpperCase();
    if (!q) return snapshot.aircraft;
    return snapshot.aircraft.filter((a) => `${a.callsign} ${a.aircraftType ?? ""}`.toUpperCase().includes(q));
  }, [search, snapshot.aircraft]);

  const selectedFresh = selected ? snapshot.aircraft.find((a) => a.callsign === selected.callsign) ?? selected : null;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-mark">V</div><div><strong>VANTA</strong><span>NETWORK RADAR</span></div></div>
        <div className="top-stats"><div><b>{snapshot.aircraft.length}</b><span>AIRCRAFT</span></div><div><b>{snapshot.atcFrequencies.length}</b><span>ATC</span></div><div className={online ? "status live" : "status"}><i />{online ? "NETWORK ONLINE" : "NETWORK OFFLINE"}</div></div>
      </header>
      <div className="toolbar"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search callsign or aircraft" /><button onClick={() => void load()}>Refresh</button></div>
      <main className="radar-layout">
        <MapContainer center={[20, 0]} zoom={3} minZoom={2} worldCopyJump className="map">
          <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Recenter aircraft={snapshot.aircraft} />
          {aircraft.map((a) => (
            <Marker key={a.callsign} position={[a.latitude, a.longitude]} icon={aircraftIcon(a.headingDegrees)} eventHandlers={{ click: () => setSelected(a) }}>
              <Popup><strong>{a.callsign}</strong><br />{a.aircraftType ?? "Unknown aircraft"}<br />{Math.round(a.altitudeFeet).toLocaleString()} ft · {a.groundSpeedKts ? Math.round(a.groundSpeedKts) : "—"} kt</Popup>
            </Marker>
          ))}
        </MapContainer>
        <aside className="sidebar">
          <section className="panel"><div className="panel-title">LIVE TRAFFIC <span>{aircraft.length}</span></div><div className="traffic-list">
            {aircraft.length === 0 && <div className="empty">No VANTA aircraft are currently connected.</div>}
            {aircraft.map((a) => <button className={`traffic-row ${selected?.callsign === a.callsign ? "selected" : ""}`} key={a.callsign} onClick={() => setSelected(a)}><div><strong>{a.callsign}</strong><small>{a.aircraftType ?? "UNKNOWN"}</small></div><div className="row-right"><b>{Math.round(a.altitudeFeet / 100)}</b><small>FL</small></div></button>)}
          </div></section>
          <section className="panel"><div className="panel-title">ATC FREQUENCIES <span>{snapshot.atcFrequencies.length}</span></div>{snapshot.atcFrequencies.length === 0 ? <div className="empty">No active ATC positions.</div> : snapshot.atcFrequencies.map((x) => <div className="atc-row" key={x.positionCallsign}><strong>{x.positionCallsign}</strong><span>{x.frequencyMhz.toFixed(3)}</span></div>)}</section>
          {selectedFresh && <section className="panel details"><div className="panel-title">AIRCRAFT</div><h2>{selectedFresh.callsign}</h2><p>{selectedFresh.aircraftType ?? "Unknown aircraft"}</p><div className="detail-grid"><span>ALTITUDE<b>{Math.round(selectedFresh.altitudeFeet).toLocaleString()} FT</b></span><span>SPEED<b>{selectedFresh.groundSpeedKts ? `${Math.round(selectedFresh.groundSpeedKts)} KT` : "—"}</b></span><span>HEADING<b>{Math.round(selectedFresh.headingDegrees).toString().padStart(3, "0")}°</b></span><span>SQUAWK<b>{selectedFresh.transponderCode ?? "—"}</b></span><span>COM1<b>{selectedFresh.com1?.active.toFixed(3) ?? "—"}</b></span><span>COM2<b>{selectedFresh.com2?.active.toFixed(3) ?? "—"}</b></span></div></section>}
        </aside>
      </main>
      <footer>VANTA · Free flight simulation network · Last update {snapshot.timestamp ? new Date(snapshot.timestamp).toLocaleTimeString() : "—"}</footer>
    </div>
  );
}

export default App;
