import type { Curve } from "../piecewise.js";

// Rationale for every number here is in DECISIONS.md and
// ai-sessions/surf-scoring.txt. Height is tuned for beginners.
export interface SurfConfig {
  weights: {
    height: number;
    period: number;
    wind: number;
  };
  curves: {
    /** swell_wave_height_max (m) → sub-score */
    height: Curve;
    /** swell_wave_period_max (s) → sub-score */
    period: Curve;
    /** wind_speed_10m_max (km/h) → sub-score */
    wind: Curve;
  };
  /** Any of these makes the day unfeasible: score 0. All inclusive (≥ / ≤). */
  gates: {
    /** m, at or below: no rideable waves */
    flat: number;
    /** m, at or above: too big for a beginner */
    tooBig: number;
    /** km/h sustained, force 6 */
    wind: number;
  };
  thunderstorm: {
    /** WMO weather codes, inclusive */
    codes: { min: number; max: number };
    factor: number;
  };
}

export const surfConfig: SurfConfig = {
  weights: { height: 0.45, period: 0.3, wind: 0.25 },
  curves: {
    height: [
      [0.3, 0],
      [0.6, 1],
      [1.0, 1],
      [1.5, 0.4],
      [2.0, 0],
    ],
    period: [
      [5, 0],
      [8, 0.4],
      [12, 1],
    ],
    wind: [
      [11, 1],
      [19, 0.7],
      [28, 0.35],
      [39, 0],
    ],
  },
  gates: { flat: 0.3, tooBig: 2.0, wind: 39 },
  // Stronger than outdoor's ×0.75: in the water you're far from shelter and
  // it takes time to paddle in.
  thunderstorm: { codes: { min: 95, max: 99 }, factor: 0.5 },
};
