import type { Curve } from "../piecewise.js";

// Rationale for every number here is in DECISIONS.md and
// ai-sessions/outdoor-scoring.txt.
export interface OutdoorConfig {
  weights: {
    rain: number;
    temperature: number;
    wind: number;
    sunshine: number;
  };
  curves: {
    /** precipitation_hours → factor */
    rainHours: Curve;
    /** precipitation_sum (mm) → factor */
    rainAmount: Curve;
    /** apparent_temperature_max (°C) → sub-score */
    temperature: Curve;
    /** wind_gusts_10m_max (km/h) → sub-score */
    gusts: Curve;
    /** sunshine / daylight ratio → sub-score */
    sunshine: Curve;
  };
  /** Any of these makes the day unfeasible: score 0. All inclusive (≥ / ≤). */
  gates: {
    /** km/h, NWS "High" sustained wind */
    sustainedWind: number;
    /** km/h, NWS "Extreme" gusts */
    gusts: number;
    /** °C feels-like */
    heat: number;
    /** °C feels-like */
    cold: number;
    /** Rain for this many hours, whatever the amount */
    washoutHours: number;
    /** Heavy rain only gates if it also lasts */
    heavyRain: { mm: number; hours: number };
  };
  thunderstorm: {
    /** WMO weather codes, inclusive */
    codes: { min: number; max: number };
    factor: number;
  };
}

export const outdoorConfig: OutdoorConfig = {
  weights: { rain: 0.4, temperature: 0.3, wind: 0.15, sunshine: 0.15 },
  curves: {
    rainHours: [
      [0, 1],
      [2, 0.7],
      [10, 0],
    ],
    rainAmount: [
      [1, 1],
      [30, 0],
    ],
    temperature: [
      [-10, 0],
      [18, 1],
      [26, 1],
      [35, 0.3],
      [45, 0],
    ],
    gusts: [
      [40, 1],
      [56, 0.5],
      [93, 0],
    ],
    // max(0.3, ratio), capped at 1
    sunshine: [
      [0.3, 0.3],
      [1, 1],
    ],
  },
  gates: {
    sustainedWind: 64,
    gusts: 93,
    heat: 45,
    cold: -10,
    washoutHours: 10,
    heavyRain: { mm: 20, hours: 4 },
  },
  thunderstorm: { codes: { min: 95, max: 99 }, factor: 0.75 },
};
