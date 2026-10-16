import { describe, expect, it } from "vitest";
import type { DayScore } from "../../domain/types.js";
import {
  bergenDrizzle,
  galwayStormEowyn,
  kuwaitHeat,
  lisbonClear,
  miamiHeavyRain,
  wellingtonGusts,
  yakutskCold,
} from "../outdoor/fixtures.js";
import { OutdoorScorer } from "../outdoor/OutdoorScorer.js";
import { IndoorScorer } from "./IndoorScorer.js";

const scorer = new IndoorScorer(new OutdoorScorer());

/** What the UI shows: 100 minus the points each factor loses. */
function fromPointsLost({ factors }: DayScore): number {
  const lost = factors.reduce(
    (sum, f) => sum + f.weight * (1 - f.subScore) * 100,
    0,
  );
  return Math.round((100 - lost) * 10) / 10;
}

describe("IndoorScorer", () => {
  it("scores a clear day just above the baseline (Lisbon, outdoor 91.2)", () => {
    // 60 + 40 × (1 − 0.912)
    const result = scorer.scoreDay(lisbonClear);

    expect(result.score).toBe(63.5);
    expect(result.factors).toEqual([
      {
        name: "Weather outside",
        subScore: expect.closeTo(0.088),
        weight: 0.4,
        detail: "outdoor score 91.2",
      },
    ]);
  });

  it.each([
    ["drizzle washout", bergenDrizzle, "Washout: rain for 12 h"],
    ["heavy-rain washout", miamiHeavyRain, "Washout: 68.1 mm over 7 h"],
    ["heat", kuwaitHeat, "Extreme heat: 46.8 °C feels-like"],
    ["cold", yakutskCold, "Extreme cold: -46.7 °C feels-like"],
  ])("scores 100 when outdoor is gated for %s", (_name, day, outdoorGate) => {
    const result = scorer.scoreDay(day);

    expect(result.score).toBe(100);
    expect(result.gate).toBeUndefined();
    expect(result.factors[0].detail).toBe(`outdoor ruled out (${outdoorGate})`);
  });

  it("is gated on dangerous wind, because getting there is risky", () => {
    const result = scorer.scoreDay(wellingtonGusts);

    expect(result.score).toBe(0);
    expect(result.gate).toBe(
      "Dangerous wind: risky to travel (gusts 102.6 km/h)",
    );
  });

  it("is gated when wind and washout both apply (Storm Éowyn)", () => {
    const result = scorer.scoreDay(galwayStormEowyn);

    expect(result.score).toBe(0);
    expect(result.gate).toBe(
      "Dangerous wind: risky to travel (gusts 172.4 km/h)",
    );
  });

  it("falls back to the baseline when outdoor data is missing", () => {
    const result = scorer.scoreDay({ ...lisbonClear, sunshineDuration: null });

    expect(result.score).toBe(60);
    expect(result.missingData).toBeUndefined();
    expect(result.factors[0]).toMatchObject({
      subScore: 0,
      detail: "outdoor conditions unknown",
    });
  });

  it.each([
    ["clear", lisbonClear],
    ["washout", bergenDrizzle],
    ["missing data", { ...lisbonClear, sunshineDuration: null }],
  ])("points lost add up to the score (%s)", (_name, day) => {
    const result = scorer.scoreDay(day);

    expect(fromPointsLost(result)).toBe(result.score);
  });
});
