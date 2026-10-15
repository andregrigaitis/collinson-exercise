# Decisions & Assumptions

## Open questions (would ask PM) → assumption taken

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

## Cut / not done (and why)
