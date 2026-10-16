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
a4: The Marine API returns 200 with all values null for inland places (Madrid,
Coimbra), so all-null means "not applicable: No sea nearby". It uses the
nearest sea cell, so towns up to ~20 km inland (Leiria) still get a score.
That's arguably useful (a short drive), but the score describes the nearest
sea, not a specific break: Lisbon's cell sits at the mouth of the Tagus,
more sheltered than the Atlantic beaches nearby. `cell_selection=sea` gave the
same results as the default in every test; it's passed explicitly anyway.

q5: Who is the surfer?
a5: A beginner. The app is for someone deciding what to do in a city, not a
surf forecast for experts. Ideal swell 0.6–1 m, too big at 2 m. Caveat: the API
gives significant swell height at sea; wave faces at the beach are often bigger.

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
sunshine 15%), plus hard gates for unfeasible days. Exact curves and thresholds
are in `server/src/scoring/`. The full back-and-forth is in
`ai-sessions/outdoor-scoring.txt`.

- **Gates are for unfeasible days, curves are for comfort.** For single-variable
  gates (temperature, gusts, rain hours), the sub-score reaches 0 exactly where
  the gate starts, so there's no range where conditions get worse but the score
  doesn't move. Two exceptions: the heavy-rain gate combines amount and duration,
  so no single curve point can match it; and sustained wind only has a gate,
  since gusts already drive the wind comfort score.

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

- **Missing data means "can't score", not 0.** If any field the formula
  needs is null, the day gets score null and a "Missing forecast data"
  reason. A null scored as 0 would look like a terrible day instead of an
  unknown one.

- **Missing-data check runs before the gates.** Side effect: a day with
  dangerous gusts but a null precipitation value comes back as "can't
  score", not as a wind gate. Kept for now because it's one simple rule;
  checking each gate whenever its own fields are present would fix it.

- **`weather_code` is required.** The thunderstorm penalty needs it, so a
  null code makes the day unscorable rather than silently skipping the
  penalty.

### Indoor sightseeing

Built on top of the outdoor result, with no weather logic of its own.
Exact numbers are in `server/src/scoring/indoor/config.ts`.

- **Baseline plus a bonus for bad weather outside:**
  indoor = 60 + 40 × (1 − outdoor/100). A perfect outdoor day still gives 60
  (museums are fine, just not the best option); the worse it is outside, the
  closer indoor gets to 100. Shown in the UI as one factor, "Weather outside",
  so 100 minus points lost still equals the score.

- **Outdoor washout, heat and cold count as outdoor 0, so indoor scores 100.**
  Those are the best museum days. Side effect: a day that's ruled out outdoors
  can become indoor's best date, which is intended.

- **Dangerous wind gates indoor too.** Getting there is the problem: gusts at
  NWS "Extreme" levels bring down trees. Extreme heat or cold isn't gated,
  since a short trip to a museum is manageable in both; strong wind isn't.
  A wind-gated indoor day shows only the gate reason, no factors.

- **Missing outdoor data falls back to the baseline (60).** Museums don't depend
  on the forecast; only the bonus is unknown, so the day still gets a score.

- **No thunderstorm penalty for indoor.** A storm already lowers the outdoor
  score, which raises indoor.

### Surfing

Height 45%, period 30%, wind 25%, with gates for flat (≤ 0.3 m), too big
(≥ 2 m) and too windy (≥ 39 km/h). Exact curves are in
`server/src/scoring/surf/config.ts`; the research is in
`ai-sessions/surf-scoring.txt`.

- **Swell height and period, not total wave height.** Swell is the surfable
  part; total height mixes in wind chop. `swell_wave_peak_period_max` returned
  values like 1.65 s for Lisbon, so it isn't used.
- **Wind without direction counts as bad wind.** Coastline orientation isn't
  available, so light offshore wind (actually the best case) scores lower than
  calm. That's why wind has the lowest weight. Breakpoints follow the Beaufort
  scale (force 2 at 11 km/h, force 3 at 19, force 6 at 39).
- **Thunderstorm ×0.5, stronger than outdoor's ×0.75.** In the water you're
  farther from shelter and it takes time to paddle in.
- **Sources:** I checked surfing-waves.com for thresholds, but it has no numbers,
  only how swell forms. All values are my own calls.

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
  to keep scoring and GraphQL independent of Open-Meteo. A `ForecastProvider`
  interface was extracted once the ForecastService tests needed a fake.

- **5s timeout on Open-Meteo calls**, so a slow upstream doesn't hang the request.

- **Error handling.** Forecast provider failures become a `FORECAST_UNAVAILABLE` error
  with a safe "try again" message; the real cause is only logged on the
  server. Search failures show a generic error in the UI. Bad coordinates return `BAD_USER_INPUT`. Any other error stays
  masked by Yoga as "Unexpected error."

- **CORS left at Yoga's default (open).** No auth, cookies or mutations, so
  an open policy exposes nothing. The real exposure is the server being used
  as a free Open-Meteo proxy, which needs rate limiting or caching, not CORS.

- **UI shows points lost per factor, not raw sub-scores.** "Rain: 1.5 mm over
  6 h (−26 pts)" answers "why is this day low?"; 0.35 doesn't. On gated days
  the factors are listed without points, since they don't add up to the 0;
  the gate reason explains it.

- **Dates formatted without timezone conversion.** The API sends the place's
  local date; `new Date("YYYY-MM-DD")` would show the previous day west of UTC.

- **OutdoorScorer exposes the gate kind, not just a message.** The indoor scorer
  needs to tell wind apart from heat, cold and washout. Parsing the message text
  would break on the first wording change, so `assess()` returns the outdoor
  score plus the gate kind; `scoreDay()` is unchanged.

- **Forecast and marine fetched in parallel, failures isolated.** If the forecast
  fails, it's FORECAST_UNAVAILABLE as before. If only marine fails, surfing comes
  back "Sea forecast unavailable right now" and the other activities still work.
  Scorers that don't use marine data ignore it (`scoreDay` takes it as an
  optional argument).

## Cut / not done (and why)

- **Scoring skiing at resort altitude.** See q3. Next step would be sampling a
  grid of points around the city with the Open-Meteo Elevation API to detect
  nearby mountain terrain (Lisbon's max is 331 m, Chamonix's grid reaches
  4,516 m), then forecasting at a high percentile rather than the max, since
  the max is glacier, not piste. Cut because the chosen altitude drives the
  ski score heavily and would need its own tuning and justification.

- **Live ski data can't show a good ski day right now** (mid-October, northern
  hemisphere season hasn't started). Ski scoring will be checked with fixed
  test data instead of the live API.

- **Weighted geometric mean for outdoor.** With a weighted sum, a dry, sunny,
  calm day can't go below ~70 however bad the temperature is (a −9 °C sunny
  day scores 71). A geometric mean fixes that (−9 °C → 37), but it's a
  structural change late in the process and makes the factors harder to
  explain in the UI. The gates already cover the dangerous extremes.

- **Daytime-only aggregation.** Daily values include the night, so night rain
  counts against the day. Fix: hourly data aggregated over ~09:00–18:00.

- **Trace precipitation is over-penalised.** `precipitation_hours` seems to count
  an hour even for trace amounts (Chamonix: 0.13 mm over 2 h). So 0.9 mm over 9 h
  in Lisbon scores rain ≈ 0.09, and a Chamonix day with 88% sunshine and 1.1 mm
  over 6 h loses ~26 points. Idea: scale the hours penalty by the amount (full
  from ~2 mm/day). Left for fine-tuning.

- **Extreme rain in a short time isn't gated.** 88 mm in 3 h in Miami scores
  21.7 instead of being a washout, because the heavy-rain gate needs 4+ hours.
  Idea: gate on amount alone above ~50 mm.

- **Wave energy.** Height and period are scored separately, but energy depends on
  height² × period, so a small long-period swell (Lisbon 19 Oct: 0.5 m at 13.8 s)
  scores lower than a surfer would rate it. A combined sub-score would be harder
  to explain in the UI.
