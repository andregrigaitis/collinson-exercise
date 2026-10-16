import { describe, expect, it } from "vitest";
import type { DailyMarine } from "../../domain/types.js";
import {
  barcelonaFlat,
  cocoaBeachStorm,
  lisbonTooBig,
  lisbonWeek,
  tarifaWind,
  type SurfDay,
} from "./fixtures.js";
import { SurfScorer } from "./SurfScorer.js";

const scorer = new SurfScorer();
const weekOf = (marine: DailyMarine[] | null) => ({
  weather: lisbonWeek.map((d) => d.weather),
  marine,
});
const score = ({ weather, marine }: SurfDay) => scorer.scoreDay(weather, marine);

describe("SurfScorer", () => {
  describe("scored days", () => {
    it("scores the Lisbon week", () => {
      // Worked by hand from the curves, e.g. the 16th:
      // height 0.976 × 0.45 + period 0.7825 × 0.30 + wind 0.70375 × 0.25
      expect(lisbonWeek.map((day) => score(day).score)).toEqual([
        85.0, 85.9, 79.5, 81.0, 96.3, 90.8, 86.5,
      ]);
    });

    it("explains the score with one factor per sub-score", () => {
      const { factors } = score(lisbonWeek[0]);

      expect(factors.map((f) => [f.name, f.weight, f.detail])).toEqual([
        ["Swell height", 0.45, "1.02 m swell"],
        ["Swell period", 0.3, "10.6 s period"],
        ["Wind", 0.25, "wind 18.9 km/h"],
      ]);
      expect(factors.map((f) => f.subScore)).toEqual([
        expect.closeTo(0.976),
        expect.closeTo(0.7825),
        expect.closeTo(0.70375),
      ]);
    });

    it("applies the ×0.5 thunderstorm penalty", () => {
      // height 0.067, period 0.4525, wind 0.5756 → 0.3096 × 0.5
      const result = score(cocoaBeachStorm);

      expect(result.score).toBe(15.5);
      expect(result.penalty).toBe("Thunderstorm ×0.5");
    });
  });

  describe("gates", () => {
    it.each([
      ["Flat: 0.02 m swell", barcelonaFlat],
      ["Waves too big: 2.30 m swell", lisbonTooBig],
      ["Too windy: wind 40.1 km/h", tarifaWind],
    ])("scores 0 with gate %s", (gate, day) => {
      const result = score(day);

      expect(result.score).toBe(0);
      expect(result.gate).toBe(gate);
    });
  });

  describe("missing data", () => {
    it("returns null when a marine value is null", () => {
      const [day] = lisbonWeek;
      const result = scorer.scoreDay(day.weather, {
        ...day.marine,
        swellWavePeriodMax: null,
      });

      expect(result).toEqual({
        date: "2026-10-16",
        score: null,
        factors: [],
        missingData: "Missing forecast data: swell period",
      });
    });

    it("returns null when there's no marine day for the date", () => {
      const result = scorer.scoreDay(lisbonWeek[0].weather, undefined);

      expect(result.missingData).toBe(
        "Missing forecast data: swell height, swell period",
      );
    });
  });

  describe("notApplicable", () => {
    it("is applicable when there's sea data", () => {
      expect(scorer.notApplicable(weekOf(lisbonWeek.map((d) => d.marine)))).toBeNull();
    });

    it("says no sea nearby when every marine value is null", () => {
      const inland = lisbonWeek.map(({ marine }) => ({
        date: marine.date,
        swellWaveHeightMax: null,
        swellWavePeriodMax: null,
      }));

      expect(scorer.notApplicable(weekOf(inland))).toBe("No sea nearby");
    });

    it("says the sea forecast is unavailable when the Marine API failed", () => {
      expect(scorer.notApplicable(weekOf(null))).toBe(
        "Sea forecast unavailable right now",
      );
    });
  });
});
