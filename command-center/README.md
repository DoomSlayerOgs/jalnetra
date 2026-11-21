# JalNetra — Command centre (port 3000)

Officer dashboard **and** the backend for both apps. It owns the data (reports, shelters,
volunteers, alerts); the civilian app calls its `/api/*` routes through a proxy.

## Run
```
pnpm install
pnpm dev        # http://localhost:3000/command-centre
```
Start this one first. New requests from the civilian app appear in the queue within ~3 s
(the page polls `/api/state`), with a red **New SOS** toast and a map marker.

Without `DATABASE_URL` the data is in memory (resets when the server restarts; fine for demos).
For a deployed/serverless setup set `DATABASE_URL` (Neon Postgres) so state survives and is shared.
