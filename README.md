# VANTA

VANTA is a free, community-run flight simulation network for
**Microsoft Flight Simulator 2020** and **Microsoft Flight Simulator
2024** — pilots fly online together, air traffic controllers staff
real airports, and everyone shows up on a shared live map, using the
aircraft's actual COM radios rather than a Discord-style voice chat.

VANTA is its own independent implementation: no code or assets are
shared with VATSIM, IVAO, or any other network.

> **Status: pre-release, under active development.** The table below
> tracks exactly what works today versus what's scaffolded or not yet
> started. Nothing in this README claims a feature works unless it's
> marked "Implemented."

## Current status

| Subsystem | Status | Notes |
|---|---|---|
| Wire protocol (`packages/protocol`) | **Implemented** | VANTA/1 message set, Zod-validated, unit tested |
| Shared domain types (`packages/types`) | **Implemented** | Aircraft, airport, user, flight-plan types + `SimulatorAdapter` interface |
| REST API (`services/api`) | **Implemented** | Auth (register/login, argon2id + JWT), user profile, airports, flight plans, ATC position claim/release, all backed by Prisma/Postgres |
| Realtime WebSocket server (`services/realtime`) | **Implemented** | JWT-authenticated connections, PILOT_UPDATE broadcast with rate limiting and a basic anti-teleport check, heartbeat/timeout detection, ATC frequency tracking |
| Airport data importer (`packages/airport-data`) | Not started | Will import from OurAirports (public domain) into the `Airport`/`Runway`/`Frequency`/`Navaid` tables |
| Web radar (`apps/web`) | Not started | Planned: React + Vite + MapLibre GL, consuming the realtime WebSocket |
| Windows client (`apps/client`) | Not started | Planned: Electron + `node-simconnect`, implementing `SimulatorAdapter` for MSFS 2020 and MSFS 2024 |
| ATC client (`apps/atc`) | Not started | |
| Voice/radio service (`services/voice`) | Not started | Planned: WebRTC (Opus) with server-side frequency/range-based routing, signaling already relayed by the realtime server |
| Admin tooling | Not started | |

If a row says "Not started," the corresponding user-facing feature
(e.g. "connect MSFS," "hear ATC on frequency") does not work yet —
there is no fake/demo version standing in for it.

## Architecture

```
apps/
  web/        VANTA Radar - public live map (Vite + React, planned)
  client/     Windows VANTA Client (Electron + SimConnect, planned)
  atc/        ATC client (planned)

services/
  api/        REST API - accounts, flight plans, airports, ATC positions (Postgres via Prisma)
  realtime/   WebSocket network core - live aircraft/ATC state, VANTA/1 protocol
  voice/      Radio/voice server - WebRTC + frequency-based routing (planned)

packages/
  protocol/     VANTA/1 message schemas, validators, encode/decode
  types/        Shared TypeScript domain types + SimulatorAdapter interface
  airport-data/ OurAirports importer (planned)

database/
  migrations/   Notes on the Prisma migration workflow (see services/api/prisma)
```

**Why two services instead of one?** The API (`services/api`) owns
durable state in Postgres — accounts, flight plans, ATC position
ownership. The realtime server (`services/realtime`) owns live,
ephemeral state — where aircraft currently are, right now — entirely
in memory, and never touches Postgres. Splitting them means the
high-frequency position stream can't accidentally hammer the database,
and either service can be scaled/restarted independently later.

**Known scaling limit, stated plainly:** `services/realtime` currently
holds live state in a single process's memory (see
`services/realtime/src/state/network-state.ts`). That's fine for one
server handling everyone who's currently flying, but running more than
one realtime node (for horizontal scaling) would require moving that
state into a shared store such as Redis pub/sub. That migration is not
done — this is flagged so nobody is surprised later.

## Prerequisites (Windows 11)

- [Node.js 20+](https://nodejs.org)
- [pnpm](https://pnpm.io) 9.7+: `npm install -g pnpm`
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for local Postgres)
- Git

## Local setup

```powershell
git clone https://github.com/APGSwizzVR/VANTA.git
cd VANTA
pnpm install

copy .env.example .env
# Edit .env: at minimum, set JWT_SECRET and REALTIME_JWT_SECRET to the
# SAME long random value (generate one with the command below).
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

pnpm db:up          # starts Postgres via docker-compose.dev.yml
pnpm db:migrate      # applies the Prisma schema

pnpm dev:api         # http://localhost:4000
pnpm dev:realtime    # ws://localhost:4001/realtime
```

Verify the API is healthy:

```powershell
curl http://localhost:4000/health
```

## Environment variables

See `.env.example` for the full, commented list. The two that must
match each other are `JWT_SECRET` (API) and `REALTIME_JWT_SECRET`
(realtime server) — the realtime server verifies tokens the API
issued, so they need the same signing secret.

## MSFS 2020 / MSFS 2024 setup

Not yet available — `apps/client` (the Windows VANTA Client that reads
SimConnect data and talks to the network) has not been built yet. This
section will be filled in with real, tested setup steps once that
client exists. Until then, there is no way to connect a running
simulator to VANTA.

## Development commands

```powershell
pnpm dev              # run every app/service in watch mode, in parallel
pnpm dev:api           # just the REST API
pnpm dev:realtime       # just the realtime WebSocket server
pnpm build              # build every workspace package
pnpm lint               # eslint across all workspaces
pnpm typecheck          # tsc --noEmit across all workspaces
pnpm test               # vitest across all workspaces
pnpm db:up / db:down    # start/stop local Postgres
pnpm db:migrate         # apply Prisma migrations
pnpm db:generate        # regenerate the Prisma client
```

## Troubleshooting

- **`prisma generate` fails / Prisma client not found** — run
  `pnpm db:generate` after any change to `services/api/prisma/schema.prisma`.
- **Realtime server rejects every AUTH** — check that `JWT_SECRET`
  (API) and `REALTIME_JWT_SECRET` (realtime) are set to the *identical*
  value in `.env`.
- **Port already in use** — another process is bound to 4000/4001/5432;
  either stop it or change `API_PORT`/`REALTIME_PORT` in `.env`.

## Contributing

See `CONTRIBUTING.md`.

## License

MIT — see `LICENSE`.
