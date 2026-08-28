# VANTA Pilot + ATC Network

VANTA is split into two first-class desktop clients sharing one network protocol.

## Pilot client

The VANTA Pilot client is a Windows application for MSFS 2020 and MSFS 2024. It connects to the simulator through SimConnect and publishes authenticated live aircraft telemetry to the VANTA realtime service.

Pilot telemetry includes position, altitude, heading, ground speed, indicated airspeed where available, vertical speed, aircraft identity, callsign, transponder state/code, COM1/COM2 active and standby frequencies, simulator version, and flight-plan state.

The pilot client must not inject arbitrary code into the simulator process. The installer owns simulator detection/configuration and installs the supported VANTA connector automatically.

## ATC client

The VANTA ATC client is a separate Windows desktop application. Controllers authenticate, claim an authorized position, select the published frequency, receive the live aircraft stream, inspect aircraft/flight-plan information, transmit and receive radio audio, and manage ATIS.

Example positions include DEL, GND, TWR, APP, DEP and CTR. Position authorization is server-side.

## Radio model

Radio is frequency-based rather than a global chat room. The pilot client's actual COM frequency is the source of truth. The network voice service routes a transmission to eligible receivers based on active frequency, radio, position, and configured radio/range rules.

A COM1 change in MSFS must be reflected in the pilot session automatically. A pilot transmitting on a frequency is not globally audible to users on unrelated frequencies.

## Flight plans

Pilots can create or import a flight plan, including SimBrief import where credentials/API requirements permit. A submitted active flight is associated with the authenticated pilot session and becomes available to realtime radar and authorized ATC clients.

The flight-plan model supports callsign, aircraft, departure, arrival, alternate, route, cruise altitude, flight rules, remarks, and active/completed state.

## Realtime contract

Live aircraft state belongs in the realtime service, not PostgreSQL. PostgreSQL stores durable users, flight plans, ATC permissions and completed flight history. The realtime service owns active sessions, heartbeats, subscriptions and current aircraft state.

## Public tracking

The VANTA Radar web application consumes the same realtime state as the desktop clients. It must never manufacture aircraft positions independently of the network.

## Installer goal

The pilot installer is intended to be a single Windows setup executable. It detects installed MSFS 2020/2024 instances, installs/configures the supported VANTA simulator connector, creates the VANTA desktop application shortcuts, and can later update the connector and application safely.

## Security

Clients authenticate before publishing or consuming protected network state. Telemetry is validated server-side. ATC position claims and radio permissions are server-side decisions. Voice media is never sent through REST endpoints.
