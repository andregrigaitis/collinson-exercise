# Activity forecast

Enter a city or town, pick the right match, and see the next 7 days ranked
for skiing, surfing, outdoor sightseeing and indoor sightseeing. A Node.js
GraphQL server fetches the forecast from Open-Meteo and scores each day 0–100
per activity. A React app shows the scores, the best day, and why each day
scored the way it did.

## Status

| Activity            | Status                                        |
| ------------------- | --------------------------------------------- |
| Outdoor sightseeing | Done: server scoring, tests, and UI           |
| Skiing              | Not started (approach decided, see DECISIONS) |
| Surfing             | Done: server scoring, tests, and UI           |
| Indoor sightseeing  | Done: server scoring, tests, and UI           |

Location search, the forecast view, and loading, no-results and
service-unavailable states work in the UI.

## How to run

**Prerequisites:** Node.js 24 (see `.nvmrc`; with nvm, run `nvm install` in the repo root).
Older versions fail: the test runner doesn't start on Node 21.

### Server (GraphQL API)

```sh
cd server
npm install
npm run dev
```

The GraphQL server runs at http://localhost:4000/graphql (GraphiQL is available at the same URL in a browser).

### Web (React + Vite)

Start the server first, the web app expects the API at http://localhost:4000/graphql
(override with `VITE_API_URL`).

In a second terminal:

```sh
cd web
npm install
npm run dev
```

Open the URL Vite prints (by default http://localhost:5173).

### Tests

```sh
cd server
npm test
```

Only the server has tests. The web app has none.

## Assumptions

The main ones. The reasoning for each is in [DECISIONS.md](DECISIONS.md).

- A search returns up to 3 matches and the user picks one (q2).
- Skiing will be scored at the city's elevation, not at resort altitude, so valley towns near resorts will score low (q3). Not built yet.
- Surfing is "not applicable" when the Marine API returns all nulls (inland), or when the Marine API is down (q4).
- Surfing is scored for a beginner: ideal swell 0.6–1 m, too big at 2 m (q5).
- Daily data covers the full day, including the night, so night rain counts against the day (Cut / not done).
- Daily `weather_code` and `precipitation_probability_max` aren't used as scores, because they describe the worst hour of the day (Scoring decisions).
- A day with missing forecast data is shown as "can't score", not as 0 (Outdoor sightseeing).
- Gates make a day unfeasible (score 0): dangerous wind, extreme heat or cold and washout for outdoor; flat, too big and too windy for surfing. The outdoor heat gate was calibrated on Miami data and isn't a standard (Scoring decisions).

## How I worked

- [DECISIONS.md](DECISIONS.md): open questions with the assumption I took, scoring and technical decisions, and what I cut and why.
- [ai-sessions/](ai-sessions/): raw AI sessions (ski altitude, outdoor scoring, surf scoring, front-end coding), exported unedited except for a short summary at the top.
- The commit history.
- I also used a separate chat for domain research and for sanity-checking numbers.

## Project structure

```
server/                 GraphQL API (Node.js, GraphQL Yoga, TypeScript run with tsx)
  src/index.ts          Schema and resolvers
  src/providers/        Open-Meteo clients (geocoding, forecast, marine), mapped to our own domain types
  src/services/         ForecastService: fetch once, run each activity scorer
  src/scoring/          One folder per activity (outdoor/, indoor/, surf/) with its scorer, config and tests
web/                    React + TypeScript front end (Vite)
  src/api/              GraphQL requests (plain fetch, no client library)
  src/hooks/            Search and forecast state: loading, error, retry
  src/components/       Search box, results, forecast view
ai-sessions/            Raw AI session exports
DECISIONS.md            Questions, assumptions, decisions, cuts
```
