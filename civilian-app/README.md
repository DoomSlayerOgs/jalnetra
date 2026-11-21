# JalNetra — Civilian app (port 3001)

Citizen-facing app. It has no database of its own: every `/api/*` request (SOS, tracking link,
alerts, shelters) is proxied to the **command-centre app**, so an SOS sent here lands in the
officer queue there.

## Run (two terminals)
1. Start the command centre first (see its README) on http://localhost:3000
2. Here:
   ```
   pnpm install
   cp .env.example .env.local     # COMMAND_CENTER_URL=http://localhost:3000
   pnpm dev                       # http://localhost:3001/citizen  -> "I need help"
   ```
Production: set `COMMAND_CENTER_URL` to the deployed command-centre URL before `pnpm build`.

## Test the link
Open `/citizen` -> **Need help**, submit a request. Within ~3 s it appears in the command centre
queue with a red "New SOS" toast. Officer updates (verified, shelter, volunteer) show on the
citizen's private tracking link.
