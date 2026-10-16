import { describe, expect, it } from "vitest";
import {
  bergenDrizzle,
  galwayStormEowyn,
  kuwaitHeat,
  lisbonClear,
  miamiHeavyRain,
  miamiShortDownpour,
  miamiThunderstorm,
  tromsoPolarNight,
  wellingtonGusts,
  yakutskCold,
} from "./fixtures.js";
import { OutdoorScorer } from "./OutdoorScorer.js";

const scorer = new OutdoorScorer();

describe("OutdoorScorer", () => {
  describe("scored days", () => {
    it("matches the Lisbon worked example (91.2)", () => {
      const result = scorer.scoreDay(lisbonClear);

      expect(result.score).toBe(91.2);
      expect(result.gate).toBeUndefined();
      expect(result.penalty).toBeUndefined();
    });

    it("explains the score with one factor per sub-score", () => {
      const { factors } = scorer.scoreDay(lisbonClear);

      expect(factors.map((f) => [f.name, f.weight, f.detail])).toEqual([
        ["Rain", 0.4, "0 mm over 0 h"],
        ["Temperature", 0.3, "29.6 °C feels-like"],
        ["Wind", 0.15, "gusts 24.8 km/h"],
        ["Sunshine", 0.15, "97% of daylight"],
      ]);
      expect(factors.map((f) => f.subScore)).toEqual([
        1,
        expect.closeTo(0.72),
        1,
        expect.closeTo(0.9724, 4),
      ]);
    });

    it("applies the ×0.75 thunderstorm penalty", () => {
      // rain 0.668, temp 0.246, wind 1, sun 0.662 → 0.590 × 0.75
      const result = scorer.scoreDay(miamiThunderstorm);

      expect(result.score).toBe(44.3);
      expect(result.penalty).toBe("Thunderstorm ×0.75");
    });

    it("doesn't gate a heavy but short downpour (88 mm in 3 h)", () => {
      // Rain sub-score is 0 (amount ≥ 30 mm), but H < 4 so no washout.
      // temp 0.171, wind 1, sun 0.587 → 0.289 × 0.75
      const result = scorer.scoreDay(miamiShortDownpour);

      expect(result.gate).toBeUndefined();
      expect(result.factors[0].subScore).toBe(0);
      expect(result.score).toBe(21.7);
    });

    it("uses the sunshine floor during polar night instead of dividing by 0", () => {
      // rain 0.415, temp 0.375, wind 1, sun 0.3 → 0.473
      const result = scorer.scoreDay(tromsoPolarNight);

      expect(result.factors[3].subScore).toBe(0.3);
      expect(result.score).toBe(47.3);
    });
  });

  describe("gates", () => {
    it.each([
      ["Dangerous wind: gusts 102.6 km/h", wellingtonGusts],
      ["Extreme heat: 46.8 °C feels-like", kuwaitHeat],
      ["Extreme cold: -46.7 °C feels-like", yakutskCold],
      ["Washout: rain for 12 h", bergenDrizzle],
      ["Washout: 68.1 mm over 7 h", miamiHeavyRain],
    ])("scores 0 with gate %s", (gate, day) => {
      const result = scorer.scoreDay(day);

      expect(result.score).toBe(0);
      expect(result.gate).toBe(gate);
    });

    it("reports the most dangerous gate when several apply (Storm Éowyn)", () => {
      const result = scorer.scoreDay(galwayStormEowyn);

      expect(result.score).toBe(0);
      expect(result.gate).toBe("Dangerous wind: gusts 172.4 km/h");
    });

    it("still returns factors on a gated day, for the UI", () => {
      const { factors } = scorer.scoreDay(kuwaitHeat);

      expect(factors).toHaveLength(4);
      expect(factors[1].subScore).toBe(0);
    });
  });

  describe("missing data", () => {
    it("returns null instead of scoring a missing field as 0", () => {
      const result = scorer.scoreDay({ ...lisbonClear, sunshineDuration: null });

      expect(result).toEqual({
        date: "2026-10-15",
        score: null,
        factors: [],
        missingData: "Missing forecast data: sunshine duration",
      });
    });

    it("lists every missing field", () => {
      const result = scorer.scoreDay({
        ...lisbonClear,
        windGustsMax: null,
        weatherCode: null,
      });

      expect(result.missingData).toBe(
        "Missing forecast data: wind gusts, weather code",
      );
    });

    it("doesn't gate on partial data", () => {
      // Gusts alone would gate, but the day can't be scored as a whole.
      const result = scorer.scoreDay({ ...wellingtonGusts, precipitationSum: null });

      expect(result.score).toBeNull();
      expect(result.gate).toBeUndefined();
    });
  });
});
