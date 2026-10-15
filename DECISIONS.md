# Decisions & Assumptions

## Open questions (would ask PM) → assumption taken

q1: Empty or whitespace-only search: is it a validation error or just "no results"?
a1: Returns no results (`[]`) without calling Open-Meteo. The UI should prevent submitting it anyway.

q2: Open-Meteo returns several matches for a name, e.g. "Paris" gives Paris/France, Paris/Texas, etc. Should we use the first occurrence or return a few matches for the user to pick?
a2: Backend returns up to 3 matches and the UI lets the user pick. 3 felt like enough to cover the common cases.

## Scoring decisions

## Technical decisions

- **Two independent npm packages (`server/`, `web/`), no monorepo tooling.**
  Two apps, no shared code yet. Workspaces/turbo would add setup without
  solving a real problem here. If server and web start sharing types,
  I'd revisit (e.g. generating TS types from the GraphQL schema).

- **GraphQL Yoga for the server.**
  Smallest setup I found: one file, schema as SDL string, resolvers as a
  plain object, GraphiQL built in for manual testing. Apollo Server would
  work too, but brings more than this needs.

- **TypeScript run with `tsx`, no build step.**
  `tsc` is only used for type-checking (`noEmit`). Keeps the dev loop
  simple; a real deploy would add a build.

- **Node 24 pinned via `.nvmrc`.**
  Current LTS; meets Vite's minimum (20.19+/22.12+).

- **Open-Meteo Geocoding API for location search.**
  We're already using Open-Meteo for the weather, so no extra provider or key.

- **Provider classes map Open-Meteo responses to my own domain types.**
  OpenMeteoGeocodingProvider is the only place that knows the API's
  shape, for example admin1 maps to region, and missing results returns []. The goal is
  to keep scoring and GraphQL independent of Open-Meteo. No interface yet;
  I'll extract one when the weather provider exists and the shape is clearer.

- **5s timeout on Open-Meteo calls**, so a slow upstream doesn't hang the request.

## Cut / not done (and why)
