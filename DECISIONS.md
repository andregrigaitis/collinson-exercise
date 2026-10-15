# Decisions & Assumptions

## Open questions (would ask PM) → assumption taken

q1: Empty or whitespace-only search: is it a validation error or just "no results"?
a1: Returns no results (`[]`) without calling Open-Meteo. The UI should prevent submitting it anyway.

q2: Open-Meteo returns several matches for a name, e.g. "Paris" gives Paris/France, Paris/Texas, etc. Should we use the first occurrence or return a few matches for the user to pick?
a2: Backend returns up to 3 matches and the UI lets the user pick. 3 felt like enough to cover the common cases.

q3: Ski conditions depend on altitude, but a city's forecast is for the city itself (often a valley town below the slopes). Should skiing be scored at city elevation or at "mountain" altitude?
a3: Score at city elevation, and document the limitation.
I checked it: Chamonix at city elevation (1,034 m) shows rain and 0 cm snow all week, the same coordinates with `elevation=2500` show 7.7 cm snowfall and ~20 cm snow depth. So city elevation underestimates resorts in valleys.
I didn't go with a fixed mountain altitude because Open-Meteo forecasts any elevation you ask for, whether or not there's terrain there. Lisbon with `elevation=2000` returns a normal forecast, ~12.6 °C colder than at city level on almost every day, which matches the standard lapse rate (6.5 °C/km × ~1.9 km). So it looks like a formula shift of the city's weather, not a real mountain forecast. Doing this right needs terrain data (is there skiable terrain nearby?), which Open-Meteo doesn't provide. Elevation also changes the rain/snow split, not only temperature: at 2,500 m Chamonix gets 5.8 cm snow on a day that's rain in the valley, with total precipitation roughly unchanged. The chosen altitude drives the ski score heavily (2,500 → 2,800 m roughly doubled snowfall in one test), so picking one isn't a small detail.
Research and the back-and-forth with Claude (including a wrong conclusion I caught) are in `ai-sessions/ski-altitude-questioning.txt`.

q4: How do we know if surfing applies to a place?
a4: The Marine API doesn't error for inland places; it returns 200 with all values `null` (checked with Madrid). If all marine values are null, surfing is "not applicable" instead of scoring 0.
Known limitation: a coastal town a few km inland may land in a land grid cell and come back null too.

## Scoring decisions

- **Daily `weather_code` is not used for scoring.**
  It looks like the most severe condition of the day, not the typical one:
  Lisbon had `weather_code: 3` (overcast) on a day with 10.9 h of sunshine,
  and Chamonix showed the same pattern. `sunshine_duration` is a much better
  signal for "nice day outside".
  One exception: the outdoor thunderstorm penalty (below) uses it, because
  there "worst condition of the day" is exactly the question.

- **Snow: `snowfall_sum` + temperature as main signal, `snow_depth` as secondary.**
  The two don't agree with each other: at 2,500 m in Chamonix, depth started
  rising on a day with 0 snowfall, and reached ~20 cm from ~7.7 cm of total
  snowfall. In the valley, depth hit 0.01 m on a rain day with no snowfall.
  So depth needs a minimum threshold to count as "there's snow", not `> 0`.

### Outdoor sightseeing

Weighted sum of four sub-scores (rain 40%, temperature 30%, wind 15%,
sunshine 15%), plus hard gates for unsafe days. Exact curves and thresholds
will be in `server/src/scoring/`. The full back-and-forth is in
`ai-sessions/outdoor-scoring.txt`.

- **Gates are for safety, curves are for comfort.** Every sub-score reaches 0
  exactly where its gate starts, so there's no range where conditions get
  worse but the score doesn't move.

- **Feels-like max temperature.** Includes humidity and wind chill, and the
  max is the daytime value. Side effect: a cold windy day is penalised twice.
  Mild at these weights, accepted.

- **Heat hurts faster than cold.** Cold falls slowly (a dry sunny 5 °C day is
  fine with a coat, ~86). Heat falls about twice as fast up to 35 °C, then
  tails off to the gate.

- **Heat gate at 45 °C, calibrated on data.** My first try was 38 °C, but
  Open-Meteo's archive for Jul–Aug 2026 showed it would zero 42 of 62 days in
  Miami (median feels-like max 38.6 °C). That's a climate filter, not a
  safety gate. 45 °C is above every Florida day this summer. It's my
  calibration, not a standard.

- **Wind thresholds from the NWS wind threat scale**
  (https://www.weather.gov/mlb/seasonal_wind_threat). Gates at "High"
  sustained wind (64 km/h) or "Extreme" gusts (93 km/h). The scale is about
  danger, not comfort, so where comfort starts dropping is my call.

- **Thunderstorm is a ×0.75 penalty, not a gate.** With daily data, a short
  afternoon storm would zero the whole day. NWS 30/30 lightning guidance
  means a short storm costs ~1–2 h of an ~8 h day; I took the upper end
  because daily data can't say when it happens.

- **Washout needs duration, not just amount.** Short heavy storms can drop a
  lot of rain fast, so heavy rain only gates if it also lasts 4+ hours.
  10+ hours of rain gates on its own (all-day drizzle).

- **Dropped `precipitation_probability_max`.** Same problem as `weather_code`:
  it's the worst hour of the day. Consequence: forecast uncertainty isn't
  part of the score.

- **Sunshine as a ratio of daylight, with a 0.3 floor.** Short winter days
  aren't punished for being short, and overcast but dry is still fine.

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

- **Scoring skiing at resort altitude.** See q3. Next step would be sampling a
  grid of points around the city with the Open-Meteo Elevation API to detect
  nearby mountain terrain (Lisbon's max is 331 m, Chamonix's grid reaches
  4,516 m), then forecasting at a high percentile rather than the max, since
  the max is glacier, not piste. Cut because the chosen altitude drives the
  ski score heavily and would need its own tuning and justification.

- **Live ski data can't show a good ski day right now** (mid-October, northern
  hemisphere season hasn't started). Ski scoring is checked with fixed
  test data instead of the live API.

- **Weighted geometric mean for outdoor.** With a weighted sum, a dry, sunny,
  calm day can't go below ~70 however bad the temperature is (a −9 °C sunny
  day scores 71). A geometric mean fixes that (−9 °C → 37), but it's a
  structural change late in the process and makes the factors harder to
  explain in the UI. The gates already cover the dangerous extremes.

- **Daytime-only aggregation.** Daily values include the night, so night rain
  counts against the day. Fix: hourly data aggregated over ~09:00–18:00.
