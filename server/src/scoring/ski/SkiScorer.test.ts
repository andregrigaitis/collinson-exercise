import { describe, expect, it } from "vitest";
import type { DailyWeather } from "../../domain/types.js";
import { galwayStormEowyn, yakutskCold } from "../outdoor/fixtures.js";
import {
  cairngormGusts,
  chamonixOctoberWeek,
  chamonixPowder,
  chamonixRain,
  chamonixThinBase,
  lisbonJanuaryWeek,
  nisekoJanuaryWeek,
  tignesThunderstorm,
  zermattAfterStorm,
  zermattCalm,
  zermattWarm,
} from "./fixtures.js";
import { SkiScorer } from "./SkiScorer.js";

const scorer = new SkiScorer();
const weekOf = (weather: DailyWeather[]) => ({ weather, marine: null });

describe("SkiScorer", () => {
  describe("scored days (January 2026)", () => {
    // Each worked by hand from the curves; matches ai-sessions/ski-scoring.txt.
    it.each([
      // fresh 0.861, temp 0.984, base 0.3, wind 0.743, rain 1
      ["Chamonix 10 Jan, powder day", chamonixPowder, 81.1],
      // fresh 0.3, temp 1, base 0.92, wind 0.95, rain 1
      ["Zermatt 11 Jan, clear after the storm", zermattAfterStorm, 77.1],
      // fresh 0.3, temp 1, base 0.76, wind 1, rain 1
      ["Zermatt 5 Jan, calm, no new snow", zermattCalm, 75.4],
      // fresh 0.3, temp 0.16, base 0.8, wind 1, rain 1
      ["Zermatt 13 Jan, 8.8 °C", zermattWarm, 55.0],
    ])("%s scores %s", (_name, day, expected) => {
      expect(scorer.scoreDay(day).score).toBe(expected);
    });

    it("explains the score with one factor per sub-score", () => {
      const { factors } = scorer.scoreDay(chamonixPowder);

      expect(factors.map((f) => [f.name, f.weight, f.detail])).toEqual([
        ["Fresh snow", 0.3, "10.36 cm fresh snow"],
        ["Temperature", 0.25, "-1.8 °C max"],
        ["Base", 0.15, "20 cm base"],
        ["Wind", 0.15, "gusts 40.3 km/h"],
        ["Rain", 0.15, "0 mm rain"],
      ]);
    });

    it("applies the ×0.75 thunderstorm penalty (Tignes, May 2025)", () => {
      // fresh 0.3, temp 0.328, base 1, wind 1, rain 0 → 0.472 × 0.75
      const result = scorer.scoreDay(tignesThunderstorm);

      expect(result.score).toBe(35.4);
      expect(result.penalty).toBe("Thunderstorm ×0.75");
    });
  });

  describe("gates", () => {
    it.each([
      ["Dangerous wind: gusts 73.8 km/h", cairngormGusts],
      ["Extreme cold: -41.6 °C max", yakutskCold],
      ["Not enough snow: 3 cm base", chamonixThinBase],
    ])("scores 0 with gate %s", (gate, day) => {
      const result = scorer.scoreDay(day);

      expect(result.score).toBe(0);
      expect(result.gate).toBe(gate);
    });

    it("gates a base of exactly 10 cm (inclusive, Chamonix 8 Jan)", () => {
      const result = scorer.scoreDay(chamonixRain);

      expect(result.score).toBe(0);
      expect(result.gate).toBe("Not enough snow: 10 cm base");
    });
  });

  describe("missing data", () => {
    it("returns null when snow depth is null (Galway, Storm Éowyn)", () => {
      // A real null: the Historical Forecast API has no snow_depth that day.
      const result = scorer.scoreDay(galwayStormEowyn);

      expect(result).toEqual({
        date: "2025-01-24",
        score: null,
        factors: [],
        missingData: "Missing forecast data: snow depth",
      });
    });

    it("lists every missing field", () => {
      const result = scorer.scoreDay({
        ...zermattCalm,
        snowfallSum: null,
        rainSum: null,
      });

      expect(result.missingData).toBe(
        "Missing forecast data: snowfall, rain",
      );
    });
  });

  describe("notApplicable", () => {
    it.each([
      ["Lisbon in January", lisbonJanuaryWeek],
      ["Chamonix in October", chamonixOctoberWeek],
    ])("says no snow on the ground for %s", (_name, week) => {
      expect(scorer.notApplicable(weekOf(week))).toBe(
        "No snow on the ground this week",
      );
    });

    it("is applicable for Niseko in January, despite its 134 m elevation", () => {
      expect(scorer.notApplicable(weekOf(nisekoJanuaryWeek))).toBeNull();
    });

    it("counts a 10 cm base as no snow, like the gate", () => {
      const thin = lisbonJanuaryWeek.map((d) => ({ ...d, snowDepthMin: 10 }));

      expect(scorer.notApplicable(weekOf(thin))).toBe(
        "No snow on the ground this week",
      );
    });

    it("treats a null depth as missing data, not as no snow", () => {
      const withNull = lisbonJanuaryWeek.map((d, i) =>
        i === 3 ? { ...d, snowDepthMin: null } : d,
      );

      expect(scorer.notApplicable(weekOf(withNull))).toBeNull();
    });
  });
});
