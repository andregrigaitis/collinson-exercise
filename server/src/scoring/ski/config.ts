import type { Curve } from "../piecewise.js";

// Rationale for every number here is in ai-sessions/ski-scoring.txt.
// Scored at the city's elevation, not resort altitude (DECISIONS.md q3).
export interface SkiConfig {
  weights: {
    freshSnow: number;
    temperature: number;
    base: number;
    wind: number;
    rain: number;
  };
  curves: {
    /** Daily minimum snow_depth (cm) → sub-score */
    base: Curve;
    /** snowfall_sum (cm) → sub-score */
    freshSnow: Curve;
    /** temperature_2m_max (°C) → sub-score */
    temperature: Curve;
    /** wind_gusts_10m_max (km/h) → sub-score */
    gusts: Curve;
    /** rain_sum (mm) → sub-score */
    rain: Curve;
  };
  /** Any of these makes the day unfeasible: score 0. All inclusive (≥ / ≤). */
  gates: {
    /** cm, at or below: not enough snow to ski. Also the applicability rule. */
    thinBase: number;
    /** °C, at or below */
    cold: number;
    /** km/h gusts, at or above: lifts close */
    gusts: number;
  };
  thunderstorm: {
    /** WMO weather codes, inclusive */
    codes: { min: number; max: number };
    factor: number;
  };
}

export const skiConfig: SkiConfig = {
  weights: { freshSnow: 0.3, temperature: 0.25, base: 0.15, wind: 0.15, rain: 0.15 },
  curves: {
    base: [
      [10, 0],
      [30, 0.6],
      [60, 1],
    ],
    freshSnow: [
      [0, 0.3],
      [5, 0.7],
      [15, 1],
    ],
    temperature: [
      [-25, 0],
      [-15, 0.6],
      [-8, 1],
      [-2, 1],
      [3, 0.6],
      [8, 0.2],
      [12, 0],
    ],
    gusts: [
      [30, 1],
      [50, 0.5],
      [70, 0],
    ],
    rain: [
      [0, 1],
      [2, 0.6],
      [10, 0],
    ],
  },
  gates: { thinBase: 10, cold: -25, gusts: 70 },
  // Same as outdoor: lifts close with lightning and you wait it out.
  thunderstorm: { codes: { min: 95, max: 99 }, factor: 0.75 },
};
